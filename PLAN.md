# Delivery Plan

Updated: 2026-08-24 (Asia/Tokyo)

## Outcome

Build a dedicated operating system for the “からだのじかん” Instagram account. The first useful loop is: open Today, understand the single next action, generate a safe on-brand post plan, review it, and save it to the calendar/content bank.

## Current scope

Phase 0, Phase 1, and the Phase 2 local/Real persistence slice are complete. Phase 3's official-API code and security boundaries are implemented locally: OAuth, encrypted tokens, runtime capabilities, exact-version approval, scheduled jobs, container polling, Insights, Webhooks, and recovery. Supabase activation and a user-approved Meta test-account E2E remain before Phase 3 completion.

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

Status: complete on 2026-08-24. Evidence is recorded in `docs/PHASE1_ACCEPTANCE.md`; the Supabase migration preserves every generated plan version and rejects BLOCK content.

### Phase 2 — Video Studio

Upload → probe → transcription → silence candidates → versioned EDL → Remotion preview/render → QC. Rendering is an asynchronous provider-backed job, never a web request.

Status: complete for the local MVP on 2026-08-24. Evidence is in `docs/PHASE2_ACCEPTANCE.md`. Supabase Storage/RLS and the Real Mode save/queue path are verified; production-provider selection remains an explicit deployment gate.

### Phase 3 — Instagram

Official Instagram Login → capability/permission verification → media rights → exact-version human approval → schedule → asynchronous container/publish → actual Insights → failure/reconnect recovery.

Status: local implementation complete on 2026-08-24. Evidence is in `docs/PHASE3_ACCEPTANCE.md`. External activation is intentionally pending explicit approval for the Meta app, public callback/webhook, Supabase migration, and test-account publication.

### Phases 4–6

Official Instagram connection and capabilities; growth intelligence; community/leads; PWA, accessibility, recovery, performance, and security audit.

## Work order

1. Lock sources, product boundaries, architecture, ERD, threats, costs, risks.
2. Build Phase 0 and its verification gates.
3. Build Phase 1 vertical slice and E2E journey.
4. Connect real services one at a time behind adapters.
5. Benchmark production render providers before choosing one; keep the disabled provider boundary until approved.

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

Apple Command Line Tools, Git, and Node.js are installed. Phase 2 passed its real local/Supabase evidence. Phase 3 currently passes strict contracts for official OAuth, token encryption, capability fail-closed behavior, version approval, publish states, Meta container behavior, and webhook signatures; external sandbox evidence is still pending. The first repository commit is tracked on GitHub.
