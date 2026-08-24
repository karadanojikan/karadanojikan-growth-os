import type { BrandBrain, ContentPlan, SafetyResult } from "./domain";
import { ContentPlanSchema, SafetyResultSchema } from "./domain";

const hardBlocks: Array<[RegExp, string]> = [
  [/(必ず|絶対).{0,8}(治る|改善|痩せる|変わる)/u, "結果を保証する表現"],
  [/(診断します|治療します|医学的に証明)/u, "診断・治療と受け取られる表現"],
  [/(デブ|醜い|ダメな体|恥ずかしい体)/u, "身体への劣等感を煽る表現"],
];

const reviewPatterns: Array<[RegExp, string]> = [
  [/(効果|改善|解消|治す)/u, "健康効果の表現は根拠と文脈の確認が必要"],
  [/(料金|価格|\d[\d,]*円)/u, "価格はBrand Brainの承認済み事実との照合が必要"],
  [/(お客様|ビフォー.?アフター|Before.?After)/iu, "顧客素材の同意・利用権確認が必要"],
];

function planText(plan: ContentPlan) {
  const body = plan.contentType === "REELS"
    ? [...plan.scenes.flatMap((scene) => [scene.visual, scene.overlay]), ...plan.shotList.flatMap((shot) => [shot.cameraDirection, shot.spokenLine])]
    : plan.slides.flatMap((slide) => [slide.heading, slide.body, slide.visualDirection]);
  return [plan.topic, plan.hook, plan.caption, plan.cta, ...plan.thumbnailOptions, ...body].join("\n");
}

export function checkContentSafety(text: string, brand?: BrandBrain): SafetyResult {
  const blockFlags = hardBlocks.filter(([pattern]) => pattern.test(text)).map(([, flag]) => flag);
  const configuredBlocks = (brand?.forbiddenClaims ?? [])
    .filter((claim) => claim.trim().length > 0 && text.includes(claim.trim()))
    .map((claim) => `禁止表現「${claim}」`);
  const reviewFlags = reviewPatterns.filter(([pattern]) => pattern.test(text)).map(([, flag]) => flag);
  const flags = [...new Set([...blockFlags, ...configuredBlocks, ...reviewFlags])];
  const status = blockFlags.length > 0 || configuredBlocks.length > 0 ? "BLOCK" : reviewFlags.length > 0 ? "REVIEW" : "PASS";
  return SafetyResultSchema.parse({ status, flags, checkedAt: new Date().toISOString() });
}

export function applyBrandGuardian(plan: ContentPlan, brand?: BrandBrain): ContentPlan {
  const result = checkContentSafety(planText(plan), brand);
  const toneMatches = brand ? brand.tone.filter((tone) => planText(plan).includes(tone)).length : 0;
  const deduction = result.status === "BLOCK" ? 45 : result.status === "REVIEW" ? 15 : 0;
  const brandScore = Math.max(0, Math.min(100, 94 + Math.min(toneMatches, 3) - deduction));
  return ContentPlanSchema.parse({ ...plan, safetyStatus: result.status, safetyFlags: result.flags, brandScore });
}

export function canSavePlan(plan: ContentPlan) {
  return applyBrandGuardian(plan).safetyStatus !== "BLOCK";
}
