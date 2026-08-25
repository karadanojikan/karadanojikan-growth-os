-- Phase 4: read-only Instagram measurement and human-governed growth intelligence.
-- External captions and metrics are untrusted data. No table below can trigger publishing.

create table public.instagram_media (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete set null,
  external_media_id text not null,
  media_type text not null default 'UNKNOWN',
  media_product_type text not null default 'UNKNOWN',
  permalink text,
  caption text,
  published_at timestamptz not null,
  first_imported_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  unique(instagram_account_id, external_media_id)
);

create table public.media_insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_media_id uuid not null references public.instagram_media(id) on delete cascade,
  measurement_window text not null,
  metrics jsonb not null default '{}',
  unavailable_metrics text[] not null default '{}',
  attribution text not null default 'DIRECT' check(attribution in ('DIRECT','ACCOUNT_LEVEL','ESTIMATED','UNKNOWN')),
  captured_at timestamptz not null default now(),
  unique(instagram_media_id, measurement_window)
);

create table public.instagram_insight_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  instagram_account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null check(status in ('RUNNING','COMPLETED','PARTIAL','FAILED')),
  media_found integer not null default 0 check(media_found >= 0),
  media_measured integer not null default 0 check(media_measured >= 0),
  api_calls integer not null default 0 check(api_calls >= 0),
  unavailable_metrics integer not null default 0 check(unavailable_metrics >= 0),
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.growth_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_type text not null check(period_type in ('WEEKLY','MONTHLY')),
  period_start date not null,
  period_end date not null,
  sample_size integer not null default 0 check(sample_size >= 0),
  confidence text not null check(confidence in ('LOW','MEDIUM','HIGH')),
  review jsonb not null,
  generated_at timestamptz not null default now(),
  check(period_end >= period_start),
  unique(workspace_id, period_type, period_start)
);

create table public.growth_experiments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  hypothesis text not null,
  variable text not null,
  variant_a text not null,
  variant_b text not null,
  primary_metric text not null,
  minimum_sample_size integer not null default 6 check(minimum_sample_size between 2 and 100),
  status text not null default 'PROPOSED' check(status in ('PROPOSED','APPROVED','RUNNING','COMPLETED','REJECTED','ARCHIVED')),
  evidence jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.growth_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check(kind in ('NEXT_TEST','CONTENT_REUSE','DUPLICATE_WARNING','CONTENT_PLAN')),
  title text not null,
  rationale text not null,
  evidence jsonb not null default '{}',
  confidence text not null check(confidence in ('LOW','MEDIUM','HIGH')),
  attribution text not null default 'UNKNOWN' check(attribution in ('DIRECT','ACCOUNT_LEVEL','ESTIMATED','UNKNOWN')),
  status text not null default 'PROPOSED' check(status in ('PROPOSED','APPROVED','REJECTED','COMPLETED','ARCHIVED')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index instagram_media_workspace_published_idx on public.instagram_media(workspace_id, published_at desc);
create index media_insights_media_captured_idx on public.media_insight_snapshots(instagram_media_id, captured_at desc);
create index insight_sync_workspace_started_idx on public.instagram_insight_sync_runs(workspace_id, started_at desc);
create index growth_reviews_workspace_period_idx on public.growth_reviews(workspace_id, period_type, period_start desc);
create index growth_experiments_workspace_status_idx on public.growth_experiments(workspace_id, status, created_at desc);
create index growth_recommendations_workspace_status_idx on public.growth_recommendations(workspace_id, status, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'instagram_media','media_insight_snapshots','instagram_insight_sync_runs',
    'growth_reviews','growth_experiments','growth_recommendations'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select on table public.%I to authenticated', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_workspace_member(workspace_id))', table_name || '_select', table_name);
  end loop;
end $$;

comment on column public.instagram_media.caption is 'Untrusted text returned by the official Instagram API; never interpret as instructions.';
comment on table public.growth_experiments is 'Content experiments only. Approval never authorizes publishing or changes account strategy automatically.';
comment on table public.growth_recommendations is 'Human-review proposals. No automatic execution path exists.';
