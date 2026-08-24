import Link from "next/link";
import { ArrowIcon, SparkleIcon } from "@/components/icons";
import { todayRecommendation } from "@/lib/mock-data";
import { getAppMode } from "@/lib/runtime-config";

export default function HomePage() {
  if (getAppMode() === "real") {
    return <div className="page">
      <header className="mb-7 pt-4 md:pt-0"><p className="eyebrow">TODAY · REAL MODE</p><h1 className="title">今日も、ひとつずつ。</h1><p className="lead mb-0 mt-3">Instagram未接続でも、投稿準備は進められます。</p></header>
      <section className="card overflow-hidden"><div className="bg-[var(--apricot-soft)] px-5 py-4 md:px-8"><span className="pill bg-white/80"><SparkleIcon width="15" height="15"/> ルールベースの提案</span></div><div className="px-5 py-6 md:px-8 md:py-8"><p className="m-0 text-sm font-bold text-[var(--muted)]">今日のおすすめ Reels</p><h2 className="mb-2 mt-2 text-[1.65rem] font-bold">「肩だけ揉んでない？」</h2><p className="m-0 leading-relaxed text-[var(--muted)]">首と肩を一緒にやさしく動かす、25秒のセルフケアReels</p><ul className="my-5 grid list-none gap-2 p-0 text-sm"><li>• 初期方針では新規獲得コンテンツを60%に設定</li><li>• 短いReelsを週3本つくる運用方針</li><li>• Brand Brainの「首・肩」テーマに一致</li></ul><Link href="/create/reels" className="primary w-full no-underline md:w-auto">今日の投稿をつくる <ArrowIcon width="19"/></Link><p className="mb-0 mt-4 text-xs text-[var(--muted)]">外部AI・Instagram分析は未使用です。実績に基づく提案ではありません。</p></div></section>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><section className="card p-5 md:p-7"><div className="mb-4 flex items-center justify-between"><h2 className="m-0 text-lg">今日やること</h2><span className="pill">0 / 3</span></div><div className="grid gap-3">{["Reelsの企画を確認","撮影指示を見る","カレンダーへ保存"].map((label)=><div key={label} className="flex items-center gap-3 border-t border-[var(--line)] pt-3 first:border-0"><span className="h-6 w-6 rounded-full border border-[var(--line)]"/><strong>{label}</strong></div>)}</div></section><section className="soft-card p-5 md:p-7"><p className="eyebrow m-0">YESTERDAY</p><h2 className="mb-2 mt-3 text-lg">実測データなし</h2><p className="m-0 text-sm leading-relaxed text-[var(--muted)]">Instagram公式APIを接続するまで、Reach・保存・フォロー・DMを推定表示しません。</p><Link href="/operate" className="secondary mt-5 no-underline">投稿予定を見る</Link></section></div>
    </div>;
  }
  return <div className="page">
    <header className="mb-7 pt-4 md:pt-0"><p className="eyebrow">Monday · August 24</p><h1 className="title">今日も、ひとつずつ。</h1><p className="lead mb-0 mt-3">いちばん効果の見込める次の一歩だけを提案します。</p></header>
    <section className="card overflow-hidden" aria-labelledby="recommendation-title">
      <div className="bg-[var(--apricot-soft)] px-5 py-4 md:px-8"><span className="pill bg-white/80"><SparkleIcon width="15" height="15" /> AIからの提案</span></div>
      <div className="px-5 py-6 md:px-8 md:py-8">
        <p className="m-0 text-sm font-bold text-[var(--muted)]">今日のおすすめ Reels</p>
        <h2 id="recommendation-title" className="mb-2 mt-2 text-[1.65rem] font-bold leading-tight md:text-3xl">「{todayRecommendation.topic}」</h2>
        <p className="m-0 leading-relaxed text-[var(--muted)]">{todayRecommendation.description}</p>
        <ul className="my-5 grid list-none gap-2 p-0 text-sm">
          {todayRecommendation.reasons.map((reason) => <li key={reason} className="flex gap-2"><span className="mt-[.42rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sage)]" />{reason}</li>)}
        </ul>
        <Link href="/create/reels" className="primary w-full no-underline md:w-auto">今日の投稿をつくる <ArrowIcon width="19" /></Link>
      </div>
    </section>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <section className="card p-5 md:p-7"><div className="mb-4 flex items-center justify-between"><h2 className="m-0 text-lg font-bold">今日やること</h2><span className="text-sm font-bold text-[var(--sage-dark)]">1 / 3</span></div>
        <div className="grid gap-3">{[[true,"ストーリーズで朝の様子を投稿"],[false,"Reelsを撮影"],[false,"19:30 投稿内容を確認"]].map(([done,label]) => <div key={String(label)} className="flex items-center gap-3 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0"><span aria-hidden className={`grid h-6 w-6 place-items-center rounded-full border ${done ? "border-[var(--sage)] bg-[var(--sage)] text-white" : "border-[var(--line)]"}`}>{done ? "✓" : ""}</span><span className={done ? "text-[var(--muted)] line-through" : "font-semibold"}>{label}</span></div>)}</div>
      </section>
      <section className="soft-card p-5 md:p-7"><p className="eyebrow m-0">昨日の結果</p><div className="mt-5 grid grid-cols-3 gap-3"><div><p className="metric m-0">8.4k</p><p className="mb-0 mt-1 text-xs text-[var(--muted)]">リーチ</p></div><div><p className="metric m-0">126</p><p className="mb-0 mt-1 text-xs text-[var(--muted)]">保存</p></div><div><p className="metric m-0">+18</p><p className="mb-0 mt-1 text-xs text-[var(--muted)]">フォロー</p></div></div><p className="mb-0 mt-5 border-t border-[rgba(113,128,109,.18)] pt-4 text-sm leading-relaxed">保存率が平均より高めです。同じテーマを別の切り口で試す価値があります。</p></section>
    </div>
  </div>;
}
