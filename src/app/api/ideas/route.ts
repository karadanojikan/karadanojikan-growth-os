import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

const IdeaSchema = z.object({ title: z.string().trim().min(1).max(160), topic: z.string().trim().min(1).max(100), objective: z.enum(["GROWTH", "TRUST", "LIFESTYLE", "CONVERSION"]), source: z.string().trim().max(120).optional() });

export async function POST(request: Request) {
  const input = IdeaSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "アイデアの内容を確認してください。" }, { status: 400 });
  try {
    const { supabase, workspaceId } = await requireWorkspaceContext();
    const { data, error } = await supabase.from("content_ideas").insert({ workspace_id: workspaceId, ...input.data, source: input.data.source || "手動" }).select("id,title,topic,objective,source,created_at").single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) { if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status }); console.error("idea_create_failed"); return NextResponse.json({ error: "アイデアを保存できませんでした。" }, { status: 500 }); }
}
