import Link from "next/link";
import { getInstagramSettingsData } from "@/lib/instagram-data";

const capabilityLabels = { publishing: "投稿", reels: "Reels", carousel: "Carousel", stories: "Stories", insights: "Insights", comments: "Comments", messaging: "Messages", webhooks: "Webhooks" } as const;
const resultMessages: Record<string,string> = {
  connected: "Instagramプロアカウンと接続しました。",
  refreshed: "InstagramトークンとCapabilityを更新しました。",
  refresh_not_due: "長期トークンは発行から24時間未満のため、まだ更新できません。",
  disconnected: "Instagram接続を解除しました。",
  denied: "Instagram側で接続がキャンセルされました。",
  invalid_state: "接続セッションを検証できませんでした。もう一度お試しください。",
  failed: "Instagram接続を完了できませんでした。",
  configuration: "Metaアプリのサーバー設定が不足しています。",
};

export default async function InstagramSettingsPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const [{ configuration, account, capabilities }, params] = await Promise.all([getInstagramSettingsData(), searchParams]);
  const result = params.result ? resultMessages[params.result] : null;
  const connected = account?.connection_status === "CONNECTED";
  return <div className="page"><header><p className="eyebrow">PHASE 3 · OFFICIAL API</p><h1 className="title">Instagram接続</h1><p className="lead mt-3">Meta公式Instagram Loginのみを使います。パスワードは保存しません。</p></header>
    {result && <p role="status" className="soft-card mt-6 p-4 text-sm">{result}</p>}
    <section className="card mt-6 p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className="pill">{connected ? "CONNECTED" : "DISCONNECTED"}</span><h2 className="mb-1 mt-4 text-2xl">{connected ? `@${account.username}` : "まだ接続していません"}</h2><p className="m-0 text-sm text-[var(--muted)]">{connected ? `${account.account_type} · 有効期限 ${new Intl.DateTimeFormat("ja-JP",{dateStyle:"medium",timeZone:"Asia/Tokyo"}).format(new Date(account.token_expires_at))}` : "BusinessまたはCreatorアカウンが必要です。"}</p></div>{!connected && configuration.ready && <Link href="/api/instagram/connect" className="primary no-underline">Instagramと接続</Link>}</div>
      {!configuration.ready && <div className="alert-card mt-5 p-4 text-sm"><strong>Metaアプリ設定が必要です</strong><p className="mb-0 mt-2">App ID・App Secret・OAuth Redirect URI・Webhook Verify Token・32 byte暗号化キーをサーバー環境変数へ設定してください。</p></div>}
      {connected && <div className="mt-5 flex flex-wrap gap-3"><form action="/api/instagram/refresh" method="post"><input type="hidden" name="accountId" value={account.id}/><button className="secondary" type="submit">トークンと権限を更新</button></form><form action="/api/instagram/disconnect" method="post"><input type="hidden" name="accountId" value={account.id}/><button className="secondary" type="submit">Instagram接続を解除</button></form></div>}
    </section>
    <section className="mt-6"><div className="mb-3 flex items-end justify-between"><h2 className="m-0 text-xl">Capability Matrix</h2><span className="text-xs text-[var(--muted)]">{capabilities?.api_version ?? configuration.apiVersion}</span></div><div className="grid gap-3 sm:grid-cols-2">{Object.entries(capabilityLabels).map(([key,label])=>{const enabled=Boolean(capabilities?.[key as keyof typeof capabilityLabels]);return <article className="card flex items-center justify-between p-4" key={key}><span><strong className="block">{label}</strong><small className="mt-1 block text-[var(--muted)]">{enabled?"公式APIで利用可能":"権限または設定が未確認"}</small></span><span className={`pill ${enabled?"":"bg-[var(--paper)]"}`}>{enabled?"ON":"OFF"}</span></article>})}</div></section>
    <section className="soft-card mt-6 p-5"><h2 className="m-0 text-lg">安全な投稿ルール</h2><ul className="mb-0 mt-3 text-sm leading-relaxed"><li><code>AUTO_PUBLISH=false</code>のままです。</li><li>承認はコンテンツの正確な版に固定します。</li><li>メディアはMeta取得中だけ期限付きURLを使います。</li><li>権限・トークン・コンテナの異常は自動投稿せず、再接続または人の確認へ回します。</li></ul></section>
    <Link href="/settings" className="secondary mt-5 no-underline">設定に戻る</Link>
  </div>;
}
