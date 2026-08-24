# からだのじかん AI Growth OS

Mobile-first operating system for planning, reviewing, publishing, and learning from the “からだのじかん” Instagram account.

## Current delivery

Phase 0, Phase 1, and the local Phase 2 Video Studio are implemented. Phase 3 now includes the disabled-by-default official Instagram Login, encrypted tokens, runtime Capability Matrix, version-bound human approval, idempotent publish worker, Insights boundary, and signed Webhooks. A Meta app/test-account E2E is still required before Phase 3 is complete. `AUTO_PUBLISH=false` remains mandatory.

See [docs/PHASE1_ACCEPTANCE.md](./docs/PHASE1_ACCEPTANCE.md), [docs/PHASE2_ACCEPTANCE.md](./docs/PHASE2_ACCEPTANCE.md), and [docs/PHASE3_ACCEPTANCE.md](./docs/PHASE3_ACCEPTANCE.md) for acceptance evidence and remaining production boundaries.

## Run

Requires Node.js 20.9+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Local Video Studio:

```bash
npm run video:transcription:setup
npm run video:worker -- --input /absolute/source.mp4 --edl fixtures/video-edl.json --output /absolute/output.mp4
```

Read [PLAN.md](./PLAN.md), [AGENTS.md](./AGENTS.md), and `docs/` before implementing real providers. `AUTO_PUBLISH` must remain false until an explicit product/security decision changes it.

For Supabase activation, follow [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md). Do not commit `.env.local`.
