# Unified Website + Seyyed Mehrab Mirkarimi Publishing — Single Bertina Release Candidate
**Date:** 2026-10-17  
**Status:** SOURCE INTEGRATED / LIVE OPERATIONAL ACCEPTANCE INCOMPLETE — DO NOT CLAIM DEPLOYED  
**Only repository:** `drrezazadeh65/drjavadrezazadeh.com`  
**Only development branch:** `migration/bertina-linux6`  
**Production:** `https://drjavadrezazadeh.com` on Bertina Linux6, PHP + MySQL/MariaDB  
**Deployment:** existing `.github/workflows/deploy-bertina.yml`; NO competing workflow or independent payment stack.

## 1 — Governing owner intentions; scope reconciliation
The owner directs a *single combined deployment* of (a) the comprehensive international academic / educational / scientific website masterplan and (b) the first future-publishing external-author product: Seyyed Mehrab Mirkarimi. This document **integrates** existing requirements, and does not replace `AGENTS.md`, the frozen international bilingual SEO standard, or either accepted master plan.

Binding source documents:
- `AGENTS.md`
- `docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md`
- `docs/governance/SUPER_MASTER_ALL_SERVICES_VISUAL_IDENTITY_100_PERCENT_20261016.md`
- `docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json`
- `foundation/MASTER-ECOSYSTEM-ROADMAP.md`
- `docs/governance/MASTER_STRUCTURED_DATA_ENTITY_GRAPH_EXECUTION_20261017.md`
- `docs/governance/STRUCTURED_DATA_PHASE_ACCEPTANCE_20261017.json`
- `docs/governance/SERVICE_PRIVATE_FILES_ACTIVATION_AND_ACCEPTANCE_20261017.md`
- `docs/governance/OWNER_RELEASE_INTENT_AND_BLOCKERS_20261017.md`
- `docs/governance/OWNER_RELEASE_NOW_POSTLAUNCH_AUDIT_DIRECTIVE_20261017.md`
- `docs/governance/JR_FUTURE_PUBLISHING_MASTER_20261017.md`
- `docs/governance/JR_PUBLISHING_DIGITAL_PAYMENT_ACTIVATION_20261017.md`

**Owner's latest release-timing decision:** Publish as soon as a genuinely protected, verified candidate can be launched, then complete the remaining noncritical audit; do not repeatedly ask whether the owner wants to publish. This does NOT certify release quality or negate the current blocking master release gate, which requires separate evidence-backed policy reconciliation; preserve non-negotiable transaction, TLS, privacy, immutable target SHA, recovery and identity controls. Do not forge any `VERIFIED` entry to accommodate a desired launch time.

## 2 — Whole-site release scope
One domain, one `/api/` origin, one verified email-account system, one BitPay Stage09 commerce engine, one design system and one source branch. Preserve:
- All **21 sellable services** with source-of-truth SKUs/prices in `assets/data/service-catalog.json`, `assets/data/service-descriptions-en.json`; 42 canonical Persian/English detail pages, separately trackable customer orders and admin fulfilment.
- Owner-confirmed **Donation** login, actual payment and recording in Bertina. Do not ask for a redundant test or make another payment system; do run regression protection for new code.
- Premium common visual brand, shared responsive components and mobile app-like experience, accessibility, valid SEO metadata/schema, no existing URL changes, no published private pages.
- Authenticated customer dashboard, owner MFA operations dashboard, invoice/receipt, secure academic service intake / professional deliverable custody, buyer notifications, no unproven paid fulfilment.
- Golden Talent, RCAS, BAHAR, Golden Path and scientifically qualified claims; academic publications/books; JHELA/OJS journal and scholarly submission/reviewer flows; bilingual SEO/GEO and structured entity graph.
- Unique service illustrations and academically substantiated, professionally written Persian/English content. An attractive mockup is not functional acceptance.

**Known live P0 for the author product:** [Post-release anonymous observation #39031499136](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39031499136) confirms the live **Mirkarimi public author page HTTP 404** and **/api/publishing/offer HTTP 404** on the production release fingerprint `f0bc6178a437d24e23b65eec1b791a36e578d8fb`. No actual paid link delivery or author email was demonstrated. This is a production visibility gap independent of complete private activation. The observer is in `scripts/bertina-postrelease-check.mjs` and its data are in the run's `bertina-postrelease-operational-evidence` artifact.

**Known live P0:** [route evidence](LIVE_BILINGUAL_SERVICE_ROUTE_GAP_20261017.md) documents **21/21 EN service detail URLs responding 404** in the inspected live revision and **21/21 FA URLs returning 200 but without the source-approved reciprocal hreflang**. Source-level 42-route tests pass; the live release fingerprint `f0bc6178a437d24e23b65eec1b791a36e578d8fb` differs from reviewed development code. This must be resolved through one approved deployment and verified afterward, without making false redirects or altering approved URLs. Follow-up source control: `scripts/lib/public-service-route-contract.mjs`, `tests/bertina-live-service-route-contract.test.mjs`, `scripts/bertina-postrelease-check.mjs`.

## 3 — First external author and digital bundle
**Author:** سید محراب میرکریمی / Seyyed Mehrab Mirkarimi  
**Product:** 36 examination years (1370–1405), two *original* PDF files, **425** question pages and **572** answer pages (**997 pages total**). An eventual printed book is prospective; no ISBN, signed print distribution contract or firm release date is asserted.

Owner/author-reported distinctive features: retyped high-quality text; efforts to correct ambiguous/incorrect original questions and answer keys; explanatory answers drawing on source books; sources/editions/year/page references reportedly given for **1390–1405**; AI-assisted condensation reportedly used in some answers **before 1390**; author reports more than a year of work and 120+ revisions. These are explicitly attributed to the author, not falsely certified as independent 997-page peer review. No invented exam rank, degree, picture consent, official examination-organisation endorsement or full scientific approval.

Source:
- Persian profile + SEO product page: `fa/shop/authors/mehrab-mirkarimi/index.html`
- Premium style: `assets/css/jr-future-publishing-author-v1.css`
- Conditional buyer checkout: `assets/js/jr-publishing-checkout-v1.js`
- Authenticated author workspace: `fa/app/author/` + `assets/js/jr-author-workspace-v1.js` + `api/publishing.php`
- Negotiation-only author contract: `api/internal/jr-publishing-contract-draft.php`
- Immutable contract/evidence schema: `docs/migrations/20261017_jr_publishing_contract_and_reserve.sql`
- Original PDF private binary installer: `api/internal/jr-publishing-private-install-cli.php`
- Digital gating/paid-order entitlement: `api/internal/jr-publishing-digital.php`
- Buyer+author separate outbox notices: `api/internal/jr-publishing-mailer.php`, `api/internal/jr-publishing-mail-worker.php`
- Hosting CLI setup and read-only preflight: `api/internal/jr-publishing-provision-cli.php`, `api/internal/jr-publishing-preflight-cli.php`
- Canonical base schema: `docs/migrations/20261017_jr_future_publishing.sql`. **Do not install** mutually incompatible experimental `jr_pub_*` migrations.

### Financial terms — mandatory precise disclosure
**Each verified bundle transaction:**
| Component | Toman | Accounting treatment |
| --- | ---: | --- |
| Actual customer price / gross sale | 1,000,000 | Authoritative server-side checkout |
| Author entitlement | 600,000 | 60% **of gross**, not net profit; accrued is not bank settled |
| Talent-support fund earmark | 400,000 | 40% **of gross**, not net profit; earmarked is not beneficiary disbursement |
| Separate site operations/tax-cost reserve | 70,000 | 7% of gross, funded **externally by platform**; NOT 7% statutory tax |
| Total funded obligations | 1,070,000 | A separate platform subsidy of at least 70,000 plus actual gateway/other costs is necessary |

No silent deduction from the promised 600k or 400k. Financial dashboard distinguishes paid-bank evidence, accrual, settlements, allocations, reconciled reserves, notifications and reversals.

### Legal and privacy distinction
The owner's commercial release intent for the website has been unequivocally expressed. **This is not the author's independent digital-distribution consent** and is not third-party permission for national examination source materials. An actual evidenced author grant, with privacy-safe account identity, is required before collecting money for the author's material.

As specifically ordered by owner, the **contract is visible now as a negotiable, read-only DRAFT** in the author's authenticated panel; it is not falsely shown as signed and does not prevent separate legitimate evidence of limited digital distribution permission. Independent legal review and dual signing of the final agreement follow negotiation. Author account email is private and must NEVER be committed to public HTML, GitHub or anonymous evidence artifacts.

**No real money before two real PDFs are privately available for immediate fulfilment:** exact checksums, restricted filesystem outside `public_html`, source rights, malware-scan evidence, account/SMTP readiness, exactly two unique download grants, immutable payment confirmation and actual end-to-end purchase/inbox testing.

## 4 — Specific deployment prerequisites and test evidence
- Private staging PDF zip (available in the originating ChatGPT conversation, **not** in GitHub or production) must be transferred by an authorised Bertina operator. Pin SHA256:
  - `tefl_1370_1405_questions.pdf`: `6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8`
  - `tefl_1370_1405_answers.pdf`: `db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4`
- PHP private, CLI-only installer refuses extraction into `public_html`; approve private filesystem custody and scan. Never store author signatures, PDFs or payment secrets in public GitHub.
- Apply reviewed additive schema only to backed-up authorised Bertina staging, first; then production with the existing approved migration protocol, with rollback.
- Register verified author account, bona fide rights evidence, budget source, correct bank settings and SMTP worker; ensure automated links actually reach recipient.
- Test a controlled **real** customer purchase through actual BitPay with explicit authorisation, independently verify bank claim, exactly two functioning PDFs and mail delivery, independent author notice, one-time 600k/400k allocations, independent 70k reserve, reversal and duplicate callback/retry protection. No test result may be fabricated.

**Automated source validations** (NOT sufficient for production):
- `tests/jr-publishing-mysql-fixture.php` — verified paid-order split, uniqueness, two file access records, outbox, replay, rollback in isolated MySQL.
- `tests/jr-publishing-digital-payment-guard.test.mjs` — BitPay protections.
- `tests/jr-publishing-contract-preview.php` — draft terms remain unsigned.
- `tests/merged-master-publishing-release-contract.test.mjs` — single 21-service + author release invariant.
- `tests/bertina-live-service-route-contract.test.mjs` — 42 source pages.
- `scripts/bertina-postrelease-check.mjs` — nonmutating trusted-HTTPS live observer for 42 bilingual service routes, Mirkarimi public page and offer readiness; **not** a real-payments test.

## 5 — Publication governance and go/no-go decision
**Current authentic status (2026-10-17):** `docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json` reports `BLOCKED_PENDING_FULL_ACCEPTANCE`, **0/41** independently VERIFIED whole-site gates, **0/21** VERIFIED paid-service acceptance records and `ownerFinalAuthorization=false` *in that specific manifest*. This is separate from the owner's expressed intention to release. Do not set these booleans based on ChatGPT text or a passing source test.

The existing `deploy-bertina.yml` is manual, owner-actor restricted, single-concurrency, immutable SHA / live SHA guarded and has a pre-production 100% acceptance rejection step. **A GitHub push or passing nondeploy CI does not deploy.** No alternate branch, bypass, forged signature, default-open payment, or second deploy workflow is allowed.

The newer owner timing instruction to launch the verified current subset and audit after publication requires a **genuinely reviewed, explicitly evidenced release-policy reconciliation** that preserves bank identity, recovery, privacy, SSL, source fingerprint and fail-closed modules. Until this is correctly approved and implemented, the current original workflow will block: do not claim otherwise. Do not deploy unrelated unverified workflows, or deceptively present *source readiness* as *live* readiness.

### Required final sequence
1. Re-fetch fresh HEAD; compare concurrent commits and actual live `sw.js` fingerprint. Source freeze must refer to a concrete 40-character SHA, not a mutable branch pointer.
2. Finish all source QA/CI; compare 41+21 release evidence honestly, staged risk matrix, 40 approved destinations and independent scientific/security/UX review.
3. Independently verify backups/restore, live/staging parity, BitPay, SMTP, private PHP files, signed links, external costs, author digital rights, full service operational flow; do not disturb Donation or active accounts.
4. Resolve and rerun **42/42 live public services** (21 English must stop 404ing; all 42 pages have canonical and hreflang). Author public profile and availability must be checked independently.
5. Only if the resulting gated policy permits it, use the **existing single manual Bertina workflow** for that exact source SHA, with authorised owner actor. Capture workflow run, release SHA and rollback evidence.
6. Repeat trusted live HTTPS observations and genuine authenticated paid journeys, capture evidence, retain outstanding unsupported work as open. Never label 100% without full verified evidence.

## 6 — Handoff and immediate action ledger
| Priority | Current evidence | Missing real-world condition | Owner-visible outcome |
| --- | --- | --- | --- |
| P0 bilingual 21 EN 404 / 21 FA hreflang | Two trusted live observer runs, source test passes | Approved matched Bertina deploy + 42/42 clean public reads | No broken EN detail routes |
| P0 author paid PDF activation | Source integrated and MySQL test passes | Rights evidence, 2 private PDF files, schema+SMTP host setup, one actual purchase | Customer actually receives 2 PDFs |
| P0 secure owner release | Existing workflow blocks release | 100% gate evidence **or** legitimate guarded timing-policy reconciliation, verified backup/recovery and exact reviewed SHA | One reversible controlled production release |
| P0 core commerce regression | Owner-confirmed Donation paid flow and source CI | New candidate production regression after release, no order/stock/account loss | Donation stays operational |
| P1 all 21 services | 21 SKUs, 42 source pages, shared commerce | Real service-specific fulfilment, customer/admin journeys and acceptance evidence | 21 fully operating paid services |
| P1 scientific/visual content | Approved master design and existing source | Independent academic and media rights checks, full responsive/a11y review | Honest premium bilingual experience |
| P1 JHELA/OJS, assessments, bookshop | Source/staging work exists | Real host evidence, scientific quality, private workflows, submission/payment proof | Complete research ecosystem |

### Audit trail links (known source runs, dates 2026-10-17)
- Successful **combined site+author** source CI run (source candidate with new 21-service publishing invariant): https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39031565681 — four jobs success (contracts/browser/public observation/candidate); does not validate live paid release.
- Successful nondeploying candidate run: https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39030687100
- Live bilingual 42-page failure evidence: https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39030826424
- Live system observer base case: https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39027647436
- Verified source tests must be rerun at the **final exact** GitHub SHA after any further merge. Tests associated with older SHAs do not independently approve new source changes.

**Conclusion:** The two owner directives and the Mirkarimi publishing project are reconciled for a single-source release candidate. This source dossier is **not a deploy, notarised signature, proof of commercial file delivery or official 100% acceptance**. The recorded obligations, actual acceptance criteria and fail-closed protections survive further source changes.
