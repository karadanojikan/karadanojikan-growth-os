import { NextResponse } from "next/server";
import { z } from "zod";
import { MediaRightsSchema, VideoMetadataSchema } from "@/lib/video-domain";
import { RequestContextError, requireWorkspaceContext } from "@/lib/request-context";

const UploadRequestSchema = z.object({
  filename: z.string().min(1).max(180),
  contentType: z.enum(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]),
  byteSize: z.number().int().positive().max(524288000),
  metadata: VideoMetadataSchema,
  rights: MediaRightsSchema,
});

function safeExtension(filename: string) {
  const extension = filename.split(".").at(-1)?.toLowerCase() ?? "mp4";
  return /^[a-z0-9]{2,5}$/.test(extension) ? extension : "mp4";
}

export async function POST(request: Request) {
  try {
    const input = UploadRequestSchema.parse(await request.json());
    const { supabase, userId, workspaceId } = await requireWorkspaceContext();
    const assetId = crypto.randomUUID();
    const path = `${workspaceId}/${assetId}/original.${safeExtension(input.filename)}`;
    const { error: assetError } = await supabase.from("media_assets").insert({
      id: assetId, workspace_id: workspaceId, storage_key: path, original_filename: input.filename,
      media_type: input.contentType, byte_size: input.byteSize, metadata: input.metadata,
      is_customer_media: input.rights.isCustomerMedia, created_by: userId,
    });
    if (assetError) throw assetError;
    const { error: rightsError } = await supabase.from("media_asset_rights").insert({
      workspace_id: workspaceId, media_asset_id: assetId, consent_status: input.rights.consentStatus,
      approved_platforms: input.rights.approvedPlatforms, approved_usage: input.rights.approvedUsage,
      music_license_status: input.rights.musicLicenseStatus, expires_at: input.rights.expiresAt,
    });
    if (rightsError) throw rightsError;
    const { data, error: signedError } = await supabase.storage.from("video-assets").createSignedUploadUrl(path);
    if (signedError) throw signedError;
    return NextResponse.json({ assetId, path, token: data.token });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "動画または権利情報が不正です。" }, { status: 400 });
    console.error("video_upload_prepare_failed", error);
    return NextResponse.json({ error: "アップロードを準備できませんでした。" }, { status: 500 });
  }
}
