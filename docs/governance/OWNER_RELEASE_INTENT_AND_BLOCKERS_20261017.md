# Owner release intent and factual Bertina preflight — 2026-10-17

**Source:** The website owner's direct instruction in the connected ChatGPT project conversation, 2026-10-17 (Asia/Tehran): **«من آماده انتشارم»**. This records readiness for the final publication of the fully completed master plan. Do not repeatedly ask the owner if they are ready. Their repeated conditions still govern: **all services fully working, no disabled or incomplete sections, no regressions, frozen SEO/URLs, premium visual design, academically responsible content, working buyer and administrator dashboards, and one validated release**.

**This record is owner intent, not independent 100% acceptance evidence or an instruction to circumvent the production deployment gate.** The owner's successfully exercised Donation registration, identity, real payment, receipt and database recording remain an accepted baseline; do not demand that the owner repeat this test. That fact does not independently validate the **new** service-file workflow.

## Actual source state observed at this preflight

- Canonical repository/branch: `drrezazadeh65/drjavadrezazadeh.com` → `migration/bertina-linux6`.
- Head inspected after the latest nondeploy CI improvement: `afaedd343ebef82cafe5ced7b0a69ef80737477a`. Since this source is shared, refresh HEAD before final certification.
- `docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json`: `BLOCKED_PENDING_FULL_ACCEPTANCE`.
- Recorded fully independently verified workstream gates: **0/41**; separately independently verified paid-service cases: **0/21**. These figures describe the **release acceptance manifest**, not a claim that no source code exists. Source implementation and customer-confirmed Donation operation are distinct from current certification status.
- `reviewedSourceCommit`, source CI evidence, staging evidence, operational readiness evidence, independent review and final acceptance evidence: **not filled**.
- `.github/workflows/deploy-bertina.yml` enforces `scripts/masterplan-100-release-gate.mjs` and only accepts a final manually reviewed full source release. **Do not disable this guard or forge evidence.**
- On this date an additional seven `php -l` checks were added to the nondeploying candidate workflow to catch parser regressions in new private-file, buyer-receipt and operations PHP paths. **A GitHub commit is not proof that the workflow actually completed and passed.**
- Live Bertina staging/private file storage, scanned file upload, real MySQL migrations, recovery/backup, actual client–owner handover and independent professional reviews remain subject to authenticated validation. Neither static/source checks nor a GitHub commit can assert them completed.

## Required next actions for release manager

1. Get the latest canonical branch HEAD and inspect the latest nondeploying **DrJavad v5.1.0 First Usable Nondeploying Candidate** Action run. Fix any failing PHP syntax, MySQL fixture, security, UX, performance or SEO test in the same branch, rerun to green and record the exact workflow run link and immutable commit SHA.
2. Check and close the 41 independently evidenced master-plan workstreams and all 21 individually verified services. Do not guess, self-approve on source evidence alone or mark verified when live/staging validation is still needed. Capture the 40 existing internal destinations and professional academic/scientific review.
3. Verify Bertina operational gates, private migrations/files, backups/restore, secure BitPay service flow, consent, and owner/client dashboards in real protected staging with no live-data exposure. Preserve the owner-confirmed Donation flow.
4. Prepare one reviewed immutable commit and all mandatory linked release-evidence documents; then set release acceptance states **only when proofs actually exist** and finish the final owner-authorized deployment gate. Treat the user's readiness message as a request to finish promptly rather than as permission to make up results.
5. Deploy the exact vetted commit **once** through the original `deploy-bertina.yml`, only after it passes the enforced gate; verify live routes, cache/PWA, payment/receipt protections, both languages, live SSL and 404 regression. Document the deployed fingerprint and rollback.

**Publication as of this audit: NOT PERFORMED.** Production remains protected. Do not tell the owner that the complete master plan is 100% live until the supporting production evidence exists.
