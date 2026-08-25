// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildGrowthIntelligence, buildPeriodReview, measurementWindowFor, normalizeMetaInsightData, textSimilarity, type MeasuredPost } from "./growth-intelligence";

function post(index: number, overrides: Partial<MeasuredPost> = {}): MeasuredPost {
  return {
    id: `id-${index}`, externalMediaId: `media-${index}`, mediaProductType: "REELS", caption: `肩まわりセルフケア ${index}`,
    permalink: null, publishedAt: "2026-08-20T00:00:00.000Z", capturedAt: "2026-08-25T00:00:00.000Z", measurementWindow: "72H",
    metrics: { reach: 100, saved: 10, shares: 2, likes: 20, comments: 1, views: 150 }, ...overrides,
  };
}

describe("Phase 4 growth intelligence", () => {
  it("normalizes only allow-listed non-negative metrics", () => {
    expect(normalizeMetaInsightData({ data: [
      { name: "reach", total_value: { value: 123 } },
      { name: "saved", values: [{ value: 9 }] },
      { name: "secret", total_value: { value: 1000 } },
    ] })).toEqual({ reach: 123, saved: 9 });
  });

  it("assigns stable measurement windows", () => {
    const now = new Date("2026-08-25T00:00:00.000Z");
    expect(measurementWindowFor("2026-08-24T12:00:00.000Z", now)).toBe("EARLY");
    expect(measurementWindowFor("2026-08-23T12:00:00.000Z", now)).toBe("24H");
    expect(measurementWindowFor("2026-08-20T00:00:00.000Z", now)).toBe("72H");
    expect(measurementWindowFor("2026-08-01T00:00:00.000Z", now)).toBe("7D");
  });

  it("keeps small samples low-confidence and downstream attribution unknown", () => {
    const result = buildGrowthIntelligence([post(1), post(2), post(3)], [], new Date("2026-08-25T00:00:00.000Z"));
    expect(result.confidence).toBe("LOW");
    expect(result.funnel.find((stage) => stage.key === "followers")?.attribution).toBe("UNKNOWN");
    expect(result.funnel.find((stage) => stage.key === "booking")?.value).toBeNull();
    expect(result.recommendation.attribution).toBe("UNKNOWN");
  });

  it("proposes a one-variable test without claiming causality", () => {
    const result = buildGrowthIntelligence(Array.from({ length: 6 }, (_, index) => post(index)), [], new Date("2026-08-25T00:00:00.000Z"));
    expect(result.confidence).toBe("MEDIUM");
    expect(result.insight.whyItMayHaveHappened).toContain("原因とは断定できません");
    expect(result.experiment.variable).toBe("Hook");
    expect(result.experiment.minimumSampleSize).toBe(6);
  });

  it("detects substantially duplicated Japanese captions", () => {
    expect(textSimilarity("肩こりが気になる日に試すセルフケアです", "肩こりが気になる日に試すセルフケアです。保存してね")).toBeGreaterThan(.62);
    expect(textSimilarity("肩のセルフケア", "店舗のお知らせ")).toBeLessThan(.62);
  });

  it("creates weekly and monthly reviews from real posts only", () => {
    const posts = [post(1, { publishedAt: "2026-08-24T00:00:00.000Z" })];
    expect(buildPeriodReview(posts, "WEEKLY", new Date("2026-08-25T00:00:00.000Z")).sampleSize).toBe(1);
    expect(buildPeriodReview(posts, "MONTHLY", new Date("2026-08-25T00:00:00.000Z")).results.reach).toBe(100);
  });
});
