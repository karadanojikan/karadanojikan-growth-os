import { describe, expect, it } from "vitest";
import { budgetState, chooseObjective, estimateTokenCostMicros, insightConfidence, ReelsPlanSchema, VideoEdlSchema } from "./domain";
import { demoPlan } from "./mock-data";

describe("content strategy", () => {
  it("prioritizes growth for an empty history", () => expect(chooseObjective([])).toBe("GROWTH"));
  it("fills the largest objective ratio gap", () => expect(chooseObjective([
    { objective: "GROWTH", topic: "a", hook: "a", publishedAt: "2026-01-01" },
    { objective: "GROWTH", topic: "b", hook: "b", publishedAt: "2026-01-02" },
    { objective: "TRUST", topic: "c", hook: "c", publishedAt: "2026-01-03" },
  ])).toBe("LIFESTYLE"));
  it("does not overstate small samples", () => { expect(insightConfidence(3)).toBe("LOW"); expect(insightConfidence(8)).toBe("MEDIUM"); expect(insightConfidence(12)).toBe("HIGH"); });
});

describe("validated contracts", () => {
  it("accepts the deterministic demo plan", () => expect(ReelsPlanSchema.safeParse(demoPlan).success).toBe(true));
  it("rejects destructive time inversions in EDL", () => expect(VideoEdlSchema.safeParse({ version: 1, clips: [{ assetId: "a", sourceStart: 3, sourceEnd: 2, timelineStart: 0, crop: "FIT", zoom: 1 }] }).success).toBe(false));
});

describe("cost guard", () => {
  it("calculates integer micros", () => expect(estimateTokenCostMicros(1_000_000, 500_000, 2_000_000, 8_000_000)).toBe(6_000_000));
  it("warns and blocks at policy boundaries", () => { expect(budgetState(79,100)).toBe("OK"); expect(budgetState(80,100)).toBe("WARNING"); expect(budgetState(100,100)).toBe("BLOCKED"); });
});
