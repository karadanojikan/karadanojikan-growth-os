import { NextResponse } from "next/server";
import { getInstagramConfigurationStatus } from "@/lib/instagram-config";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

export async function GET() {
  try {
    const { supabase, workspaceId } = await requireWorkspaceContext();
    const { data: account } = await supabase.from("instagram_accounts")
      .select("id,username,account_type,connection_status,token_expires_at,last_verified_at,granted_permissions,declined_permissions")
      .eq("workspace_id", workspaceId).order("last_verified_at", { ascending: false }).limit(1).maybeSingle();
    const { data: capabilities } = account ? await supabase.from("instagram_capabilities")
      .select("api_version,publishing,reels,carousel,stories,insights,messaging,comments,webhooks,reasons,verified_at")
      .eq("instagram_account_id", account.id).maybeSingle() : { data: null };
    return NextResponse.json({ configuration: getInstagramConfigurationStatus(), account, capabilities });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Instagram接続状態を取得できません。" }, { status: 500 });
  }
}
