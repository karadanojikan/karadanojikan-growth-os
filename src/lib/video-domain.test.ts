import { describe, expect, it } from "vitest";
import { checkMediaRights, createInitialEdl, findEditCandidates, metadataOrientation, nextEdlVersion, runVideoQc, scriptToTranscript, wordsToSubtitleCues, type VideoMetadata } from "./video-domain";

const metadata: VideoMetadata = {
  width: 1080, height: 1920, durationSeconds: 12, fps: 30, codec: "h264", hasAudio: true,
  byteSize: 1200000, orientation: "PORTRAIT", container: "mp4", probeProvider: "FFPROBE", integrity: "OK",
};

describe("Phase 2 video domain", () => {
  it("detects orientation without guessing", () => {
    expect(metadataOrientation(1080, 1920)).toBe("PORTRAIT");
    expect(metadataOrientation(1920, 1080)).toBe("LANDSCAPE");
    expect(metadataOrientation(1000, 1000)).toBe("SQUARE");
  });

  it("builds subtitle cues that stay inside the two-line contract", () => {
    const transcript = scriptToTranscript("最初に肩の力を抜きます。次にゆっくり呼吸します。", 8);
    const cues = wordsToSubtitleCues(transcript.words);
    expect(cues.length).toBeGreaterThan(0);
    expect(cues.every((cue) => cue.lines.length <= 2 && cue.lines.every((line) => line.length <= 22))).toBe(true);
  });

  it("keeps silence decisions as reviewable candidates", () => {
    const candidates = findEditCandidates([
      { startSeconds: 0, endSeconds: 0.8, confidence: 0.9 },
      { startSeconds: 4, endSeconds: 5.4, confidence: 0.8 },
    ], 12);
    expect(candidates.map((item) => item.kind)).toEqual(["LEADING_SILENCE", "LONG_SILENCE"]);
    expect(candidates.every((item) => item.recommendation === "REVIEW")).toBe(true);
  });

  it("versions edits and never mutates source media", () => {
    const edl = createInitialEdl({ assetId: "asset-1", metadata, transcript: scriptToTranscript("テストです。", 12), style: "EDUCATIONAL" });
    const next = nextEdlVersion(edl, { hook: "新しいHook" });
    expect(next.version).toBe(2);
    expect(next.sourceImmutable).toBe(true);
    expect(edl.hook).toBe("");
  });

  it("blocks customer media without explicit Instagram consent", () => {
    const result = checkMediaRights({
      isCustomerMedia: true, consentStatus: "approved", approvedPlatforms: [], approvedUsage: [],
      expiresAt: null, musicLicenseStatus: "not_applicable",
    });
    expect(result.allowed).toBe(false);
  });

  it("reports pending post-render QC honestly", () => {
    const edl = createInitialEdl({ assetId: "asset-1", metadata, transcript: scriptToTranscript("テストです。", 12), style: "NATURAL" });
    const qc = runVideoQc(metadata, edl);
    expect(qc.status).toBe("REVIEW");
    expect(qc.checks.find((check) => check.code === "black_frames")?.status).toBe("PENDING");
  });
});
