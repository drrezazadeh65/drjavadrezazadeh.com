# JR Konkur — Official and Practice Scorecard Integration Readiness
**Date:** 2026-10-21 · **Status:** Research + proposed schema; NOT live.
**Scope:** Sanjesh 1405, Ghalamchi, Gaj and future independent exam providers.

## 1. Sources and evidence quality

1. Original six Sanjesh 1405 PDF manifests in `platform/konkur-1405-sources.json` remain the controlling official-source *documents* for the official admission catalogue. PDF hash/page count verification is NOT row-by-row eligibility verification.
2. Published national academic-record rules are **cycle-, examination-group- and admission-route-specific**. The public report of the 1405 regulation says a 60% academic-record share for high-demand programmes, with important differences between grade-11 and grade-12 effects in the reported text; a separate earlier announcement describes different grade-11 treatment. Until the precise latest official instrument and its effective date are independently matched to the applicable group, the simulator MUST NOT apply a global 60% formula or recompute an official composite score. Public reporting: https://hdfydirect.mehdibb.ir/fa/news/764227/ and https://www.tasnimnews.ir/fa/news/1404/01/30/3294725/
3. Public examples of Ghalamchi scorecards describe total/per-subject taz, national/regional/city ranks, percentages, correct/incorrect/blank, deciles, per-ten performance and cohort counts. These are **illustrative third-party descriptions, not verified official schemas or a reusable personal dataset**: https://kimiagarkhoone.com/روش-تحلیل-کارنامه-آزمون-قلمچی/ and https://akoedu.ir/نحوه-تحلیل-کارنامه-آزمون-قلم-چی/
4. A third-party Gaj results guide describes practice results and rank-equivalent claims; the exact current Gaj report schema, score calibration, underlying sample and any API/export licence **remain unverified**: https://pishkhanak.com/blog/gaj-exam-report-card-results
5. The source websites above are examples for **field discovery only**. Do not scrape candidate identities or copy public personal scorecard screenshots into a production dataset. Do not train admission predictions on those anecdotes.

## 2. Provider-neutral field mapping

| Field | Official Sanjesh | Ghalamchi | Gaj | Storage rule |
|---|---|---|---|---|
| Provider / exam date / cycle / group | required by applicable cycle | required by actual test | required by actual test | `eco_exam_score_providers`, `eco_exam_score_events` |
| Rank + rank population / quota | only if official scorecard specifies | test-specific population | test-specific population | `eco_exam_scorecards`; **never interchangeable** |
| Composite score / taz | preserve official named metric and scale | provider-native taz | provider-native score | `overall_score` + `scale_code` + `scale_version` |
| Subject percentage, correct, incorrect, blank | if applicable | commonly displayed | verify current form | `eco_exam_scorecard_measures` with `measure_code` |
| Grade-11/12 official academic records | source- and route-dependent | not a substitute | not a substitute | reuse existing `eco_academic_records`; do not duplicate |
| Regional/quota, eligibility, special admission | verified official rule only | self-reported at best | self-reported at best | candidate profile / official eligibility engine |
| Source certainty | official uploaded/verified/self-entered distinct | self-entered unless provider verified | self-entered unless provider verified | `verification_state` |
| Missing value | unknown ≠ zero | unknown ≠ zero | unknown ≠ zero | nullable measure and `missing_reason` |

Future exam providers are **new provider and event rows**, not schema forks. Provider-specific metric vocabularies must be versioned; no arbitrary unreviewed metric should be treated as an eligibility predicate.

## 3. Week-one operational release boundary

**Minimum useful service:** mobile bilingual/manual scorecard entry (no mandatory document upload), year/group/provider selector, self-entered official rank or practice taz clearly labelled, existing Choice Studio five-criterion worksheet, 1405 programme-code draft with duplicate/order checks, printable non-official report, optional authorized consultation. The programme catalogue remains **source-review pending** until verified records are imported. A mock scorecard may be used for QA but must not be represented as a real student's result.

**Explicitly disabled until validated:** national exam score reconstruction, global 60% calculations, conversion of Ghalamchi/Gaj taz into Sanjesh rank, official allocation prediction, admission percentages, anonymous or unauthorized retention of minors' data, unreviewed PDFs/OCR and automatic adviser sign-off.

**Persistence gate:** authenticated account ownership, consent purpose/version, age/guardian authorization, retention and deletion implementation, server-side authorization, CSRF, audit logging, encryption-at-rest design and live DB migration verification. The proposed `003f` schema alone does not satisfy these. If these gates cannot be completed in time, release a **no-storage, manual-entry** simulator first and do not promise saved scorecards.

## 4. Database rollout sequence

- `003e`: proposed eight-table public official admissions catalogue (sources, pages, staging, offerings, conditions, rules).
- `003f`: proposed four-table **private** provider-neutral exam adapter, referencing existing `customer_accounts`, `eco_consent_records`, and `eco_admission_cycles`.
- First run [read-only preflight](../migrations/20261020_konkur_catalog_readonly_preflight.sql) on Bertina, compare FK types/charsets and existing migrations; verify owner backup is **restorable**. Do not apply either DDL without explicit owner-reviewed evidence.
- Do not import personally identifiable sample scorecards from the internet. A future 10+ guide expansion uses `003e` document rows; a future 10+ exam-provider expansion uses `003f` provider rows.
- If any required dependency is absent or incompatible, stop and author a forward-only corrected migration; never drop an existing table to make a proposed script pass.

## 5. Data product and research constraints

Paid use of the simulator must not depend on coercive collection or indefinite retention of minors' scores. Separate consent for service delivery from optional longitudinal research, model training and marketing; refuse secondary use without appropriate authorization. Provide access, correction and deletion workflows, clear retention, and opt-out. User-provided scores are not automatically ground truth; verified actual admissions outcomes require a distinct consented evidence collection and governance programme.

**Status:** repository source only. No SQL applied to live Bertina, no real private scorecards stored, no admission model validated and no release claimed.

## 6. MAZ manual intake alignment (2026-10-21 source change)

The existing practice-provider directory already lists `MAZ`. The deterministic
server-side scorecard normalizer, public no-storage laboratory adapter and
research-only provider selector now recognize the same provider identifier.
This is **manual entry only**: no MAZ authentication, proprietary report
parsing, third-party API integration, licensed data access or verified vendor
scorecard schema is claimed. MAZ practice ranks are never attested as official
Sanjesh ranks; admission probability remains unavailable. The change does not
activate the proposed `003e` or `003f` database migrations.
