# Phase 12 — Golden Talent and student support acceptance ledger (2026-10-12)

**Canonical source:** `drrezazadeh65/drjavadrezazadeh.com`, `migration/bertina-linux6`. **Production:** Bertina PHP/MySQL, same-origin `/api/`. **Status:** source-level protective gates added; live end-to-end acceptance **OPEN**. Do not claim rollout, scientific validation, sponsor/student matching, settled donations, or production DB compatibility on the basis of this file.

## Existing source, preserved rather than replaced
- `platform/golden-talent-engine.mjs` and `platform/golden-talent-review.mjs`: D1–D6 multi-source routing, provenance, professional review, no overall talent score and no normative label (`0.2-prevalidation`).
- `platform/golden-talent-instruments.json`: RCAS-O1 observer protocol version 1.1 in preview. `platform/onboarding-state-machine.json` and `foundation/GOLDEN-TALENT-API-CONTRACT-v1.yaml`: future journey/API contracts, not proof of live routes. The provider-neutral contract uses a placeholder server and must not be copied into production routing.
- `api/student-support.php`: live-code route declarations for health, the payer's own verified contributions, scoped private portal, guarded needs proposals and sponsor revocation; it explicitly disallows direct sponsor–child messaging, child identity provisioning and automated fund allocation. Six MySQL tables are checked dynamically by the API, **but their production presence and compatibility require independently saved live evidence**.
- Current Bertina account/auth, commerce and administrator modules must be reused. Never introduce a parallel identity database, Worker/D1/Resend/Neon/Vercel deployment, duplicate commerce flows or replacement dashboards.

## New source artifacts in this phase
1. `platform/golden-talent-instrument-registry.v1.json`: conservative version and scientific-status ledger. RCAS-O1 1.1 links to the source definition; other instrument versions are **unknown** rather than invented. No tool is marked published.
2. `platform/golden-talent-phase12-gates.mjs`: fail-closed decision primitives for append-only purpose-specific consent, verified role/subject relationships, professional assignment, provider-reconciled paid entitlement and sponsor-safe view projections.
3. `platform/golden-talent-phase12-gates.test.mjs`: refusal and allowed-case coverage; independent existing evidence router regression remains required.
4. `.github/workflows/golden-talent-phase12.yml`: source CI for gates and the original routing core. CI is not a substitute for PHP/MySQL live authorization testing.

**Security boundary:** the JS policy module is an implementation contract / testable decision helper, **not automatically executed by PHP**. Do not treat an HTTP route as protected until its real Bertina controller loads account/record/consent data from the server, enforces equivalent checks transactionally, projects allowed fields and passes denial tests. The browser never supplies authoritative `record_source`, roles, guardianship, consent, payment verification or assignment.

## Required acceptance — every line remains OPEN unless separately proven

| Gate | Implementation and test that must be evidenced | Current bounded status |
| --- | --- | --- |
| GT12-01 Tool registry | Immutable `instrument_id + version + SHA256` on published contents, reviewed change log, eligibility gate, exact form/rubric binding, rollback to historical versions; no edit to a submitted instrument version | Registry created; publication/DB/runtime unresolved |
| GT12-02 Role isolation | Student, guardian, teacher, assigned adviser and admin are independently authorized by authenticated session and persisted relationship/assignment; IDOR tests deny foreign case IDs; admin powers require scoped elevated action and audit | Source policy tests; PHP/MySQL enforcement unverified |
| GT12-03 Child consent | Verify guardian relationship, age/jurisdiction, child assent as appropriate; keep independent assessment, parent visibility, observer, adviser, research and sponsor purposes; append-only grant/revoke and current check on every read/write; protect private exports and historical retention | Policy contract/tests; persistence/revocation fan-out unverified |
| GT12-04 Administer/review/report | Versioned assessment session, secure save/submit with idempotency key, immutable responses/provenance, scoring only if validated for stated use, independent human assessment, report release and role-scoped viewing | Prevalidation routing exists; real submission/scoring/report API unverified |
| GT12-05 Golden Path / BAHAR | Persist signed review, discrepancy/counterevidence, release and revocation history, follow-up plan, owner/assignee, measurable goals, student feedback and longitudinal reviews; pause baseline after revoked source | Contracts/core components exist; live data/monitoring unverified |
| GT12-06 Paid entitlements | Resolve active feature grant from reconciled verified payment and bound account/order; protect replay, duplicate webhook, refund and concurrent access; never grant on redirect, request fields or local storage | Policy tests; Bertina settlement/entitlement bridge unverified |
| GT12-07 Student support | Scoped child pseudonym, staff-verified needs, two-sided optional identity release and explicit consent/assent, no direct contact, own contribution receipts, approval and revocation, sponsor-safe only progress/needs, verified allocations, accounting and double-spend prevention | Existing private PHP pathways; verification/provisioning/allocation not proven |
| GT12-08 Scientific integrity | Register intended use, version, content, adaptation, reliability/validity/fairness evidence and expert approval before enabling any numerical score; contextual multiple-source interpretation; avoid labels, career prescriptions and validity claims not supported by studies | All tools remain PREVALIDATION; empirical studies/validation open |

## Non-negotiable data and release safeguards
- Child identity, assessment answers, school history, private notes, contributions, consent, communications, and guardian linkage **must not** appear in publicly indexable URLs, search/AI feeds, analytics payloads, client telemetry, social publications, persistent PWA caches, email subject lines or support screenshots.
- Keep student and sponsorship identity mappings in private tables; never expose contact fields to sponsors, even with optional display-name consent. All sponsor-visible text is individually approved and can be withdrawn without deleting financial audit records.
- Provide subject access, rectification, restricted processing, retention/deletion/export workflows with a legal-hold exception, secured documents, time-bounded access, and audit without raw sensitive payloads. Ensure guardian/staff authority is revoked when relationship/consent changes.
- Test unauthenticated 401, cross-child 403/404, revocation instant effect, stale tokens, role manipulation, query/body ID spoofing, concurrent submit/allocation, callback replay, refund, expiry, data export, backup/restore, no-store headers, 320–430px mobile and RTL/LTR accessibility.
- No migrations or release against real Bertina MySQL until schema compatibility, a **real encrypted external backup** and independent isolated restore are certified, code is staged with fake records, existing auth/commerce paths remain green and serialized deployment is approved. Historical source archives are not production database backups.

## Exact next safe implementation order
1. Collect current server schema introspection and inventory matching the *existing* PHP/MySQL tables without modifying them; retain full original data/stock.
2. Certify production backup and isolated restore, then create additive compatible migrations and dual-read/rollout plan if required.
3. Wire consent and relationships into PHP authorization on current `/api/` routes, with negative HTTP/PDO integration tests and immediate withdrawal propagation.
4. Connect instrument versioned sessions and immutable evidence through the existing non-normative D1–D6 engine; add human-reviewed Golden Path/BAHAR releases.
5. Bind the current verified Bertina payment/order ledger to service entitlements, and complete fully audited sponsor allocation/identity approvals without new payment providers.
6. Verify real account roles and child safety using synthetic identities first; check deployment, CI, SEO/privacy, mobile and accessibility, and independently record live results. Only scientifically cleared instruments can be published later.

**Closure rule:** all eight acceptance gates require test logs, stored release SHA, DB evidence and live scoped observations; source commits alone never close Phase 12.


## Phase 12 scientific completion addendum — 2026-10-16 (source governance, NOT production approval)

### Verified architecture and scientific boundaries
- Canonical evidence router: `platform/golden-talent-engine.mjs`, engine `0.2-prevalidation`. Its states `INSUFFICIENT`, `SINGLE_SOURCE`, `DISCREPANT`, `CONVERGENT` describe **evidence coverage/agreement**, never talent level, norm, probability, diagnosis or career prediction. A convergent result is not a validity coefficient.
- Registry: `platform/golden-talent-instrument-registry.v1.json`. RCAS-O1 v1.1 and RCAS-CORE browser preview are `PREVIEW_ONLY`, scoring disabled; D1–D6 instrument versions and hashes remain unverified. Do not fabricate item text, norms, weights, cutoffs, standard errors or validation samples.
- Unified MySQL definitions: `database/unified/003c_assessment_scoring.sql` and `003d_golden_talent_bahar.sql`. DDL presence does not demonstrate live migration, data persistence, authorized readback or backup recovery.
- The `platform/golden-talent-phase12-gates.mjs` policy is NOT a PHP authorization boundary. Production controllers must independently enforce authenticated roles, relationship scope, consent, entitlement, record ownership and revocation.
- `assets/js/rcas-o1.js` currently generates a **local preview** without persistence; `assets/js/bahar-readiness.js` explicitly reports BAHAR as not enabled for real learner portfolios. A browser preview must never appear in a customer dashboard as a verified longitudinal record.

### Release matrix — each gate needs separately retained evidence
| Gate | Required evidence / acceptance criteria | Release state |
| --- | --- | --- |
| SCI-01 Book-to-web traceability | Author-approved frozen manuscript and migration ledger; each of 28 RCAS core items and 142 D1–D6 bank items mapped to chapter, construct, item ID, exact FA/EN wording, scoring key if any, and approved revisions; no invented or silent item replacement | OPEN |
| SCI-02 Instrument freeze | Exact versioned bilingual form, immutable SHA256 for item order, choices, instructions and rubric; archived previous versions; report refers to submitted version | OPEN |
| SCI-03 Scoring and uncertainty | Predeclared purpose-specific scoring specification with missingness, reverse coding, response quality, dimension aggregation and uncertainty; independently reviewed. Until evidence supports it, keep scoring disabled, total score null, normative labels null | OPEN |
| SCI-04 Psychometric programme | Content validity review; response-process interviews; accessibility and language equivalence; pilot item analysis; appropriate internal consistency/test-retest/inter-rater estimates; construct structure, measurement invariance/DIF and consequential validity where applicable; sampling and limitations disclosed | OPEN |
| SCI-05 Consent and safeguarding | Versioned, purpose-specific, withdrawable informed consent and verified guardian relationship for minors; consent revocation blocks future access; teacher/adviser role tests and IDOR/CSRF/replay checks; retention/deletion protocol | OPEN |
| SCI-06 Server-backed sessions | Bertina same-origin authenticated create/save/resume/submit, transaction-safe one-time finalization, idempotent retries, no duplicate sessions, and fail-closed outage behavior; no raw learner responses in localStorage or public cache | OPEN |
| SCI-07 Evidence/provenance | Immutable event IDs, respondent role verified server-side, collection date, version/hash, observation context, provenance, quality flags, withdrawal and reviewer decision; conflicting sources remain visible to assigned professional | OPEN |
| SCI-08 Human-reviewed report | Explainable domain-level evidence summary, provenance and missingness, contextual cautions, alternative interpretations, reviewer identity/date, non-diagnostic language, report revision, restricted audience and explicit approval before release | OPEN |
| SCI-09 Golden Path | Several revisable developmental hypotheses, rationale/evidence links, feasible activities, human decision, follow-up date and non-prescriptive alternatives; no automatic career assignment | OPEN |
| SCI-10 BAHAR longitudinal | Authorized baseline, eight-week plan and weekly cycles, review at week four, dated evidence, mentor approval, versioned revision and private dashboard history; no longitudinal effect claim without suitable study | OPEN |
| SCI-11 Dashboard linkage | Student/guardian/teacher/adviser see only server-authorized projections; cross-account and withdrawn-consent negative tests; FA/EN consistency, mobile accessibility, PDF export privacy and cache exclusion | OPEN |
| SCI-12 Production acceptance | Isolated MySQL schema and restore evidence, real authorized and unauthorized E2E flows, security review, audit trail, incident rollback and explicit owner approval; deploy separately from source CI | OPEN |

### Interpretation contract for prevalidation reporting
A preview can state: observed evidence, its origin, contradictory/absent evidence, what remains to be investigated, and provisional developmental activities. It must not state: percentile, IQ, aptitude rank, clinically significant difference, validated diagnostic category, guaranteed educational success, or an individual's immutable talent. `CONVERGENT` means only that two or more qualifying source classes agree under the router's declared rules, **not** that the conclusion is scientifically validated.

### Immediate execution order and regression policy
1. Lock the frozen publisher manuscript as the editorial reference without modifying its text. Build the item-by-item crosswalk; report missing content rather than inferring it.
2. Implement and test immutable instrument binding and consent gates in the **existing** Bertina PHP/MySQL account architecture, never a parallel database.
3. Add server-backed drafts, provenance and reviewed-report projections with negative authorization tests before activating real learner data.
4. Bind authorized report revisions to the existing customer dashboard, preserving all working shop, donation, appointments, SEO, PWA and bilingual routes.
5. Only after controlled fieldwork and independent psychometric review consider advancing any instrument's scientific-status label.

**Operational prohibition:** This addendum is an acceptance specification, not a release or scientific certification. Do not enable real learner collection, publish scored conclusions or deploy production changes solely because this document was committed.
