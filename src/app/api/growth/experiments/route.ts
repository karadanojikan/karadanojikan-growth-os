import { NextResponse } from "next/server";
import { z } from "zod";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";
import { createAdminClient } from "@/lib/supabase/admin";

const ProposalSchema = z.object({
  title: z.string().trim().min(1).max(160), hypothesis: z.string().trim().min(1).max(600), variable: z.string().trim().min(1).max(80),
  variantA: z.string().trim().min(1).max(240), variantB: z.string().trim().min(1).max(240), primaryMetric: z.string().trim().min(1).max(160),
  minimumSampleSize: z.number().int().min(2).max(100), evidence: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  try {
    const proposal = ProposalSchema.parse(await request.json());
    const { workspaceId, userId } = await requireWorkspaceContext();
    const admin = createAdminClient();
    const { data, error } = await admin.from("growth_experiments").insert({
      workspace_id: workspaceId, title: proposal.title, hypothesis: proposal.hypothesis, variable: proposal.variable,
      variant_a: proposal.variantA, variant_b: proposal.variantB, primary_metric: proposal.primaryMetric,
      minimum_sample_size: proposal.minimumSampleSize, evidence: proposal.evidence, status: "PROPOSED", created_by: userId,
    }).select("id,status").single();
    if (error || !data) throw error ?? new Error("Experiment insert failed");
    await admin.from("audit_logs").insert({ workspace_id: workspaceId, actor_user_id: userId, action: "growth.experiment.proposed", subject_type: "growth_experiment", subject_id: data.id, metadata: { variable: proposal.variable, minimumSampleSize: proposal.minimumSampleSize, publishingAuthorized: false } });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "実験案の形式が不正です。" }, { status: 400 });
    return NextResponse.json({ error: "実験案を保存できませんでした。" }, { status: 500 });
  }
}
