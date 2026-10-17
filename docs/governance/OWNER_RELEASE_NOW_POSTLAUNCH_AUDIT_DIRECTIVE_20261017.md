# Owner directive — prepare immediate production publication, then final audit
**Owner instruction received:** 2026-10-17, Asia/Tehran.
**Canonical repository:** `drrezazadeh65/drjavadrezazadeh.com`
**One approved source branch:** `migration/bertina-linux6`

## Latest owner decision (takes precedence for intended rollout timing)
The owner expressly requested **publishing the current site now, with final live audit and completion to 100% after publication**, rather than waiting to audit every feature before launching. This is explicit authorization to prepare and attempt an appropriately protected release; do not repeatedly ask the owner whether publication is desired.

This supersedes the former **timing preference** to wait until the entire master plan is 100% complete before starting release preparation. It does **not** authorize a release that bypasses fundamental payment, security, privacy, data-integrity, recovery, deployment-identity, source or live-integrity controls; nor may it be represented as full master plan completion or retroactively treated as passed tests.

## Verified blockers at the time this directive was recorded
- The actual `.github/workflows/deploy-bertina.yml` is a **manual `workflow_dispatch`** with GitHub actor, branch, exact source/live SHA and deployment safety preflights. A normal push does not publish the site through that workflow.
- `docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json` is still `BLOCKED_PENDING_FULL_ACCEPTANCE`; **0/41** independently required gates are marked `VERIFIED`, **0/21** paid services have final acceptance status, and the 40 real destinations have no signed acceptance evidence. It has no reviewed immutable source SHA and no independently reviewed CI/staging/operations certificates.
- `scripts/masterplan-100-release-gate.mjs` and the deploy job reject this state **before any production interaction**. These gates were NOT bypassed or marked verified.
- In this chat the connected GitHub toolset can read/commit GitHub source but has **no workflow_dispatch/deployment operation**. No workflow was started, no production schema was altered and no live release was verified from this interface.
- The canonical branch has active concurrent contributors. Always obtain a fresh full 40-hex HEAD and current CI state before release to prevent stale or overlapping production changes.

## Correct next operational sequence
1. Preserve the existing working Donation / registration / verified payment / transaction logging, active user data and URLs. Treat the owner's earlier real successful Donation test as an established operating baseline, not a question to repeat.
2. Reconcile the new explicit phased-timing directive with the release governance **through a reviewed owner-authorized policy change** that preserves non-negotiable deploy protections; never fill `VERIFIED` fields with fabricated evidence, turn off the security gate without replacement, or add a competing deploy workflow.
3. Run nondeploying candidate/commerce/browser checks on the actual reviewed HEAD; confirm paid file routes do not leak sensitive material and that required private file migrations are either correctly deployed and configured, or the feature reliably fails closed while the current production site remains usable.
4. Confirm the live HTTPS host, `/sw.js` release fingerprint, backend readiness, exact source/live SHA, a viable hosting-managed recovery approach and compatibility of new PHP with the live database **before** a production upload; deployment scripts already include checks. Never commit server secrets or misstate a backup as tested.
5. Use the **existing** Bertina deployment workflow, on the correct branch and owner-authorized actor, only when the resulting legitimate policy permits the carefully scoped launch. Record workflow URL, result, installed production SHA and independent live checks. Do not manually upload arbitrary files or make database changes outside approved release/migration controls.
6. Perform the owner-requested post-launch live audit of the complete website (41 workstreams, 21 paid services, bilingual SEO, dashboards, full commerce, Golden Talent/RCAS/BAHAR, journal, bookstore, accessibility, mobile, confidential files and actual receipts), record verified deficiencies and repair progressively without regression.

**Recorded source status:** Release **NOT EXECUTED** as of this record. This source-only directive cannot itself authorize an unsafe production run or certify a 100% final release.
