import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireInstagramConfig } from "@/lib/instagram-config";
import { signOAuthState } from "@/lib/instagram-crypto";
import { buildInstagramAuthorizationUrl } from "@/lib/meta-instagram";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

export async function GET(request: Request) {
  try {
    const { workspaceId, userId } = await requireWorkspaceContext();
    const config = requireInstagramConfig();
    const state = signOAuthState({ workspaceId, userId, nonce: randomBytes(24).toString("base64url"), issuedAt: Date.now() }, config.encryptionKey);
    const cookieStore = await cookies();
    cookieStore.set("kdj_ig_oauth_state", state, { httpOnly: true, secure: config.redirectUri.startsWith("https://"), sameSite: "lax", maxAge: 600, path: "/api/instagram/callback" });
    return NextResponse.redirect(buildInstagramAuthorizationUrl({ appId: config.appId, redirectUri: config.redirectUri, state }));
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("instagram_connect_start_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.redirect(new URL("/settings/instagram?result=configuration", request.url));
  }
}
