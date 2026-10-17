# Unified Website + Seyyed Mehrab Mirkarimi Publishing — Single Bertina Release Candidate
**Date:** 2026-10-17  
**Status (updated 2026-10-17):** SCOPED BERTINA RELEASE `7e553a92f5dd755ab9b941b5c6c9a8bc9ec223bb` DEPLOYED; public post-release probes passed; private/financial/scientific/whole-masterplan acceptance remains incomplete. Later source edits are not deployed.  
**Only repository:** `drrezazadeh65/drjavadrezazadeh.com`  
**Only development branch:** `migration/bertina-linux6`  
**Production:** `https://drjavadrezazadeh.com` on Bertina Linux6, PHP + MySQL/MariaDB  
**Deployment:** existing `.github/workflows/deploy-bertina.yml`; NO competing workflow or independent payment stack.


## Operational progress — owner-approved 2026-10-17 additions (source changes, not deployed)

- **Bertina capacity/host:** the SSL ticketing system identifies the current service as **5000MB / linux7**. This supersedes the historical "Linux6" description *for current service configuration evidence only*; independent PHP version, free-space and active web-root checks must still be sourced from cPanel before deployment. The hosting control panel cannot be managed through GitHub.
- **Mother DB schema:** the owner executed and audited 28 additive tables in MariaDB; phpMyAdmin results show **253 total store tables**, including 20 publishing, 5 JHELA intake and 3 commerce-service tables, 28/28 new InnoDB, 28/28 new utf8mb4_unicode_ci, 41 new FK constraints and 44 FK columns. No actual money, author rights, encrypted-assets custody or app E2E is implied. Canonical sanitized inventory: [BERTINA_OBSERVED_TABLE_CATALOG_20261017.json](BERTINA_OBSERVED_TABLE_CATALOG_20261017.json). Seven canonical DDL files match all 28 additions by name. OJS vendor DB **drjavad1_jhela_ojs remains empty** and defaults to utf8mb4/utf8mb4_unicode_ci; official PKP installer must create its native tables.
- **Journal TLS:** owner-authorized ticket **t975001** was acknowledged by Bertina; support confirmed technical escalation but not a CA-issued certificate. Follow-up answer in same ticket prioritises `journal.drjavadrezazadeh.com`, then its `www` alias, without delaying mandatory TLS for optional legacy aliases. Avoid installer, public submissions and forced redirects while the journal host is self-signed.
- **Bilingual commerce design:** the owner-reported usability regression motivated additive luxury/mobile improvements in `assets/css/shop-customer-premium-20261017.css` and ten `fa/en/shop/{cart,checkout,purchase-guide,customer-policy,receipt}/index.html` pages. The pages use existing owner-approved original media, remain on existing URLs, preserve noindex on cart/checkout/receipt and maintain original payment hooks. The Mirkarimi storefront uses persuasive customer-facing product copy, a rights-approved academic **editorial illustration (not a personal portrait)** and the agreed 600k author / 400k talent-support allocation, while live payment remains blocked without rights/asset/verification evidence. The app-shell icon stylesheet is now scoped so **1024px tablet dialogs stay usable**. All six bilingual purchase-guide/customer-policy/receipt social previews now match their on-page approved editorial image (Open Graph and Twitter); canonical/hreflang/noindex regression tests preserve the original public/private SEO classifications.
- **Static and browser gates:** `tests/shop-premium-customer-design.test.mjs`, `tests/bertina-observed-schema-registry.test.mjs`, and `tests/public-browser-qa.spec.js` contain the new regression coverage. `scripts/build-public-site.mjs` now refuses a bundle missing the customer-commerce pages, their CSS, approved images or private-route noindex. The prior [Browser QA run #39062348930](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39062348930) reported **131 passed / 1 failed**: the 1024px tablet menu was hidden by an overly broad safeguard. A source correction was committed in `assets/css/mobile-app-v431.css`; **passing CI on the corrected HEAD must be demonstrated afresh** before production approval. An earlier [Catalog integrity run #39061117311](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39061117311) failed due to a syntax error in the then-current test, subsequently revised; fresh current-sha CI is required.
- **Non-negotiable release blockers:** live-source mismatch in 21/21 English service routes and original Mirkarimi public/offer URLs (historic HTTP 404 observations, recheck after any approved release); formal PKP installation + CA TLS; verified private PDF receipt/delivery; author distribution rights and financial reconciliation; 41 official masterplan and paid-service acceptance gates remain untouched unless independent evidence proves closure. **No blanket "100%" claim and no unauthorised deployment.**

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

## 7 — 2026-10-17 exact-HEAD evidence checkpoint and beyond-baseline acceptance

**Observation time:** 2026-10-17 13:05 UTC. **Observed canonical source SHA:** `f3fd28e90c9fbaeeecb30421f34688c7d6699a6a`. This is a dated, read-only source checkpoint; the branch may move. Never imply that this SHA is Bertina's installed revision or that this documentation commit itself passed the listed runs.

### Same-SHA CI evidence actually observed

All seven of the following nondeploying runs **completed successfully for `f3fd28e...`**. They are reusable evidence of their individual source/test scopes, *not* seven independently completed masterplan gates or verified transactions:

- [Bertina-Only Provider Guard — 39035146273](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39035146273)
- [Donation and Document Export Contracts — 39035146294](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39035146294)
- [Bertina Master SEO Audit — 39035146290](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39035146290)
- [SEO GEO Regression — 39035146335](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39035146335)
- [Safe public scientific experience release QA — 39035146286](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39035146286)
- [DrJavad v5.1.0 First Usable Nondeploying Candidate — 39035146271](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39035146271)
- [Progressive Release Policy Tests (No Deployment) — 39035146341](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39035146341)

The [canonical source-evidence reconciliation script](../../scripts/masterplan-evidence-reuse-audit.mjs) and its existing candidate-workflow artifact already map **41 masterplan workstreams and 21 sellable service IDs to existing implementation pointers** without assigning fictitious acceptance. Do not replace or duplicate this inventory. The authoritative [masterplan manifest](MASTERPLAN_100_RELEASE_ACCEPTANCE.json) at this checkpoint still records **0/41 formally VERIFIED, 0/21 formally VERIFIED, zero approved 40-destination evidence records, no immutable approved release SHA and `BLOCKED_PENDING_FULL_ACCEPTANCE`**. These are *certification counts*, never an estimate that implementation is 0%. The owner's earlier estimate of 30% remaining cannot be recalculated responsibly from those counts or from green CI.

### Priority closure ledger — delta only, no parallel implementation

| Priority | Deficiency supported by existing evidence | Nonduplicative next verification | Exit criterion |
| --- | --- | --- | --- |
| P0 | 21/21 English service-detail paths were 404 and 21/21 reachable Persian pages missed reciprocal hreflang at the older live fingerprint `f0bc617...` ([live audit](LIVE_BILINGUAL_SERVICE_ROUTE_GAP_20261017.md)). | Compare immutable reviewed source against current live Bertina files, hashes and routes; preserve approved paths and working Donation; deploy only through an authorized existing guarded release. | Fresh CA-trusted origin report shows **42/42 HTTP 200**, correct self-canonical/FA/EN/x-default tags, matching exact deployed fingerprint; this does not certify purchases. |
| P0 | First author public page and `/api/publishing/offer` were 404 on the same older production snapshot ([read-only observer](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39031499136)). | Reconcile source page/API assembly and release eligibility; keep money collection disabled until contractual rights, two privately stored validated PDFs, additive schema, unique claim, receipt/link and author notification are genuinely tested. | Fresh deployed page + offer observation and a separately authorized, authenticated, exactly-once paid-delivery test with evidence; no public PDF exposure. |
| P0 | [Release manifest](MASTERPLAN_100_RELEASE_ACCEPTANCE.json) blocks upload; newer owner intent requests publication as soon as a **genuinely safe** release is demonstrable. | Resolve the timing-vs-full-acceptance policy contradiction **through reviewed owner-approved governance** without falsifying any `VERIFIED` field, disabling protection, or introducing another deployment path. Inspect strict TLS, backups/restore, rollback, migration compatibility, matching source/live SHA and private-scope boundaries. | Existing owner-controlled release gate explicitly allows the precisely reviewed immutable scope with independent safety evidence, or remains blocked. |
| P0 | Existing payment/Donation and active identities must survive the publishing addition. | Reuse the existing BitPay Stage09 and accounts; test callback idempotency, existing Donation regressions, orders, receipts, author 600k / fund 400k accrual, externally funded 70k reserve and reversal without claiming bank settlement. | Signed and reconcilable event evidence; buyer receipt and two restricted downloads; no duplication, no account or Donation regression. |
| P1 | Scientific reviews, creative rights, OJS, assessments, finance and twenty-one service-specific fulfilment cases are not all independently certified. | Use the existing [41/21 evidence reuse inventory](../../scripts/masterplan-evidence-reuse-audit.mjs) and per-module controls to assign owners, distinct independent evidence and residual blockers; no fake child data, psychometric norms, OJS indexing, bank settlement or live author consents. | Each accepted capability has an auditable source test, staging/host observation, rights/science approval where relevant and an owner-approved final record. |

**Above-baseline quality standard (not a numerical claim of >100% completion):** In addition to all accepted functional and scientific obligations, a release should demonstrate regression-free accessibility with real mobile devices and assistive technology, 320/390/430/768/1440-pixel RTL/LTR visual evidence, no unexpected canonical or historical 404s, verified private no-store/cache boundaries, defensible Core Web Vitals field observations, reversible incident response and restore exercise, reproducible owner-safe reporting, and production monitoring after release. These are quality objectives with separate evidence, not reasons to falsify closure or restart completed modules. Where evidence cannot yet be obtained, retain `PENDING` and fail closed.

**Operational boundary:** This checkpoint neither modifies production nor authorizes real payments, author signatures, site deployment, migrations, email deliveries or transfers. Preserve all current working user journeys. The next candidate must re-evaluate fresh canonical HEAD, contemporaneous runs and actual Bertina host state; if a new commit changes the release artifact, the previous test SHA cannot be promoted as proof for the new one.


## 8 — Reproducible candidate package and exact deployment handoff (2026-10-17)

This is a **source/artifact handoff**, not approval to deploy. Read it together with the existing release gate and do not create a second publishing or commerce implementation.

### Verified packaged build (same source SHA)

- Candidate code commit: `f3fd28e90c9fbaeeecb30421f34688c7d6699a6a`. The immediately following `de0f44d48aaf5e8ae4ef9107ff5279c0ad9d47fa` commit is a masterplan-documentation update. The release operator must recheck HEAD and rerun appropriate CI on the final immutable release SHA before promotion.
- Existing **nondeploying** successful candidate run: https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39035146271 — all four jobs `contracts`, `browser`, `public-observation`, `candidate` successful on the exact candidate SHA. This is not evidence of a live BitPay payment, author agreement, mail arrival, MySQL migration or Bertina deploy.
- **Already-built package; DO NOT rebuild it just to make a new file name:** GitHub Actions artifact **`bertina-v5.1.0-rc`** (ID `12101856870`), size `14,848,390` bytes, digest `sha256:70a637f5f266637136cf404f4abb25aa91530f50e3dde49d1d093db1de8fd72e`, available in the Actions run (artifact expiration `2026-10-31T13:08:14Z`). Official archive endpoint: https://api.github.com/repos/drrezazadeh65/drjavadrezazadeh.com/actions/artifacts/12101856870/zip . Its contents are a *sanitized public-site candidate*, **not** the two paid PDF files, private author credentials or a production backup.
- Existing read-only evidence inventory artifact `masterplan-existing-work-reuse` (ID `12101534021`): https://api.github.com/repos/drrezazadeh65/drjavadrezazadeh.com/actions/artifacts/12101534021/zip . It cross-references 41 workstreams and 21 saleable services without declaring any independently accepted.

### Owner/operator staging handoff — perform once, in this order

1. **Freeze and verify source:** obtain exact latest branch HEAD and live `/sw.js` fingerprint independently through approved trusted HTTPS runner. Reconcile code changes since the packaged SHA. If only evidence docs changed, document that ancestry; do not infer the immutable source and live are equal. Re-run latest exact-SHA controls if package or executable source changed.
2. **Verify recovery and installation:** obtain privately checked Bertina filesystem+MySQL backup and rehearse an independent restore or signed recovery path. Inspect actual database schema compatibility, deployment checksum manifest, private runtime and irreversible upload/migration consequences; preserve current Donation, registered customers, messages, catalogue, SEO and service-worker privacy behavior.
3. **Close existing site acceptance records:** retain authoritative `docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json` as **PENDING** until independently supported. Work directly from existing `scripts/masterplan-evidence-reuse-audit.mjs`, do not create duplicate 41/21 trackers. A green source test is not independent reviewer approval. The existing manual `deploy-bertina.yml` must continue to reject missing 41/21/40-source acceptance and owner signature.
4. **Owner-authorised private digital publishing setup:** verify author identity and licence/right to distribute edited exam material, agreed 60% author / 40% support allocation, separate **7% operator-funded reserve**, genuine copyright and scientific review statements. Transfer the two exact PDFs ONLY to private server custody using `JR_Publishing_PDF_Private_Server_Staging_v2.zip` (exactly four members; ZIP SHA-256 `a0fb784d92f0b3b40fc03f370444bfda41af40a1dc72d6b90568c4c9ffcdbbcf`) from its original authenticated staging location; verify original SHA-256 digests and malware scan. Do not upload PDFs, mailbox credentials, contract signatures or buyer tokens to this repository or a public path. Use existing `api/internal/jr-publishing-private-install-cli.php` and the operator checklist in `JR_PUBLISHING_DIGITAL_PAYMENT_ACTIVATION_20261017.md`, not a second installer.
5. **Private workflows:** provision role-linked verified author account and private email destination, approved rights evidence, reviewed MySQL migrations, protected download grants, buyer and author SMTP outbox/cron, BitPay verified callback and provider-claim reconciliation, refund reversals and separately budgeted 70,000 toman expense. Confirm explicit unique events so repeated payment callbacks cannot duplicate email, grants or allocations. Never infer bank settlement from a verified order alone.
6. **Non-monetary staging tests first:** 42/42 bilingual service-detail HTTP 200 + correct canonical/hreflang, both site locale routes, author page/offer, private API denial, 320/390/430/768/1440 viewport/accessibility, PWA/no-store and SEO/structured data; authentic login/MFA and admin/user/author dashboards; preservation of already working Donation. Run operator-safe private preflight and record observed evidence, not secret contents.
7. **Owner-approved controlled financial E2E only AFTER all permissions and environment gates:** legitimate order for one 1,000,000-toman bundle; provider-approved matched amount and verified claim; buyer gets exactly two usable time-limited private PDFs; author receives one notification; finance ledger records 600,000 author payable, 400,000 fund earmark, and separately funded 70,000 reserve; refund/idempotency/bank reconciliation and verified complaint workflow tested. No public release may assert this before witnessed proof.
8. **Single final promotion:** after the required actual 100% acceptance manifest and explicit owner authorization are truthfully satisfied, use ONLY https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/deploy-bertina.yml (manual owner actor, approved exact SHA, observed prior live SHA, reviewed recovery mode). Do not weaken `scripts/masterplan-100-release-gate.mjs` or rely on push-triggered CI for production publication. Post-deploy capture live SHA/checksums, trusted TLS/42+author routes, MFA, receipts, linked downloads, error logs, rollback evidence and separate real-transaction review.

### Current blocking evidence (do not rewrite as success)

At handoff creation, the authoritative release manifest remains `BLOCKED_PENDING_FULL_ACCEPTANCE`, with `0/41` formally verified gates, `0/21` separately verified paid-service journeys, `0` approved internal destination records, `ownerFinalAuthorization=false` and no approved immutable deployment SHA. These are **formal proof counts**, not completion percentages. Earlier trusted observations recorded missing live English service pages and first-author page/offer; this session's direct web fetch could not independently verify whether they have since gone live. Do not treat the absence of a fresh observation as success or as definitive continued 404. No live deployment, money movement, rights approval, email sending, private SQL modification or public file upload was performed by preparing this handoff.

**Next action with highest value:** an authorized operator must run private staging and backup/restore acceptance and capture real evidence for the existing 41+21 records. Only then can the existing release gate legitimately progress.


## 9 — Mobile publishing QA and exact-SHA test evidence (2026-10-17)

**Tested application SHA:** `6f63dae52cc26b470cdc57816a07161039775578` on canonical `migration/bertina-linux6`. This checkpoint supersedes the older source-checkpoint only for the code and routes it directly exercised. A later documentation commit will not be confused with this application SHA. Nothing in this section marks production-ready services, digital author rights or 41/21 independent approvals as completed.

**Confirmed browser regression closure:** [Browser QA #39039964760](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964760) completed **SUCCESS (131/131)** on the exact SHA. The previously failing new mobile publishing flow passed at 320/390/430/768/1024/1440 widths on the Mirkarimi product page and the private author dashboard. Root cause: the native inline margin/min-content sizing of the product-page `figure.jp-book-scene` exceeded the 320-pixel viewport. An additive media-query constraint removed the incidental margin and allowed the grid child to shrink. Both existing pages have cache-busted the shared premium CSS without removing five-button mobile app navigation or replacing earlier designs.

**Other exact-SHA workflow outcomes — all SUCCESS (11/11, not eleven production approvals):**

| Workflow | Run |
|---|---|
| Full Route Responsive Certification | [39039964713](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964713) |
| Full Route Visual Crawl | [39039964732](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964732) |
| First Usable **Nondeploying** Candidate | [39039964770](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964770) |
| Master SEO Audit / SEO GEO Regression | [39039964790](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964790), [39039964783](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964783) |
| Bertina Migration Preflight / Bertina-Only Provider Guard | [39039964818](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964818), [39039964723](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964723) |
| Navigation QA / Safe Public Scientific QA | [39039964714](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964714), [39039964751](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964751) |
| Progressive Release Policy Tests | [39039964752](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964752) |
| Chromium Browser QA | [39039964760](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39039964760) |

**Production separation:** The preceding public read-only candidate observation reported deployed Bertina `/sw.js` SHA `f0bc6178a437d24e23b65eec1b791a36e578d8fb`, versus 22 newer source-only sitemap URLs including the Mirkarimi publishing page and English service-detail pages. This is a dated observation, not a newly repeated origin check. No production upload has occurred as a result of source CI.

**Trusted private deployment blockers remain unchanged:** owner/author verified rights evidence; Bertina private custody of two authentic PDFs; scanned and staged MySQL migrations; SMTP receipt and mail worker; operator-led backup and independent restore; one legally authorized real bank receipt and tested restricted delivery; reconciled 60/40 gross split and separately funded 7% cost; verified private dashboards, OJS, science, 21 services and the masterplan's 41 gates/40 destinations. **No 100% certification or live-money author offer is claimed.** Keep `MASTERPLAN_100_RELEASE_ACCEPTANCE.json` pending until actual independent reviewer/host evidence and final owner authorization exists.

## 10 — Verified phased release evidence and remaining deltas (2026-10-17, after section 9)

This addendum **supersedes the pre-deployment live-404 and old-fingerprint assumptions** in historical sections 2, 5, 6, 7, 8 and 9; it does not change the underlying design, acceptance standard, commercial policy or 41/21 records.

- **Exact live release:** [Bertina Deploy #39049691796](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39049691796) completed successfully for `7e553a92f5dd755ab9b941b5c6c9a8bc9ec223bb` using the original `.github/workflows/deploy-bertina.yml` in the owner-authorized guarded `phased_live_audit` scope, **not** the fully accepted final-release scope. Logs attest Bertina extracted and SHA-256-checked **841 managed files**; trusted public TLS and service-worker fingerprint checks passed. No new private publishing SQL tables or PDF uploads were authorized by this scoped release.
- **Independent anonymous public observer:** [postrelease #39050101392](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39050101392) completed successfully on the same exact live SHA. Its **17 mandatory public checks** passed; separate non-gating observations reported `bilingual-public-service-pages-21x2: LIVE_VERIFIED` (**42/42** public pages under the source route contract), `mirkarimi-public-author-and-digital-offer: LIVE_VERIFIED`, `newsletter-consent-schema-not-delivery: LIVE_VERIFIED`, and `ramzinex-public-indicative-rate: LIVE_VERIFIED`. The Mirkarimi observation expressly does **not** assert `checkoutEnabled`, author rights, private files, payouts or scholarly approval.
- **Persisting observed blockers:** `jhela-founding-intake-readiness: BLOCKED_BY_CONFIGURATION` and `jhela-ojs-subdomain-tls: HOST_UNVERIFIED` in the same public observer. Inspect actual configuration, verified mother-database tables, anti-virus and private document custody, journal subdomain CA-trusted TLS and genuine OJS editorial roles with the authorized Bertina operator. `api/jhela-intake.php` currently represents `ojsFormalPeerReviewConnected=false`, so enabling intake flags must never be mistaken for a working OJS peer-review workflow.
- **Still not independently verified:** 21 paid-service-specific purchase/fulfilment flows; original PDF rights/contract, two-file private custody and exact v2 hashes; protected publishing SQL migrations, author identity/bank ownership, signed download entitlement, SMTP inbox delivery and worker queue, real-money ledger + refund; source-to-host MariaDB schema crosswalk, isolated backup restore, authenticated dashboard/MFA E2E, full scientific assessment evidence, independent academic/UX reviews, and the authoritative **41 gates + 21 services + 40 destinations**. These require separately captured lawful evidence; keep `MASTERPLAN_100_RELEASE_ACCEPTANCE.json` pending.
- **Smallest justified source privacy correction after live SHA:** four existing public observer/contract-test files removed the literal private contributor mailbox and now match private-mailbox disclosure by a generic case-insensitive pattern. This **does not mean these newer commits are deployed** and does not remove the earlier mailbox from immutable historical Git commits; any GitHub history/privacy remediation must be approved separately and must not force-rewrite this shared production branch.
- **Next closure order:** (1) protect the current successful site and capture owner-only backup/restore evidence; (2) reconcile JHELA/OJS TLS/intake status and existing mother-table inventory without executing DDL; (3) review author digital rights, staged `JR_Publishing_PDF_Private_Server_Staging_v2.zip` (four members, checksum from canonical mother plan), bank/SMTP and private data protection; (4) run supervised isolated/full paid-case and journal editorial E2E; (5) attach actual evidence to existing 41/21 records before asserting 100%. No deploy, private upload, activation or bank transaction is implied by this addendum.

