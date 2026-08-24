import { NextResponse } from "next/server";
import { z } from "zod";
import { VideoEdlSchema } from "@/lib/video-domain";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const projectId = z.string().uuid().parse(id);
    const payload = VideoEdlSchema.parse(await request.json());
    const { supabase } = await requireWorkspaceContext();
    const { data, error } = await supabase.rpc("append_video_edl_v1", { p_video_project_id: projectId, p_payload: payload });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ videoEdlId: row.video_edl_id, version: row.version });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "EDLの形式が不正です。" }, { status: 400 });
    console.error("video_edl_append_failed", error);
    return NextResponse.json({ error: "編集版を保存できませんでした。" }, { status: 500 });
  }
}
