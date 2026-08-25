import "server-only";
import { buildGrowthIntelligence, DirectMetricsSchema, type AccountSnapshot, type MeasuredPost } from "./growth-intelligence";
import { getAppMode, isSupabaseConfigured } from "./runtime-config";
import { createClient } from "./supabase/server";

export type GrowthExperimentRecord = {
  id: string; title: string; hypothesis: string; variable: string; variantA: string; variantB: string;
  primaryMetric: string; minimumSampleSize: number; status: string; createdAt: string;
};

export async function getGrowthInsightsData() {
  if (getAppMode() !== "real" || !isSupabaseConfigured()) return { mode: "demo" as const, connection: null, syncRun: null, intelligence: null, posts: [], experiments: [], storedReviews: [] };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { mode: "real" as const, connection: null, syncRun: null, intelligence: null, posts: [], experiments: [], storedReviews: [] };
  const { data: membership } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", userData.user.id).limit(1).maybeSingle();
  if (!membership) return { mode: "real" as const, connection: null, syncRun: null, intelligence: null, posts: [], experiments: [], storedReviews: [] };
  const workspaceId = membership.workspace_id as string;
  const { data: account } = await supabase.from("instagram_accounts")
    .select("id,username,connection_status,token_expires_at").eq("workspace_id", workspaceId).order("last_verified_at", { ascending: false }).limit(1).maybeSingle();
  const { data: capability } = account ? await supabase.from("instagram_capabilities").select("insights").eq("instagram_account_id", account.id).maybeSingle() : { data: null };
  const [{ data: media }, { data: syncRun }, { data: accountRows }, { data: experimentRows }, { data: reviewRows }] = await Promise.all([
    supabase.from("instagram_media").select("id,external_media_id,media_product_type,caption,permalink,published_at,last_synced_at").eq("workspace_id", workspaceId).order("published_at", { ascending: false }).limit(50),
    supabase.from("instagram_insight_sync_runs").select("status,media_found,media_measured,unavailable_metrics,error_code,started_at,completed_at").eq("workspace_id", workspaceId).order("started_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("account_insights").select("metrics,captured_at").eq("workspace_id", workspaceId).order("captured_at", { ascending: false }).limit(20),
    supabase.from("growth_experiments").select("id,title,hypothesis,variable,variant_a,variant_b,primary_metric,minimum_sample_size,status,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
    supabase.from("growth_reviews").select("period_type,period_start,period_end,sample_size,confidence,review,generated_at").eq("workspace_id", workspaceId).order("period_start", { ascending: false }).limit(6),
  ]);
  const ids = (media ?? []).map((item) => item.id as string);
  const { data: snapshots } = ids.length
    ? await supabase.from("media_insight_snapshots").select("instagram_media_id,measurement_window,metrics,captured_at,unavailable_metrics,attribution").in("instagram_media_id", ids).order("captured_at", { ascending: false })
    : { data: [] };
  const latestByMedia = new Map<string, { measurement_window: string; metrics: unknown; captured_at: string }>();
  for (const snapshot of snapshots ?? []) if (!latestByMedia.has(snapshot.instagram_media_id as string)) latestByMedia.set(snapshot.instagram_media_id as string, snapshot as { measurement_window: string; metrics: unknown; captured_at: string });
  const posts: MeasuredPost[] = [];
  for (const item of media ?? []) {
    const snapshot = latestByMedia.get(item.id as string);
    if (!snapshot) continue;
    const parsedMetrics = DirectMetricsSchema.safeParse(snapshot.metrics);
    if (!parsedMetrics.success) continue;
    posts.push({
      id: item.id as string, externalMediaId: String(item.external_media_id), mediaProductType: String(item.media_product_type),
      caption: item.caption as string | null, permalink: item.permalink as string | null, publishedAt: item.published_at as string,
      capturedAt: snapshot.captured_at, measurementWindow: snapshot.measurement_window, metrics: parsedMetrics.data,
    });
  }
  const accountSnapshots: AccountSnapshot[] = (accountRows ?? []).map((row) => {
    const metrics = row.metrics && typeof row.metrics === "object" ? row.metrics as Record<string, unknown> : {};
    return { capturedAt: row.captured_at as string, followersCount: typeof metrics.followers_count === "number" ? metrics.followers_count : null };
  });
  const experiments: GrowthExperimentRecord[] = (experimentRows ?? []).map((row) => ({
    id: row.id as string, title: row.title as string, hypothesis: row.hypothesis as string, variable: row.variable as string,
    variantA: row.variant_a as string, variantB: row.variant_b as string, primaryMetric: row.primary_metric as string,
    minimumSampleSize: Number(row.minimum_sample_size), status: row.status as string, createdAt: row.created_at as string,
  }));
  return {
    mode: "real" as const,
    connection: account ? { username: account.username as string, connected: account.connection_status === "CONNECTED", insightsEnabled: Boolean(capability?.insights), tokenExpiresAt: account.token_expires_at as string } : null,
    syncRun,
    intelligence: buildGrowthIntelligence(posts, accountSnapshots),
    posts,
    experiments,
    storedReviews: reviewRows ?? [],
  };
}
