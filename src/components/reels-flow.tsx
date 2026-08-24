"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { applyBrandGuardian } from "@/lib/brand-guardian";
import { ReelsPlanSchema, type ReelsPlan } from "@/lib/domain";
import { regeneratePlanSection, type RegeneratableSection } from "@/lib/orchestrator";
import { ArrowIcon, CheckIcon, SparkleIcon } from "./icons";

const steps = ["企画", "撮影", "文章・確認", "保存"] as const;

function defaultSchedule() {
  const date = new Date(Date.now() + 2 * 86400000);
  date.setHours(19, 30, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function ReelsFlow({ topic }: { topic?: string }) {
  const [step, setStep] = useState(0);
  const [versions, setVersions] = useState<ReelsPlan[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [scheduledFor, setScheduledFor] = useState(defaultSchedule);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [isGenerating, setGenerating] = useState(true);
  const demo = process.env.NEXT_PUBLIC_APP_MODE !== "real";
  const latest = versions.at(-1);
  const plan = versions[viewIndex] ?? latest;
  const viewingLatest = viewIndex === versions.length - 1;

  useEffect(() => {
    let active = true;
    fetch("/api/ai/orchestrate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contentType: "REELS", topic }) })
      .then(async (response) => { const result=await response.json().catch(()=>({})) as {plan?:unknown;error?:string}; if (!response.ok || !result.plan) throw new Error(result.error||"generate_failed"); return {plan:result.plan}; })
      .then((result) => { const parsed = ReelsPlanSchema.parse(result.plan); if (active) { setVersions([parsed]); setViewIndex(0); } })
      .catch((caught) => { if (active) setError(caught instanceof Error && caught.message!=="generate_failed" ? caught.message : "投稿案を生成できませんでした。ログイン状態を確認して、もう一度お試しください。"); })
      .finally(() => { if (active) setGenerating(false); });
    return () => { active = false; };
  }, [topic]);

  const safetyLabel = useMemo(() => plan?.safetyStatus === "PASS" ? "PASS・保存可能" : plan?.safetyStatus === "REVIEW" ? "REVIEW・人の確認が必要" : "BLOCK・保存不可", [plan]);

  function updateLatest(patch: Partial<ReelsPlan>) {
    if (!latest) return;
    const next = ReelsPlanSchema.parse(applyBrandGuardian({ ...latest, ...patch }));
    setVersions((items) => [...items.slice(0, -1), next]);
    setViewIndex(versions.length - 1);
  }

  function regenerate(section: RegeneratableSection) {
    if (!latest) return;
    const next = ReelsPlanSchema.parse(regeneratePlanSection(latest, section));
    setVersions((items) => [...items, next]);
    setViewIndex(versions.length);
  }

  function restoreViewed() {
    if (!plan || viewingLatest || !latest) return;
    const restored = ReelsPlanSchema.parse(applyBrandGuardian({ ...plan, version: latest.version + 1 }));
    setVersions((items) => [...items, restored]);
    setViewIndex(versions.length);
  }

  async function saveDraft() {
    if (!latest || latest.safetyStatus === "BLOCK") return;
    setError(null); setSaving(true);
    try {
      if (demo) {
        const key = "karadanojikan.phase1.drafts";
        const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
        window.localStorage.setItem(key, JSON.stringify([...current, { plan: latest, versions, scheduledFor: new Date(scheduledFor).toISOString(), savedAt: new Date().toISOString() }]));
      } else {
        const response = await fetch("/api/content/drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: latest, versions, scheduledFor: new Date(scheduledFor).toISOString() }) });
        const result = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(result.error || "save_failed");
      }
      setSaved(true); setStep(3);
    } catch (caught) {
      setError(caught instanceof Error && caught.message !== "save_failed" ? caught.message : "保存できませんでした。接続を確認して、もう一度お試しください。");
    } finally { setSaving(false); }
  }

  if (isGenerating) return <div className="page"><div className="card mt-8 grid min-h-80 place-items-center p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--apricot-soft)] text-[var(--sage-dark)]"><SparkleIcon /></span><h1 className="mt-5 text-2xl">投稿案を整えています</h1><p className="text-sm text-[var(--muted)]">Brand Brainと投稿方針を確認中…</p><span className="pill mt-3">外部AIは使用しません</span></div></div></div>;
  if (!plan) return <div className="page"><section className="card mt-8 p-6"><h1>投稿案を作れませんでした</h1><p role="alert" className="text-[var(--danger)]">{error}</p><Link href="/create" className="secondary no-underline">作成メニューへ戻る</Link></section></div>;

  return <div className="page">
    <header className="pt-4 md:pt-0"><p className="eyebrow">RULE-BASED REELS PLAN</p><div className="flex items-end justify-between gap-3"><h1 className="title">今日のReels</h1><span className="pill mb-1">外部AI未使用</span></div></header>
    <ol className="my-6 grid list-none grid-cols-4 gap-1 p-0" aria-label="作成の進み具合">{steps.map((label, index) => <li key={label} className={`border-t-2 pt-2 text-center text-[.7rem] font-bold ${index <= step ? "border-[var(--sage)] text-[var(--sage-dark)]" : "border-[var(--line)] text-[var(--muted)]"}`} aria-current={index === step ? "step" : undefined}>{label}</li>)}</ol>
    {versions.length > 1 && <div className="mb-4 flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[var(--muted)]">版：</span>{versions.map((version, index) => <button type="button" key={version.version} onClick={() => setViewIndex(index)} className={index === viewIndex ? "pill border border-[var(--sage)]" : "pill bg-white"}>v{version.version}</button>)}{!viewingLatest && <button type="button" className="secondary min-h-9 py-1 text-xs" onClick={restoreViewed}>この版を復元</button>}</div>}
    {step === 0 && <section className="card overflow-hidden"><div className="bg-[var(--apricot-soft)] p-5 md:p-7"><div className="flex flex-wrap gap-2"><span className="pill bg-white/75">{plan.objective}</span><span className="pill bg-white/75">{plan.targetDurationSeconds}秒</span><span className="pill bg-white/75">確信度 {plan.confidence}</span></div><h2 className="mb-1 mt-5 text-3xl">{plan.hook}</h2><p className="m-0 text-[var(--muted)]">{plan.topic}</p>{viewingLatest && <button type="button" className="secondary mt-4" onClick={() => regenerate("HOOK")}>Hookを別案にする</button>}</div><div className="p-5 md:p-7"><h3 className="mt-0 text-sm tracking-wider text-[var(--muted)]">構成</h3><div className="grid gap-4">{plan.scenes.map((scene) => <article key={scene.id} className="grid grid-cols-[3.5rem_1fr] gap-3 border-t border-[var(--line)] pt-4 first:border-0"><span className="text-sm font-bold text-[var(--sage-dark)]">{scene.startSeconds}–{scene.endSeconds}秒</span><div><p className="m-0 font-bold">{scene.overlay}</p><p className="mb-0 mt-1 text-sm text-[var(--muted)]">{scene.visual}</p></div></article>)}</div><div className="mt-7 flex gap-3"><Link href="/create" className="secondary no-underline">戻る</Link><button className="primary flex-1 md:flex-none" onClick={() => setStep(1)}>撮影指示を見る <ArrowIcon width="18" /></button></div></div></section>}
    {step === 1 && <section><div className="mb-5"><h2 className="mb-1 text-2xl">今日撮るもの</h2><p className="m-0 text-sm text-[var(--muted)]">完璧でなくて大丈夫です。痛みのない範囲で撮影してください。</p></div><div className="grid gap-3">{plan.shotList.map((shot, index) => <article key={shot.id} className="card grid grid-cols-[2.6rem_1fr] gap-3 p-4 md:p-6"><span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sage-soft)] font-bold">{index + 1}</span><div><div className="flex justify-between gap-3"><h3 className="m-0 text-lg">{shot.label}</h3><span className="text-sm font-bold text-[var(--muted)]">{shot.durationSeconds}秒</span></div><p className="mb-2 mt-2 text-sm text-[var(--muted)]">カメラ：{shot.cameraDirection}</p><p className="m-0 rounded-xl bg-[var(--paper)] p-3 text-sm">「{shot.spokenLine}」</p></div></article>)}</div><div className="mt-6 flex gap-3"><button className="secondary" onClick={() => setStep(0)}>戻る</button><button className="primary flex-1 md:flex-none" onClick={() => setStep(2)}>文章と安全確認へ <ArrowIcon width="18" /></button></div></section>}
    {step === 2 && <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="card p-5 md:p-7"><label htmlFor="caption" className="text-lg font-bold">キャプション</label><textarea id="caption" value={plan.caption} disabled={!viewingLatest} onChange={(event) => updateLatest({ caption: event.target.value })} rows={12} className="mt-3 w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 leading-relaxed disabled:opacity-70"/><p className="mb-1 mt-4 text-sm font-bold">CTA</p><p className="m-0 text-sm text-[var(--muted)]">{plan.cta}</p>{viewingLatest && <div className="mt-4 flex flex-wrap gap-2"><button className="secondary" onClick={() => regenerate("CAPTION")}>文章を別案にする</button><button className="secondary" onClick={() => regenerate("CTA")}>CTAを別案にする</button></div>}</div><aside className="grid content-start gap-4"><div className={`p-5 ${plan.safetyStatus === "BLOCK" ? "alert-card" : "soft-card"}`}><div className="flex items-center gap-2"><CheckIcon /><h2 className="m-0 text-lg">安全確認：{safetyLabel}</h2></div>{plan.safetyFlags.length ? <ul className="mb-0 mt-4 text-sm">{plan.safetyFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : <p className="mb-0 mt-4 text-sm">禁止表現・診断・結果保証・身体への煽りは検出されませんでした。</p>}<p className="mb-0 mt-4 text-xs text-[var(--muted)]">ブランド整合度 {plan.brandScore}/100。身体の評価ではありません。</p></div><div className="card p-5"><p className="eyebrow m-0">サムネイル案</p><div className="mt-3 grid gap-2">{plan.thumbnailOptions.map((text, index) => <label key={text} className="flex items-center gap-3 rounded-xl border border-[var(--line)] p-3 text-sm font-bold"><input type="radio" name="cover" defaultChecked={index === 0}/>{text}</label>)}</div></div><label className="card p-5 text-sm font-bold">投稿予定日時<input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="mt-3 block w-full rounded-xl border border-[var(--line)] p-3"/></label></aside>{error && <p role="alert" className="alert-card m-0 p-3 text-sm lg:col-span-2">{error}</p>}<div className="flex gap-3 lg:col-span-2"><button className="secondary" disabled={isSaving} onClick={() => setStep(1)}>戻る</button><button className="primary flex-1 md:flex-none" disabled={isSaving || !viewingLatest || plan.safetyStatus === "BLOCK"} onClick={saveDraft}>{isSaving ? "保存中…" : "カレンダーへ保存"} <ArrowIcon width="18" /></button></div></section>}
    {step === 3 && <section className="card p-6 text-center md:p-10"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--sage-soft)]"><CheckIcon width="30" height="30" /></span><h2 className="mt-5 text-2xl">下書きを保存しました</h2><p className="mx-auto max-w-md text-sm text-[var(--muted)]">全{versions.length}版を保持しました。Instagramには送信していません。</p>{saved && <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/operate" className="primary no-underline">カレンダーを見る</Link><Link href="/" className="secondary no-underline">ホームへ</Link></div>}</section>}
  </div>;
}
