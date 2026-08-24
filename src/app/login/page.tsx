import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { getAppMode, isSupabaseConfigured } from "@/lib/runtime-config";

export default function LoginPage() {
  const ready = getAppMode() === "real" && isSupabaseConfigured();
  return <div className="page grid min-h-[80vh] place-items-center"><section className="card w-full max-w-md p-6 md:p-8"><p className="eyebrow m-0">KARADA NO JIKAN</p><h1 className="mb-2 mt-3 text-3xl font-bold">おかえりなさい</h1><p className="mb-6 mt-0 text-sm leading-relaxed text-[var(--muted)]">からだのじかん Growth OSへログインします。</p><LoginForm enabled={ready} />{!ready && <div className="soft-card mt-5 p-4"><p className="m-0 text-sm font-bold">現在はDemo Modeです</p><p className="mb-0 mt-2 text-xs leading-relaxed text-[var(--muted)]">Supabase設定後にログインが有効になります。今は安全なサンプルデータで操作できます。</p><Link href="/" className="secondary mt-4 w-full no-underline">Demoを続ける</Link></div>}</section></div>;
}
