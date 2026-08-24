import "server-only";
import { createClient } from "./supabase/server";

export async function getInstagramPublishReview(contentItemId: string) {
  const supabase = await createClient();
  const { data: content } = await supabase.from("content_items")
    .select("id,workspace_id,content_type,topic,status,current_version_id,scheduled_for")
    .eq("id", contentItemId).maybeSingle();
  if (!content?.current_version_id) return null;
  const [{ data: version }, { data: assets }, { data: account }] = await Promise.all([
    supabase.from("content_versions").select("id,version,payload,created_at").eq("id", content.current_version_id).maybeSingle(),
    supabase.from("media_assets").select("id,original_filename,media_type,byte_size,is_customer_media,created_at").eq("workspace_id", content.workspace_id).order("created_at", { ascending: false }).limit(30),
    supabase.from("instagram_accounts").select("id,username,connection_status,token_expires_at").eq("workspace_id", content.workspace_id).eq("connection_status", "CONNECTED").order("last_verified_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const assetIds = (assets ?? []).map((asset) => asset.id);
  const { data: rights } = assetIds.length ? await supabase.from("media_asset_rights").select("media_asset_id,consent_status,approved_platforms,expires_at,music_license_status").in("media_asset_id", assetIds) : { data: [] };
  const rightsMap = new Map((rights ?? []).map((right) => [right.media_asset_id, right]));
  const { data: capabilities } = account ? await supabase.from("instagram_capabilities").select("publishing,reels,carousel,verified_at,reasons").eq("instagram_account_id", account.id).maybeSingle() : { data: null };
  return {
    content,
    version,
    account,
    capabilities,
    assets: (assets ?? []).map((asset) => ({ ...asset, rights: rightsMap.get(asset.id) ?? null })),
  };
}
