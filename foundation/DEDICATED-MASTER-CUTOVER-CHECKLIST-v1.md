# Dedicated Master Cutover Checklist — v1

This is the operational handoff checklist for the planned move to a dedicated master. It complements the architecture documents; it does not declare the backend live.

## T-14 to T-7 days — provision and prove staging

- Provision the selected dedicated master and a separate staging environment or logically isolated staging deployment.
- Configure TLS, reverse proxy, non-root runtime user and firewall. PostgreSQL/private storage must not accept public internet ingress.
- Inject runtime secrets outside Git and browser bundles.
- Run all numbered database migrations in order; record the migration head for the release.
- Deploy private app/API as an immutable release artifact.
- Implement `/health/live` and `/health/ready` according to `platform/runtime-health-contract.json`.
- Configure database + private-file backups and complete at least one restore drill.
- Connect transactional email in test/staging mode.
- Exercise account verification/recovery, RBAC/RLS, consent withdrawal and private-file access with synthetic data only.

## T-7 to T-2 days — product/revenue proof

- Exercise consultation intake → triage → booking → confirmation → completion/follow-up.
- If payment credentials have arrived, implement only the exact approved adapter and run sandbox create/return/callback/status/reconciliation/idempotency tests. Otherwise payment remains OFF and does not block non-payment development.
- Exercise Golden Talent evidence creation, active professional review projection, route run, discrepancy handling, professional Golden Path release, BAHAR baseline and reassessment using synthetic cases.
- Verify private routes return no-store/noindex and are never cached by the PWA.
- Test 320/360/390/430px mobile layouts plus keyboard, VoiceOver/TalkBack where available.

## T-48 hours — release candidate

- Freeze one release commit; CI, master audit and migration preflight must be green.
- Verify canonical/domain cutover prerequisites but do not change canonical origin before HTTPS is working.
- Confirm rollback artifact and forward/rollback database plan.
- Confirm monitoring, structured logs and alert contacts.
- Confirm payment remains OFF if merchant credentials or reconciliation proof are incomplete.

## Cutover

- Deploy the same tested artifact; do not rebuild from a different source.
- Apply any unapplied migrations before routing production traffic.
- Require readiness 200 before traffic switch.
- Run smoke tests for public pages, auth, consultation, private files, Golden Talent private flows and payment only if enabled.
- Execute the permanent-domain SEO cutover exactly once after HTTPS is verified.
- Re-run sitemap/canonical/hreflang/schema checks and then enable Search Console/Bing workflows.

## Abort conditions

Abort/rollback traffic if readiness fails, DB migration state differs from the release, private data becomes publicly reachable/cacheable, authentication/RBAC/RLS fails, payment verification cannot be reconciled, or canonical migration points to a non-HTTPS/non-serving origin.
