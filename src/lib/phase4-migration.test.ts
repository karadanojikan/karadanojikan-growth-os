// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../../supabase/migrations/202608250001_phase4_growth_intelligence.sql", import.meta.url), "utf8");
const serviceGrantSql = readFileSync(new URL("../../supabase/migrations/202608250002_phase4_service_role_grants.sql", import.meta.url), "utf8");

describe("Phase 4 growth intelligence migration", () => {
  it("enables RLS and grants browser clients read-only access", () => {
    for (const table of ["instagram_media", "media_insight_snapshots", "instagram_insight_sync_runs", "growth_reviews", "growth_experiments", "growth_recommendations"]) expect(sql).toContain(`'${table}'`);
    expect(sql).toContain("alter table public.%I enable row level security");
    expect(sql).toContain("grant select on table public.%I to authenticated");
    expect(sql).not.toContain("grant insert on table public.%I to authenticated");
    expect(sql).toContain("grant select,insert,update,delete on table public.%I to service_role");
    expect(serviceGrantSql).toContain("grant select,insert,update,delete on table public.%I to service_role");
  });
  it("keeps recommendations and experiments human-governed", () => {
    expect(sql).toContain("status in ('PROPOSED','APPROVED','RUNNING','COMPLETED','REJECTED','ARCHIVED')");
    expect(sql).toContain("Approval never authorizes publishing");
    expect(sql).toContain("No automatic execution path exists");
  });
  it("uses explicit attribution labels", () => { expect(sql.match(/'DIRECT','ACCOUNT_LEVEL','ESTIMATED','UNKNOWN'/g)?.length).toBeGreaterThanOrEqual(2); });
});
