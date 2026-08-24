import Link from "next/link";
import { logout } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";
import { getAppMode } from "@/lib/runtime-config";

const sections = [
  { title: "Brand Brain", description: "トーン・事実・禁止表現・投稿比率", href: "/settings/brand" },
  { title: "AIと予算", description: "使用量・費用・Budget Guard", href: "/settings/ai" },
  { title: "Instagram", description: "Meta公式API・権限・Capability Matrix", href: "/settings/instagram" },
  { title: "承認と安全", description: "自動投稿：OFF · 人の確認が必須", href: "/settings/brand" },
] as const;

export default async function SettingsPage() { const mode = getAppMode(); const user = await getCurrentUser(); return <div className="page"><header className="pt-4 md:pt-0"><p className="eyebrow">SETTINGS</p><h1 className="title">設定</h1></header><section className="card mt-7 divide-y divide-[var(--line)]">{sections.map((item) => <Link href={item.href} key={item.title} className="flex min-h-20 items-center justify-between px-5 text-[var(--ink)] no-underline hover:bg-[var(--paper)] md:px-7"><span><strong className="block">{item.title}</strong><small className="mt-1 block text-[var(--muted)]">{item.description}</small></span><span aria-hidden>›</span></Link>)}</section><section className="soft-card mt-5 p-5"><div className="flex items-center justify-between"><div><p className="eyebrow m-0">OPERATING MODE</p><h2 className="mb-0 mt-2 text-lg">{mode === "demo" ? "Demo Mode" : "Real Mode"}</h2></div><span className="pill bg-white">{mode === "demo" ? "外部接続なし" : "Supabase接続"}</span></div><p className="mb-0 mt-4 text-sm leading-relaxed text-[var(--muted)]">{mode === "demo" ? "ブラウザ内だけへ保存します。" : `${user?.email ?? "認証ユーザー"}でログイン中です。投稿生成はルールベース、Instagram自動投稿はOFFです。`}</p>{mode === "real" && <form action={logout} className="mt-4"><button className="secondary w-full" type="submit">ログアウト</button></form>}</section></div>; }
