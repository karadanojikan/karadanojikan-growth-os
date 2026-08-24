"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowIcon, CheckIcon, SparkleIcon } from "./icons";
import { demoPlan } from "@/lib/mock-data";

const steps = ["企画", "撮影", "文章・確認", "保存"] as const;

export function ReelsFlow() {
  const [step, setStep] = useState(0);
  const [caption, setCaption] = useState(demoPlan.caption);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const [isGenerating, setGenerating] = useState(true);
  const demo = process.env.NEXT_PUBLIC_APP_MODE !== "real";

  useEffect(() => { const timer = window.setTimeout(() => setGenerating(false), 650); return () => window.clearTimeout(timer); }, []);
  if (!demo) return <div className="page"><header className="pt-4 md:pt-0"><p className="eyebrow">AI REELS PLAN</p><h1 className="title">投稿生成は未接続です</h1></header><section className="card mt-7 p-6 md:p-8"><span className="pill">準備中</span><h2 className="mb-2 mt-5 text-2xl">実データの準備が必要です</h2><p className="m-0 text-sm leading-relaxed text-[var(--muted)]">OpenAIプロバイダー、ブランド情報、利用予算ガードを設定した後に有効化します。現在はサンプル案を生成結果として表示・保存しません。</p><Link href="/create" className="secondary mt-5 no-underline">作成メニューへ戻る</Link></section></div>;
  async function saveDraft() {
    setSaveError(null); setSaving(true);
    const plan = { ...demoPlan, caption };
    try {
      if (demo) {
        const value = { ...plan, savedAt: new Date().toISOString(), status: "DRAFT", destination: "DEMO_BROWSER_ONLY" };
        window.localStorage.setItem("karadanojikan.demo.content.demo-reel-shoulder-001", JSON.stringify(value));
      } else {
        const response = await fetch("/api/content/drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, scheduledFor: "2026-08-26T10:30:00.000Z" }) });
        if (!response.ok) throw new Error("save_failed");
      }
      setSaved(true); setStep(3);
    } catch {
      setSaveError("保存できませんでした。接続を確認して、もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  return <div className="page">
    <header className="pt-4 md:pt-0"><p className="eyebrow">AI REELS PLAN</p><div className="flex items-end justify-between gap-3"><h1 className="title">今日の投稿</h1><span className="pill mb-1">下書き</span></div></header>
    <ol className="my-6 grid list-none grid-cols-4 gap-1 p-0" aria-label="作成の進み具合">{steps.map((label, index) => <li key={label} className={`border-t-2 pt-2 text-center text-[.7rem] font-bold ${index <= step ? "border-[var(--sage)] text-[var(--sage-dark)]" : "border-[var(--line)] text-[var(--muted)]"}`} aria-current={index === step ? "step" : undefined}>{label}</li>)}</ol>
    {isGenerating ? <div className="card grid min-h-80 place-items-center p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--apricot-soft)] text-[var(--sage-dark)]"><SparkleIcon /></span><h2 className="mt-5 text-xl">投稿案を整えています</h2><p className="text-sm text-[var(--muted)]">ブランド・最近の投稿・結果を確認中…</p></div></div> : <>
      {step === 0 && <section className="card overflow-hidden"><div className="bg-[var(--apricot-soft)] p-5 md:p-7"><div className="flex flex-wrap items-center gap-2"><span className="pill bg-white/75">新規獲得</span><span className="pill bg-white/75">25秒</span><span className="pill bg-white/75">確信度 中</span></div><h2 className="mb-1 mt-5 text-3xl font-bold leading-tight">{demoPlan.hook}</h2><p className="m-0 text-[var(--muted)]">{demoPlan.topic} · Educational</p></div><div className="p-5 md:p-7"><h3 className="mt-0 text-sm font-extrabold tracking-wider text-[var(--muted)]">構成</h3><div className="grid gap-4">{demoPlan.scenes.map((scene) => <article key={scene.id} className="grid grid-cols-[3.5rem_1fr] gap-3 border-t border-[var(--line)] pt-4 first:border-0 first:pt-0"><span className="text-sm font-bold text-[var(--sage-dark)]">{scene.startSeconds}–{scene.endSeconds}秒</span><div><p className="m-0 font-bold">{scene.overlay}</p><p className="mb-0 mt-1 text-sm leading-relaxed text-[var(--muted)]">{scene.visual}</p></div></article>)}</div><div className="mt-7 flex gap-3"><Link href="/create" className="secondary no-underline">戻る</Link><button className="primary flex-1 md:flex-none" onClick={() => setStep(1)}>撮影指示を見る <ArrowIcon width="18" /></button></div></div></section>}
      {step === 1 && <section><div className="mb-5"><h2 className="mb-1 text-2xl">今日撮るもの</h2><p className="m-0 text-sm text-[var(--muted)]">全部で約25秒。完璧でなくて大丈夫です。</p></div><div className="grid gap-3">{demoPlan.shotList.map((shot, index) => <article key={shot.id} className="card grid grid-cols-[2.6rem_1fr] gap-3 p-4 md:p-6"><span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sage-soft)] font-bold text-[var(--sage-dark)]">{index + 1}</span><div><div className="flex items-center justify-between gap-3"><h3 className="m-0 text-lg">{shot.label}</h3><span className="text-sm font-bold text-[var(--muted)]">{shot.durationSeconds}秒</span></div><p className="mb-2 mt-2 text-sm text-[var(--muted)]">カメラ：{shot.cameraDirection}</p><p className="m-0 rounded-xl bg-[var(--paper)] p-3 text-sm leading-relaxed">「{shot.spokenLine}」</p></div></article>)}</div><div className="mt-6 flex gap-3"><button className="secondary" onClick={() => setStep(0)}>戻る</button><button className="primary flex-1 md:flex-none" onClick={() => setStep(2)}>文章と安全確認へ <ArrowIcon width="18" /></button></div></section>}
      {step === 2 && <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="card p-5 md:p-7"><label htmlFor="caption" className="text-lg font-bold">キャプション</label><textarea id="caption" value={caption} onChange={(event) => setCaption(event.target.value)} rows={12} className="mt-3 w-full resize-y rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 leading-relaxed text-[var(--ink)]"/><div className="mt-4"><p className="mb-1 text-sm font-bold">CTA</p><p className="m-0 text-sm leading-relaxed text-[var(--muted)]">{demoPlan.cta}</p></div></div><aside className="grid content-start gap-4"><div className="soft-card p-5"><div className="flex items-center gap-2 text-[var(--sage-dark)]"><CheckIcon /><h2 className="m-0 text-lg">投稿前チェック：PASS</h2></div><ul className="mb-0 mt-4 grid list-none gap-2 p-0 text-sm"><li>✓ ブランドトーン</li><li>✓ 健康表現・過度な約束</li><li>✓ 不安・身体劣等感の煽り</li><li>✓ 個人情報・同意</li></ul><p className="mb-0 mt-4 text-xs leading-relaxed text-[var(--muted)]">ブランド整合度 {demoPlan.brandScore}/100。これは身体の評価ではありません。</p></div><div className="card p-5"><p className="eyebrow m-0">サムネイル案</p><div className="mt-3 grid gap-2">{demoPlan.thumbnailOptions.map((text, index) => <label key={text} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] p-3 text-sm font-bold"><input type="radio" name="cover" defaultChecked={index === 0}/>{text}</label>)}</div></div></aside>{saveError && <p role="alert" className="m-0 rounded-xl bg-[var(--apricot-soft)] p-3 text-sm text-[var(--danger)] lg:col-span-2">{saveError}</p>}<div className="flex gap-3 lg:col-span-2"><button className="secondary" disabled={isSaving} onClick={() => setStep(1)}>戻る</button><button className="primary flex-1 md:flex-none" disabled={isSaving} onClick={saveDraft}>{isSaving ? "保存中…" : "カレンダーへ保存"} <ArrowIcon width="18" /></button></div></section>}
      {step === 3 && <section className="card p-6 text-center md:p-10"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--sage-soft)] text-[var(--sage-dark)]"><CheckIcon width="30" height="30" /></span><h2 className="mt-5 text-2xl">下書きを保存しました</h2><p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--muted)]">8月26日のカレンダーとコンテンツバンクに、{demo ? "Demo Modeの下書き" : "実データの下書き"}として保存しました。Instagramには送信していません。</p>{saved && <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/operate" className="primary no-underline">カレンダーを見る</Link><Link href="/" className="secondary no-underline">ホームへ</Link></div>}</section>}
    </>}
  </div>;
}
