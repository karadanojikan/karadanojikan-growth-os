import Link from "next/link";
import { ArrowIcon, SparkleIcon } from "@/components/icons";
import { todayRecommendation } from "@/lib/mock-data";
import { getAppMode } from "@/lib/runtime-config";

export default function HomePage() {
  if (getAppMode() === "real") {
    return <div className="page">
      <header className="mb-7 pt-4 md:pt-0"><p className="eyebrow">REAL MODE</p><h1 className="title">準備ができました。</h1><p className="lead mb-0 mt-3">実データはまだありません。接続済みの情報だけを表示します。</p></header>
      <section className="card p-6 md:p-8"><span className="pill">データ待ち</span><h2 className="mb-2 mt-5 text-2xl">最初の投稿を準備しましょう</h2><p className="m-0 leading-relaxed text-[var(--muted)]">AI生成とInstagram連携はまだ未接続です。サンプルの提案や分析値を実データとして表示しません。</p><Link href="/settings" className="secondary mt-5 no-underline">接続状況を見る</Link></section>
      <div className="mt-5 grid gap-5 md:grid-cols-2"><section className="soft-card p-5 md:p-7"><p className="eyebrow m-0">INSTAGRAM</p><h2 className="mb-2 mt-3 text-lg">未接続</h2><p className="m-0 text-sm leading-relaxed text-[var(--muted)]">公式APIの接続と権限確認が終わるまで、自動投稿や分析取得は行いません。</p></section><section className="soft-card p-5 md:p-7"><p className="eyebrow m-0">ANALYTICS</p><h2 className="mb-2 mt-3 text-lg">まだデータがありません</h2><p className="m-0 text-sm leading-relaxed text-[var(--muted)]">実測値を取得できるまで、推定値やサンプル値は表示しません。</p></section></div>
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
