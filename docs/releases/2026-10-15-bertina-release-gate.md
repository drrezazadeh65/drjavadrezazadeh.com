# Bertina production release gate — 2026-10-15

**Scope:** migration/bertina-linux6, including donation commerce, official stationery, Persian PWA/favicon identity, native browser print/Save as PDF and customer/admin dashboards.

**Policy:** Never deploy from this document automatically. The owner performs production deployment only after reviewing the checks below. The last *historically reported* production SHA is `ef178d99301d6edafadad026e27f1bbeae5f2df2`; verify the actual deployed SHA again immediately before deployment.

## Required source gates
- [ ] Verify target branch and exact immutable SHA; ensure no unexpected newer commits were added.
- [ ] GitHub Actions > **Donation and Document Export Contracts**: run on `migration/bertina-linux6`; all jobs green for the exact target SHA.
- [ ] PHP syntax, JS syntax, donation contract audit, document export tests and official stationery tests pass.
- [ ] Review deployment diff and confirm no secrets, development test data or unapproved production database migrations.
- [ ] Preserve working backups of site files, database and prior deployment artifact; record rollback SHA and procedure.

## Required staging/production-safe acceptance
- [ ] Persian favicon, PWA home-screen icons and wordmark display on desktop/mobile; invalidate service-worker caches as needed.
- [ ] Customer login and account dashboard work; account isolation confirmed (one user cannot access another user's orders).
- [ ] Pending/unverified orders never show a verified receipt. Only server-matched verified payment claims may produce a confirmation.
- [ ] Donation and normal service orders use correct amounts, categories, history and administrative accounting; no duplicate claim multiplication.
- [ ] Print and browser Save as PDF work on A4, in Persian RTL, with both approved Persian assets, no clipped fields or blank pages.
- [ ] Static previews remain clearly marked, non-indexed and never substituted for server-issued financial documents.
- [ ] BitPay callback verification, duplicate callback idempotency and payment error handling are validated safely without unnecessary real transactions.
- [ ] Check database compatibility for `JSON_VALID`, `JSON_EXTRACT` and correlated `EXISTS` finance query on Bertina.
- [ ] Check error logs, HTTP 404/500, caching of private endpoints and admin MFA permissions.
- [ ] Verify donation financial summary means **claim-matched payment**, not bank settlement or allocation verification.

## Release sequence
1. Confirm current production SHA and create restore points.
2. Record the green CI run URL and the exact target SHA.
3. Complete browser/staging acceptance and record failures.
4. **Owner manually deploys** the approved immutable SHA using the existing Bertina deployment workflow; do not assume branch head remains unchanged.
5. Smoke-test homepages `/fa/`, `/en/`, customer dashboard, admin dashboard, authentication, donation flow, assets, PWA and print.
6. On unexpected financial/authentication errors, stop new traffic if operationally possible and roll back to the verified backup/previous release; investigate before retrying.

**No go-live assertion:** repository commits and source-level tests do not by themselves prove operational readiness.

## Operator verification record (fill at release time)
- Production SHA observed immediately before deployment: `____________`
- Target SHA approved for release: `____________`
- GitHub Actions successful run URL: `____________`
- Backup snapshot identifiers (files/database): `____________`
- PHP and MySQL versions verified on Bertina: `____________`
- Browser print/PDF and mobile/PWA reviewer: `____________`
- Deployment date/time and operator: `____________`
- Post-deployment smoke test outcome: `____________`
- Rollback outcome if needed: `____________`

Never record API keys, passwords, session cookies, or personal payment details in this release record.
