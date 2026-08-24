import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const OAuthStateSchema = z.object({
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  nonce: z.string().min(20),
  issuedAt: z.number().int().positive(),
});
export type OAuthState = z.infer<typeof OAuthStateSchema>;

export function parseEncryptionKey(value: string) {
  const normalized = value.trim();
  const key = /^[a-f0-9]{64}$/i.test(normalized) ? Buffer.from(normalized, "hex") : Buffer.from(normalized, "base64url");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

export function encryptSecret(plaintext: string, encodedKey: string) {
  if (!plaintext) throw new Error("Cannot encrypt an empty secret.");
  const key = parseEncryptionKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSecret(envelope: string, encodedKey: string) {
  const [version, ivValue, tagValue, ciphertextValue] = envelope.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) throw new Error("Unsupported encrypted secret envelope.");
  const key = parseEncryptionKey(encodedKey);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}

export function signOAuthState(state: OAuthState, encodedKey: string) {
  const payload = Buffer.from(JSON.stringify(OAuthStateSchema.parse(state))).toString("base64url");
  const signature = createHmac("sha256", parseEncryptionKey(encodedKey)).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(value: string, encodedKey: string, now = Date.now()) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) throw new Error("Invalid OAuth state.");
  const expected = createHmac("sha256", parseEncryptionKey(encodedKey)).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid OAuth state signature.");
  const state = OAuthStateSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
  if (now - state.issuedAt > 10 * 60 * 1000 || state.issuedAt > now + 60_000) throw new Error("OAuth state expired.");
  return state;
}
