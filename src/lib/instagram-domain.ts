import { z } from "zod";

export const META_API_VERSION = "v26.0";
export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
  "instagram_business_manage_insights",
  "instagram_business_manage_messages",
] as const;

export const InstagramScopeSchema = z.enum(INSTAGRAM_SCOPES);
export const InstagramAccountTypeSchema = z.enum(["BUSINESS", "MEDIA_CREATOR"]);
export const InstagramConnectionStatusSchema = z.enum([
  "DISCONNECTED", "CONNECTED", "EXPIRED", "RECONNECT_REQUIRED", "ERROR",
]);
export const PublishStateSchema = z.enum([
  "DRAFT", "MEDIA_READY", "READY_FOR_REVIEW", "APPROVED", "SCHEDULED",
  "PUBLISHING", "PUBLISHED", "ANALYZING", "ANALYZED", "PUBLISH_FAILED",
]);
export const MetaContainerStatusSchema = z.enum(["EXPIRED", "ERROR", "FINISHED", "IN_PROGRESS", "PUBLISHED"]);

export const InstagramCapabilitiesSchema = z.object({
  publishing: z.boolean(),
  reels: z.boolean(),
  carousel: z.boolean(),
  stories: z.boolean(),
  insights: z.boolean(),
  messaging: z.boolean(),
  comments: z.boolean(),
  webhooks: z.boolean(),
  verifiedAt: z.string().datetime().nullable(),
  apiVersion: z.string().nullable(),
  reasons: z.record(z.string(), z.string()),
});
export type InstagramCapabilities = z.infer<typeof InstagramCapabilitiesSchema>;

export function deriveInstagramCapabilities(input: {
  grantedPermissions: string[];
  accountType: string | null;
  tokenExpiresAt: string | null;
  verifiedAt: string | null;
  apiVersion?: string | null;
  webhookConfigured?: boolean;
  now?: Date;
}): InstagramCapabilities {
  const granted = new Set(input.grantedPermissions);
  const now = input.now ?? new Date();
  const professional = input.accountType === "BUSINESS" || input.accountType === "MEDIA_CREATOR";
  const tokenValid = Boolean(input.tokenExpiresAt && new Date(input.tokenExpiresAt) > now);
  const basic = professional && tokenValid && granted.has("instagram_business_basic");
  const publish = basic && granted.has("instagram_business_content_publish");
  const comments = basic && granted.has("instagram_business_manage_comments");
  const insights = basic && granted.has("instagram_business_manage_insights");
  const messagingPermission = basic && granted.has("instagram_business_manage_messages");
  const reasons: Record<string, string> = {};
  if (!professional) reasons.account = "Instagramプロアカウント(BusinessまたはCreator)が必要です。";
  if (!tokenValid) reasons.token = "トークンが未設定または期限切れです。";
  if (!granted.has("instagram_business_content_publish")) reasons.publishing = "投稿権限が許可されていません。";
  if (!granted.has("instagram_business_manage_comments")) reasons.comments = "コメント管理権限が許可されていません。";
  if (!granted.has("instagram_business_manage_insights")) reasons.insights = "インサイト権限が許可されていません。";
  if (!granted.has("instagram_business_manage_messages")) reasons.messaging = "メッセージ管理権限が許可されていません。";
  else if (messagingPermission) reasons.messaging = "DM送信はPhase 5の人間承認フローが完了するまでOFFです。";
  reasons.stories = "Stories投稿は現在の版固定承認フローが未対応のためOFFです。";
  if (!input.webhookConfigured) reasons.webhooks = "公開Webhookの検証とMeta側の購読が必要です。";
  return InstagramCapabilitiesSchema.parse({
    publishing: publish,
    reels: publish,
    carousel: publish,
    stories: false,
    insights,
    messaging: false,
    comments,
    webhooks: basic && Boolean(input.webhookConfigured),
    verifiedAt: input.verifiedAt,
    apiVersion: input.apiVersion ?? META_API_VERSION,
    reasons,
  });
}

export const PublishMediaSchema = z.object({
  kind: z.enum(["IMAGE", "REELS", "CAROUSEL"]),
  mediaUrls: z.array(z.string().url().refine((value) => value.startsWith("https://"), "HTTPS media URL required")).min(1).max(10),
  mediaTypes: z.array(z.enum(["IMAGE", "VIDEO"])).min(1).max(10),
  caption: z.string().max(2200),
  altText: z.string().max(1000).optional(),
  shareToFeed: z.boolean().default(true),
}).superRefine((value, context) => {
  if (value.mediaUrls.length !== value.mediaTypes.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Each media URL requires a type." });
  if (value.kind !== "CAROUSEL" && value.mediaUrls.length !== 1) context.addIssue({ code: z.ZodIssueCode.custom, message: "Single media post requires one URL." });
  if (value.kind === "REELS" && value.mediaTypes[0] !== "VIDEO") context.addIssue({ code: z.ZodIssueCode.custom, message: "Reels require video." });
  if (value.kind === "IMAGE" && value.mediaTypes[0] !== "IMAGE") context.addIssue({ code: z.ZodIssueCode.custom, message: "Image posts require JPEG media." });
});
export type PublishMedia = z.infer<typeof PublishMediaSchema>;

export const ApprovalRequestSchema = z.object({
  contentItemId: z.string().uuid(),
  contentVersionId: z.string().uuid(),
  scheduledFor: z.string().datetime(),
  mediaAssetIds: z.array(z.string().uuid()).min(1).max(10),
  notes: z.string().max(500).optional(),
});

export function publishIdempotencyKey(scheduleId: string, contentVersionId: string) {
  return `instagram-publish:${scheduleId}:${contentVersionId}`;
}

const allowedTransitions: Record<z.infer<typeof PublishStateSchema>, Array<z.infer<typeof PublishStateSchema>>> = {
  DRAFT: ["MEDIA_READY"],
  MEDIA_READY: ["READY_FOR_REVIEW"],
  READY_FOR_REVIEW: ["APPROVED"],
  APPROVED: ["SCHEDULED"],
  SCHEDULED: ["PUBLISHING"],
  PUBLISHING: ["PUBLISHED", "PUBLISH_FAILED"],
  PUBLISHED: ["ANALYZING"],
  ANALYZING: ["ANALYZED", "PUBLISH_FAILED"],
  ANALYZED: [],
  PUBLISH_FAILED: ["SCHEDULED"],
};

export function canTransitionPublishState(from: string, to: string) {
  const current = PublishStateSchema.safeParse(from);
  const next = PublishStateSchema.safeParse(to);
  return current.success && next.success && allowedTransitions[current.data].includes(next.data);
}

export function classifyMetaFailure(status: number, code?: number) {
  if (status === 401 || status === 403 || code === 190) return "RECONNECT_REQUIRED" as const;
  if (status === 429 || status >= 500) return "RETRYABLE" as const;
  return "REVIEW_REQUIRED" as const;
}

export function nextContainerAction(status: z.infer<typeof MetaContainerStatusSchema>) {
  if (status === "IN_PROGRESS") return "POLL_LATER" as const;
  if (status === "FINISHED") return "PUBLISH" as const;
  if (status === "PUBLISHED") return "COMPLETE" as const;
  return "FAIL" as const;
}
