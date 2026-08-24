import { NextResponse } from "next/server";
import { SaveContentDraftSchema } from "@/lib/content-draft";
import { getAppMode, isSupabaseConfigured } from "@/lib/runtime-config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (getAppMode() !== "real" || !isSupabaseConfigured()) {
    return NextResponse.json({ error: "Real Mode is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const input = SaveContentDraftSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: "Invalid content draft." }, { status: 400 });

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership) return NextResponse.json({ error: "Workspace membership required." }, { status: 403 });

  const { data, error } = await supabase.rpc("save_content_draft", {
    p_workspace_id: membership.workspace_id,
    p_content_type: "REELS",
    p_objective: input.data.plan.objective,
    p_topic: input.data.plan.topic,
    p_payload: input.data.plan,
    p_scheduled_for: input.data.scheduledFor,
  });
  if (error || typeof data !== "string") {
    console.error("content_draft_save_failed", { code: error?.code, requestId: request.headers.get("x-request-id") });
    return NextResponse.json({ error: "Draft could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ contentId: data, version: 1, mode: "real" }, { status: 201 });
}
