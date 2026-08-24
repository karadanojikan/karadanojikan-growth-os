-- Karada no Jikan Growth OS — Phase 0 schema.
-- Apply through a reviewed Supabase migration. Never run destructively in production.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(), name text not null,
  monthly_ai_budget_micros bigint not null default 50000000 check (monthly_ai_budget_micros >= 0),
  auto_publish boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','viewer')),
  created_at timestamptz not null default now(), primary key (workspace_id,user_id)
);
create table public.instagram_accounts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  external_account_id text, username text, connection_status text not null default 'DISCONNECTED',
  token_ciphertext text, token_expires_at timestamptz, last_verified_at timestamptz,
  created_at timestamptz not null default now(), unique(workspace_id,external_account_id)
);
create table public.instagram_capabilities (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  api_version text, publishing boolean not null default false, reels boolean not null default false,
  carousel boolean not null default false, stories boolean not null default false, insights boolean not null default false,
  messaging boolean not null default false, comments boolean not null default false, webhooks boolean not null default false,
  verified_at timestamptz not null default now(), unique(instagram_account_id)
);
create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  concept text not null, audience text not null, tone jsonb not null default '[]', forbidden_claims jsonb not null default '[]',
  terminology jsonb not null default '{}', colors jsonb not null default '{}', fonts jsonb not null default '{}',
  posting_ratios jsonb not null default '{"GROWTH":0.6,"TRUST":0.2,"LIFESTYLE":0.1,"CONVERSION":0.1}',
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.brand_facts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_profile_id uuid not null references public.brand_profiles(id) on delete cascade, fact_key text not null, fact_value text,
  status text not null default 'UNKNOWN' check(status in ('UNKNOWN','DRAFT','APPROVED','REJECTED')),
  approved_by uuid references auth.users(id), approved_at timestamptz, unique(brand_profile_id,fact_key)
);
create table public.approved_claims (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  wording text not null, context text, status text not null default 'DRAFT' check(status in ('DRAFT','APPROVED','RETIRED')),
  approved_by uuid references auth.users(id), approved_at timestamptz, created_at timestamptz not null default now()
);
create table public.content_ideas (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid references public.instagram_accounts(id) on delete set null, title text not null, topic text not null,
  objective text not null check(objective in ('GROWTH','TRUST','LIFESTYLE','CONVERSION')), source text, created_at timestamptz not null default now()
);
create table public.content_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid references public.instagram_accounts(id) on delete set null, content_type text not null,
  objective text not null check(objective in ('GROWTH','TRUST','LIFESTYLE','CONVERSION')), topic text not null,
  status text not null default 'DRAFT', current_version_id uuid, scheduled_for timestamptz,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.content_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade, version integer not null,
  payload jsonb not null, prompt_version_id uuid, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  unique(content_item_id,version)
);
alter table public.content_items add constraint content_items_current_version_fk foreign key(current_version_id) references public.content_versions(id) on delete set null;
create table public.content_series (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null, description text, created_at timestamptz not null default now()
);
create table public.series_items (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  series_id uuid not null references public.content_series(id) on delete cascade, content_item_id uuid references public.content_items(id) on delete set null,
  position integer not null, status text not null default 'IDEA', unique(series_id,position)
);
create table public.media_assets (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  storage_key text not null, original_filename text not null, media_type text not null, byte_size bigint not null check(byte_size >= 0),
  checksum_sha256 text, metadata jsonb not null default '{}', is_customer_media boolean not null default false,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(workspace_id,storage_key)
);
create table public.media_asset_rights (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  consent_status text not null default 'unknown' check(consent_status in ('unknown','requested','approved','rejected','expired')),
  approved_platforms text[] not null default '{}', approved_usage text[] not null default '{}', music_license_status text,
  consent_date date, expires_at timestamptz, notes text, updated_at timestamptz not null default now(), unique(media_asset_id)
);
create table public.transcripts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade, words jsonb not null, provider text not null,
  created_at timestamptz not null default now()
);
create table public.video_projects (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete set null, style text not null default 'EDUCATIONAL',
  status text not null default 'QUEUED', current_edl_id uuid, created_at timestamptz not null default now()
);
create table public.video_edls (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  video_project_id uuid not null references public.video_projects(id) on delete cascade, version integer not null, payload jsonb not null,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), unique(video_project_id,version)
);
alter table public.video_projects add constraint video_projects_current_edl_fk foreign key(current_edl_id) references public.video_edls(id) on delete set null;
create table public.jobs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null, status text not null default 'QUEUED' check(status in ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  payload jsonb not null default '{}', progress jsonb not null default '{}', attempts integer not null default 0,
  max_attempts integer not null default 5, scheduled_at timestamptz not null default now(), started_at timestamptz,
  completed_at timestamptz, lease_expires_at timestamptz, error_code text, error_message text, idempotency_key text not null,
  created_at timestamptz not null default now(), unique(workspace_id,type,idempotency_key)
);
create table public.render_jobs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  video_project_id uuid not null references public.video_projects(id) on delete cascade, video_edl_id uuid not null references public.video_edls(id),
  job_id uuid not null references public.jobs(id), provider text not null, status text not null default 'QUEUED', created_at timestamptz not null default now()
);
create table public.render_outputs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  render_job_id uuid not null references public.render_jobs(id) on delete cascade, storage_key text not null, qc_result jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.post_schedules (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade, content_version_id uuid not null references public.content_versions(id),
  scheduled_for timestamptz not null, status text not null default 'READY_FOR_REVIEW', approval_id uuid, created_at timestamptz not null default now()
);
create table public.approvals (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_type text not null, subject_id uuid not null, subject_version text not null, decision text not null check(decision in ('APPROVED','REJECTED')),
  decided_by uuid not null references auth.users(id), decided_at timestamptz not null default now(), notes text
);
alter table public.post_schedules add constraint post_schedules_approval_fk foreign key(approval_id) references public.approvals(id);
create table public.published_posts (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id), content_item_id uuid not null references public.content_items(id),
  external_media_id text not null, permalink text, published_at timestamptz not null, unique(instagram_account_id,external_media_id)
);
create table public.insight_snapshots (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  published_post_id uuid not null references public.published_posts(id) on delete cascade, measurement_window text not null,
  metrics jsonb not null, attribution text not null check(attribution in ('DIRECT','ACCOUNT_LEVEL','ESTIMATED','UNKNOWN')),
  captured_at timestamptz not null default now(), unique(published_post_id,measurement_window)
);
create table public.account_insights (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id), metrics jsonb not null, captured_at timestamptz not null default now()
);
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  feature text not null, model_route text not null, resolved_model text not null, prompt_version text not null, request_id text not null,
  status text not null, started_at timestamptz not null default now(), completed_at timestamptz, error_code text, unique(workspace_id,request_id)
);
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  ai_run_id uuid not null references public.ai_runs(id) on delete cascade, input_tokens bigint not null default 0,
  cached_input_tokens bigint not null default 0, output_tokens bigint not null default 0, estimated_cost_micros bigint not null default 0,
  currency text not null default 'USD', recorded_at timestamptz not null default now()
);
create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, version integer not null, template_hash text not null, metadata jsonb not null default '{}', created_at timestamptz not null default now(), unique(workspace_id,name,version)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id), kind text not null, title text not null, action_url text, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid references public.workspaces(id) on delete cascade,
  provider text not null, external_event_id text not null, payload_hash text not null, status text not null default 'RECEIVED',
  received_at timestamptz not null default now(), processed_at timestamptz, unique(provider,external_event_id)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id), action text not null, subject_type text not null, subject_id text not null,
  metadata jsonb not null default '{}', occurred_at timestamptz not null default now()
);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workspace_members wm where wm.workspace_id = target_workspace_id and wm.user_id = (select auth.uid()));
$$;
revoke all on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
revoke all on table public.profiles, public.workspaces, public.workspace_members from anon, authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,update on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy workspaces_select on public.workspaces for select to authenticated using (public.is_workspace_member(id));
create policy workspaces_update on public.workspaces for update to authenticated using (public.is_workspace_member(id)) with check (public.is_workspace_member(id));
create policy members_select on public.workspace_members for select to authenticated using (public.is_workspace_member(workspace_id));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'instagram_accounts','instagram_capabilities','brand_profiles','brand_facts','approved_claims','content_ideas',
    'content_items','content_versions','content_series','series_items','media_assets','media_asset_rights','transcripts',
    'video_projects','video_edls','jobs','render_jobs','render_outputs','post_schedules','approvals','published_posts',
    'insight_snapshots','account_insights','ai_runs','ai_usage','prompt_versions','notifications','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select,insert,update,delete on table public.%I to authenticated', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))', table_name || '_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_workspace_member(workspace_id))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_workspace_member(workspace_id))', table_name || '_delete', table_name);
  end loop;
end $$;

-- Append-only and audit tables are readable through RLS but cannot be mutated directly by browser clients.
revoke insert, update, delete on table public.audit_logs from authenticated;
drop policy if exists audit_logs_insert on public.audit_logs;
drop policy if exists audit_logs_update on public.audit_logs;
drop policy if exists audit_logs_delete on public.audit_logs;
revoke insert, update, delete on table public.content_versions, public.video_edls, public.prompt_versions, public.ai_usage from authenticated;
drop policy if exists content_versions_insert on public.content_versions;
drop policy if exists content_versions_update on public.content_versions;
drop policy if exists content_versions_delete on public.content_versions;
drop policy if exists video_edls_insert on public.video_edls;
drop policy if exists video_edls_update on public.video_edls;
drop policy if exists video_edls_delete on public.video_edls;
drop policy if exists prompt_versions_insert on public.prompt_versions;
drop policy if exists prompt_versions_update on public.prompt_versions;
drop policy if exists prompt_versions_delete on public.prompt_versions;
drop policy if exists ai_usage_insert on public.ai_usage;
drop policy if exists ai_usage_update on public.ai_usage;
drop policy if exists ai_usage_delete on public.ai_usage;

alter table public.webhook_events enable row level security;
revoke all on table public.webhook_events from anon, authenticated;
-- Webhooks are service-role-only. Workspace members read operational summaries through a safe server endpoint.

create index jobs_claim_idx on public.jobs(status,scheduled_at,lease_expires_at);
create index content_items_workspace_status_idx on public.content_items(workspace_id,status,scheduled_for);
create index media_assets_workspace_created_idx on public.media_assets(workspace_id,created_at desc);
create index insights_post_captured_idx on public.insight_snapshots(published_post_id,captured_at desc);
create index audit_workspace_time_idx on public.audit_logs(workspace_id,occurred_at desc);
