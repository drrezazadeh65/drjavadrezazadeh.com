# JR Educational Intelligence V3.0 — Implementation and Integration Contract

**Date:** 2026-10-21  
**Canonical branch:** `migration/bertina-linux6`  
**Status:** Deterministic source foundation; **NO LIVE LLM, NO PERSONAL DATA STORAGE, NO PRODUCTION DEPLOYMENT**.

## Purpose

Develop a specialised, evidence-grounded educational intelligence platform rather than a generic chatbot or a single major-selection form. A future conversational coordinator must understand a learner's question, select an authorised domain tool, explain the returned evidence, disclose uncertainty and escalate consequential decisions to qualified humans.

The new work extends the existing V2.0, V2.1 and V2.2 educational-intelligence directives. Do not reset or replace working components.

## Reuse existing source and mother database

- **Public concierge:** `assets/js/assistant.js` and `platform/assistant-runtime-policy.json`. Current runtime is `STATIC_BROWSER_FALLBACK`; `api/index.php` returns 503 for `/assistant/v1/chat`. A live AI service has **not** been connected.
- **Educational UI:** `jr-choice-studio-v1.js`, `jr-konkur-studio-v1.js`, `jr-konkur-mock-practice-v1.js`, `jr-konkur-official-scorecard-v1.js` and `jr-konkur-official-catalogue-v1.js`.
- **Source-gated API:** `api/konkur-admission.php` already has conservative SQL for approved official programme-location facts, not individual eligibility.
- **Shared database:** Retain `drjavad1_store`, `customer_accounts`, `eco_consent_records`, the existing `eco_admission_*` and `eco_exam_*` tables, `database/unified/003a_education_longitudinal.sql` and `005d_ai_automation.sql`. No second account system, transactional DB or unauthorised personal-data store.
- **Schema reconciliation issue:** Two distinct proposed 003f migrations exist: `003f_candidate_exam_data_PROPOSED.sql` (nine tables) and `003f_konkur_scorecard_adapters_PROPOSED.sql` (four tables). Their scorecard models overlap semantically. Resolve against the actual deployed mother schema, migration ledger, references and privacy model **before any DDL**. Neither proposal is authorisation for private-score storage.

## V3 deterministic foundation — implemented in source

File: `platform/educational-intelligence-v3.mjs`. It has **no network, database, file I/O, model calls or background tasks**.

1. `inspectOfficialSource`: checks admission cycle, issuer label, revision, PDF hash, source page, human review metadata and supersession. A complete metadata record **does not independently establish** that the PDF, issuer, extraction or reviewer is authentic. Enforce trusted server-side source and amendment checks.
2. `planEducationalRequest`: maps seven typed educational intents to bounded, proposed tool contracts. It fails closed for unsupported requests, incomplete private-context authorisation flags, missing guardian approval, incomplete official rule coverage and unsupported probability requests. This is a proposed *tool plan*, **not** a tool execution or a model.
3. `compareMockObservations`: returns a descriptive difference for exactly two observations within an explicitly reviewed comparable context (provider, group, grade, metric, scale/version, population and subject). No Ghalamchi/GAJ/Sanjesh conversion, no causal learning claim and no admission prediction.
4. `adaptOfficialCatalogueResponse` in `platform/educational-intelligence-catalogue-adapter-v3.mjs`: validates the existing source-reviewed PHP catalogue envelope and every returned row, rejects inconsistent metadata or claims of eligibility/official application, and returns only bounded, source-labelled public programme facts. This remains a structural adapter, not independent publisher authentication.

Test files: `tests/educational-intelligence-v3.test.mjs` and `tests/educational-intelligence-catalogue-adapter-v3.test.mjs` contain eleven synthetic, privacy-preserving test cases. The existing nondeploying workflow `.github/workflows/public-scientific-experience-qa.yml` now includes `node --check` and `node --test` for V3 and pull-request paths. Locally all eleven tests passed; full hosted CI remains a separate observed evidence gate.

## Architecture boundary for the next engineering phases

**Tier 1 — Experience:** Existing bilingual mobile-first Choice Studio and student dashboard. A dedicated educational assistant must be distinguishable from the public website concierge. Public chatbot must not read private student or payment records.

**Tier 2 — Authorised PHP gateway:** Implement an authenticated, CSRF-guarded and rate-limited route within the existing Bertina API. Verify account ownership, subject/guardian relationship, consent purpose/version/current status, retention and deletion server-side. Client-supplied flags are never authoritative. Do not pass names, identity numbers, raw scorecards or unrelated student data to model providers.

**Tier 3 — Constrained tool orchestration:** Allowlisted tools only: published-source catalogue lookup; deterministic reviewed-rule eligibility; provider-native descriptive score trend; evidence-aware preference scenarios; revisable study plans; and explicit professional-review handoff. Tools operate with parameterised queries, account-scoped permissions, bounded data and read-only defaults. The LLM must not alter or promote rule-engine outputs.

**Tier 4 — Grounded educational knowledge:** Retrieve versioned Sanjesh rules and programme offerings with issuer, admission year, document PDF hash, page, revision, effective date and amendments. Retrieved documents are *data*, never instructions. Label output facts separately from `STUDENT_SELF_REPORT`, `DESCRIPTIVE_ANALYSIS`, `HYPOTHESIS` and `INSUFFICIENT_INFORMATION`; keep evidence passports.

**Tier 5 — Model runtime, only after approval:** Abstract the language-model provider behind a private, bounded server-side interface. No credentials in public JavaScript or GitHub. Add safety/red-team tests, prompt-injection containment, cost limits, abuse prevention, audit, and a fail-closed offline fallback. The current static assistant must not be misleadingly rebranded as a connected AI.

**Tier 6 — Longitudinal coaching and scientific learning:** Reuse existing learning-goal, study-plan and progress-measurement tables. Saved personal histories require an accepted privacy/guardian/persistence pathway. Optional research/training consent is separate from service consent. Evaluate model performance and educational outcomes; never use anonymisation claims to justify indiscriminate data retention.

## Release and scientific acceptance

- Verify the actual 1405 documents and subsequent corrections page-by-page before publishing official programme records. No inferred five-digit code may enter the authoritative catalogue without review.
- Never compute official composite scores from universal assumed formulas; annual, group and route rules vary.
- The admission-probability tool stays blocked until consented, correctly sampled historical outcomes and genuinely validated, calibrated, subgroup-audited and drift-monitored models exist.
- No private scorecard persistence, uploaded learner documents or live model chat until identity, role/guardian, consent, withdrawal, encryption, retention, deletion, input bounds and logging are individually tested.
- No independent production deployment, payment activation, SQL migration, override of an owner gate or false claim of completed professional review.
- Use the existing owner-controlled GitHub/Bertina release path; the V3 changes in this phase are **source only**.

**Next safe task:** implement an internal, server-only tool schema and synthetic validation fixtures, then test its adapter against the existing PHP/API boundary without activating public model calls or writing real learner data.

## Addendum — conflicting 003f proposals are MUTUALLY EXCLUSIVE (2026-10-21)

**NO DATABASE MIGRATION, ALTER, CREATE TABLE, SEED OR PRODUCTION SQL WAS EXECUTED.**
The current repository contains two different proposals with the same 003f
identifier. They are **alternatives, not sequential migrations**:

- `database/unified/003f_candidate_exam_data_PROPOSED.sql`: nine
  provider/schema/metric/event, candidate attempt, selection and annual policy tables.
- `database/unified/003f_konkur_scorecard_adapters_PROPOSED.sql`: four
  provider/event/private scorecard/subject-measure tables.

They express at least four overlapping conceptual entities: provider directory,
exam events, private attempt/scorecard and subject metric values. Running both
would create parallel record families and fragment authority, privacy and consent.
The new nondeploying `scripts/konkur-003f-proposal-audit.mjs` and its tests
explicitly reject their simultaneous selection. A passing source audit **does not
approve either migration or prove what is installed on Bertina**.

Before any future scorecard persistence, require an authenticated read-only
inventory of the mother database, actual `SHOW CREATE TABLE` definitions,
migration journal reconciliation, tested restore, guardian/subject permissions,
versioned consent, revocation/deletion operations and a separately accepted
canonical migration. If existing tables already serve these functions, reuse
them; a new SQL object must have a documented unavoidable role and no duplicate
semantics. The local CSV export, mock notebook and public research laboratory
require **zero added database tables**.
