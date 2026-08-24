import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const jobId = z.string().uuid().parse(id);
    const { supabase, workspaceId } = await requireWorkspaceContext();
    const { data, error } = await supabase.from("jobs").select("id,status,progress,attempts,max_attempts,error_code,error_message,created_at,started_at,completed_at").eq("workspace_id", workspaceId).eq("id", jobId).single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "ジョブIDが不正です。" }, { status: 400 });
    return NextResponse.json({ error: "ジョブを取得できませんでした。" }, { status: 404 });
  }
}
