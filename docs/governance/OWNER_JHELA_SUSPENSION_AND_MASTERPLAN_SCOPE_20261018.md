# Owner decision — OJS suspension and master-plan scope

**Recorded:** 2026-10-18

## Binding owner instruction
- Pause every OJS installation, repair, config change and reattempt for ten calendar days (18–27 October 2026 inclusive). Work may only resume from 28 October 2026 if the owner explicitly requests it; passage of time alone does not authorise operations.
- Manuscript submission and preliminary PDF intake must remain disabled unless the owner gives subsequent explicit authorisation. Disable both PHP create/upload endpoints and public submission UI, independently of hosting environment flags.
- Continue completing the website's previously approved master plan in the canonical GitHub repository/branch. Do not suspend store, services, scientifically qualified public tools, bilingual SEO, verified accounts, consultation, payments, news, books, donations or separate reviewer-collaboration information.
- Preserve the working main website and live transactions. No silent deploy, MySQL change, live OJS change or release certificate is authorised by this scope record.

## Implementation and acceptance scope
- Canonical branch: `migration/bertina-linux6`.
- Hard source guard: `api/jhela-intake.php`, reporting `manuscriptIntake:false` and returning `503 manuscript_submissions_paused` on creation and upload, regardless of production feature flags.
- UI: `assets/js/jhela-author-workspace.js` suppresses submit/retry forms; `journal/submission/index.html` and `journal/fa/submission/index.html` tell readers submissions are closed without suggesting articles are being received.
- Separate reviewer interest and approved reviewer listings are not intentionally shut down by the manuscript gate. They remain subject to their existing consent, identity and operational readiness checks.
- Test source with `node --test tests/jhela-founding-intake.test.mjs` and PHP lint; then obtain independent live evidence after an approved release. Source-only tests cannot prove the production application received the change.

## Release interpretation
The scientific_journal_ojs workstream has an explicit temporary *scope exception for manuscript submission/OJS installation*. It is NOT VERIFIED as fully installed or operational. Existing master-plan manifest and owner release controls remain evidence-gated; do not mislabel them as complete.
