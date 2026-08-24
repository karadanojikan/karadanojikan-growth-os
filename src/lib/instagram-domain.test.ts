import { describe, expect, it } from "vitest";
import { canTransitionPublishState, classifyMetaFailure, deriveInstagramCapabilities, nextContainerAction, publishIdempotencyKey, PublishMediaSchema } from "./instagram-domain";

describe("Phase 3 Instagram domain", () => {
  const future = "2030-01-01T00:00:00.000Z";

  it("enables only capabilities backed by a valid professional account and granted scopes", () => {
    const capabilities = deriveInstagramCapabilities({
      grantedPermissions: ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_insights"],
      accountType: "BUSINESS", tokenExpiresAt: future, verifiedAt: "2026-08-24T00:00:00.000Z",
      webhookConfigured: false, now: new Date("2026-08-24T00:00:00.000Z"),
    });
    expect(capabilities.reels).toBe(true);
    expect(capabilities.insights).toBe(true);
    expect(capabilities.comments).toBe(false);
    expect(capabilities.webhooks).toBe(false);
  });

  it("keeps insights off without the dedicated permission", () => {
    const capabilities = deriveInstagramCapabilities({
      grantedPermissions: ["instagram_business_basic"],
      accountType: "BUSINESS", tokenExpiresAt: future, verifiedAt: null,
      now: new Date("2026-08-24T00:00:00.000Z"),
    });
    expect(capabilities.insights).toBe(false);
    expect(capabilities.reasons.insights).toBeTruthy();
  });

  it("fails closed when the token is expired", () => {
    const capabilities = deriveInstagramCapabilities({
      grantedPermissions: ["instagram_business_basic", "instagram_business_content_publish"],
      accountType: "MEDIA_CREATOR", tokenExpiresAt: "2026-08-01T00:00:00.000Z", verifiedAt: null,
      now: new Date("2026-08-24T00:00:00.000Z"),
    });
    expect(capabilities.publishing).toBe(false);
    expect(capabilities.reasons.token).toBeTruthy();
  });

  it("keeps Stories and DM actions off until their reviewed product flows exist", () => {
    const capabilities = deriveInstagramCapabilities({
      grantedPermissions: ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_messages"],
      accountType: "BUSINESS", tokenExpiresAt: future, verifiedAt: null, now: new Date("2026-08-24T00:00:00.000Z"),
    });
    expect(capabilities.stories).toBe(false);
    expect(capabilities.messaging).toBe(false);
  });

  it("accepts HTTPS reels and rejects mismatched media", () => {
    expect(PublishMediaSchema.safeParse({ kind: "REELS", mediaUrls: ["https://example.com/a.mp4"], mediaTypes: ["VIDEO"], caption: "test" }).success).toBe(true);
    expect(PublishMediaSchema.safeParse({ kind: "REELS", mediaUrls: ["http://example.com/a.mp4"], mediaTypes: ["IMAGE"], caption: "test" }).success).toBe(false);
  });

  it("requires the reviewed publication state sequence", () => {
    expect(canTransitionPublishState("READY_FOR_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionPublishState("READY_FOR_REVIEW", "PUBLISHED")).toBe(false);
    expect(canTransitionPublishState("PUBLISH_FAILED", "SCHEDULED")).toBe(true);
  });

  it("uses the exact approved version in its idempotency key", () => {
    expect(publishIdempotencyKey("schedule", "version")).toBe("instagram-publish:schedule:version");
  });

  it("separates reconnect, retry, and human review failures", () => {
    expect(classifyMetaFailure(401, 190)).toBe("RECONNECT_REQUIRED");
    expect(classifyMetaFailure(429)).toBe("RETRYABLE");
    expect(classifyMetaFailure(400)).toBe("REVIEW_REQUIRED");
  });

  it("polls containers without publishing before Meta reports FINISHED", () => {
    expect(nextContainerAction("IN_PROGRESS")).toBe("POLL_LATER");
    expect(nextContainerAction("FINISHED")).toBe("PUBLISH");
    expect(nextContainerAction("ERROR")).toBe("FAIL");
  });
});
