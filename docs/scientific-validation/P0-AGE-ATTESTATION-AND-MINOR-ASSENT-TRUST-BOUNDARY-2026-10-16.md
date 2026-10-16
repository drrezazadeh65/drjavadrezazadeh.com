# P0 Age Attestation, Guardian Authority and Minor Assent — Evidence Boundary

**Date:** 2026-10-16  
**Environment:** `work/p1-scientific-validation-20261016`, nondeploying scientific-development branch  
**Acceptance status:** **ISOLATED LOGIC ONLY** — no live learner enrolment, proof collection, public API route, production migration, or scientific/ethical approval.  
**Governance:** existing frozen international bilingual SEO baseline and `foundation/DESIGN-SYSTEM.md`; `docs/scientific-validation/P0-CANONICAL-IDENTITY-CONSENT-ADAPTER-DECISION-2026-10-16.md`.

## Why the original implementation was insufficient

The proposed `eco_subjects.age_band` column merely describes a selected age band. It does not independently prove legal adult/minor classification or ensure that a guardian had legal authority to consent. Previously, a reference free-stage policy tested minor guardian consent without a separate learner-assent requirement. That could be mistaken for completed child safeguarding if later integrated without an explicit trust source.

The new contract distinguishes **four** independent, subject-scoped preconditions. No single checkbox or parent declaration satisfies all of them:

1. Verified authenticated actor and active learner subject from server session and canonical account.
2. Current verified age classification, with named jurisdiction, expiration and independent two-person provenance; unknown age denies.
3. Current, verified, non-expired guardian relationship, purpose-specific **ASSESSMENT** consent and separate `PARENT_VISIBILITY` consent before a guardian can see protected material.
4. The learner's own purposeful, affirmative and revocable **assent** where the conservative site policy requires it. It is separate from parental permission. Refusal, revocation, expiry, pending review, missing trusted source and ambiguous history deny private free-stage authorisation.

Individual legal requirements, decision-making capacity, safeguarding exceptions and appropriate participation methods need independent ethical/legal review. The strict prototype policy is **not** a declaration that every minor of any age must provide a legally identical form of assent. Until a reviewed alternative exists, denial is safer than assuming permission.

## New code and candidate schema

- `database/unified/006a_age_attestation_PROPOSAL_NOT_APPLIED.sql`: an explicit **NOT-APPLIED** candidate for `eco_subject_age_attestations` and `eco_minor_assent_records`. No DOB, document image, identification number, address or self-reported narrative is stored. Candidate data consists of subject/guardian links, review states, reviewers, minimal hashes, date bounds, versioned notice and revocation timestamp. Evidence SHA-256 by itself is **not** proof of a trustworthy examination.
- `platform/bertina-age-attestation-reader.php`: reference SQL reader, no HTTP route or writes. Requires existing PDO transaction and subject mutex, current jurisdiction, `AGE_ATTESTATION_V1`, two **distinct** reviewer IDs, `INDEPENDENT_REVIEW`, expiry, immutable evidence digest and no ambiguous/revoked event history. Returns exactly the established `age_verification` DTO; unavailable table or invalid input returns null. Reviewer-role verification and original evidence provenance are still **not implemented**.
- `platform/bertina-minor-assent-reader.php`: reference SQL history projection for `eco_minor_assent_records`. Requires trusted transaction, subject+guardian scope, reviewed decision, expiry, notice digest and chronological completeness (up to 1024 events). New `DECLINED`, `WITHDRAWN`, grant mutation, ambiguous timestamp or missing source returns null. Returns the limited `minor_assent` DTO, never a transcript or child document. No proof intake/UI writer exists.
- `platform/bertina-free-stage-authorisation.php`: minor stages now require both the guardian checks and an independent time-bound, versioned, not-withdrawn `minor_assent`. Adult stages still require independently verified age and self ownership. No diagnosis, paid entitlement, private report or expanded result claims follow automatically.
- `platform/bertina-dashboard-projections.php`: uses the same policy to block guardian private dashboard projections without assent, while keeping purpose-separated `PARENT_VISIBILITY` checks.
- `platform/bertina-free-stage-trusted-reader.php`: a **single, nondeployed PHP SQL composition boundary**, using one caller-owned transaction and canonical subject-first row locks, retrieves trusted account/subject, verified age, current guardian relation, learner assent and scoped ASSESSMENT consent history from SQL. It passes them through `bertinaAuthoriseFreeStage` and returns a restricted yes/no/stage decision without student IDs or raw evidence. The future HTTP caller must still authenticate the account and audit/commit; this code is **not** an API endpoint.
- All of these PHP reference readers and the proposed SQL file are **excluded from the sanitized Bertina release package**; a future trusted runtime reader must be independently reviewed and packaged only after live-schema, legal and security approvals.

## Tests and defined evidence

`tests/bertina-age-attestation-mysql.php` uses synthetic MySQL/MariaDB temporary tables and verifies: transaction requirement, no proof, valid adult review, not relying on `age_band`, jurisdiction mismatch, expiry, revocation, future record, incorrect reviewers/provenance, newer review status, tied event times, rollback and missing table fail-closed. A valid SQL-derived age DTO is also supplied to the free RCAS policy; a revoked/expired DTO does not unlock it.

`tests/bertina-free-stage-authorisation.php` tests missing/withdrawn/expired/cross-subject/cross-guardian or forged learner assent, independently of verified guardian consent. `tests/bertina-dashboard-projections.php` checks that even a current `PARENT_VISIBILITY` grant cannot bypass absent learner assent. `tests/bertina-free-stage-mysql.php` now obtains minor assent from an actual temporary SQL history via `bertinaVerifiedMinorAssent`, testing no record, later decline, withdrawal, expiry and ambiguous same-instant decisions.

The nondeploy `.github/workflows/scientific-free-stage-policy-qa.yml` tests the policy on MySQL 8 and MariaDB 10.11, PHP/JS, Chromium FA/EN regressions, existing admin MFA access and sanitized release packaging. `tests/bertina-trusted-free-stage-reader-mysql.php` additionally assembles the complete decision from synthetic SQL only, covering adult/minor scenarios, access-denial scenarios and privacy-safe result projections. Push and pull-request path filters are aligned so a change to relevant PHP/SQL also triggers the suite.

**Tests validate reference policy and synthetic database compatibility, not the legitimacy of a real minor's age/assent evidence, scientific instrument validity, or actual Bertina schema activation.**

## Explicit no-go and sequenced next steps

1. Define jurisdiction-appropriate minority/adulthood and capacity policy with competent legal/safeguarding review; determine an accessible, humane learner assent/objection experience; protect vulnerable learners and provide an escalation channel.
2. Define authorized independent reviewers, dual-control access, change/revocation authority, evidence retention and audit; verify the record-hash provenance (a stored hash alone does not suffice).
3. Inventory actual installed Bertina schema with the **MFA-protected structural endpoint**, without exporting personal rows. Approve additive reversible migration and backup/rollback before creating any new table.
4. Build a **single trusted account/subject/guardian/age/assent/consent DTO reader** in deployed PHP with transaction/lock discipline, no browser-supplied trusted assertions, complete histories and end-to-end denial/revocation tests.
5. Complete child privacy and informed-consent notices in Persian and English, and operational interfaces with valid age-/ability-appropriate human support. Do not automatically enable test submissions or paid reports.
6. Review exact Golden Talent/RCAS/BAHAR versions and instrument-specific empirical dossiers. `PREVALIDATION` remains mandatory; a software test cannot establish measurement validity.
7. Run independent staging acceptance for security, accessibility, performance, bilingual behaviour, rollback and payment isolation. **Production deployment requires explicit owner signoff.**

**Decision:** retains progress without weakening the privacy/child-safeguarding release gate; no live migration or child records touched.


## Verified nondeploy regression checkpoint

[GitHub Actions run 38853504403](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38853504403) completed with **all six jobs successful**. Actual CI logs confirm **22 tests on MySQL 8 and the same 22 scenarios on MariaDB 10.11** for the *full server-sourced* free-stage trust composition; **25 independent age attestation checks on each engine**, **26 SQL guardian/consent fixture checks per engine**, **32 PHP free-stage policy checks**, **40 PHP dashboard/privacy checks**, **27 JavaScript policy tests**, and **45 Chromium FA/EN and existing admin UI regression tests**. The two database engine runs repeat the same fixtures; do not represent independent scientific studies. The test environments contain only fictional, ephemeral tables. No live Bertina installation, child or guardian evidence, instrument psychometric data or private user session was accessed.

**Acceptance distinction:** the *reference SQL loader* and its child-safeguarding gates have passed deterministic tests. The actual installed database and live credentials remain unverified; reviewer authority/provenance, lawful age/assent policy, approved migration, public/session binding, request-level audit and customer-dashboard integration remain separate production blockers. The service is still **NOT wired into** `api/golden-talent.php` or any live form. The proposal SQL is **NOT applied**, and all new PHP reader prototypes remain outside the sanitized release package.
