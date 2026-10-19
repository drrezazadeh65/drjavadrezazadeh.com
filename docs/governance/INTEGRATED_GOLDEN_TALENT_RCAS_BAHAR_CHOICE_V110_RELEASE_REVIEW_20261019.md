# Integrated scientific and Choice Studio upgrade — acceptance ledger
**Date:** 19 October 2026  
**Branch:** `migration/bertina-linux6`  
**Status:** **SOURCE INTEGRATED — NOT YET PRODUCTION-CERTIFIED**  
**Production deployment:** Must use the already-frozen owner-controlled Bertina one-click release. No deploy workflow modification is allowed.

## Compatibility and dependency audit

| Component | Previously inspected contract | Integrated non-destructive outcome | Operational limitation |
|---|---|---|---|
| `platform/golden-talent-engine.mjs` | Original `0.2-prevalidation` `routeEvidence`/`classifyDomain` | Same file and exported entrypoints upgraded to `1.1.0`; historical persisted route results retain their own engine_version | Node research/prevalidation only; not an active PHP student route |
| Owner's `1.0.0` sample | Order-independent buckets, hashing, zero score, review projection | Principles incorporated and strengthened; no second production router created | Sample provided in owner conversation; never treated as approved release |
| `golden-talent-review.mjs` | One ACTIVE professional projection required | Existing authorization boundary and approval remained unchanged | Backend must verify authorship of review and metadata |
| `golden-talent-evidence-analytics.mjs` | Evidence freshness and descriptive coverage | Reads the engine's verified source-state, claim compatibility and independent-source counts, not raw source-type diversity | Never provides talent or intervention effect |
| `rcas-evidence-bridge.mjs` | Core/P0 mapping, missing-response semantics and UNREVIEWED events | Session observation grouping now explicit; same item-domain mapping and free entry retained | Not a validated aptitude score |
| `rcas-observer-evidence-bridge.mjs` | Parent/teacher verified relation and visible contextual observations | Rejects extra fields/nontext input, preserves null-domain contextual records and review-pending lineage | Server authorization/consent remains authoritative |
| `bahar-engine.mjs` | Human-reviewed longitudinal cycles, non-causal summary | Separately counts repeated linked evidence across weeks; never infers independence or causal impact | No real clinical/developmental effect validation claimed |
| `golden-path-synthesis.mjs` | Human review then explicit professional release | Versioned 1.1 synthesis requires exact route-input fingerprint correspondence and cited, reviewed events; BAHAR handoff remains draft | This is hash consistency, not an authenticated signature |
| `api/golden-talent.php` | Bertina MariaDB read-only capability/guardian checks | Retained unchanged | PHP scoring/persistence adapters require separate independently tested implementation |
| `database/unified/003d_golden_talent_bahar.sql` | Canonical unified MySQL/MariaDB objects | Retained unchanged, no parallel SQL tables | Production column presence, backup and private API writes remain unverified |
| `platform/bahar-persistence.mjs` | Historical PostgreSQL planning prototype | Unchanged; never routed into Bertina production writes | Not compatible with live MySQL without validated adapter |
| `assets/js/jr-choice-studio-v1.js` | Five criteria, two options, memory-only preference reflection | Existing mount/DOM upgraded to v4 in the SAME JS file; stable ID-based reorder, keyboard and pointer, optional session-only weights | Not a psychometric test, career prescription or advice without external evidence |
| `assets/js/jr-choice-feedback-v1.js` | Seven example groups, printable report, verified independent evidence disclaimer | Canonical five-factor ordering enforced even after visual reorder | User names, judgements and reports never leave transient memory |
| FA/EN guidance pages | Existing canonical public URLs | Reuse exact URLs with updated asset version pins | Requires Playwright mobile/RTL and assistive-tech certification |

## 0.2 → 1.0 owner candidate → 1.1.0 comparison

- `0.2`: considered distinct `source_type` values as independent; some intra-source contradictory directions could remain `SINGLE_SOURCE`; did not account for rejected/withdrawn/UNREVIEWED by an auditable total.
- `1.0.0` owner sample: corrected intra-source discrepancies, deterministic SHA fingerprints and full event accounting; excluded legitimate `UNREVIEWED`, could mark multiple labels as convergence without verifying independence, and did not establish a production authentication signature.
- `1.1.0` in the existing engine: preserves UNREVIEWED as contextual, preserves out-of-domain contextual observer events, explicitly rejects malformed unsupported JSON-like values, records rejected evidence references (SHA-256 truncated, not personal data), uses trusted Node SHA-256, verifies original-events correspondence, deeply freezes outputs, rejects repeated IDs, and requires independently reviewed source origins **and material compatibility of the same proposition** before `CONVERGENT`. Same old API names are retained.
- **Intended scientific difference:** prior apparent convergence is now `SINGLE_SOURCE`/needs review without trustworthy independent sources or compatible claims. This is NOT a reduction in a learner's capability or performance. Differently signed evidence on the same comparable claim is `DISCREPANT`, including one-source contradictions.
- Hash consistency without private HMAC/signature and verified server provenance is **not trusted authorship**. Never expose keys or student records in the repository. A future persisted attestation must be created by the existing authenticated Bertina PHP app using a purpose-scoped key held only in its private configuration, with versioned canonical input hash, result hash, issuer and review record. Do not interpret a browser-supplied signed-looking field as evidence of authorization.

## Non-negotiable scientific and commercial constraints

1. Six original D1–D6 constructs/mappings remain fixed; no fake total talent score, norm, giftedness label, causal intervention effect, career prescription or automatic Golden Path release.
2. Original RCAS item/response conventions, P0 context and O1 verified relationship checks remain intact. Missing/UNKNOWN/NA are not treated as zero or learner weakness.
3. BAHAR has a human-authored plan and iterative context-revision model; changes over time never prove a treatment effect.
4. Publishing/commerce flows (including original Mirkarimi two-PDF asset custody and bank settlement) are independent release gates. Updating Choice Studio never enables payments or relaxes those checks.
5. The live PHP app and unified MariaDB schema must be audited, backed up and restored in a safe test before any future write migration. This patch does not require, nor authorize, any database schema operation.

## Tests added or extended

- `platform/golden-talent-engine.test.mjs` (legacy functional API, synthetic review provenance).
- `platform/golden-talent-engine-v11.test.mjs` (NFC/canonical rejection, SHA trusted vectors, duplicate/permutation, 500-record bounds, UNREVIEWED RCAS, independent-source and claim compatibility, contradicted/withdrawn evidence).
- `platform/rcas-evidence-bridge.test.mjs`, `platform/golden-talent-evidence-analytics.test.mjs`, `platform/bahar-engine.test.mjs` (lineage and repeated observations).
- `platform/golden-path-synthesis.test.mjs` (route hash correspondence, forged/unreviewed exclusion, professional release, noncausal BAHAR handoff).
- `tests/choice-studio-contract.test.mjs`, `tests/choice-feedback-contract.test.mjs` (bilingual mounting, optional storage safeguards and canonical five-factor mapping).
- `tests/choice-studio-browser.spec.js`, `tests/choice-feedback.browser.spec.js` (mobile/RTL sizing, interactive scoring stability, reorder, reset and privacy).
- Existing `.github/workflows/golden-talent-phase12.yml` and `.github/workflows/browser-qa.yml` run the consolidated source-specific contracts and Playwright tests. They are separate from, and do not modify, the frozen production deployment workflow.

## Evidence and release sign-off

**Verified in this developer chat:** Direct repository source inspection; JavaScript syntax checks through a V8 parser; isolated mock-interaction checks of Choice Studio in FA/EN with real node movement, optional weight-only storage and matching feedback mounts; isolated simulated router checks for independently reviewed agreement, dependence, pending RCAS/O1 context, intra-source disagreement, BAHAR provenance repeat and input-order invariance.

**Not yet independently verified:** GitHub Actions Node/Playwright passing result, a genuine Chrome/Firefox/Safari/mobile visual pass, real screen reader verification, Bertina PHP/MariaDB execution, author/guardian/consent access checks with real accounts, calibrated psychometric reliability/validity, or verified public deployment. Repository source commits are NOT host changes.

**Publication verdict: BLOCKED UNTIL CI/REAL DEVICE QA.** Owner's previously authorized one-click release flow remains unchanged and must not be invoked until a corresponding green release candidate and explicit owner decision. No new cPanel or database action is necessary for this **scientific + Choice Studio source package**. Separately, the ongoing Mirkarimi sales activation still requires its existing legal, antivirus, Cron and payment verification gates.

## Owner's acceptance rule

Never self-assign 10/10. Provide the completed build, tests and proof, and specific unresolved external conditions. No parallel engine, no parallel database, no destructive replacement, no forged scientific validation, and no unverified production claim.
