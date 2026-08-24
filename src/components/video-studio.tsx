"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { checkMediaRights, createInitialEdl, metadataOrientation, nextEdlVersion, runVideoQc, scriptToTranscript, VideoEdlSchema, type MediaRights, type VideoEdl, type VideoMetadata, type VideoStyle } from "@/lib/video-domain";
import { ArrowIcon, CheckIcon, SparkleIcon } from "./icons";
import { VideoPreview } from "./video-preview";

type PersistedIds = { assetId: string; videoProjectId: string; videoEdlId: string };
const styles: Array<{ value: VideoStyle; label: string; description: string }> = [
  { value: "NATURAL", label: "Natural", description: "間を残した穏やかな編集" },
  { value: "EDUCATIONAL", label: "Educational", description: "要点と字幕を読みやすく" },
  { value: "SHORT", label: "Short", description: "短くテンポよく" },
  { value: "STORY", label: "Story", description: "導入・変化・まとめを重視" },
];
const stageLabels = ["アップロード", "解析", "文字起こし", "編集案", "プレビュー", "保存・レンダー"];

function inferContainer(file: File) {
  return file.name.split(".").at(-1)?.toLowerCase() || file.type.split("/").at(-1) || "unknown";
}

async function readBrowserMetadata(file: File, sourceUrl: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve({
      width: video.videoWidth,
      height: video.videoHeight,
      durationSeconds: video.duration,
      fps: 30,
      codec: file.type || "browser-unverified",
      hasAudio: false,
      byteSize: file.size,
      orientation: metadataOrientation(video.videoWidth, video.videoHeight),
      container: inferContainer(file),
      probeProvider: "BROWSER",
      integrity: "UNVERIFIED",
    });
    video.onerror = () => reject(new Error("この動画をブラウザで読み取れませんでした。別のMP4/MOVをお試しください。"));
    video.src = sourceUrl;
  });
}

function defaultRights(): MediaRights {
  return { isCustomerMedia: false, consentStatus: "approved", approvedPlatforms: ["instagram"], approvedUsage: ["social_post"], expiresAt: null, musicLicenseStatus: "not_applicable" };
}

export function VideoStudio() {
  const demo = process.env.NEXT_PUBLIC_APP_MODE !== "real";
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [script, setScript] = useState("今日の体調に合わせて、痛みのない範囲でゆっくり動きましょう。");
  const [style, setStyle] = useState<VideoStyle>("EDUCATIONAL");
  const [hook, setHook] = useState("肩の力を、ふっと抜く");
  const [customerMedia, setCustomerMedia] = useState(false);
  const [customerConsent, setCustomerConsent] = useState(false);
  const [musicSource, setMusicSource] = useState<VideoEdl["audio"]["musicSource"]>("NONE");
  const [versions, setVersions] = useState<VideoEdl[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<PersistedIds | null>(null);
  const [renderStage, setRenderStage] = useState<string | null>(null);

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  const edl = versions[viewIndex] ?? versions.at(-1);
  const latest = versions.at(-1);
  const rights = useMemo<MediaRights>(() => ({
    ...defaultRights(),
    isCustomerMedia: customerMedia,
    consentStatus: customerMedia ? (customerConsent ? "approved" : "unknown") : "approved",
    approvedPlatforms: customerMedia && !customerConsent ? [] : ["instagram"],
    musicLicenseStatus: musicSource === "NONE" || musicSource === "INSTAGRAM_MANUAL" ? "not_applicable" : musicSource === "OWNED" || musicSource === "LICENSED" || musicSource === "ROYALTY_FREE" ? "approved" : "unknown",
  }), [customerConsent, customerMedia, musicSource]);
  const rightsResult = useMemo(() => checkMediaRights(rights), [rights]);
  const qc = metadata && edl ? runVideoQc(metadata, edl) : null;

  async function selectFile(nextFile: File | null) {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setError(null); setMetadata(null); setVersions([]); setSaved(null); setRenderStage(null);
    if (!nextFile) { setFile(null); setSourceUrl(""); return; }
    if (!nextFile.type.startsWith("video/")) { setError("動画ファイルを選んでください。"); return; }
    const url = URL.createObjectURL(nextFile);
    setFile(nextFile); setSourceUrl(url); setBusy(true);
    try { setMetadata(await readBrowserMetadata(nextFile, url)); setStep(1); }
    catch (caught) { URL.revokeObjectURL(url); setSourceUrl(""); setFile(null); setError(caught instanceof Error ? caught.message : "動画を読み取れませんでした。"); }
    finally { setBusy(false); }
  }

  function generateEdl() {
    if (!metadata || !file || !rightsResult.allowed) return;
    const transcript = scriptToTranscript(script, metadata.durationSeconds);
    const next = createInitialEdl({ assetId: crypto.randomUUID(), metadata, transcript, style, hook, coverText: hook.slice(0, 24) });
    next.audio.musicSource = musicSource;
    setVersions([next]); setViewIndex(0); setStep(4);
  }

  function updateLatest(patch: Parameters<typeof nextEdlVersion>[1]) {
    if (!latest) return;
    const next = nextEdlVersion(latest, patch);
    setVersions((items) => [...items, next]); setViewIndex(versions.length);
  }

  function updateWorking(patch: Parameters<typeof nextEdlVersion>[1]) {
    if (!latest) return;
    const next = VideoEdlSchema.parse({ ...latest, ...patch });
    setVersions((items) => [...items.slice(0, -1), next]); setViewIndex(Math.max(0, versions.length - 1));
  }

  function splitClip() {
    if (!latest || latest.clips.length !== 1) return;
    const clip = latest.clips[0]!;
    const mid = clip.sourceStart + (clip.sourceEnd - clip.sourceStart) / 2;
    updateLatest({ clips: [
      { ...clip, id: `${clip.id}-a`, sourceEnd: mid },
      { ...clip, id: `${clip.id}-b`, sourceStart: mid, timelineStart: (mid - clip.sourceStart) / clip.playbackRate, transition: "CUT" },
    ] });
  }

  function removeClip(index: number) {
    if (!latest || latest.clips.length <= 1) return;
    const clips = latest.clips.filter((_, clipIndex) => clipIndex !== index).map((clip, clipIndex, all) => ({ ...clip, timelineStart: all.slice(0, clipIndex).reduce((sum, item) => sum + (item.sourceEnd - item.sourceStart) / item.playbackRate, 0) }));
    updateLatest({ clips });
  }

  function moveClip(index: number, direction: -1 | 1) {
    if (!latest) return;
    const target = index + direction;
    if (target < 0 || target >= latest.clips.length) return;
    const clips = [...latest.clips];
    const sourceClip = clips[index];
    const targetClip = clips[target];
    if (!sourceClip || !targetClip) return;
    clips[index] = targetClip;
    clips[target] = sourceClip;
    let timeline = 0;
    updateLatest({ clips: clips.map((clip) => { const next = { ...clip, timelineStart: timeline }; timeline += (clip.sourceEnd - clip.sourceStart) / clip.playbackRate; return next; }) });
  }

  function trimClip(index: number, edge: "start" | "end", delta: number) {
    if (!latest) return;
    const clips = latest.clips.map((clip, clipIndex) => {
      if (clipIndex !== index) return clip;
      if (edge === "start") return { ...clip, sourceStart: Math.max(0, Math.min(clip.sourceEnd - 0.2, clip.sourceStart + delta)) };
      return { ...clip, sourceEnd: Math.min(metadata?.durationSeconds ?? clip.sourceEnd, Math.max(clip.sourceStart + 0.2, clip.sourceEnd + delta)) };
    });
    let timeline = 0;
    updateWorking({ clips: clips.map((clip) => { const next = { ...clip, timelineStart: timeline }; timeline += (clip.sourceEnd - clip.sourceStart) / clip.playbackRate; return next; }) });
  }

  async function persistProject() {
    if (!file || !metadata || !latest || !rightsResult.allowed) return;
    setBusy(true); setError(null);
    try {
      if (demo) {
        const ids = { assetId: latest.assetId, videoProjectId: crypto.randomUUID(), videoEdlId: crypto.randomUUID() };
        const records = JSON.parse(localStorage.getItem("karadanojikan.phase2.video-projects") ?? "[]") as unknown[];
        localStorage.setItem("karadanojikan.phase2.video-projects", JSON.stringify([...records, { ids, filename: file.name, metadata, rights, transcript: scriptToTranscript(script, metadata.durationSeconds), edl: latest, versions, savedAt: new Date().toISOString() }]));
        setSaved(ids); setRenderStage("READY_FOR_LOCAL_PREVIEW"); setStep(5); return;
      }
      const uploadResponse = await fetch("/api/video/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, byteSize: file.size, metadata, rights }) });
      const upload = await uploadResponse.json() as { error?: string; assetId?: string; path?: string; token?: string };
      if (!uploadResponse.ok || !upload.assetId || !upload.path || !upload.token) throw new Error(upload.error || "upload_prepare_failed");
      const assetId = upload.assetId;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("video-assets").uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const realVersions = versions.map((version) => ({ ...version, assetId, clips: version.clips.map((clip) => ({ ...clip, assetId })) }));
      const projectResponse = await fetch("/api/video/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assetId, metadata, transcript: scriptToTranscript(script, metadata.durationSeconds), edls: realVersions }) });
      const project = await projectResponse.json() as PersistedIds & { error?: string };
      if (!projectResponse.ok || !project.videoProjectId) throw new Error(project.error || "project_save_failed");
      setSaved(project); setVersions(realVersions); setRenderStage("READY_FOR_REVIEW"); setStep(5);
    } catch (caught) { setError(caught instanceof Error && !caught.message.endsWith("_failed") ? caught.message : "動画プロジェクトを保存できませんでした。接続を確認してください。"); }
    finally { setBusy(false); }
  }

  async function enqueueRender() {
    if (!saved) return;
    if (demo) { setRenderStage("DEMO_PREVIEW_ONLY"); return; }
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/video/projects/${saved.videoProjectId}/render`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoEdlId: saved.videoEdlId, provider: "LOCAL" }) });
      const result = await response.json() as { error?: string; stage?: string };
      if (!response.ok) throw new Error(result.error || "render_enqueue_failed");
      setRenderStage(result.stage || "QUEUED");
    } catch (caught) { setError(caught instanceof Error && caught.message !== "render_enqueue_failed" ? caught.message : "レンダーをキューに追加できませんでした。"); }
    finally { setBusy(false); }
  }

  return <div className="page">
    <header className="pt-4 md:pt-0"><p className="eyebrow">PHASE 2 · VIDEO STUDIO</p><h1 className="title">素材からReelsへ</h1><p className="lead">元動画を残したまま、字幕・カット・表紙を編集します。投稿は行いません。</p></header>
    <ol className="my-6 grid list-none grid-cols-6 gap-1 p-0" aria-label="動画作成の進み具合">{stageLabels.map((label, index) => <li key={label} className={`border-t-2 pt-2 text-center text-[.62rem] font-bold ${index <= step ? "border-[var(--sage)] text-[var(--sage-dark)]" : "border-[var(--line)] text-[var(--muted)]"}`}>{label}</li>)}</ol>
    <div className="mb-5 flex flex-wrap gap-2"><span className="pill">{demo ? "DEMO · 端末内保存" : "REAL · Supabase保存"}</span><span className="pill bg-white">AUTO_PUBLISH=false</span><span className="pill bg-white">元動画は変更しません</span></div>

    {!file && <section className="card p-6 md:p-10"><div className="mx-auto max-w-xl text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--apricot-soft)]"><SparkleIcon /></span><h2 className="mt-5 text-2xl">撮影した動画を選ぶ</h2><p className="text-sm leading-relaxed text-[var(--muted)]">MP4/MOVなどの動画を選択します。お客様素材は同意確認が必要です。</p><label className="primary mt-4 cursor-pointer">動画を選択<input type="file" accept="video/*" className="sr-only" disabled={busy} onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}/></label></div></section>}

    {file && metadata && step < 4 && <section className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
      <div className="card p-5 md:p-7"><h2 className="mt-0 text-2xl">素材と台本</h2><div className="soft-card grid grid-cols-2 gap-3 p-4 text-sm"><span><small className="block text-[var(--muted)]">ファイル</small><strong>{file.name}</strong></span><span><small className="block text-[var(--muted)]">サイズ</small><strong>{(file.size / 1024 / 1024).toFixed(1)} MB</strong></span><span><small className="block text-[var(--muted)]">画面</small><strong>{metadata.width}×{metadata.height}</strong></span><span><small className="block text-[var(--muted)]">尺</small><strong>{metadata.durationSeconds.toFixed(1)}秒</strong></span></div><p className="mt-3 text-xs text-[var(--muted)]">現在はブラウザ仮解析です。codec・fps・音声・破損・無音区間はワーカーのffprobe/ffmpegで確定します。</p><label className="mt-5 block font-bold">Hook<input value={hook} maxLength={42} onChange={(event) => setHook(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white p-3 font-normal"/></label><label className="mt-5 block font-bold">話した内容／撮影台本<textarea rows={6} value={script} onChange={(event) => setScript(event.target.value)} className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 font-normal leading-relaxed"/></label><p className="text-xs text-[var(--muted)]">プレビューは台本同期の「要確認」字幕です。保存後のLOCALワーカーはWhisperで日本語を自動文字起こしし、低信頼語を人の確認へ回します。</p></div>
      <aside className="grid content-start gap-4"><div className="card p-5"><h2 className="mt-0 text-lg">編集スタイル</h2><div className="grid gap-2">{styles.map((item) => <label key={item.value} className={`rounded-xl border p-3 ${style === item.value ? "border-[var(--sage)] bg-[var(--sage-soft)]" : "border-[var(--line)]"}`}><span className="flex gap-2"><input type="radio" name="style" checked={style === item.value} onChange={() => setStyle(item.value)}/><strong>{item.label}</strong></span><small className="ml-6 text-[var(--muted)]">{item.description}</small></label>)}</div></div>
      <div className="card p-5"><h2 className="mt-0 text-lg">素材の権利</h2><label className="flex gap-3 text-sm"><input type="checkbox" checked={customerMedia} onChange={(event) => { setCustomerMedia(event.target.checked); setCustomerConsent(false); }}/><span>お客様が映る素材です</span></label>{customerMedia && <label className="mt-3 flex gap-3 rounded-xl bg-[var(--apricot-soft)] p-3 text-sm"><input type="checkbox" checked={customerConsent} onChange={(event) => setCustomerConsent(event.target.checked)}/><span>Instagram掲載と編集の同意を確認済み</span></label>}<label className="mt-4 block text-sm font-bold">音源<select value={musicSource} onChange={(event) => setMusicSource(event.target.value as VideoEdl["audio"]["musicSource"])} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white p-3"><option value="NONE">使用しない</option><option value="OWNED">自分で所有</option><option value="LICENSED">ライセンス取得済み</option><option value="ROYALTY_FREE">利用条件確認済み</option><option value="INSTAGRAM_MANUAL">Instagramアプリで手動追加</option></select></label></div>
      {!rightsResult.allowed && <div className="alert-card p-4 text-sm"><strong>編集を進める前に確認</strong><ul className="mb-0">{rightsResult.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>}</aside>
      <div className="flex gap-3 lg:col-span-2"><button className="secondary" onClick={() => void selectFile(null)}>別の動画</button><button className="primary flex-1 md:flex-none" disabled={!script.trim() || !rightsResult.allowed} onClick={generateEdl}>編集案をつくる <ArrowIcon width="18"/></button></div>
    </section>}

    {file && metadata && edl && step === 4 && <section className="grid gap-5 lg:grid-cols-[minmax(260px,400px)_1fr]">
      <div><VideoPreview sourceUrl={sourceUrl} edl={edl}/><p className="mt-3 text-center text-xs text-[var(--muted)]">Remotion Player · 9:16セーフエリア表示</p></div>
      <div className="grid content-start gap-4"><div className="card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="m-0 text-xl">ミニエディター</h2><div className="flex flex-wrap gap-1">{versions.map((version, index) => <button key={`${version.version}-${index}`} type="button" className={`pill ${viewIndex === index ? "border border-[var(--sage)]" : "bg-white"}`} onClick={() => setViewIndex(index)}>v{version.version}</button>)}</div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Hook<input value={edl.hook} disabled={edl !== latest} onChange={(event) => updateWorking({ hook: event.target.value.slice(0, 42) })} className="mt-2 w-full rounded-xl border border-[var(--line)] p-3"/></label><label className="text-sm font-bold">表紙テキスト<input value={edl.coverText} disabled={edl !== latest} onChange={(event) => updateWorking({ coverText: event.target.value.slice(0, 24) })} className="mt-2 w-full rounded-xl border border-[var(--line)] p-3"/></label></div><div className="mt-4 flex flex-wrap gap-2"><button className="secondary min-h-10 text-sm" disabled={edl !== latest} onClick={() => updateLatest({ hook: latest?.hook === "肩の力を、ふっと抜く" ? "今日の自分に、やさしい1分" : "肩の力を、ふっと抜く" })}>Hookを再生成</button><button className="secondary min-h-10 text-sm" disabled={edl !== latest || edl.clips.length !== 1} onClick={splitClip}>中央で2クリップに分割</button></div></div>
      <div className="card p-5"><h3 className="mt-0">クリップ</h3><div className="grid gap-3">{edl.clips.map((clip, index) => <article key={clip.id} className="rounded-xl border border-[var(--line)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>Clip {index + 1}</strong><span className="text-xs text-[var(--muted)]">{clip.sourceStart.toFixed(1)}–{clip.sourceEnd.toFixed(1)}秒</span></div><div className="mt-3 flex flex-wrap gap-2"><button className="secondary min-h-9 px-3 py-1 text-xs" disabled={edl !== latest || index === 0} onClick={() => moveClip(index, -1)}>前へ</button><button className="secondary min-h-9 px-3 py-1 text-xs" disabled={edl !== latest || index === edl.clips.length - 1} onClick={() => moveClip(index, 1)}>後へ</button><button className="secondary min-h-9 px-3 py-1 text-xs" disabled={edl !== latest} onClick={() => trimClip(index,"start",0.2)}>冒頭 −0.2秒</button><button className="secondary min-h-9 px-3 py-1 text-xs" disabled={edl !== latest} onClick={() => trimClip(index,"end",-0.2)}>末尾 −0.2秒</button><button className="secondary min-h-9 px-3 py-1 text-xs text-[var(--danger)]" disabled={edl !== latest || edl.clips.length <= 1} onClick={() => removeClip(index)}>削除</button></div></article>)}</div><p className="mb-0 mt-3 text-xs text-[var(--muted)]">削除・並べ替え・トリムはEDLのみ変更し、元動画には反映しません。</p></div>
      <div className="card p-5"><h3 className="mt-0">字幕</h3><div className="max-h-64 space-y-2 overflow-auto">{edl.subtitles.map((cue, index) => <label key={cue.id} className="grid grid-cols-[4rem_1fr] items-center gap-2 text-xs"><span>{cue.startSeconds.toFixed(1)}秒</span><input disabled={edl !== latest} value={cue.lines.join("\n")} onChange={(event) => { if (!latest) return; const lines=event.target.value.split("\n").map((line)=>line.slice(0,22)).filter(Boolean).slice(0,2); updateWorking({ subtitles: latest.subtitles.map((item, cueIndex) => cueIndex === index ? { ...item, lines: lines.length ? lines : [" "] } : item) }); }} className="rounded-lg border border-[var(--line)] p-2"/></label>)}</div></div>
      <div className="soft-card p-5"><div className="flex items-center justify-between gap-3"><strong>事前QC：{qc?.status}</strong><span className="pill bg-white">{qc?.checks.filter((check) => check.status === "PASS").length}/{qc?.checks.length} PASS</span></div><p className="mb-0 mt-2 text-xs text-[var(--muted)]">黒フレーム・音割れ・出力サイズはレンダー後に判定します。</p></div>
      {error && <p role="alert" className="alert-card m-0 p-3 text-sm">{error}</p>}<div className="flex gap-3"><button className="secondary" onClick={() => setStep(1)}>設定へ戻る</button><button className="primary flex-1" disabled={busy || edl !== latest} onClick={() => void persistProject()}>{busy ? "保存中…" : "版を保存してレンダーへ"} <ArrowIcon width="18"/></button></div></div>
    </section>}

    {saved && edl && step === 5 && <section className="card p-6 text-center md:p-10"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--sage-soft)]"><CheckIcon width="30" height="30"/></span><h2 className="mt-5 text-2xl">動画プロジェクトを保存しました</h2><p className="mx-auto max-w-xl text-sm leading-relaxed text-[var(--muted)]">元動画とv{edl.version}のEDLを分けて保持しています。Instagramには送信していません。</p><div className="mx-auto mt-5 max-w-lg rounded-2xl bg-[var(--paper)] p-4 text-left text-sm"><strong>レンダー状態：{renderStage}</strong><p className="mb-0 mt-2 text-[var(--muted)]">{demo ? "DemoではRemotionプレビューのみです。実ファイルは生成していません。" : "LOCALワーカーがキューを取得し、解析→文字起こし→レンダー→QCを順に実行します。"}</p></div>{error && <p role="alert" className="alert-card mx-auto mt-4 max-w-lg p-3 text-sm">{error}</p>}<div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><button className="primary" disabled={busy} onClick={() => void enqueueRender()}>{busy ? "処理中…" : "レンダーをキューに追加"}</button><Link href="/create/shooting" className="secondary no-underline">撮影アシスタント</Link><Link href="/create" className="secondary no-underline">作成メニュー</Link></div></section>}

    {error && !edl && <p role="alert" className="alert-card mt-5 p-4">{error}</p>}
  </div>;
}
