import "server-only";
import { requireInstagramConfig } from "./instagram-config";
import { decryptSecret } from "./instagram-crypto";
import { buildPeriodReview, measurementWindowFor, normalizeMetaInsightData, type DirectMetrics, type MeasuredPost } from "./growth-intelligence";
import { MetaApiError, MetaInstagramClient } from "./meta-instagram";
import { createAdminClient } from "./supabase/admin";

const METRICS = ["comments", "likes", "reach", "saved", "shares", "views"] as const;
const MAX_MEDIA_DISCOVERY = 25;
const MAX_MEDIA_PER_SYNC = 8;
const MAX_METRIC_CALLS = MAX_MEDIA_PER_SYNC * METRICS.length;

type SyncInput = {
  workspaceId: string;
  userId: string;
  account: { id: string; external_account_id: string; token_ciphertext: string; token_expires_at: string };
};

export class InsightSyncError extends Error {
  constructor(readonly code: "SYNC_IN_PROGRESS" | "SYNC_TOO_SOON" | "RECONNECT_REQUIRED" | "RATE_LIMITED" | "FAILED", message: string) { super(message); }
}

export async function syncInstagramInsights(input: SyncInput) {
  const admin = createAdminClient();
  const now = new Date();
  const { data: lastRun } = await admin.from("instagram_insight_sync_runs")
    .select("status,started_at,completed_at").eq("workspace_id", input.workspaceId).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (lastRun?.status === "RUNNING" && now.getTime() - new Date(lastRun.started_at).getTime() < 10 * 60_000) {
    throw new InsightSyncError("SYNC_IN_PROGRESS", "別の同期が進行中です。完了後に再読み込みしてください。");
  }
  if (lastRun?.completed_at && now.getTime() - new Date(lastRun.completed_at).getTime() < 30_000) {
    throw new InsightSyncError("SYNC_TOO_SOON", "直前の同期から30秒後にもう一度お試しください。");
  }

  const { data: run, error: runError } = await admin.from("instagram_insight_sync_runs").insert({
    workspace_id: input.workspaceId, instagram_account_id: input.account.id, requested_by: input.userId, status: "RUNNING",
  }).select("id").single();
  if (runError || !run) {
    console.error("instagram_insight_sync_start_failed", { code: runError?.code ?? "NO_ROW", message: runError?.message ?? "Insert returned no row", details: runError?.details ?? null, hint: runError?.hint ?? null });
    throw new InsightSyncError("FAILED", `同期記録を開始できませんでした。(${runError?.code ?? "NO_ROW"})`);
  }

  let apiCalls = 0; let mediaMeasured = 0; let unavailableCount = 0; let rateLimited = false;
  try {
    if (new Date(input.account.token_expires_at) <= now) throw new InsightSyncError("RECONNECT_REQUIRED", "Instagramの再接続が必要です。");
    const config = requireInstagramConfig();
    const client = new MetaInstagramClient(decryptSecret(input.account.token_ciphertext, config.encryptionKey), config.apiVersion);
    const page = await client.getOwnedMedia({ accountId: input.account.external_account_id, limit: MAX_MEDIA_DISCOVERY });
    apiCalls += 1;
    const ownedMedia = page.data.filter((item) => item.timestamp && item.id).slice(0, MAX_MEDIA_DISCOVERY);
    const externalIds = ownedMedia.map((item) => item.id);
    const { data: published } = externalIds.length ? await admin.from("published_posts")
      .select("external_media_id,content_item_id").eq("workspace_id", input.workspaceId).in("external_media_id", externalIds) : { data: [] };
    const contentByExternalId = new Map((published ?? []).map((item) => [String(item.external_media_id), item.content_item_id as string]));

    const mediaRows = ownedMedia.map((item) => ({
      workspace_id: input.workspaceId,
      instagram_account_id: input.account.id,
      content_item_id: contentByExternalId.get(item.id) ?? null,
      external_media_id: item.id,
      media_type: item.media_type ?? "UNKNOWN",
      media_product_type: item.media_product_type ?? "UNKNOWN",
      permalink: item.permalink ?? null,
      caption: item.caption?.slice(0, 10000) ?? null,
      published_at: new Date(item.timestamp!).toISOString(),
      last_synced_at: now.toISOString(),
    }));
    const { data: storedMedia, error: mediaError } = mediaRows.length
      ? await admin.from("instagram_media").upsert(mediaRows, { onConflict: "instagram_account_id,external_media_id" }).select("id,external_media_id,media_product_type,caption,permalink,published_at")
      : { data: [], error: null };
    if (mediaError) throw mediaError;

    const storedIds = (storedMedia ?? []).map((item) => item.id as string);
    const { data: existingSnapshots } = storedIds.length ? await admin.from("media_insight_snapshots").select("instagram_media_id,captured_at").in("instagram_media_id", storedIds).order("captured_at", { ascending: true }) : { data: [] };
    const oldestCapture = new Map<string, string>();
    for (const snapshot of existingSnapshots ?? []) if (!oldestCapture.has(snapshot.instagram_media_id as string)) oldestCapture.set(snapshot.instagram_media_id as string, snapshot.captured_at as string);
    const measurementCandidates = [...(storedMedia ?? [])].sort((left, right) => {
      const leftCaptured = oldestCapture.get(left.id as string); const rightCaptured = oldestCapture.get(right.id as string);
      if (!leftCaptured && rightCaptured) return -1;
      if (leftCaptured && !rightCaptured) return 1;
      return (leftCaptured ?? "").localeCompare(rightCaptured ?? "");
    }).slice(0, MAX_MEDIA_PER_SYNC);
    const measuredPosts: MeasuredPost[] = [];
    for (const media of measurementCandidates) {
      const ageMs = now.getTime() - new Date(media.published_at).getTime();
      const unavailable: string[] = [];
      const metrics: DirectMetrics = {};
      if (media.media_product_type === "STORY" || ageMs > 2 * 365 * 86_400_000) {
        unavailable.push(...METRICS);
      } else {
        for (const metric of METRICS) {
          if (apiCalls >= 1 + MAX_METRIC_CALLS) { rateLimited = true; break; }
          try {
            const response = await client.getMediaInsights(String(media.external_media_id), [metric]);
            apiCalls += 1;
            const value = normalizeMetaInsightData(response)[metric];
            if (value === undefined) unavailable.push(metric); else metrics[metric] = value;
          } catch (error) {
            apiCalls += 1;
            if (error instanceof MetaApiError && error.status === 400) unavailable.push(metric);
            else if (error instanceof MetaApiError && error.status === 429) { rateLimited = true; break; }
            else throw error;
          }
        }
      }
      unavailableCount += unavailable.length;
      const measurementWindow = measurementWindowFor(media.published_at, now);
      const { error: snapshotError } = await admin.from("media_insight_snapshots").upsert({
        workspace_id: input.workspaceId, instagram_media_id: media.id, measurement_window: measurementWindow,
        metrics, unavailable_metrics: unavailable, attribution: "DIRECT", captured_at: now.toISOString(),
      }, { onConflict: "instagram_media_id,measurement_window" });
      if (snapshotError) throw snapshotError;
      mediaMeasured += 1;
      measuredPosts.push({
        id: media.id, externalMediaId: String(media.external_media_id), mediaProductType: String(media.media_product_type),
        caption: media.caption as string | null, permalink: media.permalink as string | null, publishedAt: media.published_at,
        capturedAt: now.toISOString(), measurementWindow, metrics,
      });
      if (rateLimited) break;
    }

    if (!rateLimited) try {
      const snapshot = await client.getAccountSnapshot(input.account.external_account_id); apiCalls += 1;
      await admin.from("account_insights").insert({
        workspace_id: input.workspaceId, instagram_account_id: input.account.id,
        metrics: { followers_count: snapshot.followers_count ?? null, follows_count: snapshot.follows_count ?? null, media_count: snapshot.media_count ?? null, attribution: "ACCOUNT_LEVEL" },
        captured_at: now.toISOString(),
      });
    } catch (error) {
      if (!(error instanceof MetaApiError && error.status === 400)) throw error;
    }

    for (const periodType of ["WEEKLY", "MONTHLY"] as const) {
      const review = buildPeriodReview(measuredPosts, periodType, now);
      const { error: reviewError } = await admin.from("growth_reviews").upsert({
        workspace_id: input.workspaceId, period_type: periodType, period_start: review.periodStart, period_end: review.periodEnd,
        sample_size: review.sampleSize, confidence: review.confidence, review, generated_at: now.toISOString(),
      }, { onConflict: "workspace_id,period_type,period_start" });
      if (reviewError) throw reviewError;
    }

    const status = rateLimited ? "PARTIAL" : "COMPLETED";
    await admin.from("instagram_insight_sync_runs").update({ status, media_found: ownedMedia.length, media_measured: mediaMeasured, api_calls: apiCalls, unavailable_metrics: unavailableCount, error_code: rateLimited ? "META_RATE_LIMIT" : null, completed_at: now.toISOString() }).eq("id", run.id);
    await admin.from("audit_logs").insert({ workspace_id: input.workspaceId, actor_user_id: input.userId, action: "instagram.insights.synced", subject_type: "instagram_account", subject_id: input.account.id, metadata: { status, mediaFound: ownedMedia.length, mediaMeasured, apiCalls, unavailableMetrics: unavailableCount, readOnly: true } });
    return { status, mediaFound: ownedMedia.length, mediaMeasured, unavailableMetrics: unavailableCount, nextCursorAvailable: Boolean(page.paging?.cursors?.after) };
  } catch (error) {
    const reconnect = error instanceof InsightSyncError && error.code === "RECONNECT_REQUIRED" || error instanceof MetaApiError && (error.status === 401 || error.status === 403 || error.code === 190);
    const limited = error instanceof MetaApiError && error.status === 429;
    await admin.from("instagram_insight_sync_runs").update({ status: "FAILED", media_measured: mediaMeasured, api_calls: apiCalls, unavailable_metrics: unavailableCount, error_code: reconnect ? "RECONNECT_REQUIRED" : limited ? "META_RATE_LIMIT" : "SYNC_FAILED", completed_at: new Date().toISOString() }).eq("id", run.id);
    if (reconnect) throw new InsightSyncError("RECONNECT_REQUIRED", "Instagramの再接続が必要です。");
    if (limited) throw new InsightSyncError("RATE_LIMITED", "Meta APIの利用上限に達しました。時間をおいて再実行してください。");
    if (error instanceof InsightSyncError) throw error;
    throw new InsightSyncError("FAILED", "Instagram実測値を取得できませんでした。");
  }
}
