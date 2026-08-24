import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

const SeriesSchema = z.object({ title: z.string().trim().min(1).max(160), description: z.string().trim().max(500).optional() });

export async function POST(request: Request) {
  const input = SeriesSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "シリーズの内容を確認してください。" }, { status: 400 });
  try {
    const { supabase, workspaceId } = await requireWorkspaceContext();
    const { data, error } = await supabase.from("content_series").insert({ workspace_id: workspaceId, title: input.data.title, description: input.data.description || null }).select("id,title,description").single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) { if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status }); console.error("series_create_failed"); return NextResponse.json({ error: "シリーズを保存できませんでした。" }, { status: 500 }); }
}
