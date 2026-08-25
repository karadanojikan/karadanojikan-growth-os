# Instagram Integration

## Policy

Use only Meta's official Instagram API. No scraping, browser automation, password automation, or private API. `AUTO_PUBLISH=false` by default and production publishing requires an explicit user approval audit event.

## Capability-first connection

At connection time store API version, account type, permissions granted/declined, verification time, and capabilities for reels, carousel, stories, insights, messaging, comments, and webhooks. A missing or stale capability disables the UI and explains reconnection or manual Instagram steps.

## Content state

`DRAFT → MEDIA_READY → READY_FOR_REVIEW → APPROVED → SCHEDULED → PUBLISHING → PUBLISHED → ANALYZING → ANALYZED`, with `PUBLISH_FAILED` and an idempotent retry path.

Media URLs are short-lived signed URLs with a TTL long enough for Meta ingestion. Successful publication schedules cleanup; failed ingestion preserves enough time for retry without creating permanent public URLs.

## Webhooks and tokens

Validate signature before parsing business data; persist provider event ID; deduplicate; acknowledge quickly; process asynchronously; retain an audit-safe envelope. Encrypt tokens at rest, track expiration/permissions, redact logs, refresh server-side, and require reconnect on invalidation.

## Documentation gate

Verified against Meta's official documentation on 2026-08-24 (Asia/Tokyo):

- API examples use `v26.0`; the app keeps `META_API_VERSION` configurable and records the verified version per account.
- Instagram Login uses `https://www.instagram.com/oauth/authorize`, exchanges the code server-side, then exchanges the one-hour short token for a 60-day long token. A valid long token older than 24 hours can be refreshed for another 60 days.
- Current scopes are `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_insights`, and `instagram_business_manage_messages`. The older `business_*` scope names are not used.
- Standard Access is sufficient for a professional account owned/managed by the app owner and added in the App Dashboard. Other accounts require Advanced Access/app review.
- Publishing creates a container, polls `status_code`, and only calls `media_publish` after `FINISHED`. Supported states are `EXPIRED`, `ERROR`, `FINISHED`, `IN_PROGRESS`, and `PUBLISHED`.
- The documented API publishing limit is 100 posts per rolling 24 hours per professional account; a carousel counts as one. The runtime also checks `content_publishing_limit`.
- Publishing media must be reachable by Meta at ingestion time. The worker creates one-hour signed URLs from private Storage; it never makes originals permanently public.
- Webhook verification happens on the raw request body before JSON parsing. Payloads are encrypted, service-only, deduplicated by SHA-256, and treated as untrusted input.
- Comments and insights are read only when the corresponding runtime capability is true. Comment replies remain human-approved Phase 5 work.

## Read-only Insights sync and Phase 4

`/insights` の「実測値を同期」は、自分の直近25投稿を公式APIから読み取り、未測定を優先して1回につき最大8投稿の指標を `EARLY` / `24H` / `72H` / `7D` の測定窓へ保存します。

- 1回の同期は最大48 metric calls、再同期は30秒間隔
- Metaが空データを返した指標は0にせず unavailable として保存
- DM、予約問い合わせ、予約完了は連携元がない限り `UNKNOWN`
- Metaの指標は最大48時間遅れる場合がある
- 保存したキャプションは untrusted external content
- 同期は投稿、返信、DM、アカウント設定、課金を変更しない

Phase 4の提案は実測値と標本数に基づく決定論的な処理です。6件未満では形式傾向を断定しません。実験案の人間承認も投稿承認とは別であり、投稿を実行しません。

Official sources:

- [Instagram API with Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login)
- [Business Login and token lifecycle](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)
- [Content publishing](https://developers.facebook.com/documentation/instagram-platform/content-publishing)
- [Webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks)
- [Media insights](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights)
- [Comment moderation](https://developers.facebook.com/documentation/instagram-platform/comment-moderation)

If official docs or a runtime check do not confirm a capability, its default is false.

## Activation boundary

The code, schema, and disabled UI are present. Activation still requires a user-approved Meta Business app, exact OAuth redirect URI, public HTTPS webhook, server-only secrets, Phase 3 Supabase migration, and a test professional account. No app was created and no Instagram account or post was changed during implementation.
