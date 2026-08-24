-- Avoid PL/pgSQL ambiguity between the table column and the `job_id`
-- output parameter. This migration is safe to apply after 202608240005.
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
