# Architecture Decision Record

## D-001 — Modular monolith first

One Next.js application owns UI, server routes, and domain modules; Postgres is the system of record; workers may be separate processes using the same contracts. This avoids premature microservices while keeping render/queue boundaries explicit.

## D-002 — Demo Mode is a product mode

`APP_MODE=demo` uses deterministic mock providers and conspicuous Demo labels. Real mode fails closed if configuration is missing. Mock values are never shown as connected Instagram data.

## D-003 — Domain schemas precede providers

Zod schemas define Reels plans, safety checks, EDLs, capabilities, jobs, and insights. Provider responses are parsed at the boundary and invalid output is retried at most once.

## D-004 — Approval is a state transition

Approval is stored with actor/time/version. `READY_FOR_REVIEW → APPROVED` is distinct from scheduling and publishing. No boolean UI shortcut can bypass it.

## D-005 — Queue in Postgres for the first account

A transactional jobs table with `FOR UPDATE SKIP LOCKED`, attempts, leases, and idempotency is sufficient initially. A dedicated queue is reconsidered after measured throughput or reliability pressure.

## D-006 — Render outside request lifecycle

Web requests create jobs only. Local rendering uses `@remotion/renderer`; production starts with a benchmark of Remotion Lambda, Cloud Run/server worker, and current hosted options. Cost, license, region, cold start, timeout, and memory decide the provider.

## D-007 — Attribution is typed

Every conversion metric carries `DIRECT`, `ACCOUNT_LEVEL`, `ESTIMATED`, or `UNKNOWN`. The UI cannot silently imply post-level causality.

## D-008 — Model routing, no model literals in features

Features request `FAST_MODEL`, `QUALITY_MODEL`, `VISION_MODEL`, or `TRANSCRIPTION_MODEL`. Environment/admin settings resolve actual model IDs. Representative evals, not novelty, determine changes.

## D-009 — Current framework baseline

Use Next.js 16.3 App Router and Node.js 20.9+ based on the current official installation documentation. Use Tailwind v4. The current official OpenAI JavaScript SDK release declares a Zod 3 peer, so the baseline pins the compatible Zod 3.25 line; migrate only after the SDK supports Zod 4 without peer overrides.

## D-010 — Webpack for production builds in the current environment

Next.js 16.3 Turbopack attempts to bind a local port while evaluating the Tailwind PostCSS plugin and is blocked by the managed execution environment. Production builds use the supported `next build --webpack` path until the environment permits Turbopack or the upstream behavior changes. Development remains on the Next.js default dev server.
