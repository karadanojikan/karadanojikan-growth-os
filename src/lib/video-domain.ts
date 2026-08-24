import { z } from "zod";

export const VideoStyleSchema = z.enum(["NATURAL", "EDUCATIONAL", "SHORT", "STORY"]);
export type VideoStyle = z.infer<typeof VideoStyleSchema>;

export const VideoJobStageSchema = z.enum([
  "QUEUED",
  "ANALYZING",
  "TRANSCRIBING",
  "PLANNING",
  "RENDERING",
  "QUALITY_CHECK",
  "READY",
  "FAILED",
]);
export type VideoJobStage = z.infer<typeof VideoJobStageSchema>;

export const VideoMetadataSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationSeconds: z.number().positive().max(3600),
  fps: z.number().positive().max(240),
  codec: z.string().min(1),
  hasAudio: z.boolean(),
  byteSize: z.number().int().nonnegative(),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE", "SQUARE"]),
  container: z.string().min(1),
  probeProvider: z.enum(["BROWSER", "FFPROBE", "FIXTURE"]),
  integrity: z.enum(["OK", "CORRUPT", "UNVERIFIED"]),
});
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;

export const TranscriptWordSchema = z.object({
  text: z.string().min(1).max(100),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  confidence: z.number().min(0).max(1).nullable(),
}).refine((word) => word.endSeconds > word.startSeconds, "Word end must follow start");
export type TranscriptWord = z.infer<typeof TranscriptWordSchema>;

export const TranscriptSchema = z.object({
  provider: z.enum(["OPENAI", "LOCAL_WHISPER", "SCRIPT_SYNC", "MANUAL", "FIXTURE"]),
  status: z.enum(["VERIFIED", "NEEDS_REVIEW", "UNAVAILABLE"]),
  language: z.string().min(2).max(12),
  words: z.array(TranscriptWordSchema),
  createdAt: z.string().datetime(),
});
export type Transcript = z.infer<typeof TranscriptSchema>;

export const SilenceRangeSchema = z.object({
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  confidence: z.number().min(0).max(1),
}).refine((range) => range.endSeconds > range.startSeconds, "Silence end must follow start");
export type SilenceRange = z.infer<typeof SilenceRangeSchema>;

export const EditCandidateSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["LEADING_SILENCE", "TRAILING_SILENCE", "LONG_SILENCE", "PAUSE", "RETAKE"]),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  recommendation: z.enum(["REMOVE", "REVIEW", "KEEP"]),
  reason: z.string().min(1),
}).refine((candidate) => candidate.endSeconds > candidate.startSeconds, "Candidate end must follow start");
export type EditCandidate = z.infer<typeof EditCandidateSchema>;

export const SubtitleCueSchema = z.object({
  id: z.string().min(1),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  lines: z.array(z.string().min(1).max(22)).min(1).max(2),
  emphasis: z.array(z.string().min(1).max(20)).max(3),
  safeArea: z.literal("REELS_9_16_BOTTOM"),
}).refine((cue) => cue.endSeconds > cue.startSeconds, "Subtitle end must follow start");
export type SubtitleCue = z.infer<typeof SubtitleCueSchema>;

export const EdlClipSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  sourceStart: z.number().nonnegative(),
  sourceEnd: z.number().positive(),
  timelineStart: z.number().nonnegative(),
  crop: z.enum(["FIT", "FILL", "CUSTOM"]),
  zoom: z.number().min(1).max(3),
  volume: z.number().min(0).max(2),
  playbackRate: z.number().min(0.5).max(2),
  transition: z.enum(["NONE", "CUT", "FADE"]),
}).refine((clip) => clip.sourceEnd > clip.sourceStart, "Clip end must follow start");
export type EdlClip = z.infer<typeof EdlClipSchema>;

export const AudioPolicySchema = z.object({
  normalizeVoice: z.boolean(),
  reduceNoise: z.boolean(),
  fadeInSeconds: z.number().min(0).max(3),
  fadeOutSeconds: z.number().min(0).max(3),
  duckMusicUnderVoice: z.boolean(),
  musicSource: z.enum(["NONE", "OWNED", "LICENSED", "ROYALTY_FREE", "INSTAGRAM_MANUAL"]),
  musicLicenseReference: z.string().nullable(),
});

export const VideoEdlSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.number().int().positive(),
  assetId: z.string().min(1),
  style: VideoStyleSchema,
  fps: z.number().positive().max(60),
  width: z.literal(1080),
  height: z.literal(1920),
  clips: z.array(EdlClipSchema).min(1),
  subtitles: z.array(SubtitleCueSchema),
  editCandidates: z.array(EditCandidateSchema),
  audio: AudioPolicySchema,
  hook: z.string().max(42),
  coverText: z.string().max(24),
  createdAt: z.string().datetime(),
  sourceImmutable: z.literal(true),
});
export type VideoEdl = z.infer<typeof VideoEdlSchema>;

export const MediaRightsSchema = z.object({
  isCustomerMedia: z.boolean(),
  consentStatus: z.enum(["unknown", "requested", "approved", "rejected", "expired"]),
  approvedPlatforms: z.array(z.string()),
  approvedUsage: z.array(z.string()),
  expiresAt: z.string().datetime().nullable(),
  musicLicenseStatus: z.enum(["not_applicable", "approved", "unknown", "rejected", "expired"]),
});
export type MediaRights = z.infer<typeof MediaRightsSchema>;

export const QcCheckSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["PASS", "WARN", "FAIL", "PENDING"]),
  detail: z.string().min(1),
});
export const VideoQcResultSchema = z.object({
  status: z.enum(["PASS", "REVIEW", "FAIL", "PENDING"]),
  checks: z.array(QcCheckSchema).min(1),
  checkedAt: z.string().datetime(),
});
export type VideoQcResult = z.infer<typeof VideoQcResultSchema>;

export function metadataOrientation(width: number, height: number): VideoMetadata["orientation"] {
  if (width === height) return "SQUARE";
  return height > width ? "PORTRAIT" : "LANDSCAPE";
}

function splitSubtitleLines(text: string): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= 18) return [normalized];
  const midpoint = Math.ceil(normalized.length / 2);
  const nearbySpace = normalized.lastIndexOf(" ", midpoint);
  const splitAt = nearbySpace > 5 ? nearbySpace : midpoint;
  return [normalized.slice(0, splitAt).trim(), normalized.slice(splitAt).trim()].filter(Boolean).slice(0, 2);
}

export function wordsToSubtitleCues(words: TranscriptWord[]): SubtitleCue[] {
  const validWords = z.array(TranscriptWordSchema).parse(words);
  const cues: SubtitleCue[] = [];
  let group: TranscriptWord[] = [];
  const flush = () => {
    if (!group.length) return;
    const first = group[0]!;
    const last = group[group.length - 1]!;
    const text = group.map((word) => word.text).join("").slice(0, 42);
    cues.push(SubtitleCueSchema.parse({
      id: `caption-${cues.length + 1}`,
      startSeconds: first.startSeconds,
      endSeconds: last.endSeconds,
      lines: splitSubtitleLines(text),
      emphasis: [],
      safeArea: "REELS_9_16_BOTTOM",
    }));
    group = [];
  };
  for (const word of validWords) {
    const currentLength = group.reduce((sum, item) => sum + item.text.length, 0);
    const previous = group.at(-1);
    const first = group[0];
    const gap = previous ? word.startSeconds - previous.endSeconds : 0;
    if (first && (currentLength + word.text.length > 36 || gap > 0.65 || word.endSeconds - first.startSeconds > 3.2)) flush();
    group.push(word);
  }
  flush();
  return cues;
}

export function findEditCandidates(silences: SilenceRange[], durationSeconds: number): EditCandidate[] {
  const parsed = z.array(SilenceRangeSchema).parse(silences);
  return parsed.flatMap((silence, index) => {
    const duration = silence.endSeconds - silence.startSeconds;
    const kind: EditCandidate["kind"] = silence.startSeconds <= 0.35
      ? "LEADING_SILENCE"
      : durationSeconds - silence.endSeconds <= 0.35
        ? "TRAILING_SILENCE"
        : duration >= 1.2 ? "LONG_SILENCE" : "PAUSE";
    if (duration < 0.55 && kind === "PAUSE") return [];
    return [{
      id: `candidate-${index + 1}`,
      kind,
      startSeconds: silence.startSeconds,
      endSeconds: silence.endSeconds,
      recommendation: kind === "PAUSE" ? "KEEP" as const : "REVIEW" as const,
      reason: kind === "PAUSE" ? "自然な間として保持します。" : "自動削除せず、プレビューで確認する候補です。",
    }];
  });
}

export function createInitialEdl(input: {
  assetId: string;
  metadata: VideoMetadata;
  transcript: Transcript;
  silences?: SilenceRange[];
  style: VideoStyle;
  hook?: string;
  coverText?: string;
  version?: number;
}): VideoEdl {
  const metadata = VideoMetadataSchema.parse(input.metadata);
  const transcript = TranscriptSchema.parse(input.transcript);
  const candidates = findEditCandidates(input.silences ?? [], metadata.durationSeconds);
  return VideoEdlSchema.parse({
    schemaVersion: 1,
    version: input.version ?? 1,
    assetId: input.assetId,
    style: input.style,
    fps: Math.min(60, metadata.fps || 30),
    width: 1080,
    height: 1920,
    clips: [{
      id: "clip-1",
      assetId: input.assetId,
      sourceStart: 0,
      sourceEnd: metadata.durationSeconds,
      timelineStart: 0,
      crop: "FILL",
      zoom: 1,
      volume: 1,
      playbackRate: 1,
      transition: "NONE",
    }],
    subtitles: wordsToSubtitleCues(transcript.words),
    editCandidates: candidates,
    audio: {
      normalizeVoice: true,
      reduceNoise: false,
      fadeInSeconds: 0.12,
      fadeOutSeconds: 0.2,
      duckMusicUnderVoice: true,
      musicSource: "NONE",
      musicLicenseReference: null,
    },
    hook: input.hook ?? "",
    coverText: input.coverText ?? input.hook?.slice(0, 24) ?? "",
    createdAt: new Date().toISOString(),
    sourceImmutable: true,
  });
}

export function nextEdlVersion(edl: VideoEdl, patch: Partial<Pick<VideoEdl, "clips" | "subtitles" | "style" | "hook" | "coverText" | "audio">>): VideoEdl {
  return VideoEdlSchema.parse({ ...edl, ...patch, version: edl.version + 1, createdAt: new Date().toISOString(), sourceImmutable: true });
}

export function checkMediaRights(rights: MediaRights, now = new Date()): { allowed: boolean; reasons: string[] } {
  const parsed = MediaRightsSchema.parse(rights);
  const reasons: string[] = [];
  if (parsed.isCustomerMedia && parsed.consentStatus !== "approved") reasons.push("お客様素材には承認済みの同意が必要です。");
  if (parsed.isCustomerMedia && !parsed.approvedPlatforms.includes("instagram")) reasons.push("Instagramでの利用許可がありません。");
  if (parsed.expiresAt && new Date(parsed.expiresAt) <= now) reasons.push("素材の利用同意期限が切れています。");
  if (["unknown", "rejected", "expired"].includes(parsed.musicLicenseStatus)) reasons.push("音源の利用権を確認できません。");
  return { allowed: reasons.length === 0, reasons };
}

export function runVideoQc(metadata: VideoMetadata, edl: VideoEdl): VideoQcResult {
  const parsedMetadata = VideoMetadataSchema.parse(metadata);
  const parsedEdl = VideoEdlSchema.parse(edl);
  const duration = parsedEdl.clips.reduce((sum, clip) => sum + (clip.sourceEnd - clip.sourceStart) / clip.playbackRate, 0);
  const checks: z.infer<typeof QcCheckSchema>[] = [
    { code: "integrity", label: "ファイル整合性", status: parsedMetadata.integrity === "CORRUPT" ? "FAIL" : parsedMetadata.integrity === "UNVERIFIED" ? "WARN" : "PASS", detail: parsedMetadata.integrity === "OK" ? "動画を読み取れました。" : "ffprobeでの最終確認が必要です。" },
    { code: "resolution", label: "9:16解像度", status: parsedMetadata.orientation === "PORTRAIT" ? "PASS" : "WARN", detail: parsedMetadata.orientation === "PORTRAIT" ? `${parsedMetadata.width}×${parsedMetadata.height}` : "縦長にクロップして確認します。" },
    { code: "duration", label: "尺", status: duration > 0 && duration <= 90 ? "PASS" : "FAIL", detail: `${duration.toFixed(1)}秒` },
    { code: "codec", label: "コーデック", status: /h264|avc/i.test(parsedMetadata.codec) ? "PASS" : "WARN", detail: `${parsedMetadata.codec} / ${parsedMetadata.container}` },
    { code: "audio", label: "音声", status: parsedMetadata.hasAudio ? "PASS" : "WARN", detail: parsedMetadata.hasAudio ? "音声ストリームあり" : "音声ストリーム未確認" },
    { code: "subtitle", label: "字幕セーフエリア", status: parsedEdl.subtitles.every((cue) => cue.lines.length <= 2 && cue.lines.every((line) => line.length <= 22)) ? "PASS" : "FAIL", detail: "最大2行・1行22文字以内" },
    { code: "black_frames", label: "黒フレーム", status: "PENDING", detail: "レンダー後のffmpeg QCで確認します。" },
    { code: "clipping", label: "音割れ", status: "PENDING", detail: "レンダー後のラウドネスQCで確認します。" },
    { code: "file_size", label: "出力サイズ", status: "PENDING", detail: "レンダー後に確認します。" },
  ];
  const status = checks.some((check) => check.status === "FAIL") ? "FAIL" : checks.some((check) => check.status === "WARN" || check.status === "PENDING") ? "REVIEW" : "PASS";
  return VideoQcResultSchema.parse({ status, checks, checkedAt: new Date().toISOString() });
}

export function scriptToTranscript(script: string, durationSeconds: number): Transcript {
  const tokens = script.trim().split(/(?<=[。！？、\s])/u).map((item) => item.trim()).filter(Boolean);
  if (!tokens.length) return { provider: "SCRIPT_SYNC", status: "NEEDS_REVIEW", language: "ja", words: [], createdAt: new Date().toISOString() };
  const usableDuration = Math.max(0.5, durationSeconds - 0.4);
  const unit = usableDuration / tokens.length;
  return TranscriptSchema.parse({
    provider: "SCRIPT_SYNC",
    status: "NEEDS_REVIEW",
    language: "ja",
    words: tokens.map((text, index) => ({
      text,
      startSeconds: 0.2 + index * unit,
      endSeconds: Math.min(durationSeconds, 0.2 + (index + 1) * unit),
      confidence: null,
    })),
    createdAt: new Date().toISOString(),
  });
}
