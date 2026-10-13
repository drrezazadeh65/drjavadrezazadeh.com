# Recovery checkpoint — commerce, appointments, Golden Talent, RCAS and BAHAR
Date: 2026-10-14
Main branch: `migration/bertina-linux6`
Checkpoint source SHA: `1ab157213c2e1258a604277384a5cb4ef241e3be`
Protected checkpoint branch: `checkpoint/commerce-golden-talent-rcas-bahar-20261014`

## Binding owner decisions

1. Prioritise completion of revenue-generating books, paid consultations, professional services and Golden Talent/RCAS/BAHAR. Leave unrelated Stage 7 engines alone.
2. Ordinary consultations must be **telephone (PHONE)** or **online video (VIDEO)**, selectable by the buyer. In-person meetings are permitted only for **VIP** or an explicitly catalogued annual coaching offer, with city restricted to **Tehran** or **Kashan**. The annual coaching product is not presently catalogued: no implicit eligibility.
3. Consultations cannot double book the same owner's calendar. A selected delivery mode is a preference and NOT a confirmed appointment. No bank settlement, service delivery, online meetings, capacity or notification can be claimed solely from a paid order.
4. Ground RCAS/Golden Talent in the author's `کشف مسیر طلایی استعداد` manuscript: RCAS Core 28, 142 unpublished D1–D6 items, E1–E10, Golden Path and BAHAR. No overall talent score or automated diagnostic norm claims before validation. Protect minor consent and private evidence.

## Verified and unverified milestones

- Owner supplied `/api/commerce/health` JSON showing all requirements true, `checkout=true`, `capabilities.books=true`, `services=true`, `vip=true` after declaring 100 in-stock copies of each book. BitPay emails for 2026-10-08/09/11 were previously inspected and confirmed payment notifications, not bank settlement or book/service fulfilment.
- Golden Talent/RCAS/BAHAR scientific and API scaffolds, PHP guardian consent checks, bounded auditing and read-only BAHAR overviews were committed to GitHub. Digital D1–D6 and BAHAR portfolios remain PREVALIDATION/NOT_LIVE.
- Private owner paid-service state progression added: `api/operations-fulfilment.php`, owner MFA, CSRF, payment claim checks, immutable audit, conservative calendar advisory lock.
- Customer consultation preference code added `api/consultation-delivery.php`, route `POST /api/commerce/consultation-preference`, additive **unapplied** database migration `docs/migrations/20261014_consultation_preferences.sql`, read-only account appointment view `assets/js/consultation-appointments.js`. New preferences not operational until schema migration is owner-approved and applied.
- Other recently committed changes: paid-book dispatch queue and ageing reports, sales and consented lead queues, bilingual private owner dashboard, RCAS Core 28 validation, manuscript crosswalk and BAHAR science tests.
- The 2026-10-13 GitHub Actions run `38486364635` **FAILED at automatic release eligibility** before production deploy: live `sw.js` source SHA observed as `aa3741ba606fa37f0f89f23af80a5e4909d77bb5`; proposed SHA `a177dc8607f915ef254484fd7c81979af6029cb2`; **controlled paths 42**, notably workflow changes and `docs/migrations/20261014_consultation_preferences.sql`, require deliberate activation. Later runs not yet independently confirmed successful.
- **Do not claim these new commits are on the live Bertina site**, and do not replace live database contents or run migration automatically. Manual production gate requires current live SHA, approved exact main HEAD, owner run, valid backup/restore custody, and release test success.
- The GitHub integration available in this chat has file/branch/update/read access but **no workflow_dispatch action**. A protected manual Run workflow is required. Use:
  `https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/deploy-bertina.yml`
  select branch `migration/bertina-linux6`; input `recovery_mode=owner_cpanel_custody` only with owner's *explicit current* acknowledgement of restore risk, `approved_commit_sha` exact current HEAD, `expected_live_sha` exact currently deployed service worker fingerprint from current site (recheck; do not assume historic SHA), `owner_acknowledgement=ACCEPT_UNTESTED_RESTORE_RISK_V5`. Never instruct owner to bypass tests, backups, drift or risk policies.

## Before any new production deployment

- Validate php syntax, MariaDB fixture and all browser tests; check isolated Stage09 consultation tests against the new preference schema and booking guard. Earlier fixture may not account for required customer selection.
- Verify `consultation-delivery.php` migration compatibility and security. The annual coaching exception MUST remain unavailable until a specific item exists in the live catalog.
- Run independent QA workflows. Production release of the new booking flow must follow approved additive SQL migration, after signed/restorable backup; ensure schema is present before using new booking features.
- Verify deployment using the stamped service worker SHA, live health endpoints, pages and a controlled service order that does not accidentally charge or consume production stock.
- Publish only after the independent tests pass and no other GitHub push changes HEAD midflight. If release is blocked, report exact gate and stop; do not rewrite policy to bypass it.

## Resume instruction
Continue with publication prerequisites and verification from the above checkpoint. User's latest request: "تا اینجای کار را منتشر کن بعد ادامه بده میترسم ظرفیت چت تمام شود" (publish progress now, then continue, worried chat space). **Preserve the code baseline, don't rush unsafe production changes.**
