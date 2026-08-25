import { NextResponse } from "next/server";
import { syncInstagramInsights, InsightSyncError } from "@/lib/instagram-insights-sync";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

export async function POST() {
  try {
    const { supabase, workspaceId, userId } = await requireWorkspaceContext();
    const { data: account } = await supabase.from("instagram_accounts")
      .select("id,external_account_id,token_ciphertext,token_expires_at,connection_status")
      .eq("workspace_id", workspaceId).eq("connection_status", "CONNECTED").order("last_verified_at", { ascending: false }).limit(1).maybeSingle();
    if (!account?.token_ciphertext) return NextResponse.json({ error: "Instagramを接続してください。" }, { status: 409 });
    const { data: capability } = await supabase.from("instagram_capabilities").select("insights").eq("instagram_account_id", account.id).maybeSingle();
    if (!capability?.insights) return NextResponse.json({ error: "Instagram Insights権限が利用できません。" }, { status: 409 });
    const result = await syncInstagramInsights({ workspaceId, userId, account: {
      id: account.id, external_account_id: account.external_account_id, token_ciphertext: account.token_ciphertext, token_expires_at: account.token_expires_at,
    } });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof InsightSyncError) {
      const status = error.code === "RECONNECT_REQUIRED" ? 409 : error.code === "RATE_LIMITED" ? 429 : error.code === "SYNC_IN_PROGRESS" || error.code === "SYNC_TOO_SOON" ? 409 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Instagram実測値を取得できませんでした。" }, { status: 502 });
  }
}
