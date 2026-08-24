# Delivery Plan

Updated: 2026-08-24 (Asia/Tokyo)

## Outcome

Build a dedicated operating system for the “からだのじかん” Instagram account. The first useful loop is: open Today, understand the single next action, generate a safe on-brand post plan, review it, and save it to the calendar/content bank.

## Current scope

The repository began empty. This baseline delivers documentation-first architecture plus a Phase 0/1 Demo Mode. Real Supabase, OpenAI, Meta, and rendering credentials are intentionally not required for the demo and are never simulated as production.

## Milestones

### Phase 0 — foundation

- Next.js App Router, strict TypeScript, Tailwind, accessible mobile navigation
- Calm/warm design tokens and responsive shell
- Provider interfaces with explicit mock/real mode
- Domain schemas and deterministic recommendation logic
- Supabase schema/migration with grants, RLS, jobs, audit, consent
- Test, logging, environment, and security foundations

Exit gate: lint, typecheck, unit tests, production build, secret scan, mobile review.

### Phase 1 — Brand + Content OS

- Today recommendation, reasons, tasks, yesterday snapshot, one insight
- Guided creation: objective → Reels plan → shot list → caption → brand/safety check → save
- Brand Brain, Ideas, Content Bank, Series, Calendar, AI usage views
- Mock orchestrator with the same structured contract as the real AI provider

Exit gate: the ten-step mobile Definition of Done works without Instagram or OpenAI.

### Phase 2 — Video Studio

Upload → probe → transcription → silence candidates → versioned EDL → Remotion preview/render → QC. Rendering is an asynchronous provider-backed job, never a web request.

### Phases 3–6

Official Instagram connection and capabilities; growth intelligence; community/leads; PWA, accessibility, recovery, performance, and security audit.

## Work order

1. Lock sources, product boundaries, architecture, ERD, threats, costs, risks.
2. Build Phase 0 and its verification gates.
3. Build Phase 1 vertical slice and E2E journey.
4. Connect real services one at a time behind adapters.
5. Start video work only after Phase 1 gates pass.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Meta permissions/metrics change | Runtime capability matrix; docs re-check before each integration; disabled UI by default |
| Health or body-harmful copy | approved claim library, structured safety result, BLOCK gate, human approval |
| Customer media misuse | rights record and `approved` query predicate; audit use |
| AI hallucinated business facts | Brand Brain allowlist; `UNKNOWN`; no ungrounded facts |
| Weak recommendations from small samples | minimum sample sizes, confidence label, hypotheses rather than causal claims |
| Video cost/runtime | versioned EDL, queue, idempotency, provider benchmark, explicit render budget |
| Vendor lock-in | provider contracts and domain-owned schemas |
| Scope explosion | one account first, modular monolith, phased exit gates |

## Validation environment

The machine has no system Node.js/npm and no Apple Command Line Tools. Validation was completed with an official Node.js 24.19.0 LTS binary isolated in `/private/tmp`; project dependencies and lockfile are present. A normal developer setup still needs Node.js 20.9+ (24 LTS recommended). Git operations remain unavailable until Apple Command Line Tools are installed.
