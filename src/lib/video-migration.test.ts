import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 2 video migration", () => {
  it("targets the render job constraint without colliding with the job_id output parameter", () => {
    const sql = readFileSync(resolve("supabase/migrations/202608240006_fix_video_render_enqueue.sql"), "utf8");

    expect(sql).toContain("on conflict on constraint render_jobs_job_unique");
    expect(sql).not.toMatch(/on conflict\s*\(job_id\)/i);
  });
});
