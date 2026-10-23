# Operations dashboard: evidence and closure contract

This is an isolated **proposal**, not a deployed administrator route. Do not publish the static prototype as an authenticated admin page.

## Gate definitions
- `not_started`: no verifiable implementation evidence.
- `in_progress`: changes exist but some gates are missing.
- `blocked`: missing external credentials, provider response, or owner approval.
- `ready_for_verification`: implementation present; production E2E still pending.
- `verified_complete`: all required evidence recorded; eligible for closure.
- `regressed`: previously passed, but a subsequent release fails a gate.

Every section stores: ID, owner engine, P0/P1/P2, description, dependency IDs, criteria, status, numeric score (only if calculated), score methodology, evidence references (run URL, commit SHA, checked_at UTC, test name, environment), blocker, next action, and last_verified_at. Never equate CI green with production revenue readiness.

## First closure batch (business dependency order)
1. OP-02: GitHub release control. Determine canonical production branch and audit stale default branch workflows. Do not auto-merge 314 divergent commits.
2. OP-03: Strict independent certificate-chain, hostname, apex/www, expiry and redirect tests. No insecure TLS bypass.
3. OP-04: Compression and cache headers from Bertina production; verify no-store on private routes and correct service-worker offline behavior.
4. OP-05 / OP-06: Consent-based, controlled register → verify email → login → password recovery on production; redact identities and tokens.
5. OP-07 / OP-08: Gateway credential and currency conversion configuration, idempotent callback, tamper-resistant receipt and reconciliation; do not enable commerce before explicit approval.
6. OP-09: One low-value real payment and refund/reconciliation evidence, after owner authorization.
7. OP-01 / OP-12 / OP-13: Preserve SEO release gates and recover only evidence-backed historical URLs.

## Evidence sources and fail-closed policy
- GitHub Actions for source gates and Bertina FTPS integrity.
- Strict external HTTP/TLS probes for public domain.
- Bertina private health probes via secure server-side ingestion, never browser secrets.
- GSC/Bing API via server-side authorized integration; distinguish indexed, discovered and submitted.
- Ahrefs backlink-target exports and sanitized Apache 404 logs; no blanket 404 → homepage redirects.
- Payment provider webhook events and internal order ledger; do not leak PII, credentials or raw transaction tokens into reports.

## Admin architecture
Server-side Bertina PHP + MySQL. Admin access must use authenticated sessions, RBAC, CSRF protection, no-store, noindex, audit log, and rate limits. A public HTML draft is **not** an admin portal. Read-only evidence import should precede all mutation features.

## Reporting
Provide Persian executive summary, per-engine evidence table, completed/blocked/unverified counts, dependency graph, progress history, deployment status, sales funnel, priority queue and dated written report. Show "estimate" separately from "measured". Never mark an item complete from a manually checked box alone.

## Handoff
Branch: `proposal/admin-operations-dashboard-36`; base: Bertina production commit `404c051f6b781df1cb8a8aeb4b5cac1a112b8e8e`. Codex owns production merges under issue #28. Review this proposal as read-only, reconcile with any newer production commits, then implement secured backend before deployment.
