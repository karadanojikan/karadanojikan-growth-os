import { describe, expect, it } from "vitest";
import { ContentPlanSchema } from "./domain";
import { defaultBrandBrain } from "./brand-brain";
import { orchestrateContent, regeneratePlanSection } from "./orchestrator";

describe("Phase 1 orchestrator", () => {
  it.each(["REELS", "CAROUSEL"] as const)("returns a validated %s contract without an external call", (contentType) => {
    const result = orchestrateContent({ contentType }, defaultBrandBrain);
    expect(ContentPlanSchema.safeParse(result.plan).success).toBe(true);
    expect(result.externalCall).toBe(false);
    expect(result.provider).toBe("DETERMINISTIC_PHASE1");
  });
  it("creates a new retrievable version during regeneration", () => {
    const first = orchestrateContent({ contentType: "REELS" }, defaultBrandBrain).plan;
    const second = regeneratePlanSection(first, "HOOK", defaultBrandBrain);
    expect(second.version).toBe(first.version + 1);
    expect(second.hook).not.toBe(first.hook);
    expect(first.version).toBe(1);
  });
});
