-- Phase 3: official Instagram Login, encrypted tokens, version-bound approval,
-- idempotent publication jobs, and service-only webhook payloads.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('publish-assets','publish-assets',false,524288000,array['image/jpeg','video/mp4','video/quicktime','video/webm','video/x-m4v'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists publish_assets_select on storage.objects;
drop policy if exists publish_assets_insert on storage.objects;
create policy publish_assets_select on storage.objects for select to authenticated
using(bucket_id='publish-assets' and public.is_workspace_member(public.storage_object_workspace_id(name)));
create policy publish_assets_insert on storage.objects for insert to authenticated
with check(bucket_id='publish-assets' and public.is_workspace_member(public.storage_object_workspace_id(name)));

alter table public.media_assets add column if not exists storage_bucket text not null default 'video-assets';

alter table public.instagram_accounts
  add column if not exists account_type text,
  add column if not exists granted_permissions text[] not null default '{}',
  add column if not exists declined_permissions text[] not null default '{}',
  add column if not exists token_key_version integer not null default 1,
  add column if not exists profile_picture_url text,
  add column if not exists last_error_code text,
  add column if not exists disconnected_at timestamptz;

alter table public.instagram_capabilities
  add column if not exists reasons jsonb not null default '{}',
  add column if not exists source text not null default 'RUNTIME_VERIFICATION';

alter table public.post_schedules
  add column if not exists instagram_account_id uuid references public.instagram_accounts(id),
  add column if not exists media_asset_ids uuid[] not null default '{}',
  add column if not exists publish_payload jsonb not null default '{}',
  add column if not exists publish_job_id uuid references public.jobs(id),
  add column if not exists meta_container_id text,
  add column if not exists external_media_id text,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.published_posts
  add column if not exists content_version_id uuid references public.content_versions(id),
  add column if not exists publish_job_id uuid references public.jobs(id);

alter table public.webhook_events
  add column if not exists event_type text,
  add column if not exists external_account_id text,
  add column if not exists payload_ciphertext text,
  add column if not exists signature_version text;

create unique index if not exists post_schedule_version_unique on public.post_schedules(content_item_id,content_version_id);
create index if not exists post_schedules_publish_due_idx on public.post_schedules(status,scheduled_for);
create index if not exists instagram_accounts_token_expiry_idx on public.instagram_accounts(connection_status,token_expires_at);

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner','admin')
  );
$$;
revoke all on function public.is_workspace_admin(uuid) from public, anon;
grant execute on function public.is_workspace_admin(uuid) to authenticated;

create or replace function public.store_instagram_connection_v1(
  p_workspace_id uuid,
  p_external_account_id text,
  p_username text,
  p_account_type text,
  p_token_ciphertext text,
  p_token_expires_at timestamptz,
  p_granted_permissions text[],
  p_declined_permissions text[],
  p_profile_picture_url text,
  p_api_version text,
  p_capabilities jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare account_id uuid;
begin
  if not public.is_workspace_admin(p_workspace_id) then raise exception 'workspace_admin_required' using errcode = '42501'; end if;
  if p_account_type not in ('BUSINESS','MEDIA_CREATOR') then raise exception 'professional_account_required' using errcode = '22023'; end if;
  if p_token_expires_at <= now() or length(p_token_ciphertext) < 40 then raise exception 'valid_encrypted_token_required' using errcode = '22023'; end if;

  insert into public.instagram_accounts(
    workspace_id,external_account_id,username,account_type,connection_status,token_ciphertext,
    token_expires_at,granted_permissions,declined_permissions,profile_picture_url,last_verified_at,last_error_code,disconnected_at
  ) values (
    p_workspace_id,p_external_account_id,p_username,p_account_type,'CONNECTED',p_token_ciphertext,
    p_token_expires_at,coalesce(p_granted_permissions,'{}'),coalesce(p_declined_permissions,'{}'),nullif(p_profile_picture_url,''),now(),null,null
  ) on conflict(workspace_id,external_account_id) do update set
    username=excluded.username,account_type=excluded.account_type,connection_status='CONNECTED',
    token_ciphertext=excluded.token_ciphertext,token_expires_at=excluded.token_expires_at,
    granted_permissions=excluded.granted_permissions,declined_permissions=excluded.declined_permissions,
    profile_picture_url=excluded.profile_picture_url,last_verified_at=now(),last_error_code=null,disconnected_at=null
  returning id into account_id;

  insert into public.instagram_capabilities(
    workspace_id,instagram_account_id,api_version,publishing,reels,carousel,stories,insights,messaging,comments,webhooks,reasons,verified_at
  ) values (
    p_workspace_id,account_id,p_api_version,
    coalesce((p_capabilities->>'publishing')::boolean,false),coalesce((p_capabilities->>'reels')::boolean,false),
    coalesce((p_capabilities->>'carousel')::boolean,false),coalesce((p_capabilities->>'stories')::boolean,false),
    coalesce((p_capabilities->>'insights')::boolean,false),coalesce((p_capabilities->>'messaging')::boolean,false),
    coalesce((p_capabilities->>'comments')::boolean,false),coalesce((p_capabilities->>'webhooks')::boolean,false),
    coalesce(p_capabilities->'reasons','{}'::jsonb),now()
  ) on conflict(instagram_account_id) do update set
    api_version=excluded.api_version,publishing=excluded.publishing,reels=excluded.reels,
    carousel=excluded.carousel,stories=excluded.stories,insights=excluded.insights,
    messaging=excluded.messaging,comments=excluded.comments,webhooks=excluded.webhooks,
    reasons=excluded.reasons,verified_at=now();

  insert into public.audit_logs(workspace_id,actor_user_id,action,subject_type,subject_id,metadata)
  values(p_workspace_id,(select auth.uid()),'instagram.connected','instagram_account',account_id::text,
    jsonb_build_object('username',p_username,'apiVersion',p_api_version,'permissions',p_granted_permissions));
  return account_id;
end;
$$;
revoke all on function public.store_instagram_connection_v1(uuid,text,text,text,text,timestamptz,text[],text[],text,text,jsonb) from public, anon;
grant execute on function public.store_instagram_connection_v1(uuid,text,text,text,text,timestamptz,text[],text[],text,text,jsonb) to authenticated;

create or replace function public.disconnect_instagram_v1(p_instagram_account_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_workspace_id uuid;
begin
  select workspace_id into target_workspace_id from public.instagram_accounts where id=p_instagram_account_id;
  if target_workspace_id is null or not public.is_workspace_admin(target_workspace_id) then raise exception 'workspace_admin_required' using errcode = '42501'; end if;
  update public.instagram_accounts set connection_status='DISCONNECTED',token_ciphertext=null,token_expires_at=null,disconnected_at=now() where id=p_instagram_account_id;
  update public.instagram_capabilities set publishing=false,reels=false,carousel=false,stories=false,insights=false,messaging=false,comments=false,webhooks=false,reasons='{"connection":"Instagram接続が解除されています。"}'::jsonb,verified_at=now() where instagram_account_id=p_instagram_account_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,subject_type,subject_id)
  values(target_workspace_id,(select auth.uid()),'instagram.disconnected','instagram_account',p_instagram_account_id::text);
end;
$$;
revoke all on function public.disconnect_instagram_v1(uuid) from public, anon;
grant execute on function public.disconnect_instagram_v1(uuid) to authenticated;

create or replace function public.approve_instagram_schedule_v1(
  p_content_item_id uuid,
  p_content_version_id uuid,
  p_scheduled_for timestamptz,
  p_media_asset_ids uuid[],
  p_notes text
) returns table(schedule_id uuid, approval_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
declare target_workspace_id uuid; target_content_type text; target_payload jsonb; target_account_id uuid; created_schedule_id uuid; created_approval_id uuid;
begin
  select ci.workspace_id,ci.content_type,cv.payload,coalesce(ci.instagram_account_id,
    (select ia.id from public.instagram_accounts ia where ia.workspace_id=ci.workspace_id and ia.connection_status='CONNECTED' order by ia.last_verified_at desc limit 1))
  into target_workspace_id,target_content_type,target_payload,target_account_id
  from public.content_items ci join public.content_versions cv on cv.id=p_content_version_id and cv.content_item_id=ci.id
  where ci.id=p_content_item_id and ci.current_version_id=p_content_version_id;
  if target_workspace_id is null or not public.is_workspace_member(target_workspace_id) then raise exception 'current_content_version_required' using errcode = '42501'; end if;
  if target_payload->>'safetyStatus'='BLOCK' then raise exception 'blocked_content_cannot_be_approved' using errcode = '22023'; end if;
  if target_account_id is null then raise exception 'connected_instagram_account_required' using errcode = '22023'; end if;
  if coalesce(array_length(p_media_asset_ids,1),0)=0 then raise exception 'media_required' using errcode = '22023'; end if;
  if target_content_type='REELS' and array_length(p_media_asset_ids,1)<>1 then raise exception 'reels_require_one_video' using errcode = '22023'; end if;
  if target_content_type='CAROUSEL' and (array_length(p_media_asset_ids,1)<2 or array_length(p_media_asset_ids,1)>10) then raise exception 'carousel_requires_two_to_ten_assets' using errcode = '22023'; end if;
  if exists(
    select 1 from unnest(p_media_asset_ids) asset_id
    left join public.media_assets ma on ma.id=asset_id and ma.workspace_id=target_workspace_id
    left join public.media_asset_rights mar on mar.media_asset_id=ma.id
    where ma.id is null or (ma.is_customer_media and (
      mar.consent_status<>'approved' or not ('instagram'=any(mar.approved_platforms)) or
      (mar.expires_at is not null and mar.expires_at<=now())
    )) or (ma.media_type like 'video/%' and coalesce(mar.music_license_status,'unknown') not in ('not_applicable','approved'))
  ) then raise exception 'media_rights_not_approved' using errcode = '22023'; end if;

  insert into public.approvals(workspace_id,subject_type,subject_id,subject_version,decision,decided_by,notes)
  values(target_workspace_id,'POST_SCHEDULE',p_content_item_id,p_content_version_id::text,'APPROVED',(select auth.uid()),left(p_notes,500))
  returning id into created_approval_id;
  insert into public.post_schedules(workspace_id,content_item_id,content_version_id,instagram_account_id,media_asset_ids,scheduled_for,status,approval_id,publish_payload)
  values(target_workspace_id,p_content_item_id,p_content_version_id,target_account_id,p_media_asset_ids,p_scheduled_for,'APPROVED',created_approval_id,
    jsonb_build_object('contentType',target_content_type,'caption',coalesce(target_payload->>'caption',''),'approvedVersion',p_content_version_id))
  on conflict(content_item_id,content_version_id) do update set
    instagram_account_id=excluded.instagram_account_id,media_asset_ids=excluded.media_asset_ids,scheduled_for=excluded.scheduled_for,
    status='APPROVED',approval_id=excluded.approval_id,publish_payload=excluded.publish_payload,last_error_code=null,last_error_message=null,updated_at=now()
  returning id into created_schedule_id;
  update public.content_items set status='APPROVED',scheduled_for=p_scheduled_for where id=p_content_item_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,subject_type,subject_id,metadata)
  values(target_workspace_id,(select auth.uid()),'instagram.publish.approved','post_schedule',created_schedule_id::text,jsonb_build_object('contentVersionId',p_content_version_id,'mediaCount',array_length(p_media_asset_ids,1)));
  return query select created_schedule_id,created_approval_id,'APPROVED'::text;
end;
$$;
revoke all on function public.approve_instagram_schedule_v1(uuid,uuid,timestamptz,uuid[],text) from public, anon;
grant execute on function public.approve_instagram_schedule_v1(uuid,uuid,timestamptz,uuid[],text) to authenticated;

create or replace function public.enqueue_instagram_publish_v1(p_schedule_id uuid)
returns table(job_id uuid, status text)
language plpgsql security definer set search_path = '' as $$
declare target_workspace_id uuid; target_version_id uuid; target_approval_version text; target_scheduled_for timestamptz; target_account_id uuid; created_job_id uuid; idempotency text;
begin
  select ps.workspace_id,ps.content_version_id,a.subject_version,ps.scheduled_for,ps.instagram_account_id
  into target_workspace_id,target_version_id,target_approval_version,target_scheduled_for,target_account_id
  from public.post_schedules ps join public.approvals a on a.id=ps.approval_id and a.decision='APPROVED'
  join public.instagram_accounts ia on ia.id=ps.instagram_account_id and ia.connection_status='CONNECTED' and ia.token_expires_at>now()
  join public.instagram_capabilities ic on ic.instagram_account_id=ia.id and ic.publishing=true
  where ps.id=p_schedule_id and ps.status in ('APPROVED','SCHEDULED','PUBLISH_FAILED');
  if target_workspace_id is null or not public.is_workspace_member(target_workspace_id) then raise exception 'approved_publish_schedule_required' using errcode = '42501'; end if;
  if target_approval_version<>target_version_id::text then raise exception 'approval_version_mismatch' using errcode = '22023'; end if;
  idempotency := 'instagram-publish:'||p_schedule_id::text||':'||target_version_id::text;
  insert into public.jobs(workspace_id,type,status,payload,progress,idempotency_key,scheduled_at)
  values(target_workspace_id,'INSTAGRAM_PUBLISH','QUEUED',jsonb_build_object('scheduleId',p_schedule_id,'contentVersionId',target_version_id,'instagramAccountId',target_account_id),jsonb_build_object('stage','SCHEDULED','percent',0),idempotency,greatest(target_scheduled_for,now()))
  on conflict(workspace_id,type,idempotency_key) do update set
    status=case when public.jobs.status in ('FAILED','CANCELLED') and public.jobs.attempts<public.jobs.max_attempts then 'QUEUED' else public.jobs.status end,
    scheduled_at=case when public.jobs.status in ('FAILED','CANCELLED') then greatest(target_scheduled_for,now()) else public.jobs.scheduled_at end,
    error_code=case when public.jobs.status in ('FAILED','CANCELLED') then null else public.jobs.error_code end,
    error_message=case when public.jobs.status in ('FAILED','CANCELLED') then null else public.jobs.error_message end
  returning id into created_job_id;
  update public.post_schedules set status='SCHEDULED',publish_job_id=created_job_id,
    meta_container_id=case when status='PUBLISH_FAILED' and external_media_id is null then null else meta_container_id end,
    updated_at=now() where id=p_schedule_id;
  update public.content_items ci set status='SCHEDULED' from public.post_schedules ps where ps.id=p_schedule_id and ci.id=ps.content_item_id;
  insert into public.audit_logs(workspace_id,actor_user_id,action,subject_type,subject_id,metadata)
  values(target_workspace_id,(select auth.uid()),'instagram.publish.queued','post_schedule',p_schedule_id::text,jsonb_build_object('jobId',created_job_id,'contentVersionId',target_version_id));
  return query select created_job_id,'QUEUED'::text;
end;
$$;
revoke all on function public.enqueue_instagram_publish_v1(uuid) from public, anon;
grant execute on function public.enqueue_instagram_publish_v1(uuid) to authenticated;

-- Tokens, approvals, publication records, and webhook payloads are server/RPC controlled.
revoke insert,update,delete on table public.instagram_accounts,public.instagram_capabilities,public.approvals,public.post_schedules,public.published_posts,public.insight_snapshots,public.account_insights from authenticated;
drop policy if exists instagram_accounts_insert on public.instagram_accounts;
drop policy if exists instagram_accounts_update on public.instagram_accounts;
drop policy if exists instagram_accounts_delete on public.instagram_accounts;
drop policy if exists instagram_capabilities_insert on public.instagram_capabilities;
drop policy if exists instagram_capabilities_update on public.instagram_capabilities;
drop policy if exists instagram_capabilities_delete on public.instagram_capabilities;
drop policy if exists approvals_insert on public.approvals;
drop policy if exists approvals_update on public.approvals;
drop policy if exists approvals_delete on public.approvals;
drop policy if exists post_schedules_insert on public.post_schedules;
drop policy if exists post_schedules_update on public.post_schedules;
drop policy if exists post_schedules_delete on public.post_schedules;
drop policy if exists published_posts_insert on public.published_posts;
drop policy if exists published_posts_update on public.published_posts;
drop policy if exists published_posts_delete on public.published_posts;
drop policy if exists insight_snapshots_insert on public.insight_snapshots;
drop policy if exists insight_snapshots_update on public.insight_snapshots;
drop policy if exists insight_snapshots_delete on public.insight_snapshots;
drop policy if exists account_insights_insert on public.account_insights;
drop policy if exists account_insights_update on public.account_insights;
drop policy if exists account_insights_delete on public.account_insights;
