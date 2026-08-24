# Architecture

## Context

```text
iPhone/Desktop
    │ HTTPS
Next.js modular monolith on Vercel
    ├── domain services + Zod contracts
    ├── AI / Instagram / Render / Storage / Analytics providers
    └── job producer + worker endpoints
             │
        Supabase Postgres/Auth/Storage
             │
   OpenAI / Meta / render worker (server-only)
```

## Modules

- `today`: recommendation and tasks
- `content`: ideas, versions, series, calendar, ratios
- `brand`: source of truth, claims, terminology, checks
- `ai`: gateway, routes, prompts, usage, budget
- `media/video`: assets, rights, transcripts, EDL, renders
- `instagram`: connection, capabilities, publishing, insights, webhook
- `community`: inbox classification, FAQ mining, leads
- `platform`: auth, workspace, jobs, notifications, audit

Dependencies point inward: UI → use cases → domain contracts. Infrastructure implements ports. No UI component imports an OpenAI, Meta, or Remotion SDK.

## Runtime modes

- Demo: no credentials; deterministic fixtures; read/write to browser demo store; banner always visible.
- Real: authenticated Supabase workspace; server providers only; missing credentials disable capability and explain recovery.
- Test: injected providers and fixed clock/IDs.

## Job contract

`QUEUED → RUNNING → SUCCEEDED|FAILED|CANCELLED`, with domain progress for video. Claim uses a lease; `idempotency_key` is unique per workspace/job type. Retry is exponential with jitter and a dead-letter review state after the configured maximum.

## Source review (2026-08-24)

- OpenAI Responses accepts tools, structured text output, usage, safety identifiers, and prompt caching configuration.
- Supabase requires both grants and RLS policies; views need `security_invoker` care; Storage access is governed through `storage.objects` policies.
- Remotion server rendering exposes `renderMedia`, metadata, ffprobe/ffmpeg, and silence helpers. All Remotion packages must use exactly the same version.
- Vercel function duration remains plan/runtime-dependent; rendering is therefore isolated from request/response regardless of current maximum.
- Meta docs endpoints were rate-limited during this review. The integration is deliberately gated on a fresh official verification and runtime capability discovery.

## References

- https://developers.openai.com/api/reference/cli/resources/responses/methods/create
- https://developers.openai.com/api/docs/guides/latest-model
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://www.remotion.dev/docs/renderer
- https://vercel.com/docs/functions/configuring-functions/duration
- https://nextjs.org/docs/app/getting-started/installation
