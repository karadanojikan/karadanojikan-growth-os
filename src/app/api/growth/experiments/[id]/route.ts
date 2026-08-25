import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";
import { createAdminClient } from "@/lib/supabase/admin";

const DecisionSchema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = z.string().uuid().parse((await context.params).id);
    const { decision } = DecisionSchema.parse(await request.json());
    const { workspaceId, userId } = await requireWorkspaceContext();
    const admin = createAdminClient();
    const { data: existing } = await admin.from("growth_experiments").select("id,status").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    if (!existing) return NextResponse.json({ error: "実験案が見つかりません。" }, { status: 404 });
    if (existing.status !== "PROPOSED") return NextResponse.json({ error: "この実験案はすでに判断済みです。" }, { status: 409 });
    const { error } = await admin.from("growth_experiments").update({ status: decision, approved_by: decision === "APPROVED" ? userId : null, approved_at: decision === "APPROVED" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    await admin.from("audit_logs").insert({ workspace_id: workspaceId, actor_user_id: userId, action: `growth.experiment.${decision.toLowerCase()}`, subject_type: "growth_experiment", subject_id: id, metadata: { publishingAuthorized: false, strategyAutoChanged: false } });
    return NextResponse.json({ id, status: decision });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "判断内容が不正です。" }, { status: 400 });
    return NextResponse.json({ error: "実験案を更新できませんでした。" }, { status: 500 });
  }
}
