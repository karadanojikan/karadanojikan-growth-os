import "server-only";
import { getAppMode, isSupabaseConfigured } from "./runtime-config";
import { getInstagramConfigurationStatus } from "./instagram-config";
import { createClient } from "./supabase/server";

export async function getInstagramSettingsData() {
  const configuration = getInstagramConfigurationStatus();
  if (getAppMode() === "demo" || !isSupabaseConfigured()) return { configuration, account: null, capabilities: null };
  const supabase = await createClient();
  const { data: membership } = await supabase.from("workspace_members").select("workspace_id").limit(1).maybeSingle();
  if (!membership) return { configuration, account: null, capabilities: null };
  const { data: account } = await supabase.from("instagram_accounts")
    .select("id,username,account_type,connection_status,token_expires_at,last_verified_at,granted_permissions,declined_permissions,profile_picture_url")
    .eq("workspace_id", membership.workspace_id).order("last_verified_at", { ascending: false }).limit(1).maybeSingle();
  const { data: capabilities } = account ? await supabase.from("instagram_capabilities")
    .select("api_version,publishing,reels,carousel,stories,insights,messaging,comments,webhooks,reasons,verified_at")
    .eq("instagram_account_id", account.id).maybeSingle() : { data: null };
  return { configuration, account, capabilities };
}
