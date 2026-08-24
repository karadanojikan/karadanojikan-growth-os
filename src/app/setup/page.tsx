import Link from "next/link";

export default function SetupPage() {
  return <div className="page grid min-h-[75vh] place-items-center"><section className="card max-w-xl p-6 md:p-9"><span className="pill">SETUP REQUIRED</span><h1 className="mb-3 mt-5 text-3xl">Supabase設定が必要です</h1><p className="lead m-0">Real Modeが選択されていますが、接続情報がありません。`.env.local`へProject URLとPublishable Keyを設定し、開発サーバーを再起動してください。</p><pre className="mt-5 overflow-x-auto rounded-2xl bg-[var(--ink)] p-4 text-xs leading-relaxed text-white">NEXT_PUBLIC_APP_MODE=real{"\n"}NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co{"\n"}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...</pre><p className="mt-4 text-xs text-[var(--muted)]">Service Role Keyはブラウザ公開変数へ設定しないでください。</p><Link href="/login" className="secondary mt-3 no-underline">ログイン画面へ</Link></section></div>;
}
