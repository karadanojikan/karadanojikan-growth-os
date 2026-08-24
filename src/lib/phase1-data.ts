import "server-only";
import { defaultBrandBrain, parseStringArray, parseStringRecord } from "./brand-brain";
import { BrandBrainSchema, type BrandBrain } from "./domain";
import { getAppMode, isSupabaseConfigured } from "./runtime-config";
import { createClient } from "./supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function workspaceIdFor(supabase: SupabaseClient) {
  const { data } = await supabase.from("workspace_members").select("workspace_id").limit(1).maybeSingle();
  return data?.workspace_id as string | undefined;
}

export async function getBrandBrainForWorkspace(supabase: SupabaseClient, workspaceId: string): Promise<BrandBrain> {
  const [{ data: profile }, { data: facts }, { data: claims }] = await Promise.all([
    supabase.from("brand_profiles").select("concept,audience,tone,forbidden_claims,terminology,colors,fonts,posting_ratios,version").eq("workspace_id", workspaceId).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("brand_facts").select("id,fact_key,fact_value,status").eq("workspace_id", workspaceId),
    supabase.from("approved_claims").select("id,wording,status").eq("workspace_id", workspaceId).eq("status", "APPROVED"),
  ]);
  if (!profile) return defaultBrandBrain;
  const factMap = new Map((facts ?? []).map((fact) => [fact.fact_key, fact]));
  const factValue = (key: string) => factMap.get(key)?.fact_value || "UNKNOWN";
  const unknownFacts = (facts ?? []).filter((fact) => fact.status !== "APPROVED").map((fact) => fact.fact_key);
  const missingFactLabels: Array<[string, string]> = [["services","サービス内容"],["location","所在地の公開表記"],["reservation_flow","予約導線"]];
  const missingLabels = missingFactLabels
    .filter(([key]) => factValue(key) === "UNKNOWN").map(([, label]) => label);
  const ratios = profile.posting_ratios as Record<string, unknown> | null;
  return BrandBrainSchema.parse({
    concept: profile.concept,
    audience: profile.audience,
    tone: parseStringArray(profile.tone, defaultBrandBrain.tone),
    services: factValue("services") === "UNKNOWN" ? [] : factValue("services").split("\n").filter(Boolean),
    location: factValue("location"),
    reservationFlow: factValue("reservation_flow"),
    approvedClaims: (claims ?? []).map((claim) => claim.wording),
    forbiddenClaims: parseStringArray(profile.forbidden_claims, defaultBrandBrain.forbiddenClaims),
    terminology: parseStringRecord(profile.terminology),
    colors: Object.keys(parseStringRecord(profile.colors)).length ? Object.values(parseStringRecord(profile.colors)) : defaultBrandBrain.colors,
    fonts: Object.keys(parseStringRecord(profile.fonts)).length ? Object.values(parseStringRecord(profile.fonts)) : defaultBrandBrain.fonts,
    ctaStyle: factValue("cta_style"),
    postingRatios: {
      GROWTH: Number(ratios?.GROWTH ?? 0.6), TRUST: Number(ratios?.TRUST ?? 0.2),
      LIFESTYLE: Number(ratios?.LIFESTYLE ?? 0.1), CONVERSION: Number(ratios?.CONVERSION ?? 0.1),
    },
    contentThemes: factValue("content_themes") === "UNKNOWN" ? defaultBrandBrain.contentThemes : factValue("content_themes").split("\n").filter(Boolean),
    unknownFacts: [...new Set([...missingLabels, ...unknownFacts])],
    version: profile.version,
  });
}

export async function getBrandBrain() {
  if (getAppMode() === "demo" || !isSupabaseConfigured()) return defaultBrandBrain;
  const supabase = await createClient();
  const workspaceId = await workspaceIdFor(supabase);
  return workspaceId ? getBrandBrainForWorkspace(supabase, workspaceId) : defaultBrandBrain;
}

export type IdeaRecord = { id: string; title: string; topic: string; objective: string; source: string | null; createdAt: string };
export async function getIdeas(): Promise<IdeaRecord[]> {
  if (getAppMode() === "demo" || !isSupabaseConfigured()) return [
    { id: "idea-1", title: "肩だけ揉んでない？", topic: "首・肩", objective: "GROWTH", source: "今日の提案", createdAt: "2026-08-24T00:00:00.000Z" },
    { id: "idea-2", title: "朝の姿勢を整える3つのヒント", topic: "姿勢", objective: "TRUST", source: "FAQ", createdAt: "2026-08-23T00:00:00.000Z" },
  ];
  const supabase = await createClient();
  const workspaceId = await workspaceIdFor(supabase);
  if (!workspaceId) return [];
  const { data } = await supabase.from("content_ideas").select("id,title,topic,objective,source,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  return (data ?? []).map((idea) => ({ id: idea.id, title: idea.title, topic: idea.topic, objective: idea.objective, source: idea.source, createdAt: idea.created_at }));
}

export type SeriesRecord = { id: string; title: string; description: string | null; total: number; completed: number };
export async function getSeries(): Promise<SeriesRecord[]> {
  if (getAppMode() === "demo" || !isSupabaseConfigured()) return [{ id: "series-1", title: "40代からの朝1分", description: "忙しい朝に続けやすいセルフケア", total: 4, completed: 1 }];
  const supabase = await createClient();
  const workspaceId = await workspaceIdFor(supabase);
  if (!workspaceId) return [];
  const { data: series } = await supabase.from("content_series").select("id,title,description").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  const ids = (series ?? []).map((item) => item.id);
  const { data: items } = ids.length ? await supabase.from("series_items").select("series_id,status").in("series_id", ids) : { data: [] };
  return (series ?? []).map((entry) => { const related = (items ?? []).filter((item) => item.series_id === entry.id); return { id: entry.id, title: entry.title, description: entry.description, total: related.length, completed: related.filter((item) => item.status === "PUBLISHED" || item.status === "READY").length }; });
}

export type AiUsageSummary = { todayMicros: number; weekMicros: number; monthMicros: number; budgetMicros: number; runs: Array<{ id: string; feature: string; model: string; status: string; startedAt: string; costMicros: number }> };
export async function getAiUsageSummary(): Promise<AiUsageSummary> {
  if (getAppMode() === "demo" || !isSupabaseConfigured()) return { todayMicros: 0, weekMicros: 0, monthMicros: 0, budgetMicros: 50_000_000, runs: [] };
  const supabase = await createClient();
  const workspaceId = await workspaceIdFor(supabase);
  if (!workspaceId) return { todayMicros: 0, weekMicros: 0, monthMicros: 0, budgetMicros: 0, runs: [] };
  const [{ data: workspace }, { data: runs }, { data: usage }] = await Promise.all([
    supabase.from("workspaces").select("monthly_ai_budget_micros").eq("id", workspaceId).single(),
    supabase.from("ai_runs").select("id,feature,resolved_model,status,started_at").eq("workspace_id", workspaceId).order("started_at", { ascending: false }).limit(30),
    supabase.from("ai_usage").select("ai_run_id,estimated_cost_micros,recorded_at").eq("workspace_id", workspaceId).order("recorded_at", { ascending: false }).limit(200),
  ]);
  const now = new Date(); const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0,0,0,0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sumSince = (start: Date) => (usage ?? []).filter((row) => new Date(row.recorded_at) >= start).reduce((sum, row) => sum + Number(row.estimated_cost_micros), 0);
  const costMap = new Map((usage ?? []).map((row) => [row.ai_run_id, Number(row.estimated_cost_micros)]));
  return { todayMicros: sumSince(todayStart), weekMicros: sumSince(weekStart), monthMicros: sumSince(monthStart), budgetMicros: Number(workspace?.monthly_ai_budget_micros ?? 0), runs: (runs ?? []).map((run) => ({ id: run.id, feature: run.feature, model: run.resolved_model, status: run.status, startedAt: run.started_at, costMicros: costMap.get(run.id) ?? 0 })) };
}
