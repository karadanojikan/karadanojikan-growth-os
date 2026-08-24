import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/runtime-config";

export function createAdminClient() {
  const { url } = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for trusted background operations.");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
