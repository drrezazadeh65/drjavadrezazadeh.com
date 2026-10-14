# JR Identity OS — unified integration and acceptance matrix

Target: `migration/bertina-linux6`. Development: `feature/jr-unified-identity-v1`.
**Do not deploy or merge before the gates below pass.** All identity files remain within the existing repository; no separate database or parallel production service.

## Gate A — identity assets
- [ ] Approve original Persian vector mark, wordmark spelling, monochrome and 16/32/48px legibility.
- [ ] Verify all FA/EN templates use the same approved mark and tokens.
- [ ] Review license/provenance and accessibility contrast.

## Gate B — document renderer
- [ ] Run `node --test identity/engine/preview.test.mjs` in CI; record successful run URL and commit SHA.
- [ ] Verify six document types × two locales, print pagination, RTL shaping and PDF output.
- [ ] Validate template-manifest/schema consistency and snapshot outputs.

## Gate C — trusted issuance
- [ ] Inspect actual deployed PHP endpoints and MariaDB schema; do not infer deployment from documentation.
- [ ] Issue receipts only after verified server-side payment settlement; implement idempotency.
- [ ] Require authenticated authorization for bookings, assessments, certificates and document retrieval.
- [ ] Bind assessment reports to instrument/version, consent and authorized recipient.
- [ ] Store private documents securely; implement audit, revocation and retention.
- [ ] Public verification reveals only minimal validity metadata, never sensitive assessment data.

## Gate D — integration and release
- [ ] Check all existing pages and services for regressions, especially mobile/PWA.
- [ ] Confirm production configuration and secrets are excluded from commits.
- [ ] Back up target branch and database; verify rollback procedure.
- [ ] Compare final development head against `migration/bertina-linux6` and resolve any divergence.
- [ ] Obtain approval for final Persian logo and controlled deployment.
- [ ] Merge into the single Bertina target branch, then deploy once and verify live smoke tests.

Status: checklist created; no gate is marked passed by this file.
