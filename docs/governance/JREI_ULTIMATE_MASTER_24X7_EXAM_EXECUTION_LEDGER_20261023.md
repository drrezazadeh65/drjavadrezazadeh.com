# JREI 2026 — Unified 24/7 Knowledge Acquisition and Commercial Examination Directive

Owner's complete 23 October 2026 Ultimate Master Directive is binding alongside the original 117 atomic website/education requirements, the Hybrid JREI Super Master and the original author TESTLY/Humanability addendum. No original requirement is removed or superseded. This file is a traceability ledger, not an acceptance certificate.

- Canonical repository: drrezazadeh65/drjavadrezazadeh.com
- Branch: migration/bertina-linux6
- Host and one mother DB: Bertina Linux/PHP/MariaDB, drjavad1_store
- Existing primary entities: customer_accounts, commerce_orders, commerce_payment_claims, eco_assessment_items, eco_assessment_sessions, eco_assessment_responses, eco_score_runs
- Release instruction: no iterative tests, migrations, actual source crawls, paid operations, model installation or deployment before final integrated owner-approved acceptance.

## Parallel mandatory workstreams

A — JREI-KA: lawful continuous source discovery and acquisition, versioned provenance, integrity/rights/robots/DNS checks, Persian/English extraction and OCR, independent answer-key review, content addressing, deduplication, priority, quota, storage target planning (1 TB is an eventual target only), interruption recovery and scheduled refresh.

B — Commercial Intelligent Examination Centre: urgent Konkur, master's and doctoral examination catalogues; independent reviewed questions, three-stage preparation, buyer entitlements, account-bound attempts, server clock, idempotent response persistence, accurate deterministic scoring, private reports and refund/financial governance. School and national final examinations extend the same architecture.

C — Dual Windows computing: existing authenticated separate outbound A/B nodes with constrained CPU/RAM/GPU, model/provenance allowlists, optional indexing/processing, host-independent examination timing, model approval and no unauthorised task-type escalation.

## Traceable original 23 deliverables

SOURCE means committed but untested; PARTIAL means only part is implemented; GATED means independent licence, data, host, payment, science or release evidence is required. Never report PASS without real end-stage evidence.

| ID | Original deliverable | Responsible path / database dependency | Source status and deferred verification |
| --- | --- | --- | --- |
| UM-01 | Repository commits | migration/bertina-linux6 | SOURCE; immutable release SHA not frozen |
| UM-02 | Persistent acquisition scheduler | api/jrei-ka-scheduler.php; staged knowledge-acquisition SQL; original Cron | PARTIAL; metadata queue, no live dispatch or retry acceptance |
| UM-03 | Discovery/ingestion workers | platform/jrei-v5/jrei-authorized-https-acquisition.mjs; jrei-exam-discovery-contracts.mjs | PARTIAL; no approved live crawler/OCR |
| UM-04 | Exam coverage matrix | api/jrei-exam-coverage-readiness.php; original exam owner dashboard | SOURCE; real completeness and official keys gated |
| UM-05 | Structured question bank | eco_assessment_items/options, jrei_exam_item_metadata, staged key table | PARTIAL; approved rights and questions missing |
| UM-06 | Generation/review engine | platform/jrei-v5/jrei-examination-contracts.mjs, assessment-authoring-engine.mjs | PARTIAL; live model/expert verification not established |
| UM-07 | Commercial examination catalogue | api/jrei-exam-commercial-catalogue.php; /api/exams/catalog | SOURCE; paid checkout disabled |
| UM-08 | Product/category detail pages | fa/en/exams/ and fa/en/exams/konkur,masters,phd | PARTIAL; category descriptions source-only, per-offering details pending |
| UM-09 | Candidate exam interface | existing eco_assessment_sessions + staged attempts | OPEN; no operational timed answering yet |
| UM-10 | Candidate dashboard | api/jrei-exam-candidate-snapshot.php; /api/exams/my | PARTIAL; authenticated no-store own-history read |
| UM-11 | Scoring/reporting | api/jrei-exam-deterministic-scoring.php; eco_score_runs | PARTIAL; deterministic reviewed-key MCQ logic, no score-run transaction |
| UM-12 | Verified payment/entitlement | commerce_orders, commerce_payment_claims; staged entitlements | GATED; no live exam SKU/payments/activation |
| UM-13 | Three-stage bundles | planThreeStagePreparation and commercial offerings | PARTIAL; official exam dates, blueprint review, scoring and delivery pending |
| UM-14 | Unified MFA owner console | api/operations.php; operations-jrei-exam-research-v1.js | PARTIAL; queue/products/provenance projected; actual control QA pending |
| UM-15 | Two Windows workers | signed JREI hybrid workers and Windows modules | PARTIAL; historical signed connection, real new task inference unverified |
| UM-16 | Bertina secure communication | existing signed worker protocol | SOURCE; new acquisition job type deliberately unactivated |
| UM-17 | Network/resource monitor | hybrid telemetry, new JREI-KA budgets | PARTIAL; daily/monthly measured bytes and operator data allowance missing |
| UM-18 | TESTLY/Humanability foundation | author source-register; jrei-testly-research-contracts.mjs | SOURCE; concepts provisional, empirical validation absent |
| UM-19 | Research governance | existing eco_consent; exam/TESTLY owner schema | PARTIAL; no unapproved minors or research exports |
| UM-20 | Additive mother DB migrations | commercial exam SQL + KA SQL + prior JREI/exam schemas | SOURCE; none of the new migrations executed |
| UM-21 | Verification reports | JR_EDUCATIONAL_V4_SINGLE_FINAL_ACCEPTANCE_MATRIX_20261022.md | GATED; all final tests NOT RUN |
| UM-22 | Deploy/rollback | original Bertina deployment + mother-DB masterplan | PARTIAL; backup and rollback proof deferred |
| UM-23 | Release-readiness decision | 117-atomic ledger and single final matrix | GATED; no current claim of commercial readiness |

## Mapping all 19 directive sections

Sections 1–2 cover cumulative architecture and traceability, not a programme reset. Section 3 governs source discovery, priorities P0–P4, lawful licences, historical coverage, Persian/mathematical OCR and storage. Section 4 governs scientific maturation with no unapproved model-weight changes. Sections 5–6 govern commercial examination delivery and diagnostic/progress/final-mock products. Section 7 governs genuine construct-preserving independently verified new items, never option-position changes alone. Section 8 preserves the original unpublished TESTLY/Humanability conceptual research and permits contradictory evidence. Section 9 governs independent Windows nodes, resource-constrained signed jobs and no public ports. Section 10 requires measured network throughput and explicitly estimated (not fabricated operator-confirmed) package balance with 20/10/5 GB alerts. Section 11 extends the original bilingual MFA master dashboard. Section 12 retains the sole MariaDB mother, identity/commerce/scoring authority and controlled storage/backups. Sections 13–14 govern verifiable payment and a staged initial Konkur/master's/PhD commercial offer. Sections 15–16 define ambitious targets conditional on external evidence, not a fixed unverified delivery promise. Section 17 preserves privacy, immutable URLs, mobile UX and all existing services. Section 18 enumerates the 23 traceable deliverables above. Section 19 requires continued parallel source implementation and owner-authorized release only after acceptance.

## Source progress from this continuation

- Staged transactional catalogues, offerings, entitlements, attempt envelopes, original-item approved keys and integer scoring rules in docs/migrations/20261023_jrei_commercial_examination_mother_mysql.sql; no duplicate scoring or payment authority.
- Added one read-only, fail-closed public catalogue /api/exams/catalog; independent backend switch defaults OFF and checkout remains disabled. Added /api/exams/my account-owned private noindex/no-store attempt listing. The existing MFA owner console exposes actual source/commercial counts.
- Created bilingual examination centre hub and Konkur, master's and PhD landing pages; shared CSS and JS render only verified metadata and explicitly do not offer unapproved payments, dates or results. Added new-only sitemap entries without changing historical URLs.
- Added deterministic reviewed-key MCQ score computation in api/jrei-exam-deterministic-scoring.php; no live scoring writes.
- Added an independently OFF JREI-KA persistent acquisition scheduler and original Cron job registration, with source review/provenance SHA requirements, priorities, owner stop controls, quotas and row-locked bounded due-job insertion. This does NOT yet fetch files, dispatch KA tasks to either Windows PC or perform OCR. Those are outstanding source tasks.

## Next dependent development steps

1. Legitimate, source-approved Worker acquisition dispatch with state/digest rechecks, backoff, checkpoint resume, disk/traffic quotas, and safe extraction.
2. Candidate subject/guardian/purpose consent, purchase verification, server-time attempt start, autosave/submit and eco_score_runs result persistence.
3. Real commerce SKU reconciliation, refund and entitlement activation only on matched provider-verified payment claims.
4. Correct, licensed source-reviewed exam sets and a scientifically controlled question generation/independent verification lifecycle.
5. Real dual-worker traffic and disk/resource metering; owner-configured thresholds distinguished from operator-confirmed balance.
6. The one complete final QA/release campaign for all 117 original requirements plus all Ultimate Master sections.

**This entire batch is SOURCE DEVELOPMENT ONLY: no tests, migrations, downloads, local model runs, production deployments or bank/payment operations were executed.**


## Development continuation: authenticated candidate session source (23 Oct 2026)

New source: api/jrei-exam-runtime-gates.php (adult self-owned subject and scoped original consent; original provider-verified order claim for paid access), api/jrei-exam-attempt-runtime.php (idempotent server-timed start, compare-and-swap response revision, final canonical eco_score_runs write, private server-authorized resume), and api/jrei-exam-published-item-delivery.php (SHA-verified private prompt manifest with original item/option IDs and no answer key). Existing /api/exams/attempt and /api/exams/items are independently OFF by default, and require the private immutable-file source bridge. No live student answer content, real exam attempt or payment was processed.

Added existing-dashboard-linked fa/en/exams/my candidate pages, the shared private mobile MCQ client and responsive CSS. UI displays only server-confirmed autosaves and refuses to invent offline responses. All future rich-media items remain gated; they are NOT silently stripped. No new customer login, payment or assessment engine.

IMPORTANT UNFINISHED: an additive private materialized raw-grade report table and owner-reviewed report retrieval were not committed because the GitHub write was rejected by tool safety checks in this continuation. The source-only existing eco_score_runs digest persistence must not be represented as a fully recoverable candidate report. The accepted end-stage QA and release remain NOT RUN. End-to-end item delivery, written-response marking, under-18 guardian workflow, authentic assessment material, validated payment, live schema migrations and real release all remain outstanding.


## Source addition - commercial owner drafts and safe expiry review (23 October)

The original MFA SUPER_ADMIN route now supports source-only exam DRAFT product creation, DRAFT offering scheduling and owner emergency SUSPENDED transitions. Operations remain audited and return a fresh mother-DB snapshot. No owner action publishes an exam, charges a customer, approves a science claim or automatically refunds a paid order.

The default-OFF private JREI examination deadline reconciliation Cron marks attempts abandoned beyond the bounded 120-second finalization grace as TIMED_OUT_PENDING_REVIEW without creating scores, deleting student responses or altering orders. The existing bilingual owner console reports overdue in-progress attempts, pending reviews and active entitlements tied to suspended exams. Runtime must still be accepted before either switch may be enabled.

The original scoring model now binds integer coefficients to a deterministic versioned SHA-256 fingerprint. Per-item source licence, independent scientific review, original prompt content, option identity and answer-key digest are rechecked before private question delivery. The original account resume path requires current active offering, purpose consent and entitlement. Uncertain autosaves block further local edits until authoritative server recovery; refresh clears old answers from browser memory.

ALL new source is untested, undeployed and unauthorised for paid or personal-data production use. No database migration or Cron job ran.


## Source addition — authoritative payment checks and exam disposition (23 October 2026)

An additional set of SOURCE-only commits extends the same 117-atom / 23-deliverable programme. In api/jrei-exam-runtime-gates.php, the paid-exam entitlement check now requires the original authenticated account email, a paid original commerce order, matching original Stage09 BitPay transaction claim and provider amount, verified date/provider identifier, and a correctly summed array of original order item subtotals. The dedicated exam line must be a positive, single-quantity exam SKU; none of these checks invents the as-yet-unintegrated exam checkout SKU or grants a new entitlement. Live paid examinations remain OFF.

The original MFA owner console now has api/jrei-exam-deadline-owner.php with a bounded (40-row) private backlog of TIMED_OUT_PENDING_REVIEW cases, owner reason-code disposition, optimistic revision, matching original EXPIRED session requirement and operations audit. Closing review changes only the attempt state to TIMED_OUT_CLOSED; it does NOT grade or delete answers, refund, or resolve customer entitlements. The original GET and POST owner snapshots now include this authoritative backlog. All data remain in the mother database and no personal student contact or responses are disclosed in the admin projection.

Before creating a paid timed attempt, the exact original item IDs and option IDs in the SHA-verified published question archive now must match the independently reviewed scoring context, not merely the count. Public exam catalogue selection is hidden unless original immutable delivery + runtime release gates are both enabled, and original reviewed item/source/key licence state has not been recalled. This is NOT an authorization to activate those switches.

The new source-backed api/jrei-exam-product-readiness.php provides per-product metadata blockers: original instrument version, blueprint and reviewer, content rights, approved answer keys, delivery state, signed question counts, original source rights and independent review. The same bilingual MFA panel displays these blockers and explicitly states that DB metadata neither proves commercial payment integration nor scientific validity. All acceptance remains final-stage only.

**Actual state remains SOURCE; all tests, new DB migrations, Cron execution, model inference, real payments and live deployment NOT RUN.**


## Owner-scoped verified-order access governance (23 October 2026)

Additional SOURCE-only development in the canonical branch now includes `api/jrei-exam-entitlement-owner.php`, called exclusively from the existing MFA/CSRF/rate-limited `/admin/operations/jrei-exam-research` endpoint. This does **not** open live examination checkout.

- A verified-order grant requires the original `commerce_orders` paid record, existing customer account and exact ownership email, matching Stage09 BitPay payment-claim transaction and amount, valid item subtotals with one matching exam SKU, original approved/scheduled product, and serialized one-active-entitlement checks. Both `JR_JREI_EXAM_VERIFIED_ENTITLEMENT_GRANTS_ENABLED` and `JR_JREI_EXAM_CHECKOUT_BRIDGE_ACCEPTED` (plus the original commercial switch) are separately default OFF. The Stage09 storefront **does not yet emit** the required exam SKU; grants are not currently operational.
- Owner-only revocation is explicit, revision-protected, reason-coded and audit-recorded. It changes access status without automatically refunding a buyer, deleting response data, fabricating a payment reversal or treating the customer service contract as fulfilled. Refund- or reversal-related reasons are labelled review-required rather than verified without underlying proof.
- The protected bilingual owner console shows source-backed aggregated active entitlements attached to SUSPENDED products/offerings, a bounded private list of opaque case IDs and a guarded access revocation action. The console distinguishes an owner configuration opt-in from independently accepted payment/provider operation.
- All existing JREI item keys, original account login, BitPay callback, journal, Golden Talent, source provenance and bilingual routes are preserved. No new bank gateway, invoice issuer, customer table or secondary financial ledger was created.

**Not executed:** no bank transaction, entitlement grant/revocation, server Cron, database migration, QA, model inference or production deployment. Stage09 exam SKU integration, refunds and user communication, concurrency/ownership acceptance and the original 117 requirements remain open.


## Added ultimate real-AI vision as final cross-programme constraint

The newer owner's 11-section autonomous educational-intelligence vision is now **binding in full**, in addition to this document's original 23 deliverables. See [JREI_AUTONOMOUS_EDUCATIONAL_INTELLIGENCE_ULTIMATE_VISION_BINDING_20261023.md](JREI_AUTONOMOUS_EDUCATIONAL_INTELLIGENCE_ULTIMATE_VISION_BINDING_20261023.md). Acceptance requires a **real** continuously running licensed discovery/extraction/coverage pipeline, approved actual cloud or local model inference and independent quality/cost evidence, real bilingual multi-turn assistant/tool routing, accurately consented learner memory, reviewed timed exams and recoverable scores, and gated self-improvement pull requests. Independent access to API keys, credits, licensed data, consented datasets and final verification is not yet demonstrated. No claim of LIVE maturity follows from committed code.
