# Phase 2 acceptance evidence

Verified: 2026-08-24, Asia/Tokyo

## Completed scope

- Video Studio: mobile upload, browser preflight metadata, ownership/consent/music-rights gate, four edit styles, hook, cover, and script input.
- Analysis worker: Remotion compositor metadata, SHA-256, audio stream, fps, codec, orientation, duration, byte size, seekability, silence/audible ranges, and corrupt/unreadable-file failure.
- Local transcription: pinned `@remotion/install-whisper-cpp` 4.0.516, Whisper.cpp 1.5.5, multilingual `base` model, Japanese word timing/confidence, and human-review status.
- Non-destructive edit: immutable source reference, structured Zod EDL, clip split/delete/reorder/trim, subtitle edit, hook regeneration, templates, and append-only versions.
- Remotion: 9:16 Player preview and H.264 MP4 local render with safe-area subtitles and minimal brand overlays.
- Audio: voice normalization is applied to a temporary derivative, fades are applied during composition, and no music is embedded unless rights are explicit. Instagram music remains a manual app step.
- QC: actual output width/height, duration, codec, audio codec/true peak, subtitle bounds, five-point black-frame sampling, and file size.
- Shooting: guided shot list, batch-shooting view, checklist, and local teleprompter.
- Async boundary: authenticated API only enqueues an idempotent render job. Heavy probe/transcription/render/QC stays in the local worker.
- Storage/data: a private `video-assets` bucket, workspace-path RLS, rights rows, transcripts, projects, append-only EDLs, and render jobs are active. `202608240006_fix_video_render_enqueue.sql` removes a PL/pgSQL output-column ambiguity discovered during Real Mode acceptance.

## End-to-end evidence

The local pipeline used generated test media only. It did not upload customer media or call Instagram/OpenAI.

1. Remotion generated `/private/tmp/karadanojikan-phase2-fixture.mp4`.
2. The generated file was re-ingested as immutable source material.
3. The worker reported 1080×1920, 30 fps, H.264, AAC, 4.05 seconds, SHA-256, and a full-file silence range.
4. A macOS-generated Japanese fixture said: `今日の体調に合わせて、ゆっくり呼吸します。肩の力を抜きましょう。`
5. Local Whisper produced timed Japanese captions. A low-confidence `肩` → `方` recognition remained visibly `NEEDS_REVIEW` instead of being silently accepted.
6. The finished subtitle render `/private/tmp/karadanojikan-phase2-ja-output.mp4` passed technical QC: 1080×1920, H.264, AAC, 5.65 seconds, subtitle bounds, sampled black frames, true peak -3.95 dBTP, and 0.33 MB.
7. At 390×844 in Real Mode, upload metadata, rights controls, all four styles, Remotion Player, v1→v2, two clips, and 0.2-second trim were visible with no browser console error.
8. The Phase 2 Supabase migration was applied and verified: the bucket is private, all three RPCs exist, and both Storage policies exist.
9. The same generated Japanese fixture was uploaded through a signed URL in Real Mode. Database verification found one media asset, one private Storage object, one video project, and two immutable EDL versions in `READY_FOR_REVIEW`.
10. Render enqueue returned `QUEUED`. Repeating the request still left exactly one job and one render-job detail row, proving idempotency for the same EDL/provider.

## Quality gates

- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm test`: 39/39 pass
- `npm run build`: pass; all five Phase 2 API routes and three Phase 2 pages included
- `npm audit`: 0 known vulnerabilities at install time
- `AUTO_PUBLISH=false`; no publish, DM, customer upload, OpenAI call, or Meta call occurred

## Honest boundaries

- Browser preflight cannot prove codec, fps, audio, corruption, or silence. The UI labels it provisional; the worker is authoritative.
- Whisper output is untrusted and always requires review. Confidence is stored; low-confidence text is not auto-approved.
- Malware scanning is `NOT_CONFIGURED_REVIEW_REQUIRED`; SHA-256 and file decoding do not replace malware scanning.
- Noise reduction is not claimed on this local binary because the required filter is unavailable. The worker reports `UNAVAILABLE_REVIEW_REQUIRED` when requested.
- `ProductionRenderProvider` remains disabled until a representative benchmark, cost ceiling, infrastructure choice, and current Remotion license review are approved.
- The Real Mode acceptance job is queued for a separate local worker; the web request does not claim that queued cloud data has already been rendered.
