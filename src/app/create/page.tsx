import Link from "next/link";
import { ArrowIcon, SparkleIcon } from "@/components/icons";

const tools = [
  { label: "Reels", href: "/create/reels", description: "構成・撮影指示・文章" },
  { label: "Carousel", href: "/create/carousel", description: "スライド構成・文章" },
  { label: "アイデア", href: "/create/ideas", description: "思いつきを保存・企画化" },
] as const;
const videoTools = [
  { label: "動画編集", href: "/create/video", description: "字幕・カット・表紙・レンダー" },
  { label: "撮影アシスタント", href: "/create/shooting", description: "ショット順とテレプロンプター" },
  { label: "まとめて撮影", href: "/create/batch", description: "3本分を一度に撮影" },
] as const;
const later = ["Stories", "Before / After", "FAQからつくる", "投稿を再利用"];

export default function CreatePage() {
  return <div className="page"><header className="pt-4 md:pt-0"><p className="eyebrow">CREATE</p><h1 className="title">何をつくりますか？</h1></header>
    <Link href="/create/reels" className="card mt-7 flex items-center justify-between gap-4 bg-[var(--sage-dark)] p-5 text-white no-underline md:p-8"><div><span className="inline-flex items-center gap-2 text-sm font-bold text-white/75"><SparkleIcon /> 今日の提案から</span><h2 className="mb-1 mt-3 text-2xl">今日の投稿をつくる</h2><p className="m-0 text-sm leading-relaxed text-white/70">Brand Brainに沿った安全な案を、外部AIなしで作成します。</p></div><ArrowIcon className="shrink-0" /></Link>
    <section className="mt-8"><h2 className="text-lg">Phase 1 作成ツール</h2><div className="grid gap-3 sm:grid-cols-3">{tools.map((tool) => <Link key={tool.label} href={tool.href} className="card flex min-h-32 items-end justify-between p-4 no-underline"><span><strong className="block">{tool.label}</strong><small className="mt-2 block text-[var(--muted)]">{tool.description}</small></span><ArrowIcon width="18" /></Link>)}</div></section>
    <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="m-0 text-lg">Phase 2 動画ツール</h2><span className="pill">NEW</span></div><div className="grid gap-3 sm:grid-cols-3">{videoTools.map((tool) => <Link key={tool.label} href={tool.href} className="card flex min-h-32 items-end justify-between p-4 no-underline"><span><strong className="block">{tool.label}</strong><small className="mt-2 block text-[var(--muted)]">{tool.description}</small></span><ArrowIcon width="18" /></Link>)}</div></section>
    <section className="mt-8"><h2 className="text-lg">今後の拡張</h2><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{later.map((tool) => <div key={tool} className="card flex min-h-24 items-end p-4 font-bold text-[var(--muted)]"><span>{tool}</span></div>)}</div></section>
  </div>;
}
