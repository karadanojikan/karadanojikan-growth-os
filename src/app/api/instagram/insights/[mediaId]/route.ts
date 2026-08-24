import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInstagramConfig } from "@/lib/instagram-config";
import { decryptSecret } from "@/lib/instagram-crypto";
import { MetaInstagramClient, MetaApiError } from "@/lib/meta-instagram";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";
import { createAdminClient } from "@/lib/supabase/admin";

const MediaIdSchema = z.string().regex(/^\d+$/);
const supportedMetrics = ["comments", "likes", "reach", "saved", "shares", "views"] as const;

export async function GET(_request: Request, context: { params: Promise<{ mediaId: string }> }) {
  try {
    const mediaId = MediaIdSchema.parse((await context.params).mediaId);
    const { supabase, workspaceId } = await requireWorkspaceContext();
    const { data: published } = await supabase.from("published_posts").select("id,instagram_account_id").eq("workspace_id", workspaceId).eq("external_media_id", mediaId).maybeSingle();
    if (!published) return NextResponse.json({ error: "この投稿はワークスペースに記録されていません。" }, { status: 404 });
    const [{ data: account }, { data: capabilities }] = await Promise.all([
      supabase.from("instagram_accounts").select("token_ciphertext,connection_status,token_expires_at").eq("id", published.instagram_account_id).maybeSingle(),
      supabase.from("instagram_capabilities").select("insights").eq("instagram_account_id", published.instagram_account_id).maybeSingle(),
    ]);
    if (!account?.token_ciphertext || account.connection_status !== "CONNECTED" || !capabilities?.insights) return NextResponse.json({ error: "Instagram Insights Capabilityが利用できません。" }, { status: 409 });
    const config = requireInstagramConfig();
    const client = new MetaInstagramClient(decryptSecret(account.token_ciphertext, config.encryptionKey), config.apiVersion);
    const details = await client.getMediaDetails(mediaId);
    const metrics: Record<string, unknown> = {};
    const unavailable: string[] = [];
    for (const metric of supportedMetrics) {
      try { metrics[metric] = (await client.getMediaInsights(mediaId, [metric])).data; }
      catch (error) { if (error instanceof MetaApiError && error.status === 400) unavailable.push(metric); else throw error; }
    }
    const admin = createAdminClient();
    const measurementWindow = `ON_DEMAND:${new Date().toISOString().slice(0, 10)}`;
    const { error: storeError } = await admin.from("insight_snapshots").upsert({ workspace_id: workspaceId, published_post_id: published.id, measurement_window: measurementWindow, metrics: { ...metrics, mediaProductType: details.media_product_type ?? "UNKNOWN", unavailable }, attribution: "DIRECT", captured_at: new Date().toISOString() }, { onConflict: "published_post_id,measurement_window" });
    if (storeError) throw storeError;
    return NextResponse.json({ media: details, metrics, unavailable, attribution: "DIRECT" });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Instagram Media IDが不正です。" }, { status: 400 });
    if (error instanceof MetaApiError && (error.status === 401 || error.status === 403)) return NextResponse.json({ error: "Instagramの再接続が必要です。" }, { status: 409 });
    return NextResponse.json({ error: "Instagram実測値を取得できませんでした。" }, { status: 502 });
  }
}
