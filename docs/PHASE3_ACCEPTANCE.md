# Phase 3 acceptance evidence

Verified locally: 2026-08-24, Asia/Tokyo

## Implemented foundation

- Official Instagram Business Login URL, CSRF state, code exchange, 60-day token exchange, encrypted server-side storage, refresh, disconnect, and reconnect boundary.
- Runtime Capability Matrix from professional account type, exact granted permissions, token validity, API version, and webhook status. Missing evidence remains OFF.
- Version-bound human approval: current content version, non-BLOCK safety result, scheduled time, selected media, customer consent, and Instagram rights are revalidated inside a security-definer RPC.
- Idempotent asynchronous publishing jobs. The web request only approves/enqueues; the protected worker creates signed URLs, creates a Meta container, polls on later invocations, publishes only after `FINISHED`, records the external ID immediately, and supports reviewed retry.
- Reels and mixed Carousel container construction through `graph.instagram.com`; JPEG-only image constraint and 2–10 Carousel asset rule are enforced at the review/data boundary.
- Actual Insight fetching with `DIRECT` attribution. Unsupported metrics are reported unavailable instead of fabricated.
- Raw-body `X-Hub-Signature-256` verification, encrypted service-only webhook storage, deterministic deduplication, and unmatched-account quarantine.
- Comments are detectable/readable when permission exists. Replies are deliberately not automated and remain Phase 5 human-review work.
- `AUTO_PUBLISH=false` remains unchanged.

## Local evidence

- OAuth URL contains the official endpoint, current scopes, redirect URI, response type, and signed state.
- AES-256-GCM token encryption round-trips while ciphertext does not contain the token.
- Tampered and expired OAuth state is rejected.
- Expired tokens fail every capability closed.
- Invalid webhook signatures are rejected before parsing.
- Reels preparation creates a container but does not invoke `media_publish`.
- Publication state tests prohibit skipping human approval.
- Container tests prohibit publishing during `IN_PROGRESS`.
- Meta errors are classified into reconnect, retryable, and human-review outcomes.

## Quality gates

- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm test`: 66/66 pass
- `npm run build`: pass; 37 routes/pages include the official OAuth, media upload, schedule, webhook, Insight, worker, Settings, and publish-review boundaries
- Secret-pattern scan: no token or secret value found
- `AUTO_PUBLISH=false`; no Meta API mutation was executed

## Supabase external evidence

Applied to project `xfghlzfokaspbldgmkiq` on 2026-08-24 with explicit human approval:

- `202608240007_phase3_instagram.sql`: success
- Private `publish-assets` bucket: present and non-public
- Connection, approval, and publish-enqueue security-definer RPCs: present
- `publish_assets_select` and `publish_assets_insert` Storage RLS policies: present
- Direct `authenticated` INSERT on `instagram_accounts`: denied
- Direct `authenticated` INSERT on `approvals`: denied
- `/settings/instagram` in REAL mode: loads safely as `DISCONNECTED`; every capability remains OFF while Meta configuration is absent
- Supabase Auth Site URL: `https://karadanojikan-growth-os.vercel.app`
- Allowed Auth redirects: production and localhost `/auth/callback` URLs

## Meta external evidence

Configured in Meta for Developers on 2026-08-24 with explicit human approval:

- App `Karada no Jikan Growth OS`: created and kept unpublished
- Use case `Instagramでメッセージとコンテンツを管理`: added
- `instagram_business_basic`: test ready
- `instagram_business_content_publish`: test ready
- `instagram_business_manage_comments`: test ready
- `instagram_business_manage_insights`: test ready
- `instagram_business_manage_messages`: test ready; runtime DM actions remain OFF
- Owned professional account `karadanojikan`: Instagram tester invite accepted and account added to the API setup
- Instagram Business Login redirect: `https://karadanojikan-growth-os.vercel.app/api/instagram/callback`
- No app secret, access token, customer data, comment, DM, or media was exposed or mutated

## Production deployment evidence

Deployed to Vercel on 2026-08-24:

- Stable HTTPS URL: `https://karadanojikan-growth-os.vercel.app`
- Functions execute in Tokyo (`hnd1`)
- Unauthenticated root requests redirect to `/login`; the login page returns `200`
- Unconfigured webhook verification fails closed with `503`
- Unauthenticated publish-worker requests fail with `401`
- `AUTO_PUBLISH=false`; the worker also rejects validly authenticated execution while publishing is disabled
- CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, permissions policy, and cross-origin opener policy are enabled
- Source maps, local environment files, docs, fixtures, scripts, tests, migrations, and Git metadata are excluded from the deployment upload
- Server-generated encryption, webhook verification, and cron secrets are stored as Vercel Sensitive Production variables and were not printed

## External acceptance still required

Phase 3 cannot be marked complete until all of the following are explicitly approved and performed:

1. Transfer the existing Supabase service-role key and Meta Instagram app secret directly into Vercel Sensitive Production variables; never paste them into chat.
2. Redeploy so the final server-only variables are active, then register and verify the webhook callback.
3. Run a sandbox/test-account E2E: connect, permission check, media ingestion, exact-version human approval, schedule, status, insight fetch, and forced-failure handling. A real publish still requires a separate explicit approval.

No OAuth connection, webhook subscription, real insight retrieval, comment action, DM action, or Instagram publication occurred in this acceptance yet.
