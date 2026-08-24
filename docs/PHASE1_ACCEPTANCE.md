# Phase 1 acceptance evidence

Verified: 2026-08-24, Asia/Tokyo

## Completed scope

- Today: one prominent next action, three strategy-grounded reasons, tasks, and an honest no-data state for yesterday.
- Brand Brain: versioned concept, audience, tone, themes, CTA style, forbidden claims, approved claims, posting ratios, and explicit `UNKNOWN` facts.
- Ideas: create and promote an idea into Reels or Carousel planning.
- Reels: typed plan, scenes, shot list, caption, CTA, thumbnails, selected-section regeneration, and version restore.
- Carousel: typed slide plan, caption, CTA, regeneration, safety, and scheduling.
- Content Bank and Calendar: Supabase-backed drafts and scheduled date display.
- Series: create and inspect progress with a useful empty state.
- Orchestrator: `DETERMINISTIC_PHASE1` implements the same validated provider boundary without an external AI call.
- Brand Guardian and Safety: text/icon status, deterministic checks, server re-check, and BLOCK save denial.
- AI usage/cost: request/model/feature/time records, zero-cost deterministic runs, real usage aggregation, and 80%/100% budget states.

## Mobile Definition of Done

At a 390×844 viewport, the primary Today CTA ended at y=554.6 in an 814px content viewport, so it was visible without scrolling. The verified journey was:

1. Existing Supabase login session opened Home.
2. Home displayed the Real Mode recommendation and its evidence boundary.
3. `今日の投稿をつくる` opened typed Reels planning.
4. Reels plan displayed objective, hook, scenes, duration, and confidence.
5. Shot list displayed four clear mobile cards.
6. Caption and CTA were editable.
7. Brand/safety status displayed text plus icon, not color alone.
8. Entering `絶対改善` produced `BLOCK・保存不可`; the save button became disabled.
9. A safe plan regenerated from v1 to v2 and saved to the Supabase Calendar.
10. Operate displayed the saved draft in Content Bank for 8/26.

Supabase read-back returned `version_count=2` and `latest_version=2` for the saved draft.

## Quality gates

- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm test`: 32/32 pass
- `npm run build`: pass
- No Instagram publish, DM, media upload, OpenAI call, or external analytics occurred.
- `AUTO_PUBLISH=false` remains unchanged.
