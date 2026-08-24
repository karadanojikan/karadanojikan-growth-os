import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

const RenderRequestSchema = z.object({ videoEdlId: z.string().uuid(), provider: z.enum(["MOCK", "LOCAL", "PRODUCTION"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const projectId = z.string().uuid().parse(id);
    const input = RenderRequestSchema.parse(await request.json());
    const { supabase } = await requireWorkspaceContext();
    const { data, error } = await supabase.rpc("enqueue_video_render_v1", { p_video_project_id: projectId, p_video_edl_id: input.videoEdlId, p_provider: input.provider });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ jobId: row.job_id, renderJobId: row.render_job_id, stage: row.stage });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "レンダー要求が不正です。" }, { status: 400 });
    console.error("video_render_enqueue_failed", error);
    return NextResponse.json({ error: "レンダーをキューに追加できませんでした。" }, { status: 500 });
  }
}
