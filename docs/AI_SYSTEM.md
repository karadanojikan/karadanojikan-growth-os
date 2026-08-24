# AI System

## Gateway

Features call an `AIProvider` with a task kind and typed input. The gateway resolves a model route, budget, prompt version, safety identifier, and trace ID; calls the provider; validates output; records usage; and returns the domain object.

Routes: `FAST_MODEL` for classification/tagging/summaries, `QUALITY_MODEL` for strategy and complex creation, `VISION_MODEL` for technical visual assessment only, and `TRANSCRIPTION_MODEL` for audio. Actual IDs are configuration, not feature code.

## Reels orchestration

Load Brand Brain, recent content, ratios, insight snapshots, series, FAQ topics, eligible rights-approved assets, and experiment results. Decide objective/format/topic, generate plan, run deterministic constraints plus Brand Guardian, then show one preview. Complexity remains hidden from the user.

## Structured outputs

`ReelsPlan` includes objective, topic, hook, duration, scenes, captions, shot list, thumbnail options, caption, CTA, flags, brand score, safety status, confidence, and source fact IDs. Zod validates at runtime. One repair call is allowed for schema errors; repeated failure becomes a recoverable user-facing error.

## Prompt security

Brand rules are developer instructions. DM/comment/caption/transcript/webhook data is delimited and labeled untrusted. Tools expose narrow arguments. Secrets and raw tokens never enter prompts. Business facts are allowlisted; missing data produces `UNKNOWN`.

## Cost controls

Record request/model/feature/input/output/cached tokens/estimated micros/user/workspace/time. Warn at 80%; at 100% block configured high-cost routes while deterministic and low-cost operations remain available. Pricing is configuration with effective dates because provider pricing changes.

## Learning policy

Store hypotheses and evidence, never silently rewrite Brand Brain or posting ratios. Minimum samples and confidence are required. A recommendation cites its evidence and becomes a proposal awaiting approval.
