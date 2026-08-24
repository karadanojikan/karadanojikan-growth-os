-- Phase 2: private original media, append-only video versions, and idempotent render queues.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video-assets', 'video-assets', false, 524288000, array['video/mp4','video/quicktime','video/webm','video/x-m4v'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_object_workspace_id(object_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
declare first_segment text;
begin
  first_segment := split_part(object_name, '/', 1);
  if first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return first_segment::uuid;
  end if;
  return null;
end;
$$;
revoke all on function public.storage_object_workspace_id(text) from public;
grant execute on function public.storage_object_workspace_id(text) to authenticated;

drop policy if exists video_assets_select on storage.objects;
drop policy if exists video_assets_insert on storage.objects;
create policy video_assets_select on storage.objects for select to authenticated
using (bucket_id = 'video-assets' and public.is_workspace_member(public.storage_object_workspace_id(name)));
create policy video_assets_insert on storage.objects for insert to authenticated
with check (bucket_id = 'video-assets' and public.is_workspace_member(public.storage_object_workspace_id(name)));

alter table public.render_jobs add constraint render_jobs_job_unique unique(job_id);

create or replace function public.save_video_project_v1(
  p_asset_id uuid,
  p_metadata jsonb,
  p_transcript jsonb,
  p_edls jsonb
)
returns table(video_project_id uuid, video_edl_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  target_workspace_id uuid;
  created_project_id uuid;
  created_edl_id uuid;
  edl jsonb;
  edl_version integer;
begin
  select ma.workspace_id into target_workspace_id from public.media_assets ma where ma.id = p_asset_id;
  if target_workspace_id is null or not public.is_workspace_member(target_workspace_id) then
    raise exception 'workspace_access_denied';
  end if;
  if jsonb_typeof(p_edls) <> 'array' or jsonb_array_length(p_edls) = 0 then
    raise exception 'at_least_one_edl_required';
  end if;

  update public.media_assets set metadata = p_metadata where id = p_asset_id;
  insert into public.transcripts(workspace_id, media_asset_id, words, provider)
  values(target_workspace_id, p_asset_id, coalesce(p_transcript->'words', '[]'::jsonb), coalesce(p_transcript->>'provider', 'MANUAL'));
  insert into public.video_projects(workspace_id, style, status)
  values(target_workspace_id, coalesce(p_edls->0->>'style', 'EDUCATIONAL'), 'READY_FOR_REVIEW') returning id into created_project_id;

  for edl in select value from jsonb_array_elements(p_edls) loop
    edl_version := (edl->>'version')::integer;
    if edl_version is null or edl_version < 1 then raise exception 'invalid_edl_version'; end if;
    insert into public.video_edls(workspace_id, video_project_id, version, payload, created_by)
    values(target_workspace_id, created_project_id, edl_version, edl, (select auth.uid()))
    returning id into created_edl_id;
  end loop;
  update public.video_projects set current_edl_id = created_edl_id, style = coalesce(edl->>'style', 'EDUCATIONAL') where id = created_project_id;
  return query select created_project_id, created_edl_id;
end;
$$;
revoke all on function public.save_video_project_v1(uuid,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_video_project_v1(uuid,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.append_video_edl_v1(p_video_project_id uuid, p_payload jsonb)
returns table(video_edl_id uuid, version integer)
language plpgsql security definer set search_path = '' as $$
declare target_workspace_id uuid; next_version integer; created_edl_id uuid;
begin
  select vp.workspace_id into target_workspace_id from public.video_projects vp where vp.id = p_video_project_id;
  if target_workspace_id is null or not public.is_workspace_member(target_workspace_id) then raise exception 'workspace_access_denied'; end if;
  select coalesce(max(ve.version),0)+1 into next_version from public.video_edls ve where ve.video_project_id = p_video_project_id;
  p_payload := jsonb_set(p_payload, '{version}', to_jsonb(next_version), true);
  insert into public.video_edls(workspace_id,video_project_id,version,payload,created_by)
  values(target_workspace_id,p_video_project_id,next_version,p_payload,(select auth.uid())) returning id into created_edl_id;
  update public.video_projects set current_edl_id=created_edl_id,style=coalesce(p_payload->>'style',style) where id=p_video_project_id;
  return query select created_edl_id,next_version;
end;
$$;
revoke all on function public.append_video_edl_v1(uuid,jsonb) from public;
grant execute on function public.append_video_edl_v1(uuid,jsonb) to authenticated;

create or replace function public.enqueue_video_render_v1(p_video_project_id uuid, p_video_edl_id uuid, p_provider text)
returns table(job_id uuid, render_job_id uuid, stage text)
language plpgsql security definer set search_path = '' as $$
declare target_workspace_id uuid; created_job_id uuid; created_render_id uuid; idempotency text;
begin
  select vp.workspace_id into target_workspace_id from public.video_projects vp
  join public.video_edls ve on ve.id=p_video_edl_id and ve.video_project_id=vp.id
  where vp.id=p_video_project_id;
  if target_workspace_id is null or not public.is_workspace_member(target_workspace_id) then raise exception 'workspace_access_denied'; end if;
  if p_provider not in ('MOCK','LOCAL','PRODUCTION') then raise exception 'invalid_render_provider'; end if;
  idempotency := 'render:' || p_video_edl_id::text || ':' || p_provider;
  insert into public.jobs(workspace_id,type,status,payload,progress,idempotency_key)
  values(target_workspace_id,'VIDEO_RENDER','QUEUED',jsonb_build_object('videoProjectId',p_video_project_id,'videoEdlId',p_video_edl_id,'provider',p_provider),jsonb_build_object('stage','QUEUED','percent',0),idempotency)
  on conflict(workspace_id,type,idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into created_job_id;
  insert into public.render_jobs(workspace_id,video_project_id,video_edl_id,job_id,provider,status)
  values(target_workspace_id,p_video_project_id,p_video_edl_id,created_job_id,p_provider,'QUEUED')
  on conflict on constraint render_jobs_job_unique do update set job_id=excluded.job_id
  returning id into created_render_id;
  return query select created_job_id,created_render_id,'QUEUED'::text;
end;
$$;
revoke all on function public.enqueue_video_render_v1(uuid,uuid,text) from public;
grant execute on function public.enqueue_video_render_v1(uuid,uuid,text) to authenticated;
