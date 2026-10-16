# Three Functional Scientific Learning Experiences — Release Acceptance

**Target:** `drjavadrezazadeh.com` · Persian RTL / English LTR  
**Branch:** `release/active-scientific-worksheets-20261016`  
**PR:** [#84](https://github.com/drrezazadeh65/drjavadrezazadeh.com/pull/84) targeting `migration/bertina-linux6`  
**Release state:** PREPARED AND QA-TESTED IN SOURCE BRANCH; **NOT MERGED / NOT DEPLOYED**  
**Scope:** strictly public, adult-oriented, non-diagnostic browser exercises and one mother-brand design system. Not a new private child assessment or server-side research intake.

## Acceptance ledger

| Feature | Working route | Verifiable activity | Privacy/science gate |
| --- | --- | --- | --- |
| Golden Talent evidence studio FA | `/fa/golden-talent/#goldenTalentEvidenceStudio` | 6-source observation and limits journal; educational hypotheses, action and review; copy, print and reset | In-page only; no score/diagnosis; no names/minor records |
| Golden Talent evidence studio EN | `/en/golden-talent/#goldenTalentEvidenceStudio` | Same six-source evidence flow in English, no translated score claim | No linguistic/psychometric equivalence asserted |
| RCAS Start FA | `/fa/assessments/golden-talent/start/` | Existing interactive 28-prompt browser reflection and self-selected follow-up | No normed totals, no private report |
| RCAS Start EN | `/en/golden-talent/assessment/` | Existing English translation-pilot reflection workflow | No equivalence or norming claim |
| BAHAR FA | `/fa/app/student/bahar/#baharWorkingPlan` | Goal/action/revision form, up to 5 observations, descriptive in-page review, copy and reset | No upload, no stored portfolio, no efficacy claim |
| BAHAR EN | `/en/golden-talent/dashboard/bahar/#baharWorkingPlan` | Same interactive formative worksheet in English | No stored minor records |
| Unified customer dashboard FA | `/fa/customer-dashboard/` | Three actual stage entry links; preserves existing account and commerce interactions | Private academic form remains explicitly locked pending safe backend proof |
| Scientific methods disclosure FA/EN | `/fa/golden-talent/ravesh-shenasi/`, `/en/golden-talent/methodology/` | Explains stage limitations and links to functional forms | Public statements do not imply AERA/ITC or other independent certification |
| Admin FA/EN visual system | `/fa/app/admin/`, `/en/account/admin/` | Approved Persian golden symbol and inherited obsidian/ivory/gold tokens | Preserves MFA and role-bound original controls; no new private API |

**Design master:** `foundation/DESIGN-SYSTEM.md`, `identity/brand-governance.md` and `identity/tokens.css`, extended by `assets/css/jr-scientific-experience-v1.css`. Approved **Persian mother-symbol** is reused, with shared semantically named components for browser exercise, report, management and print: not new independent subbrands. Mobile breakpoints, keyboard-visible focus, reduced motion, safe printable output and FA/EN direction are part of code/QA.

## Reproducible release evidence

**Completed CI before signed-archive addition:** [Safe public scientific experience release QA 38861705848](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38861705848) — **61/61 Chromium browser tests passed** covering live form interactions, sanitized inputs (no unsafe HTML execution), reset, no POST or raw-response upload, responsive evidence caps, existing RCAS/BAHAR/dashboard regressions, approved mother-brand identity, language routing and internal link targets. Production package built with **726 source-derived files / 322 HTML routes**, no `platform/`, `database/` or `tests/` engineering directory. These counts reflect that pinned run, not a universal guarantee of current live host contents.

**Latest extra release gate:** the CI now builds a `safe-scientific-public-site.tar.gz`, per-file SHA-256 manifest and source commit SHA, and uploads the checksummed bundle as a short-retention artifact upon successful checks. For its **latest** commit, check that its GitHub Actions run completes successfully before using this artifact.

**Important:** A compiled public package, a CI success and a GitHub PR do **not** prove the Bertina host deployed its contents. Protected production deployment requires a separately approved job, live post-deploy checks, and an immediate rollback path.

## Red gates: intentionally withheld rather than simulated

- `RCAS-CORE` scored/normed classification, `D1–D6` specialist questionnaires and automatic AI routing: scientific item banks, methods, ages, approved scoring/ethics and independent empirical evidence are incomplete.
- Child/minor persisted subject profiles, guardian upload, private interpretation, consent-related writes and longitudinal BAHAR storage: real installed schema, verified guardian/legal-age/learner-assent source, authenticated session, CSRF/MFA and operational audit must be approved first.
- Medical/psychological diagnosis, deterministic career forecast, school placement recommendation, quantitative talent percentile, signed reviewer scientific certificate and automated paid psychometric report: expressly **not allowed** without the applicable scoped evidence and independent review.
- Site-wide bookstore payment, journal publishing, scientific manuscript intake, background schedules and SEO/indexation are **separate** production services; this public-science QA did not certify them. Do not portray them as live by implication.
- The broader PR's repository-wide checks have shown failures in unrelated journal prototype accessibility/copy, PWA cache-version/test expectations, and bookstore tests. Their current status must be reassessed at the **exact PR SHA**, not inferred from the successful targeted suite.

## Release procedure (strict no-regression)

1. Verify PR #84 against the latest target branch and reconcile any concurrent changes; do not force-merge an obsolete base or overwrite existing successful production behaviours.
2. Require source compilation, the 61+ science/UX regressions, sanitized SHA manifest and relevant global branch protections to pass; review failed checks rather than bypassing them.
3. Confirm deployment does not apply `database/unified/006a_age_attestation_PROPOSAL_NOT_APPLIED.sql`, change canonical paths, disable existing API auth, rotate user data or expose internal test files.
4. Record previous healthy production commit, package checksum and server backup; deploy through the established **manual protected Bertina release process** only after green release gates.
5. Live smoke: real HTTPS/TLS and canonical links, FA/EN Golden Talent, RCAS and BAHAR inputs/outputs/reset, keyboard and mobile, public-to-private access denial, service-worker freshness, PWA routing and no personal answer submission. Revalidate customer login/orders/appointments/consents and administrative MFA separately.
6. On failed post-deploy check, restore the recorded healthy package and recheck affected routes. Never falsify indexation, psychometric validity or live transactions to turn a dashboard green.

**Disposition:** This is a production-ready *candidate* for safe adult-oriented educational content and browser-only function; it is **not** a completed secure research/assessment product or a certification of the entire ecosystem.
