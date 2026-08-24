import { describe, expect, it } from "vitest";
import { isPublicPath } from "./auth-routing";

describe("isPublicPath", () => {
  it.each([
    "/login",
    "/setup",
    "/auth/callback",
    "/auth/callback/complete",
    "/api/instagram/callback",
    "/api/instagram/webhook",
    "/api/internal/instagram-publish",
  ])(
    "allows %s without a session",
    (pathname) => expect(isPublicPath(pathname)).toBe(true),
  );

  it.each([
    "/",
    "/create",
    "/operate",
    "/insights",
    "/settings",
    "/login-preview",
    "/api/instagram/connect",
    "/api/instagram/status",
    "/api/internal/instagram-publish/preview",
  ])(
    "protects %s",
    (pathname) => expect(isPublicPath(pathname)).toBe(false),
  );
});
