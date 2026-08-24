# Cost Model

## Cost centers

Vercel web/functions, Supabase database/storage/egress, OpenAI tokens/transcription, video compute/storage/egress, and optional Remotion licensing. Meta API is not assumed free of operational cost even when calls have no direct fee.

## Per-workspace ledger

Store integer micros by provider/feature/model with measured units and an effective-dated rate card. Show Today/Week/Month actuals, forecast, and remaining budget. Estimates are labeled estimates until reconciled.

## Planning assumptions (not quotes)

For an initial four-post/week account, budget by scenarios rather than a false exact total:

- Lean Demo/Phase 1: local demo, no provider calls: near-zero variable API spend.
- Real content planning: 16–30 structured generations/month plus classification; model choice dominates.
- Video: 12–20 short renders/month plus revisions, storage, transcription, and egress; benchmark before provider choice.
- Instagram analytics: job/function/database usage; control polling frequency and retain snapshots deliberately.

Pricing changes frequently. The app ships no hard-coded monetary claims. Admin rate cards must record source URL, currency, region, and effective date.

## Guard

At 80% emit one actionable warning. At 100% pause high-cost AI and render creation, never publication status polling, cleanup, consent, export/delete, or safety operations. Humans can change budget; AI cannot.
