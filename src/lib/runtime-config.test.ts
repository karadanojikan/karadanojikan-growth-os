import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppMode, getSupabasePublicConfig, isAutoPublishEnabled, isSupabaseConfigured, MissingConfigurationError } from "./runtime-config";

afterEach(() => vi.unstubAllEnvs());

describe("runtime configuration", () => {
  it("defaults safely to Demo Mode", () => { vi.stubEnv("NEXT_PUBLIC_APP_MODE", ""); expect(getAppMode()).toBe("demo"); });
  it("accepts explicit Real Mode", () => { vi.stubEnv("NEXT_PUBLIC_APP_MODE", "real"); expect(getAppMode()).toBe("real"); });
  it("keeps automatic publishing disabled unless explicitly true", () => {
    vi.stubEnv("AUTO_PUBLISH", "false"); expect(isAutoPublishEnabled()).toBe(false);
    vi.stubEnv("AUTO_PUBLISH", "TRUE"); expect(isAutoPublishEnabled()).toBe(false);
    vi.stubEnv("AUTO_PUBLISH", "true"); expect(isAutoPublishEnabled()).toBe(true);
  });
  it("fails closed when Supabase configuration is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", ""); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(isSupabaseConfigured()).toBe(false); expect(() => getSupabasePublicConfig()).toThrow(MissingConfigurationError);
  });
  it("accepts a valid public configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_abcdefghijklmnopqrstuvwxyz");
    expect(getSupabasePublicConfig().url).toBe("https://example.supabase.co");
  });
});
