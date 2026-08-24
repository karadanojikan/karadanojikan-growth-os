import { copyFile, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { bundle } from "@remotion/bundler";
import { getSilentParts, getVideoMetadata, renderMedia, selectComposition } from "@remotion/renderer";

const require = createRequire(import.meta.url);

function compositorPackageCandidates() {
  if (process.platform === "darwin") return [`@remotion/compositor-darwin-${process.arch}`];
  if (process.platform === "win32") return [`@remotion/compositor-win32-${process.arch}-msvc`];
  return [`@remotion/compositor-linux-${process.arch}-gnu`, `@remotion/compositor-linux-${process.arch}-musl`];
}

function ffmpegBinary() {
  for (const packageName of compositorPackageCandidates()) {
    try { return path.join(path.dirname(require.resolve(packageName)), process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"); }
    catch { /* Try the next platform package. */ }
  }
  return null;
}

function runBinary(binary, args) {
  return new Promise((resolve, reject) => {
    const binaryDirectory = path.dirname(binary);
    const child = spawn(binary, args, {
      cwd: binaryDirectory,
      env: { ...process.env, DYLD_LIBRARY_PATH: binaryDirectory, LD_LIBRARY_PATH: binaryDirectory },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout.push(chunk); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout: Buffer.concat(stdout), stderr }) : reject(new Error(`ffmpeg exited with ${code}: ${stderr.slice(-1000)}`)));
  });
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function captionsToSubtitleCues(captions, durationSeconds) {
  const cues = [];
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const text = group.map((caption) => caption.text.trim()).join("").slice(0, 42);
    const midpoint = Math.ceil(text.length / 2);
    cues.push({
      id: `caption-${cues.length + 1}`,
      startSeconds: group[0].startMs / 1000,
      endSeconds: Math.min(durationSeconds, group.at(-1).endMs / 1000),
      lines: text.length <= 18 ? [text] : [text.slice(0, midpoint), text.slice(midpoint)].filter(Boolean),
      emphasis: [], safeArea: "REELS_9_16_BOTTOM",
    });
    group = [];
  };
  for (const caption of captions.filter((item) => item.startMs / 1000 < durationSeconds)) {
    const length = group.reduce((sum, item) => sum + item.text.trim().length, 0);
    if (group.length && (length + caption.text.trim().length > 36 || caption.endMs - group[0].startMs > 3200)) flush();
    if (caption.text.trim()) group.push(caption);
  }
  flush();
  return cues;
}

async function transcribeLocally(inputPath, workingDirectory, durationSeconds) {
  const whisperPath = path.resolve(".cache/whisper.cpp");
  const modelFile = path.join(whisperPath, "ggml-base.bin");
  if (!existsSync(modelFile) || process.argv.includes("--skip-transcription")) return { status: "UNAVAILABLE", reason: process.argv.includes("--skip-transcription") ? "SKIPPED" : "MODEL_NOT_INSTALLED" };
  const binary = ffmpegBinary();
  if (!binary) return { status: "UNAVAILABLE", reason: "FFMPEG_NOT_AVAILABLE" };
  const wavPath = path.join(workingDirectory, "transcription-16khz.wav");
  await runBinary(binary, ["-hide_banner", "-loglevel", "error", "-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", "-y", wavPath]);
  const { toCaptions, transcribe } = await import("@remotion/install-whisper-cpp");
  const whisperOutput = await transcribe({
    inputPath: wavPath, whisperPath, whisperCppVersion: "1.5.5", model: "base", modelFolder: whisperPath, language: "ja",
    tokenLevelTimestamps: true, printOutput: false, splitOnWord: true,
    onProgress: (progress) => process.stdout.write(`TRANSCRIBE ${Math.min(100, Math.round(progress * 100))}%\r`),
  });
  const { captions } = toCaptions({ whisperCppOutput: whisperOutput });
  return {
    status: "NEEDS_REVIEW", provider: "LOCAL_WHISPER", language: whisperOutput.result.language,
    words: captions.filter((caption) => caption.startMs / 1000 < durationSeconds).map((caption) => ({ text: caption.text.trim(), startSeconds: caption.startMs / 1000, endSeconds: Math.min(durationSeconds, caption.endMs / 1000), confidence: caption.confidence })),
    subtitles: captionsToSubtitleCues(captions, durationSeconds),
  };
}

async function advancedQc(output, metadata, edl, outputBytes) {
  const binary = ffmpegBinary();
  let blackFrames = { status: "PENDING", detail: "ffmpeg binary unavailable" };
  let clipping = { status: "PENDING", detail: "ffmpeg binary unavailable" };
  if (binary) {
    try {
      const duration = metadata.durationInSeconds ?? 0;
      const sampleTimes = [...new Set([0.1, duration * 0.25, duration * 0.5, duration * 0.75, Math.max(0.1, duration - 0.1)].map((time) => Math.min(Math.max(0, time), Math.max(0, duration - 0.01)).toFixed(3)))];
      const [frames, loudness] = await Promise.all([
        Promise.all(sampleTimes.map(async (time) => ({ time, result: await runBinary(binary, ["-hide_banner", "-loglevel", "error", "-ss", time, "-i", output, "-frames:v", "1", "-vf", "scale=54:96", "-pix_fmt", "gray", "-vcodec", "rawvideo", "-f", "image2pipe", "-"]) }))),
        metadata.audioCodec ? runBinary(binary, ["-hide_banner", "-i", output, "-af", "loudnorm=print_format=json", "-vn", "-c:a", "pcm_s16le", "-f", "null", "-"]) : null,
      ]);
      const blackSamples = frames.filter(({ result }) => {
        const bytes = result.stdout;
        const average = bytes.length ? bytes.reduce((sum, value) => sum + value, 0) / bytes.length : 0;
        const darkRatio = bytes.length ? [...bytes].filter((value) => value < 16).length / bytes.length : 1;
        return average < 8 || darkRatio > 0.98;
      }).map(({ time }) => `${time}s`);
      blackFrames = blackSamples.length ? { status: "WARN", detail: `黒に近いサンプル: ${blackSamples.join(", ")}` } : { status: "PASS", detail: `${frames.length}点を確認` };
      const truePeakMatch = loudness?.stderr.match(/"input_tp"\s*:\s*"(-?inf|-?[\d.]+)"/i);
      const truePeak = truePeakMatch?.[1] === "-inf" ? -Infinity : Number(truePeakMatch?.[1]);
      clipping = !metadata.audioCodec ? { status: "WARN", detail: "音声トラックなし" } : !truePeakMatch ? { status: "PENDING", detail: "true peakを取得できません" } : truePeak > -0.1 ? { status: "WARN", detail: `true peak ${truePeak} dBTP` } : { status: "PASS", detail: truePeak === -Infinity ? "無音" : `true peak ${truePeak} dBTP` };
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 180) : "advanced QC unavailable";
      blackFrames = { status: "PENDING", detail };
      clipping = { status: "PENDING", detail };
    }
  }
  const subtitleSafe = edl.subtitles.every((cue) => Array.isArray(cue.lines) && cue.lines.length <= 2 && cue.lines.every((line) => typeof line === "string" && line.length <= 22));
  const checks = {
    resolution: { status: metadata.width === 1080 && metadata.height === 1920 ? "PASS" : "FAIL", detail: `${metadata.width}x${metadata.height}` },
    duration: { status: metadata.durationInSeconds > 0 && metadata.durationInSeconds <= 90 ? "PASS" : "FAIL", detail: `${metadata.durationInSeconds}s` },
    codec: { status: metadata.codec === "h264" ? "PASS" : "WARN", detail: metadata.codec },
    audio: { status: metadata.audioCodec ? "PASS" : "WARN", detail: metadata.audioCodec ?? "なし" },
    subtitles: { status: subtitleSafe ? "PASS" : "FAIL", detail: "最大2行・1行22文字" },
    blackFrames,
    clipping,
    fileSize: { status: outputBytes <= 100 * 1024 * 1024 ? "PASS" : "WARN", detail: `${(outputBytes / 1024 / 1024).toFixed(2)} MB` },
  };
  const statuses = Object.values(checks).map((check) => check.status);
  return { status: statuses.includes("FAIL") ? "FAIL" : statuses.some((status) => status === "WARN" || status === "PENDING") ? "REVIEW" : "PASS", checks };
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function fixtureEdl() {
  return {
    schemaVersion: 1, version: 1, assetId: "fixture", style: "EDUCATIONAL", fps: 30, width: 1080, height: 1920,
    clips: [{ id: "clip-1", assetId: "fixture", sourceStart: 0, sourceEnd: 4, timelineStart: 0, crop: "FILL", zoom: 1, volume: 1, playbackRate: 1, transition: "NONE" }],
    subtitles: [
      { id: "caption-1", startSeconds: 0.2, endSeconds: 2, lines: ["今日の自分に、", "やさしい時間を。"], emphasis: [], safeArea: "REELS_9_16_BOTTOM" },
      { id: "caption-2", startSeconds: 2, endSeconds: 3.8, lines: ["ゆっくり呼吸します。"], emphasis: [], safeArea: "REELS_9_16_BOTTOM" },
    ],
    editCandidates: [], audio: { normalizeVoice: true, reduceNoise: false, fadeInSeconds: 0.12, fadeOutSeconds: 0.2, duckMusicUnderVoice: true, musicSource: "NONE", musicLicenseReference: null },
    hook: "肩の力を、ふっと抜く", coverText: "やさしい1分", createdAt: new Date().toISOString(), sourceImmutable: true,
  };
}

const input = argument("--input");
const edlPath = argument("--edl");
const output = path.resolve(argument("--output") ?? "phase2-render.mp4");
const fixture = process.argv.includes("--fixture");
if (!fixture && (!input || !edlPath)) {
  throw new Error("Usage: npm run video:worker -- --input /path/video.mp4 --edl /path/edl.json --output /path/output.mp4 (or --fixture)");
}

const edl = fixture ? fixtureEdl() : JSON.parse(await readFile(path.resolve(edlPath), "utf8"));
let analysis = null;
let sourceUrl = "";
let publicDir = null;
if (input) {
  const inputPath = path.resolve(input);
  const [metadata, silenceResult, inputStat, checksumSha256] = await Promise.all([
    getVideoMetadata(inputPath),
    getSilentParts({ src: inputPath, minDurationInSeconds: 0.55, noiseThresholdInDecibels: -42 }),
    stat(inputPath),
    sha256File(inputPath),
  ]);
  analysis = { metadata: { ...metadata, byteSize: inputStat.size }, checksumSha256, malwareScan: "NOT_CONFIGURED_REVIEW_REQUIRED", silentParts: silenceResult.silentParts, audibleParts: silenceResult.audibleParts, audioProcessing: { normalization: "NOT_REQUESTED", noiseReduction: edl.audio?.reduceNoise ? "UNAVAILABLE_REVIEW_REQUIRED" : "NOT_REQUESTED" } };
  publicDir = await mkdtemp(path.join(tmpdir(), "karadanojikan-remotion-"));
  const transcription = metadata.audioCodec ? await transcribeLocally(inputPath, publicDir, metadata.durationInSeconds ?? 0) : { status: "UNAVAILABLE", reason: "NO_AUDIO_TRACK" };
  analysis.transcript = transcription;
  if (transcription.status === "NEEDS_REVIEW" && transcription.subtitles.length) edl.subtitles = transcription.subtitles;
  let publicName = `immutable-source${path.extname(inputPath) || ".mp4"}`;
  const publicPath = path.join(publicDir, publicName);
  if (edl.audio?.normalizeVoice && metadata.audioCodec && ffmpegBinary()) {
    publicName = "normalized-derivative.mp4";
    try {
      await runBinary(ffmpegBinary(), ["-hide_banner", "-loglevel", "error", "-i", inputPath, "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-movflags", "+faststart", "-y", path.join(publicDir, publicName)]);
      analysis.audioProcessing.normalization = "APPLIED_TO_DERIVATIVE";
    } catch (error) {
      publicName = path.basename(publicPath);
      await copyFile(inputPath, publicPath);
      analysis.audioProcessing.normalization = `UNAVAILABLE_REVIEW_REQUIRED: ${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`;
    }
  } else {
    await copyFile(inputPath, publicPath);
    analysis.audioProcessing.normalization = edl.audio?.normalizeVoice ? "UNAVAILABLE_REVIEW_REQUIRED" : "NOT_REQUESTED";
  }
  sourceUrl = `public:${publicName}`;
}

const entryPoint = path.resolve("src/remotion/index.ts");
const serveUrl = await bundle({ entryPoint, publicDir, onProgress: (progress) => process.stdout.write(`BUNDLE ${Math.round(progress)}%\r`) });
const inputProps = { sourceUrl, edl };
const composition = await selectComposition({ serveUrl, id: "KaradaReel", inputProps });
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: output,
  inputProps,
  overwrite: true,
  pixelFormat: "yuv420p",
  onProgress: ({ progress }) => process.stdout.write(`RENDER ${Math.round(progress * 100)}%\r`),
});
const outputStat = await stat(output);
const outputMetadata = await getVideoMetadata(output);
const qc = await advancedQc(output, outputMetadata, edl, outputStat.size);
if (publicDir) await rm(publicDir, { recursive: true, force: true });
process.stdout.write("\n");
console.log(JSON.stringify({ status: qc.status === "FAIL" ? "FAILED_QC" : "READY", output, outputBytes: outputStat.size, analysis, outputMetadata: { ...outputMetadata, container: path.extname(output).slice(1) }, qc }, null, 2));
