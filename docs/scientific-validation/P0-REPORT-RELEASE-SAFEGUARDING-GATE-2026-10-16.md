# P0 — Independent Age, Learner Assent and Guardian Visibility Before Scientific Report Release

**Date:** 2026-10-16  
**Status:** PASS — pure isolated scientific policy tests. **NO LIVE REPORT ENDPOINT, NO DEPLOYMENT OR PARTICIPANT EVIDENCE**.  
**File:** `platform/scientific-release-gate.mjs` v1.1.0-preproduction

## Change and reason

An independently reviewed *descriptive report* is still private learner information. The previous pure policy required consent/access booleans, version/checksum matching, a `RELEASED` human-review state and a verified reviewer, but did not explicitly require the new independently scoped age classification, child assent or separate guardian-visibility permission. Under future integration, such inconsistent gates would create a risk of report disclosure to an unauthorized guardian or about a child who had refused participation.

The revised **pure nondeploying gate** requires the caller to supply a **subject-scoped, transactionally authenticated server-side** `administration.safeguarding_context`. The policy checks:

- Same nonempty subject identifier for administration and independently verified safeguarding, and `record_source: TRUSTED_BACKEND`.
- `age_attestation_state: VERIFIED`, adult/minor classification, and a future age-verification expiration; absent/unverified/expired age proof rejects.
- For a **minor**, current verified guardian relationship plus `learner_assent_state: VERIFIED`, matching evidence of a pinned learner-assent notice version and SHA-256, and assent expiry in the future.
- `release_audience: SELF | GUARDIAN`. For guardian audience, only a verified minor-guardian route with distinct `parent_visibility_consent_state: GRANTED` is considered; adult subjects cannot automatically be disclosed to a parent.
- The existing instrument identity, content bank checksum, scoring version, FA/EN locale, persisted administration, consent/access, human review and version/population/intended-use scientific evidence gates are **all preserved**. `VALIDATED_USE_CLAIM` still requires independent review and appropriate validity, precision and fairness dossiers.

## Verified tests

`platform/scientific-release-gate.test.mjs` tests the prior pilot/validity-scoped behaviour and additional prohibited cases: no attestation, self-reported source, foreign learner, expired proof, absent release audience, missing/withdrawn/expired learner assent, tampered notice digest, expired guardian status and missing independent parent-visibility consent. Adult subject descriptive report claims remain possible only with proof scoped to the same learner and completed human review.

[Nondeploy CI run 38854983261](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38854983261) includes **30 passing Node policy tests**. A completed full-run verdict must be checked before describing all jobs as green. The gate is in `platform/` (excluded from the sanitized PHP public build). A boolean supplied by a future caller is **not intrinsically proof**; the production API must establish the context from locked and audited SQL as described in `platform/bertina-free-stage-trusted-reader.php` and the P0 guardian/consent dossier.

## Remaining release blockers

- No server-side PHP report writer/reader is currently integrated with the revised pure scientific gate.
- No installed schema verification, accepted age/assent/guardian evidence source, child consent/assent legal and ethical approval, qualified independent review or actual scientific validation programme has been completed.
- No report download, professional scoring, paid stage, automatic talent classification or public learner-data access has been enabled.
- The completed independent `PREVALIDATION` scientific dossiers, role/MFA/CSRF/consent-scoped APIs, bilingual accessibility and staged E2E testing are mandatory **before** any owner-approved production release.

**Decision:** consistent fail-closed prototype across free-stage initiation and *reviewed-report release*. Do not equate synthetic policy green with production or empirical instrument validation.
