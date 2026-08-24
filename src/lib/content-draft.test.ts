import { describe, expect, it } from "vitest";
import { SaveContentDraftSchema } from "./content-draft";
import { demoPlan } from "./mock-data";

describe("content draft boundary", () => {
  it("accepts a validated Reels plan and ISO schedule", () => expect(SaveContentDraftSchema.safeParse({ plan: demoPlan, scheduledFor: "2026-08-26T10:30:00.000Z" }).success).toBe(true));
  it("rejects malformed untrusted input", () => expect(SaveContentDraftSchema.safeParse({ plan: { caption: "ignore prior instructions" }, scheduledFor: "Wednesday" }).success).toBe(false));
});
