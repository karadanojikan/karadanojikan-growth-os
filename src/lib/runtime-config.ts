import { z } from "zod";

export const AppModeSchema = z.enum(["demo", "real"]);
export type AppMode = z.infer<typeof AppModeSchema>;

const SupabasePublicConfigSchema = z.object({
  url: z.string().url(),
  publishableKey: z.string().min(20),
});

export class MissingConfigurationError extends Error {
  override readonly name = "MissingConfigurationError";
}

export function getAppMode(): AppMode {
  return AppModeSchema.catch("demo").parse(process.env.NEXT_PUBLIC_APP_MODE);
}

export function getSupabasePublicConfig() {
  const parsed = SupabasePublicConfigSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    throw new MissingConfigurationError(
      "Real ModeにはNEXT_PUBLIC_SUPABASE_URLとNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEYが必要です。",
    );
  }
  return parsed.data;
}

export function isSupabaseConfigured() {
  return SupabasePublicConfigSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }).success;
}
