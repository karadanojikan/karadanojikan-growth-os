# Supabase Setup

## What is already implemented

- Next.js 16 cookie-based SSR Auth using `@supabase/ssr`
- Browser and server clients kept separate
- `proxy.ts` token refresh with no-store response headers
- Email/password login, PKCE callback, logout, and first-workspace onboarding
- RLS-aware content draft save and real content-bank read
- Real Mode fails closed when configuration is missing

## Create the project

1. Create one Supabase project in a Japan-appropriate region.
2. In the project Connect dialog, copy the Project URL and Publishable Key.
3. Create `.env.local` from `.env.example` and set:

```text
NEXT_PUBLIC_APP_MODE=real
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
AUTO_PUBLISH=false
```

Never put the Service Role Key in a `NEXT_PUBLIC_` variable.

## Apply migrations

Apply the files in `supabase/migrations/` in filename order through a reviewed migration workflow. `202608240004_phase1_content_versions.sql` is required for atomic multi-version Reels/Carousel draft saves. `202608240005_phase2_video_pipeline.sql` creates the private video boundary and `202608240006_fix_video_render_enqueue.sql` fixes its idempotent queue. `202608240007_phase3_instagram.sql` adds encrypted-token metadata, runtime capabilities, exact-version human approval, schedules, publication jobs, webhook envelopes, and revokes direct browser writes to security-sensitive Instagram tables. Review and back up before applying migrations to production.

## Create the first user

This is an internal single-operator application. Keep public self-signup disabled. Create or invite the owner from Supabase Auth, then log in at `/login`. The onboarding page creates the first workspace, owner membership, and a safe starter Brand Brain.

For production, configure a custom SMTP provider and allowed redirect URLs. The hosted default email service is only suitable for initial testing.

## Verification gate

- Unauthenticated Real Mode requests redirect to `/login`.
- Missing Real Mode configuration redirects to `/setup`.
- A user cannot read or write another workspace.
- A user without membership cannot save drafts.
- Draft creation writes one content item, one immutable version, and one audit event atomically.
- Direct browser writes cannot modify audit logs or append-only versions.
- A member can only upload/read objects whose first path segment is their workspace UUID.
- Repeated render enqueue for the same EDL/provider returns the existing job.
- The web API never performs probe, transcription, rendering, or QC synchronously.
- Browser clients cannot write Instagram tokens, capabilities, approvals, schedules, published-post records, or Insights directly.
- A publish job cannot exist without an APPROVED decision bound to its exact content version.
- A repeated enqueue for the same schedule/version returns the same job.
