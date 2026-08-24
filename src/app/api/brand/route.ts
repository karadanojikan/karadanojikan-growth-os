import { NextResponse } from "next/server";
import { z } from "zod";
import { getBrandBrainForWorkspace } from "@/lib/phase1-data";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

const UpdateBrandSchema = z.object({
  concept: z.string().trim().min(1).max(500),
  audience: z.string().trim().min(1).max(300),
  tone: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  forbiddenClaims: z.array(z.string().trim().min(1).max(200)).min(1).max(30),
  contentThemes: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  ctaStyle: z.string().trim().max(300),
  location: z.string().trim().max(160),
  reservationFlow: z.string().trim().max(500),
});

export async function GET() {
  try { const { supabase, workspaceId } = await requireWorkspaceContext(); return NextResponse.json(await getBrandBrainForWorkspace(supabase, workspaceId)); }
  catch (error) { if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status }); return NextResponse.json({ error: "Brand Brainを取得できませんでした。" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const input = UpdateBrandSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "ブランド設定を確認してください。" }, { status: 400 });
  try {
    const { supabase, workspaceId } = await requireWorkspaceContext();
    const { data: profile, error: profileError } = await supabase.from("brand_profiles").select("id,version,terminology,colors,fonts,posting_ratios").eq("workspace_id", workspaceId).order("version", { ascending: false }).limit(1).single();
    if (profileError || !profile) throw new Error("brand_profile_missing");
    const { data: nextProfile, error: insertError } = await supabase.from("brand_profiles").insert({ workspace_id: workspaceId, concept: input.data.concept, audience: input.data.audience, tone: input.data.tone, forbidden_claims: input.data.forbiddenClaims, terminology: profile.terminology, colors: profile.colors, fonts: profile.fonts, posting_ratios: profile.posting_ratios, version: profile.version + 1 }).select("id").single();
    if (insertError || !nextProfile) throw insertError ?? new Error("brand_version_create_failed");
    const { data: previousFacts } = await supabase.from("brand_facts").select("fact_key,fact_value,status,approved_by,approved_at").eq("brand_profile_id", profile.id);
    const changed = new Map([
      ["content_themes", input.data.contentThemes.join("\n")], ["cta_style", input.data.ctaStyle || "UNKNOWN"],
      ["location", input.data.location || "UNKNOWN"], ["reservation_flow", input.data.reservationFlow || "UNKNOWN"],
    ]);
    const factKeys = new Set([...(previousFacts ?? []).map((fact) => fact.fact_key), ...changed.keys()]);
    const facts = [...factKeys].map((factKey) => { const previous=(previousFacts ?? []).find((fact)=>fact.fact_key===factKey); const isChanged=changed.has(factKey); return { workspace_id: workspaceId, brand_profile_id: nextProfile.id, fact_key: factKey, fact_value: changed.get(factKey) ?? previous?.fact_value ?? "UNKNOWN", status: isChanged ? "DRAFT" : previous?.status ?? "UNKNOWN", approved_by: isChanged ? null : previous?.approved_by ?? null, approved_at: isChanged ? null : previous?.approved_at ?? null }; });
    const { error: factsError } = facts.length ? await supabase.from("brand_facts").insert(facts) : { error: null };
    if (factsError) throw factsError;
    return NextResponse.json(await getBrandBrainForWorkspace(supabase, workspaceId));
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("brand_update_failed"); return NextResponse.json({ error: "Brand Brainを保存できませんでした。" }, { status: 500 });
  }
}
