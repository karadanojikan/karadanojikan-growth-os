# Security and Threat Review

## Assets and trust boundaries

Secrets/tokens, DM data, customer media, consent, business facts, publication authority, and audit history are sensitive. Browser, uploads, Meta webhooks, captions, transcripts, comments, DMs, and model output are untrusted.

## Primary threats and controls

| Threat | Controls |
| --- | --- |
| Cross-tenant access | workspace membership RLS, separate grants/policies, policy tests |
| Secret exposure | server-only environment modules, no `NEXT_PUBLIC_` secrets, log redaction |
| Prompt injection | role separation, delimit untrusted text, narrow tools, output validation |
| Unauthorized publish/DM | version-bound human approval, server state machine, audit log |
| Customer media misuse | consent/rights predicate, expiry/platform/use checks, review |
| Forged/replayed webhook | raw-body signature validation, timestamp where offered, dedupe ID |
| Job replay/duplication | unique idempotency key, leases, monotonic state transitions |
| Malicious upload | type/size limits, content probing, quarantine, private bucket, signed access |
| SSRF via media URL | owned storage keys or allowlisted provider domains; block private networks |
| PII over-retention | retention dates, export/delete workflow, minimized logs |
| False health claims | claim allowlist, BLOCK state, human escalation |

## Security gate

Before real mode: run dependency audit, secret scan, RLS cross-tenant tests, signed URL tests, webhook signature/replay tests, approval bypass tests, CSP/header review, rate limits, backup/restore drill, deletion/export test, and least-privilege credential review.
