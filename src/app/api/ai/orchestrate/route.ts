import { NextResponse } from "next/server";
import { z } from "zod";
import { defaultBrandBrain } from "@/lib/brand-brain";
import { orchestrateContent } from "@/lib/orchestrator";
import { getBrandBrainForWorkspace } from "@/lib/phase1-data";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";
import { getAppMode, isSupabaseConfigured } from "@/lib/runtime-config";

const InputSchema = z.object({
  contentType: z.enum(["REELS", "CAROUSEL"]),
  topic: z.string().trim().max(120).optional(),
  objective: z.enum(["GROWTH", "TRUST", "LIFESTYLE", "CONVERSION"]).optional(),
  variant: z.number().int().min(0).max(20).optional(),
});

export async function POST(request: Request) {
  const input = InputSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "生成条件が正しくありません。" }, { status: 400 });
  if (getAppMode() === "demo" || !isSupabaseConfigured()) return NextResponse.json(orchestrateContent(input.data, defaultBrandBrain));
  try {
    const { supabase, workspaceId } = await requireWorkspaceContext();
    const brand = await getBrandBrainForWorkspace(supabase, workspaceId);
    const result = orchestrateContent(input.data, brand);
    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await supabase.from("ai_runs").insert({
      workspace_id: workspaceId, feature: `PHASE1_${input.data.contentType}_PLAN`, model_route: "NO_EXTERNAL_MODEL",
      resolved_model: result.provider, prompt_version: result.promptVersion, request_id: requestId,
      status: "SUCCEEDED", started_at: now, completed_at: now,
    });
    if (error) console.error("phase1_ai_run_log_failed", { code: error.code, requestId });
    return NextResponse.json({ ...result, requestId });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("phase1_orchestrate_failed");
    return NextResponse.json({ error: "投稿案を生成できませんでした。" }, { status: 500 });
  }
}
