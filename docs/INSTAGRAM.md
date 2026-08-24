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

Before Phase 3 implementation, record the current official API version, login path, review requirements, permissions, publishing limits, container status polling, supported media constraints, insight metrics/retention, messaging window/rules, webhook fields, and rate limits. If official docs do not confirm a capability, its default is false.
