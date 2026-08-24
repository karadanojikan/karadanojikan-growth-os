import { NextResponse } from "next/server";
import { z } from "zod";
import { deriveInstagramCapabilities } from "@/lib/instagram-domain";
import { requireInstagramConfig } from "@/lib/instagram-config";
import { decryptSecret, encryptSecret } from "@/lib/instagram-crypto";
import { MetaInstagramClient, refreshLongLivedToken } from "@/lib/meta-instagram";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

const InputSchema = z.object({ accountId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const { accountId } = InputSchema.parse({ accountId: form.get("accountId") });
    const config = requireInstagramConfig();
    const { supabase, workspaceId } = await requireWorkspaceContext();
    const { data: account } = await supabase.from("instagram_accounts")
      .select("external_account_id,username,account_type,token_ciphertext,token_expires_at,granted_permissions,declined_permissions,profile_picture_url,last_verified_at")
      .eq("id", accountId).eq("workspace_id", workspaceId).maybeSingle();
    if (!account?.token_ciphertext || !account.external_account_id) throw new Error("connected_account_required");
    if (account.last_verified_at && Date.now() - new Date(account.last_verified_at).getTime() < 24 * 60 * 60 * 1000) {
      return NextResponse.redirect(new URL("/settings/instagram?result=refresh_not_due", request.url), 303);
    }
    const refreshed = await refreshLongLivedToken(decryptSecret(account.token_ciphertext, config.encryptionKey));
    const profile = await new MetaInstagramClient(refreshed.access_token, config.apiVersion).getProfile();
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    const { data: currentCapabilities } = await supabase.from("instagram_capabilities").select("webhooks").eq("instagram_account_id", accountId).maybeSingle();
    const capabilities = deriveInstagramCapabilities({ grantedPermissions: account.granted_permissions ?? [], accountType: profile.account_type, tokenExpiresAt: expiresAt, verifiedAt: new Date().toISOString(), apiVersion: config.apiVersion, webhookConfigured: Boolean(currentCapabilities?.webhooks) });
    const { error } = await supabase.rpc("store_instagram_connection_v1", {
      p_workspace_id: workspaceId,
      p_external_account_id: account.external_account_id,
      p_username: profile.username,
      p_account_type: profile.account_type,
      p_token_ciphertext: encryptSecret(refreshed.access_token, config.encryptionKey),
      p_token_expires_at: expiresAt,
      p_granted_permissions: account.granted_permissions ?? [],
      p_declined_permissions: account.declined_permissions ?? [],
      p_profile_picture_url: profile.profile_picture_url ?? account.profile_picture_url ?? "",
      p_api_version: config.apiVersion,
      p_capabilities: capabilities,
    });
    if (error) throw error;
    return NextResponse.redirect(new URL("/settings/instagram?result=refreshed", request.url), 303);
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("instagram_token_refresh_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.redirect(new URL("/settings/instagram?result=failed", request.url), 303);
  }
}
