import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 3 Instagram migration", () => {
  const sql = readFileSync(resolve("supabase/migrations/202608240007_phase3_instagram.sql"), "utf8");

  it("removes direct browser writes to tokens and approval/publication records", () => {
    expect(sql).toContain("revoke insert,update,delete on table public.instagram_accounts");
    expect(sql).toContain("public.approvals,public.post_schedules,public.published_posts");
  });

  it("binds approval and idempotency to the exact content version", () => {
    expect(sql).toContain("ci.current_version_id=p_content_version_id");
    expect(sql).toContain("target_approval_version<>target_version_id::text");
    expect(sql).toContain("'instagram-publish:'||p_schedule_id::text||':'||target_version_id::text");
  });

  it("checks customer media rights before approval", () => {
    expect(sql).toContain("mar.consent_status<>'approved'");
    expect(sql).toContain("'instagram'=any(mar.approved_platforms)");
    expect(sql).toContain("music_license_status,'unknown') not in ('not_applicable','approved')");
  });
});
