import "server-only";
import { z } from "zod";
import { META_API_VERSION } from "./instagram-domain";
import { parseEncryptionKey } from "./instagram-crypto";

const InstagramConfigSchema = z.object({
  appId: z.string().regex(/^\d+$/),
  appSecret: z.string().min(8),
  redirectUri: z.string().url(),
  apiVersion: z.string().regex(/^v\d+\.\d+$/),
  webhookVerifyToken: z.string().min(16),
  encryptionKey: z.string().min(32),
});

export function getInstagramConfigurationStatus() {
  const values = {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    redirectUri: process.env.META_REDIRECT_URI,
    apiVersion: process.env.META_API_VERSION || META_API_VERSION,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
    encryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
  };
  const parsed = InstagramConfigSchema.safeParse(values);
  let encryptionReady = false;
  if (values.encryptionKey) {
    try { parseEncryptionKey(values.encryptionKey); encryptionReady = true; } catch { encryptionReady = false; }
  }
  return {
    ready: parsed.success && encryptionReady,
    appId: Boolean(values.appId),
    appSecret: Boolean(values.appSecret),
    redirectUri: values.redirectUri || null,
    apiVersion: values.apiVersion,
    webhookVerifyToken: Boolean(values.webhookVerifyToken),
    encryptionKey: encryptionReady,
  };
}

export function requireInstagramConfig() {
  const parsed = InstagramConfigSchema.parse({
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    redirectUri: process.env.META_REDIRECT_URI,
    apiVersion: process.env.META_API_VERSION || META_API_VERSION,
    webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
    encryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
  });
  parseEncryptionKey(parsed.encryptionKey);
  return parsed;
}
