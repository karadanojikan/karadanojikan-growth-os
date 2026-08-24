import { describe, expect, it } from "vitest";
import { applyBrandGuardian, checkContentSafety } from "./brand-guardian";
import { defaultBrandBrain } from "./brand-brain";
import { demoPlan } from "./mock-data";

describe("Brand Guardian", () => {
  it("passes gentle, non-diagnostic copy", () => expect(applyBrandGuardian(demoPlan, defaultBrandBrain).safetyStatus).toBe("PASS"));
  it("blocks guaranteed health outcomes", () => expect(checkContentSafety("この方法で絶対改善します").status).toBe("BLOCK"));
  it("blocks configured forbidden claims", () => expect(checkContentSafety(`投稿に${defaultBrandBrain.forbiddenClaims[0]}と書く`, defaultBrandBrain).status).toBe("BLOCK"));
  it("requires review for prices and customer media", () => expect(checkContentSafety("お客様のBefore/After 5,000円").status).toBe("REVIEW"));
});
