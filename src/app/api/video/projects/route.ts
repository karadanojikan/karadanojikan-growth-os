import { NextResponse } from "next/server";
import { z } from "zod";
import { TranscriptSchema, VideoEdlSchema, VideoMetadataSchema } from "@/lib/video-domain";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

const ProjectRequestSchema = z.object({
  assetId: z.string().uuid(),
  metadata: VideoMetadataSchema,
  transcript: TranscriptSchema,
  edls: z.array(VideoEdlSchema).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const input = ProjectRequestSchema.parse(await request.json());
    const { supabase } = await requireWorkspaceContext();
    const { data, error } = await supabase.rpc("save_video_project_v1", {
      p_asset_id: input.assetId,
      p_metadata: input.metadata,
      p_transcript: input.transcript,
      p_edls: input.edls,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ assetId: input.assetId, videoProjectId: row.video_project_id, videoEdlId: row.video_edl_id });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "動画プロジェクトの形式が不正です。" }, { status: 400 });
    console.error("video_project_save_failed", error);
    return NextResponse.json({ error: "動画プロジェクトを保存できませんでした。" }, { status: 500 });
  }
}
