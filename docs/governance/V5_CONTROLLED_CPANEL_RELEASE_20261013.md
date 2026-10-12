# DrJavad Ecosystem v5.0.0 — one-time controlled Bertina release

**Scope:** `drrezazadeh65/drjavadrezazadeh.com` only; branch `migration/bertina-linux6`. This is the owner's explicit 2026-10-13 controlled-release acceptance and **does not assert that v5 is live**.

## Recorded evidence and accepted limitation

The owner used cPanel to generate and inspect two full-account archives in `/home/drjavad1`:

- `backup-10.12.2026_23-23-00_drjavad1.tar.gz`
- `backup-10.12.2026_23-32-32_drjavad1.tar.gz`

The owner confirmed in phpMyAdmin 19 tables in `drjavad1_store`, 9/9 commerce tables `InnoDB`, unique indexes `PRIMARY(provider,transaction_id)` and `uq_payment_order(provider,order_id)`; physical-on-hand **owner-declared** 100 per book, reserved 0. These were observed from user-provided screenshots; no public GitHub commit contains personal order data.

**The two cPanel archives are NOT an authenticated, independently restored backup, and restoration may require Bertina support.** They predate the new commerce schema and cannot be used to undo only part of a release safely. Rollback must return the application and database to a mutually compatible point in time, potentially losing changes made since the archive. The owner explicitly accepts this narrower recovery assurance to release v5 sooner.

## Recovery policy design

The existing default `signed_restore` retains pinned RSA verification and has **not** been removed. The manually chosen exception `owner_cpanel_custody` is available only when ALL of the following are true:

1. A GitHub `workflow_dispatch` by the exact account `drrezazadeh65` targets the **canonical branch**, never a push event.
2. `approved_commit_sha` equals `GITHUB_SHA` byte for byte, so an unrelated source update cannot be silently approved.
3. `owner_acknowledgement` is exactly `ACCEPT_UNTESTED_RESTORE_RISK_V5`.
4. `expected_live_sha` is the current, independently observed **40-character** source stamp in `https://drjavadrezazadeh.com/sw.js`; the authenticated Bertina endpoint rechecks that the live file matches it **before extraction**.
5. The endpoint checks the two exact local account backup names immediately outside `public_html`: not links, readable, owner-consistent, mode `0600`, compressed gzip header, at least 128 MiB each, no older than seven days, and full SHA-256 readability/stability. These are **custody checks**, not a test restoration.
6. The existing read-only database check confirms legacy order columns, eight new tables, nine InnoDB engines and both required composite unique payment indexes **before extraction**.
7. The existing FTPS TLS, GitHub secrets, source-staleness check, path-traversal denial, file manifest checksums, cache fingerprint and origin health tests remain required. A failure stops/fails the workflow and must not be reported as successful production deployment.

The branch's `.bertina-backup-trigger` is expired: that does **not** prohibit the independently approved cPanel exception, but it continues to fail the **signed** recovery mode unless renewed and fully certified. No private key, fake proof, or password is committed to GitHub.

## Operator checklist

1. Ensure that the **latest** source CI has green `Bertina Controlled Release Gate CI`, `Bertina isolated restore readiness`, `DrJavad Ecosystem 5.0 Integration`, `DrJavad v5.0.0 Nondeploying Release Candidate`, `Bertina Master SEO Audit`, `SEO GEO Regression` and `Bertina-Only Provider Guard`. One successful earlier SHA is not proof for a changed head.
2. Verify current deployed Service Worker SHA from the live public HTTPS site. At owner review, the earlier observed SHA was `dd546f9c06275fe130216b9f5f8a31533619abf6`; **recheck** before clicking.
3. Go to GitHub `Actions → Deploy to Bertina → Run workflow`. Select branch `migration/bertina-linux6`.
4. Choose `recovery_mode: owner_cpanel_custody` (default `signed_restore` is *not* the owner's chosen exception).
5. Enter **full** current canonical GitHub HEAD into `approved_commit_sha`, **full** current Bertina `/sw.js` SHA into `expected_live_sha`, and exactly `ACCEPT_UNTESTED_RESTORE_RISK_V5` into `owner_acknowledgement`. These are not passwords.
6. Execute exactly **one** `Run workflow` and open the new run. The branch and target SHA must remain unchanged for the duration; do not start another concurrent deploy.
7. If the run refuses at owner-approval, secrets, TLS, cPanel backup gate or Stage09 schema preflight, **do not force it** or run database imports again. Record the failing step and stop.
8. On an apparent green release, independently verify live `/sw.js` exact SHA, pages `/fa/`, `/en/`, both owner dashboard routes, `/journal/sitemap.xml`, cache version and checkout security. Do **not** assert BitPay settlement or live OJS journal publishing solely from a healthy route.
9. In a post-deploy incident, halt further deployment immediately and contact Bertina for **coordinated website+database restoration** using their snapshots/archives. Avoid manually restoring a pre-migration database against v5 files.

## Unsupported conclusions

- No independent restoration was certified.
- No BitPay payment, stock shipment, student-support donation, journal manuscript submission or social post was executed by the source tests.
- Neither the GitHub release CI nor this document can certify that the website was deployed; **only an exact live SHA match and successful production acceptance run can**.
- `STAGE09_PRIVATE_DEPENDENCIES.json` continues to block monetary release authorization and real charge/refund tests; a controlled *file* release is not financial-operations approval.
