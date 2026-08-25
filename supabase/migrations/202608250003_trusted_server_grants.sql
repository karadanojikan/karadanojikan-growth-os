-- The service role is server-only and needs explicit privileges because the
-- foundation migration revoked defaults. Browser roles receive no new grants.

grant select,insert,update,delete on table
  public.instagram_accounts,
  public.instagram_capabilities,
  public.jobs,
  public.post_schedules,
  public.notifications,
  public.approvals,
  public.content_versions,
  public.media_assets,
  public.published_posts,
  public.content_items,
  public.audit_logs,
  public.webhook_events,
  public.insight_snapshots,
  public.account_insights
to service_role;
