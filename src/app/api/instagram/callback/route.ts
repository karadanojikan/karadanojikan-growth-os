import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { INSTAGRAM_SCOPES, deriveInstagramCapabilities } from "@/lib/instagram-domain";
import { requireInstagramConfig } from "@/lib/instagram-config";
import { encryptSecret, verifyOAuthState } from "@/lib/instagram-crypto";
import { exchangeAuthorizationCode, exchangeLongLivedToken, MetaInstagramClient } from "@/lib/meta-instagram";
import { requireWorkspaceContext } from "@/lib/request-context";

function settingsRedirect(request: Request, result: string) {
  return NextResponse.redirect(new URL(`/settings/instagram?result=${encodeURIComponent(result)}`, request.url));
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("error")) return settingsRedirect(request, "denied");
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const cookieState = cookieStore.get("kdj_ig_oauth_state")?.value;
    if (!code || !returnedState || !cookieState || returnedState !== cookieState) return settingsRedirect(request, "invalid_state");
    const config = requireInstagramConfig();
    const state = verifyOAuthState(returnedState, config.encryptionKey);
    const { supabase, workspaceId, userId } = await requireWorkspaceContext();
    if (state.workspaceId !== workspaceId || state.userId !== userId) return settingsRedirect(request, "invalid_state");

    const shortToken = await exchangeAuthorizationCode({ appId: config.appId, appSecret: config.appSecret, redirectUri: config.redirectUri, code });
    const longToken = await exchangeLongLivedToken({ appSecret: config.appSecret, accessToken: shortToken.access_token });
    const profile = await new MetaInstagramClient(longToken.access_token, config.apiVersion).getProfile();
    const expiresAt = new Date(Date.now() + longToken.expires_in * 1000).toISOString();
    const granted = shortToken.permissions.filter((permission) => INSTAGRAM_SCOPES.includes(permission as (typeof INSTAGRAM_SCOPES)[number]));
    const declined = INSTAGRAM_SCOPES.filter((permission) => !granted.includes(permission));
    const capabilities = deriveInstagramCapabilities({
      grantedPermissions: granted,
      accountType: profile.account_type,
      tokenExpiresAt: expiresAt,
      verifiedAt: new Date().toISOString(),
      apiVersion: config.apiVersion,
      webhookConfigured: false,
    });
    const { error } = await supabase.rpc("store_instagram_connection_v1", {
      p_workspace_id: workspaceId,
      p_external_account_id: profile.user_id,
      p_username: profile.username,
      p_account_type: profile.account_type,
      p_token_ciphertext: encryptSecret(longToken.access_token, config.encryptionKey),
      p_token_expires_at: expiresAt,
      p_granted_permissions: granted,
      p_declined_permissions: declined,
      p_profile_picture_url: profile.profile_picture_url ?? "",
      p_api_version: config.apiVersion,
      p_capabilities: capabilities,
    });
    if (error) throw error;
    return settingsRedirect(request, "connected");
  } catch (error) {
    console.error("instagram_oauth_callback_failed", error instanceof Error ? error.name : "unknown");
    return settingsRedirect(request, "failed");
  } finally {
    cookieStore.delete("kdj_ig_oauth_state");
  }
}
