import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const InstagramWebhookSchema = z.array(z.object({
  object: z.literal("instagram"),
  entry: z.array(z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    time: z.number().optional(),
    field: z.string().optional(),
    value: z.unknown().optional(),
    changes: z.array(z.object({ field: z.string(), value: z.unknown() })).optional(),
  })).min(1),
})).min(1);

export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader?.startsWith("sha256=") || !appSecret) return false;
  const actual = Buffer.from(signatureHeader.slice(7), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function webhookPayloadHash(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function webhookEventType(payload: z.infer<typeof InstagramWebhookSchema>) {
  const entry = payload[0]!.entry[0]!;
  return entry.field ?? entry.changes?.[0]?.field ?? "UNKNOWN";
}
