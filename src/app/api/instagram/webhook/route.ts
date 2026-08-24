import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInstagramConfig } from "@/lib/instagram-config";
import { encryptSecret } from "@/lib/instagram-crypto";
import { InstagramWebhookSchema, verifyMetaWebhookSignature, webhookEventType, webhookPayloadHash } from "@/lib/instagram-webhook";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  try {
    const config = requireInstagramConfig();
    if (mode !== "subscribe" || token !== config.webhookVerifyToken || !challenge) return new NextResponse("Forbidden", { status: 403 });
    return new NextResponse(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  } catch {
    return new NextResponse("Unavailable", { status: 503 });
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const config = requireInstagramConfig();
    if (!verifyMetaWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"), config.appSecret)) return new NextResponse("Invalid signature", { status: 401 });
    const payload = InstagramWebhookSchema.parse(JSON.parse(rawBody));
    const accountExternalId = payload[0]!.entry[0]!.id;
    const eventHash = webhookPayloadHash(rawBody);
    const admin = createAdminClient();
    const { data: account } = await admin.from("instagram_accounts").select("workspace_id").eq("external_account_id", accountExternalId).maybeSingle();
    const { error } = await admin.from("webhook_events").upsert({
      workspace_id: account?.workspace_id ?? null,
      provider: "META_INSTAGRAM",
      external_event_id: eventHash,
      payload_hash: eventHash,
      event_type: webhookEventType(payload),
      external_account_id: accountExternalId,
      payload_ciphertext: encryptSecret(rawBody, config.encryptionKey),
      signature_version: "sha256",
      status: account ? "RECEIVED" : "UNMATCHED_ACCOUNT",
    }, { onConflict: "provider,external_event_id", ignoreDuplicates: true });
    if (error) throw error;
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return new NextResponse("Invalid payload", { status: 400 });
    console.error("instagram_webhook_store_failed", error instanceof Error ? error.name : "unknown");
    return new NextResponse("Unavailable", { status: 503 });
  }
}
