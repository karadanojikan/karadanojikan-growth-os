-- Production follow-up: trusted server operations need explicit table privileges.
-- RLS remains enabled; browser roles remain select-only.

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'instagram_media','media_insight_snapshots','instagram_insight_sync_runs',
    'growth_reviews','growth_experiments','growth_recommendations'
  ] loop
    execute format('grant select,insert,update,delete on table public.%I to service_role', table_name);
  end loop;
end $$;
