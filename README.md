# からだのじかん AI Growth OS

Mobile-first operating system for planning, reviewing, publishing, and learning from the “からだのじかん” Instagram account.

## Current delivery

Phase 0/1 Demo Mode is implemented. It demonstrates Today → typed Reels plan → shot list → editable caption → brand/safety check → calendar/content bank. Supabase SSR Auth, onboarding, RLS-aware draft persistence, and real content-bank reading are also implemented but remain inactive until Real Mode is configured. Instagram and OpenAI are not called in Demo Mode.

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

Read [PLAN.md](./PLAN.md), [AGENTS.md](./AGENTS.md), and `docs/` before implementing real providers. `AUTO_PUBLISH` must remain false until an explicit product/security decision changes it.

For Supabase activation, follow [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md). Do not commit `.env.local`.
