import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const scheduleId = z.string().uuid().parse((await context.params).id);
    const { supabase } = await requireWorkspaceContext();
    const { data, error } = await supabase.rpc("enqueue_instagram_publish_v1", { p_schedule_id: scheduleId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ jobId: row.job_id, status: row.status });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "投稿予定IDが不正です。" }, { status: 400 });
    return NextResponse.json({ error: "承認済みの投稿をキューへ追加できませんでした。" }, { status: 409 });
  }
}
