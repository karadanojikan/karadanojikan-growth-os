# Video Pipeline

## Non-destructive flow

Upload original → checksum/virus boundary → ffprobe → transcription → silence/segment candidates → AI edit plan → versioned EDL → Remotion preview → queued render → technical QC → human edit/approval.

The original is immutable. Every trim/reorder/template change creates a new EDL version referencing source timecodes.

## EDL

Each clip stores asset ID, source start/end, timeline start, crop/zoom, volume, captions, overlays, and transitions. Validation rejects negative times, source overflow, timeline overlaps where prohibited, missing rights, and subtitle safe-area overflow.

## Render provider

- `MockRenderProvider`: fixture progress/output in Demo Mode.
- `LocalRenderProvider`: exact-version Remotion packages with ffmpeg/ffprobe.
- `ProductionRenderProvider`: selected after benchmark; currently undecided.

Benchmark one representative 30s 1080×1920 Reel across current Remotion Lambda, Cloud Run/server worker, and any current official hosted option. Record cold/warm latency, p95, memory, output bytes, region, failure recovery, license, and cost per render. Do not put heavy rendering in the Vercel request path.

## QC

Verify 9:16 resolution, duration, codec/container, audio stream/loudness, subtitle bounds, black frames, clipping, and file size. Meta publishing compatibility is revalidated immediately before Phase 3.

## Rights

Only approved, unexpired customer media and licensed/user-owned/royalty-free music may enter EDL. Instagram-app music is recorded as a manual step.
