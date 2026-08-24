// @vitest-environment node
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, signOAuthState, verifyOAuthState } from "./instagram-crypto";

describe("Instagram secret handling", () => {
  const key = randomBytes(32).toString("base64url");
  const state = { workspaceId: "00000000-0000-4000-8000-000000000001", userId: "00000000-0000-4000-8000-000000000002", nonce: "a-secure-random-nonce-value", issuedAt: 1_000_000 };

  it("round-trips an access token without storing plaintext", () => {
    const encrypted = encryptSecret("IGQV-test-token", key);
    expect(encrypted).not.toContain("IGQV-test-token");
    expect(decryptSecret(encrypted, key)).toBe("IGQV-test-token");
  });

  it("signs state and rejects tampering or expiry", () => {
    const signed = signOAuthState(state, key);
    expect(verifyOAuthState(signed, key, 1_000_500)).toEqual(state);
    expect(() => verifyOAuthState(`${signed}x`, key, 1_000_500)).toThrow();
    expect(() => verifyOAuthState(signed, key, 1_700_001)).toThrow("expired");
  });
});
