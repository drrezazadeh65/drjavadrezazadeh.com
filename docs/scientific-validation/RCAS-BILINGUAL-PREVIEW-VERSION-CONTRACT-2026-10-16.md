# RCAS Bilingual Preview Edition Contract — Version Provenance, Not Validation

**Date:** 2026-10-16  
**State:** Test-backed preproduction research policy, **not** a psychometrically validated instrument or consent to upload response data. No user-facing form, production site or learner profile has been changed by this version-contract work.

## Source-level finding

The original instrument registry represented `RCAS-CORE` with `version: start-1.1-browser-preview` while the **actual Persian browser form** emits `rcasRevision: start-1.2`; the English pilot independently emits `rcasRevision: start-en-pilot-1`. Both currently have 28 Core items, the same conceptual domain letters and only **self-selected exploratory next-step routing**, but translated wording, cognitive interpretation and population equivalence have **not** been established. One shared sessionStorage key does not make these editions interchangeable; the currently existing English and Persian UI gates themselves require their respective edition tokens.

### Canonical registry amendment
`platform/golden-talent-instrument-registry.v1.json`, registry version **2026-10-16.1** now distinguishes the legacy registry reference from two actual browser editions:

| Locale | Browser revision | Source file | Intended use |
|---|---|---|---|
| Persian `fa` | `start-1.2` | `assets/js/rcas-start.js` | Educational browser-only self-reflection, no normative/clinical score |
| English `en` | `start-en-pilot-1` | `assets/js/rcas-start-en.js` | Translation pilot, same restricted browser-only exploratory purpose |

Each edition explicitly states 28 items, no approved content SHA-256, `scoring_enabled:false`, `human_approval:false` and `cross_locale_equivalence_established:false`; the registry's overall scientific state remains **PREVALIDATION**. The original top-level reference revision is not silently relabelled as an existing browser implementation and responses with that older token are not accepted as the new Persian edition.

`platform/rcas-preview-edition-contract.mjs` is a pure, research-only helper. It accepts a **non-sensitive minimal session summary** plus expected locale and versioned registry and refuses mismatched editions, incomplete 28-item progress, inferred career routes, unknown domains or unapproved scientific/score/equivalence claims. It **does not access learner answers, store any data, prove respondent identity, verify informed consent or connect to a server endpoint**. Clients cannot use this to grant any private assessment access.

`tests/rcas-preview-edition-contract.test.mjs` reads the real JS form files and the versioned registry, verifying live source revision strings, preservation of independent language boundaries, refusal of stale `start-1.1-browser-preview`, and absence of normative score or report-release permission. It runs in the existing nondeploy scientific-policy GitHub workflow.

## Scientific release conditions

1. Freeze the Persian item text, response anchors, context wording and digital interaction model; preserve source content hashes.
2. Translate/adapt the English edition with independent subject-matter experts; verify intended conceptual and pragmatic equivalence using respondent cognitive interviews and accessibility evaluation.
3. Establish construct/purpose/population-specific response-process, internal-structure and precision evidence **only if actual quantified measures are proposed**. Do not infer equivalence merely from having 28 questions.
4. Define privacy-preserving, guardian/assent and legal-age prerequisites separately from browser preview status, and server-pinned administration version before any authenticated/persisted data capture.
5. Do not retrospectively combine Persian and English cohorts, apply cutoffs, generate percentile/diagnostic interpretations, or claim that completion of a browser preview produces a professional assessment report.
6. Preserve free-first-stage educational access and useful qualitative reflection without coercive payment upsell; proposed paid human review needs a separate entitlement and scientifically defensible report workflow.

**Decision:** registry version mismatch is documented and controlled in testable source form, but no psychometric comparability is established. No production activation, scientific score, paid feature or change to the frozen design/SEO baselines is authorised.
