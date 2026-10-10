# Admin engine dashboard integration contract

The existing protected admin shell lives at `/fa/app/admin/` and `/en/account/admin/`. The standalone `foundation/engine-dashboard-preview.html` is a **non-operational design preview**, not an authenticated admin route. Do not publish it as a private dashboard.

## Required server-side reporting endpoint

`GET /api/v1/admin/engine-status` (proposed, not implemented):
- Require a verified email session, ADMIN/SUPER_ADMIN role, server-side authorization and fresh admin MFA.
- Return `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow`.
- Use a short-lived request-scoped token and origin-bound CSRF protection for any write endpoints.
- Resolve actual status from deployments, database health, queue depth, error rates and bounded time windows. Never infer readiness from presence of source code.
- Respond with `{as_of, source, engines:[{id, owner_module, status, status_reason, last_verified_at, metrics:{...}}]}`.
- `status` must be one of `ACTIVE`, `DEGRADED`, `BLOCKED`, `UNVERIFIED`. Unknown or unavailable signals map to `UNVERIFIED`, not `ACTIVE`.
- Do not include user identifiers, emails, payment details, notes, secrets, assessment answers, or raw telemetry.
- For reports, return aggregation only where disclosure controls permit it; suppress small cohorts.
- Record administrative access in append-only audit logs.

## Integration gates
1. Private API deployment, email-only identity and admin MFA.
2. Production health collectors with verifiable timestamps and source attribution.
3. Authorized client fetch, loading/error/stale states, and explicit unavailable metrics.
4. Accessibility, RTL/LTR parity, mobile tests and noindex checks.
5. E2E authorization denial tests, release rollback and audit verification.

**Do not** merge the static preview into the protected admin page until these gates are implemented.
