import Link from "next/link";
import { ArrowIcon, SparkleIcon } from "@/components/icons";
import { getAppMode } from "@/lib/runtime-config";

const tools = ["Reels", "Carousel", "Stories", "アイデア", "キャプション", "サムネイル", "Before / After", "FAQからつくる", "投稿を再利用"];
export default function CreatePage() {
  const demo = getAppMode() === "demo";
  return <div className="page"><header className="pt-4 md:pt-0"><p className="eyebrow">CREATE</p><h1 className="title">何をつくりますか？</h1></header>
    {demo ? <Link href="/create/reels" className="card mt-7 flex items-center justify-between gap-4 bg-[var(--sage-dark)] p-5 text-white no-underline md:p-8"><div><span className="inline-flex items-center gap-2 text-sm font-bold text-white/75"><SparkleIcon /> AIに任せる</span><h2 className="mb-1 mt-3 text-2xl font-bold">今日の投稿をつくる</h2><p className="m-0 text-sm leading-relaxed text-white/70">ブランドと最近の結果から、いちばん良い案をひとつ。</p></div><ArrowIcon className="shrink-0" /></Link> : <section className="card mt-7 p-6 md:p-8"><span className="pill">未接続</span><h2 className="mb-2 mt-5 text-2xl">投稿生成はまだ利用できません</h2><p className="m-0 text-sm leading-relaxed text-[var(--muted)]">OpenAIプロバイダーとブランド情報の準備後に有効化します。未生成のサンプル案を実データとして保存することはありません。</p></section>}
    <section className="mt-8"><h2 className="text-lg">種類から選ぶ</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{tools.map((tool, index) => index === 0 && demo ? <Link key={tool} href="/create/reels" className="card flex min-h-28 items-end justify-between p-4 font-bold no-underline"><span>{tool}</span><ArrowIcon width="18" /></Link> : <div key={tool} className="card flex min-h-28 items-end p-4 font-bold text-[var(--muted)]"><span>{tool}</span></div>)}</div></section>
  </div>;
}
