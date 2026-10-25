# JREI Site Apprentice — learning from actual developer work
**Owner direction:** 25 October 2026. **Scope:** JREI AI workstream, observing all original website engineering domains without changing unrelated website features.
**Canonical branch:** `migration/bertina-linux6`. **Production:** Bertina PHP 8.3, only the original `drjavad1_store` mother database. **Status:** SOURCE-STAGED; no production deployment or unattended site operation claimed.

## Why this exists
The owner's objective is to train **the JREI system**, not merely increase the capabilities of the installed Qwen3-4B weights. Over time JREI should retain the reproducible engineering practice of approved work: bug diagnosis, implementation, design rationale, UI/UX decisions, SEO/GEO evidence, PHP/SQL operations, incident response, tests, release receipts and postrelease correction. It should remain serviceable when ChatGPT or an external provider is unavailable.

A ChatGPT consumer conversation does **not** give JREI API access, previous transcript access, private chain-of-thought access, or a licence to harvest personal conversations. An explicit separate integration/authorized export is required for any voluntarily shared conversation excerpts. **Never try to reconstruct or capture private hidden reasoning**. Instead collect *observable* change, decision summaries and external validation evidence.

## Implemented source components
1. `platform/jrei-v5/jrei-site-apprentice.mjs` — deterministic observation classification across code, design, UI/UX, SEO/GEO, content, security, operations, data, testing and JREI AI. Includes non-executable lesson-capsule proposals with source commit SHA, bounded rationale/outcome/verification/rollback and conservative scoped-action decisions. Default state: `OBSERVED_UNVERIFIED` or `PROPOSED`.
2. `scripts/jrei-site-apprentice-observer.mjs` — read-only CI Git observer. Reads only SHA, commit timestamp, and filtered file paths. **Never reads code patches, passwords, original prompts, visitor or student records.** Writes a JSON observation to ephemeral GitHub Actions storage.
3. `.github/workflows/jrei-site-apprentice-observer.yml` — automatic push observer on the existing canonical branch, Node 22 tests, 14-day artifact retention, `contents:read`, no commit push, no deployment. A successful observation means only *metadata collection succeeded*, never validation of developer quality.
4. `tests/jrei-site-apprentice.test.mjs` — negative tests for sensitive files, incorrect repository, false QA/deploy promotion, secret-like content and over-privileged self-actions.
5. `docs/migrations/20261025_jrei_site_apprentice_mother_mysql.sql` — additive **review-only** persistence proposal for the existing Bertina mother DB. No migration is run merely by adding this file.

## The desired learning cycle
1. **Observe:** automatically register which GitHub commit changed which *safe* files/domains. User-visible ChatGPT answers/decisions are recorded only when expressly provided as separate permitted work notes; no private ChatGPT monitoring.
2. **Understand:** a developer or authorised agent creates a bounded "lesson capsule": verified problem, design choice, alternatives, actual diff reference, scope constraints, evaluation evidence, limitations and rollback. The capsule is a proposal until genuine expert/owner review.
3. **Verify:** a separate execution checks existing tests, real CI status, measured regressions, security/SEO/mobile QA, and actual production receipts. A GitHub commit alone is **never** CI_PASS or PRODUCTION_DEPLOYED.
4. **Remember:** accepted, source-anchored, consent-safe capsules are indexed using the **same original mother DB**, with versioning and revocation. A rule can be recalled by JREI with confidence limits. Existing `jrei-learning-loop.mjs` manages controlled evaluation of changes; retrieval improvements cannot grant deployment privileges.
5. **Practice:** for a new task, JREI first retrieves matching reviewed prior cases, drafts a scoped change on an isolated review branch, compares against held-out tests and reports uncertainties. It may not autonomously approve its own work.
6. **Evolve:** benchmark candidate developer skills and retrieval policies. The strongest *empirically verified* improvements may be proposed for owner-accepted promotion; recurring, explicitly authorised low-risk operations may eventually be automated with rollback. Payments, accounts, security rules, research validation and production publication remain separately gated.

## Agency boundaries
| Capability | Present source policy | Operational status |
| --- | --- | --- |
| Classify source changes | Read-only, metadata-only | CI workflow added; live Action result separately verify |
| Store proposed engineering lessons | Structured proposals (not verified) | In source; no production DB ingestion |
| Retrieve trusted engineering skills | Only after independent acceptance | Not wired to live JREI |
| Propose patch on separate branch | Eligible in policy | No connected autonomous patch executor |
| Change live PHP/SQL/SEO/security | Not permitted by apprentice library | Not enabled |
| Upload student information to a model | Prohibited without scoped consent/private controls | Not enabled |
| Contact ChatGPT/OpenAI on its own | Requires separate authorized API, billing, limits and consent | Not connected |
| Train or fine-tune Qwen weights | Never implied by reading commits | Not running |
| Ownerless website administration | Requires incremental measured delegated privileges, audits and fallback | Not available |

## First concrete observed quality lesson
On 25 October 2026, the existing local Qwen3-4B model completed 16 synthetic Persian/English fixtures but produced **48** for `12 × 7` (correct **84**), one truncated answer and several Persian language/terminology defects. The model/runtime digest test passed and 16-request p95 was **12,799 ms**. These observations **do not** certify general capabilities. A conservative JREI skill proposal is to use deterministic calculators for exact mathematics, independently reviewed answer keys for scoring and source-grounded validation for educational claims, while retaining the established local model. This is learning at the *system behavior* level without claiming changed Qwen weights.

## Next required engineering integrations (not yet completed)
- Authenticated owner-only API to append/redact/revoke lessons in the mother DB; scoped reviewer workflow and independent evidence links; migration only after backup/restore acceptance.
- Minimal authorized CI/QA/deploy outcome correlator: mark a work capsule tested or live **only** after real immutable receipts at the same SHA.
- Evidence-based retrieval of *accepted* work lessons by JREI site operator; tool-specific allowlists and fail-closed action policies for GitHub, CMS, SEO and analytics.
- An explicit, consent-aware integration for user-provided ChatGPT output/handoff summaries, not private automatic conversation mining.
- Site apprentice evaluation on historical real tasks (including failed patches), sandbox regression tests, attack simulation, rollback and authenticated owner acceptance before expansion of privileges.
- Offline resilience: signed source-known local operator plans and review queues, local knowledge cache only for approved non-sensitive lessons, no invented model capabilities.

## Acceptance
Source presence is not deployment. An Action green light verifies the observer's tests, not that JREI has become an autonomous engineer. A real acceptance must demonstrate: reviewed work case -> retrieval into JREI -> grounded solution proposal -> independently passed website tests -> explicitly authorised release -> production evidence -> measured operational benefit, including a correct rollback. Until then, status is **PARTIAL, NOT LIVE**.
