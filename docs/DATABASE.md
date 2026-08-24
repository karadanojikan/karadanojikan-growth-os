# Database and ERD

## Ownership model

```text
auth.users ─ profiles ─ workspace_members ─ workspaces
                                      ├─ instagram_accounts ─ capabilities
                                      ├─ brand_profiles ─ brand_facts / approved_claims
                                      ├─ content_items ─ content_versions ─ post_schedules
                                      │          └─ video_projects ─ video_edls ─ render_jobs
                                      ├─ media_assets ─ media_asset_rights / transcripts
                                      ├─ published_posts ─ insight_snapshots
                                      ├─ dm_threads ─ dm_messages ─ leads
                                      └─ ai_runs / ai_usage / jobs / audit_logs
```

Every tenant-owned row has `workspace_id`; account-specific rows also have `instagram_account_id`. Membership is the sole browser authorization path.

## Invariants

- Customer media selection requires an unexpired `approved` right covering Instagram and the intended use.
- `content_versions` is append-only; content points to a current version.
- Published/sent/approval actions append audit records.
- Webhook event `(provider, external_event_id)` and job idempotency keys are unique.
- Money is integer micros; timestamps are `timestamptz`; external IDs are text.
- DM bodies have retention timestamps and are excluded from routine logs.

## RLS

The migration enables RLS, revokes defaults, grants the minimum operations, and creates separate select/insert/update/delete policies. Service-role worker access is server-only. Policy tests must cover cross-workspace denial and storage object paths.
