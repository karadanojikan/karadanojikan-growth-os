// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InstagramWebhookSchema, verifyMetaWebhookSignature, webhookEventType, webhookPayloadHash } from "./instagram-webhook";

describe("Instagram webhook boundary", () => {
  const secret = "meta-app-secret";
  const raw = JSON.stringify([{ object: "instagram", entry: [{ id: "ig-1", time: 1, field: "comments", value: { text: "untrusted" } }] }]);
  it("verifies the raw body before parsing", () => {
    const signature = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
    expect(verifyMetaWebhookSignature(raw, signature, secret)).toBe(true);
    expect(verifyMetaWebhookSignature(`${raw} `, signature, secret)).toBe(false);
  });
  it("validates the envelope but treats nested values as untrusted", () => {
    const payload = InstagramWebhookSchema.parse(JSON.parse(raw));
    expect(webhookEventType(payload)).toBe("comments");
    expect(webhookPayloadHash(raw)).toHaveLength(64);
  });
});
