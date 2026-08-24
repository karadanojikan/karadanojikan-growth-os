import { z } from "zod";

export const ObjectiveSchema = z.enum(["GROWTH", "TRUST", "LIFESTYLE", "CONVERSION"]);
export const ConfidenceSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const SafetyStatusSchema = z.enum(["PASS", "REVIEW", "BLOCK"]);
export const ContentTypeSchema = z.enum(["REELS", "CAROUSEL"]);

export const ShotSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  durationSeconds: z.number().positive().max(60),
  cameraDirection: z.string().min(1),
  spokenLine: z.string(),
  reference: z.string().optional(),
});

export const SceneSchema = z.object({
  id: z.string(),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  visual: z.string().min(1),
  overlay: z.string().max(42),
}).refine((v) => v.endSeconds > v.startSeconds, "Scene end must follow start");

export const ReelsPlanSchema = z.object({
  contentType: z.literal("REELS").default("REELS"),
  id: z.string(),
  version: z.number().int().positive(),
  objective: ObjectiveSchema,
  topic: z.string().min(1),
  hook: z.string().min(1).max(42),
  targetDurationSeconds: z.number().min(10).max(90),
  scenes: z.array(SceneSchema).min(2).max(12),
  shotList: z.array(ShotSchema).min(1).max(12),
  thumbnailOptions: z.array(z.string().max(24)).min(1).max(4),
  caption: z.string().min(1).max(2200),
  cta: z.string().min(1).max(120),
  safetyStatus: SafetyStatusSchema,
  safetyFlags: z.array(z.string()),
  brandScore: z.number().min(0).max(100),
  confidence: ConfidenceSchema,
  sourceFactIds: z.array(z.string()),
});
export type ReelsPlan = z.infer<typeof ReelsPlanSchema>;

export const CarouselSlideSchema = z.object({
  id: z.string(),
  position: z.number().int().positive().max(12),
  heading: z.string().min(1).max(42),
  body: z.string().min(1).max(180),
  visualDirection: z.string().min(1).max(120),
});

export const CarouselPlanSchema = z.object({
  contentType: z.literal("CAROUSEL"),
  id: z.string(),
  version: z.number().int().positive(),
  objective: ObjectiveSchema,
  topic: z.string().min(1),
  hook: z.string().min(1).max(42),
  slides: z.array(CarouselSlideSchema).min(3).max(12),
  thumbnailOptions: z.array(z.string().max(24)).min(1).max(4),
  caption: z.string().min(1).max(2200),
  cta: z.string().min(1).max(120),
  safetyStatus: SafetyStatusSchema,
  safetyFlags: z.array(z.string()),
  brandScore: z.number().min(0).max(100),
  confidence: ConfidenceSchema,
  sourceFactIds: z.array(z.string()),
});
export type CarouselPlan = z.infer<typeof CarouselPlanSchema>;

export const ContentPlanSchema = z.discriminatedUnion("contentType", [ReelsPlanSchema, CarouselPlanSchema]);
export type ContentPlan = z.infer<typeof ContentPlanSchema>;

export const BrandBrainSchema = z.object({
  concept: z.string().min(1).max(500),
  audience: z.string().min(1).max(300),
  tone: z.array(z.string().min(1).max(40)).min(1).max(12),
  services: z.array(z.string().min(1).max(120)).max(20),
  location: z.string().max(160),
  reservationFlow: z.string().max(500),
  approvedClaims: z.array(z.string().min(1).max(300)).max(30),
  forbiddenClaims: z.array(z.string().min(1).max(200)).min(1).max(30),
  terminology: z.record(z.string(), z.string()),
  colors: z.array(z.string().min(1).max(40)).max(12),
  fonts: z.array(z.string().min(1).max(80)).max(12),
  ctaStyle: z.string().max(300),
  postingRatios: z.object({
    GROWTH: z.number().min(0).max(1),
    TRUST: z.number().min(0).max(1),
    LIFESTYLE: z.number().min(0).max(1),
    CONVERSION: z.number().min(0).max(1),
  }).refine((value) => Math.abs(Object.values(value).reduce((sum, ratio) => sum + ratio, 0) - 1) < 0.001, "Posting ratios must total 1"),
  contentThemes: z.array(z.string().min(1).max(80)).min(1).max(30),
  unknownFacts: z.array(z.string().min(1).max(120)).max(30),
  version: z.number().int().positive(),
});
export type BrandBrain = z.infer<typeof BrandBrainSchema>;

export const SafetyResultSchema = z.object({
  status: SafetyStatusSchema,
  flags: z.array(z.string()),
  checkedAt: z.string().datetime(),
});
export type SafetyResult = z.infer<typeof SafetyResultSchema>;

export const InstagramCapabilitiesSchema = z.object({
  publishing: z.boolean(), reels: z.boolean(), carousel: z.boolean(), stories: z.boolean(),
  insights: z.boolean(), messaging: z.boolean(), comments: z.boolean(), webhooks: z.boolean(),
  verifiedAt: z.string().datetime().nullable(), apiVersion: z.string().nullable(),
});

export const EdlClipSchema = z.object({
  assetId: z.string(), sourceStart: z.number().nonnegative(), sourceEnd: z.number().positive(),
  timelineStart: z.number().nonnegative(), crop: z.enum(["FIT", "FILL", "CUSTOM"]), zoom: z.number().min(1).max(3),
}).refine((v) => v.sourceEnd > v.sourceStart, "Clip end must follow start");

export const VideoEdlSchema = z.object({ version: z.number().int().positive(), clips: z.array(EdlClipSchema).min(1) });

export type ContentSummary = { objective: z.infer<typeof ObjectiveSchema>; topic: string; hook: string; publishedAt: string };
export type InsightSummary = { theme: string; saveRate: number; accountAverageSaveRate: number; sampleSize: number };

export function chooseObjective(items: ContentSummary[]): z.infer<typeof ObjectiveSchema> {
  const target = { GROWTH: .6, TRUST: .2, LIFESTYLE: .1, CONVERSION: .1 } as const;
  if (items.length === 0) return "GROWTH";
  const counts = { GROWTH: 0, TRUST: 0, LIFESTYLE: 0, CONVERSION: 0 };
  items.forEach((item) => { counts[item.objective] += 1; });
  return (Object.keys(target) as Array<keyof typeof target>)
    .map((key) => ({ key, gap: target[key] - counts[key] / items.length }))
    .sort((a, b) => b.gap - a.gap)[0]?.key ?? "GROWTH";
}

export function insightConfidence(sampleSize: number): z.infer<typeof ConfidenceSchema> {
  if (sampleSize >= 12) return "HIGH";
  if (sampleSize >= 6) return "MEDIUM";
  return "LOW";
}

export function estimateTokenCostMicros(inputTokens: number, outputTokens: number, inputPerMillionMicros: number, outputPerMillionMicros: number) {
  if ([inputTokens, outputTokens, inputPerMillionMicros, outputPerMillionMicros].some((n) => !Number.isFinite(n) || n < 0)) throw new Error("Cost inputs must be finite and non-negative");
  return Math.round((inputTokens * inputPerMillionMicros + outputTokens * outputPerMillionMicros) / 1_000_000);
}

export function budgetState(spentMicros: number, budgetMicros: number) {
  if (budgetMicros <= 0) return "BLOCKED" as const;
  const ratio = spentMicros / budgetMicros;
  if (ratio >= 1) return "BLOCKED" as const;
  if (ratio >= .8) return "WARNING" as const;
  return "OK" as const;
}
