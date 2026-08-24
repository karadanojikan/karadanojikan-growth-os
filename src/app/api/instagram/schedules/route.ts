import { NextResponse } from "next/server";
import { z } from "zod";
import { ApprovalRequestSchema } from "@/lib/instagram-domain";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

const RequestSchema = ApprovalRequestSchema.extend({ confirmed: z.literal(true) });

export async function POST(request: Request) {
  try {
    const input = RequestSchema.parse(await request.json());
    const { supabase } = await requireWorkspaceContext();
    const { data, error } = await supabase.rpc("approve_instagram_schedule_v1", {
      p_content_item_id: input.contentItemId,
      p_content_version_id: input.contentVersionId,
      p_scheduled_for: input.scheduledFor,
      p_media_asset_ids: input.mediaAssetIds,
      p_notes: input.notes ?? "",
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ scheduleId: row.schedule_id, approvalId: row.approval_id, status: row.status });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "投稿承認の内容が不正です。" }, { status: 400 });
    console.error("instagram_schedule_approval_failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "対象版・安全確認・素材の権利を確認できませんでした。" }, { status: 409 });
  }
}
