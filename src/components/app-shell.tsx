"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, InsightIcon, OperateIcon, SettingsIcon, SparkleIcon } from "./icons";

const items = [
  { href: "/", label: "ホーム", Icon: HomeIcon },
  { href: "/create", label: "つくる", Icon: SparkleIcon },
  { href: "/operate", label: "運用", Icon: OperateIcon },
  { href: "/insights", label: "分析", Icon: InsightIcon },
  { href: "/settings", label: "設定", Icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const demo = process.env.NEXT_PUBLIC_APP_MODE !== "real";
  const authScreen = path === "/login" || path === "/setup" || path === "/onboarding";
  return <div className={authScreen ? "min-h-screen" : "shell"}>
    {!authScreen && <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 border-r border-[var(--line)] bg-[rgba(250,248,243,.92)] px-5 py-7 backdrop-blur md:block">
      <div className="mb-8 px-3"><p className="m-0 text-xs font-extrabold tracking-[.18em] text-[var(--sage-dark)]">KARADA NO JIKAN</p><p className="mt-2 text-xl font-bold leading-tight">Growth OS</p></div>
      <nav aria-label="メインナビゲーション" className="grid gap-2">
        {items.map(({ href, label, Icon }) => { const active = href === "/" ? path === "/" : path.startsWith(href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 font-bold no-underline ${active ? "bg-[var(--sage-soft)] text-[var(--sage-dark)]" : "text-[var(--muted)] hover:bg-white"}`}><Icon />{label}</Link>; })}
      </nav>
      <div className="absolute bottom-6 left-5 right-5 rounded-2xl border border-[var(--line)] bg-white p-3"><span className="pill">{demo ? "DEMO MODE" : "REAL MODE"}</span><p className="mb-0 mt-2 text-xs leading-relaxed text-[var(--muted)]">{demo ? "外部サービスには接続していません" : "Supabase認証を使用中 · 自動投稿OFF"}</p></div>
    </aside>}
    {!authScreen && <div className="fixed right-4 top-3 z-50 md:hidden"><span className="pill border border-white">{demo ? "DEMO" : "REAL"}</span></div>}
    <main>{children}</main>
    {!authScreen && <nav aria-label="メインナビゲーション" className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-5 border-t border-[var(--line)] bg-[rgba(255,255,255,.94)] px-1 pb-[max(.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
      {items.map(({ href, label, Icon }) => { const active = href === "/" ? path === "/" : path.startsWith(href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[.68rem] font-bold no-underline ${active ? "text-[var(--sage-dark)]" : "text-[#8a8d87]"}`}><Icon width="21" height="21" />{label}</Link>; })}
    </nav>}
  </div>;
}
