# JHELA — editorial, journal-design and financial execution master
**Established:** 2026-10-16 · **Source:** drrezazadeh65/drjavadrezazadeh.com / migration/bertina-linux6  
**Editorial title:** Journal of Human-Centred Education, Learning and Assessment (JHELA)  
**Publication language:** English. Persian is an accurate navigation and information locale, not a separate peer-reviewed Persian journal.  
**Site:** https://drjavadrezazadeh.com/journal/ · **future intended OJS host:** journal.drjavadrezazadeh.com  
**Status:** PUBLIC INFORMATION ONLY. Native OJS editorial/publishing transactions NOT CERTIFIED. No public manuscripts or payments may be received.

## 1. Source authority and non-regression
Continue the existing public journal, independent sitemap, public role dashboard, English/Persian ethics and policies, existing /fa/app/admin and /en/account/admin superadmin, founding identity, prior JHELA OJS manifest, 2026-10-12 runbook and the frozen bilingual SEO policies. Do not create an alternative PHP peer-review system, change canonical URLs pre-cutover, share the customer password database with OJS, or expose any review manuscript or staff identity publicly. This file is the additive journal execution contract, not evidence of live service.

## 2. Journal design identity, web, print and OJS
Dedicated English wordmarks: assets/images/jhela/wordmark-en.svg (paper/light backgrounds) and wordmark-en-reverse.svg (navy/dark backgrounds). Original legacy journal mark identity.svg retained. The two new vector variants express a human-centred open book without suggesting institutional endorsement. Before adoption on certificates, invoices or published covers, verify image scaling (28, 40, 64, 256px), actual fonts, 4.5:1 text contrast, permitted clear space and print/monochrome reproduction.
Visual system: deep academic navy #0b203c, warm ivory #f4f0e6, restrained brass #b48a3f. Prefer editorial serif headings, highly legible sans-serif body, generous white space, quiet 1px rules, recognizable manuscript-stage chips, clear pending/error/success distinctions, keyboard-first form navigation, accessible reduced motion, mobile widths 320–430px. Reuse existing site tokens and CSS rather than overwrite the owner's global visual identity.
OJS-specific required deliverables: author navigation / submission stepper, reviewer assigned-manuscript inbox, editor decision desk, manager operations centre, print-ready reviewer invitation, acceptance/rejection/revision letter templates, invoice/waiver, blind review scorecard, author checklist, publication galley PDF/HTML, article landing-page metadata and responsive issue contents. Every private surface must require native OJS session and role checks. Public ornamental previews are not operational dashboards.

## 3. Native OJS role and dashboard specification
| Role | Own dashboard | May view | Permitted actions | Forbidden |
|---|---|---|---|---|
| Author | My submissions, revision tasks and private messages | Own accepted/draft/submitted records and blinded decisions | Draft, upload, submit, respond, revise, request withdrawal, review invoice | Others' manuscripts; reviewer identity; final decision editing |
| Reviewer | Invitations, accepted assignments, due dates, structured reports | Specifically assigned anonymised manuscript, author-safe files | Declare conflict; decline/accept; return author/editor separate comments; submit signed-off recommendation | Access other reviews/identity, edit decision, export author private fields |
| Handling / Section Editor | Assigned screening, review rounds, decision drafts | Assigned manuscripts, permissible reviewer profiles and correspondence | Assign unconflicted reviewers; request revision; recommend decision | Self-handle conflicted manuscripts, waive own approvals |
| Editor-in-Chief | Editorial oversight, assignment, exceptional cases, appeals | Scope-controlled submitted records, decision provenance | Appoint independent handling editor; final scholarly decision within conflicts policy | Interfere with manuscripts authored by self or close collaborators |
| Managing Editor / Journal Manager | Work queue, policies, production, operational metrics | Administrative submission metadata; confidential review text only when explicitly needed | Follow up overdue actions, manage permissions, template/config and schedules | Influence scientific merit based on author fee or sponsor |
| Copyeditor / Production Editor | Accepted articles and galleys | Accepted manuscript, approved metadata and proofs | Copyedit, proof, publication metadata, embargo/licence check | Blind reviewer identities and pending-review files by default |
| Finance Officer | Accepted-author invoicing, waivers, refunds, reconciliation | Author billing identity, final acceptance status, invoice totals | Issue invoice, record waiver/refund and settlement proofs | Review manuscript, appoint reviewers, read reviewer reports, change decision |
| Journal security auditor | Privacy, roles and event security | Redacted audit event and access metadata | Investigate access, inspect operational controls | Browse full manuscripts or confidential review content by default |
| Site superadmin | Hosting/configuration safety and MFA | Infrastructure health, audited aggregate records | Recover security incidents; provision OJS user only under change ticket | Assumed journal scholarly editorial privileges |

OJS provides native role-based dashboards; configure native roles and permissions in the supported OJS version, never simulate them with frontend CSS or localStorage. A superadmin and an editor are independent authorities. Enforce deny-by-default assignment-scoped server authorization, MFA for superusers, expiring reviewer invitations, review independence, provenance and append-only redacted logs. Verify OJS 3.5's exact supported user groups before configuration.

## 4. Manuscript state machine and editorial QA
State history must be immutable and attributable:
DRAFT -> SUBMITTED -> TECHNICAL_SCREENING -> (DESK_REJECTED | AUTHOR_CORRECTION_REQUESTED | UNDER_REVIEW) -> REVIEW_REPORTS_RECEIVED -> EDITOR_DECISION (REJECT / MAJOR_REVISION / MINOR_REVISION / RECONSIDER / ACCEPT) -> REVISION_SUBMITTED (loop) -> COPYEDIT -> PROOF -> METADATA_VALIDATED -> PUBLISHED, with WITHDRAWN and POSTPUBLICATION_CORRECTION/RETRACTION workflows independent. Do not force custom DB enums into an unmodified OJS schema; map conceptual states to its native statuses.
Author intake: email-verified identity; English title, 150–300 word abstract where relevant, 4–8 keywords, all authors and affiliations, optional verified ORCID, original file, blinded file, funding, author contributions, conflict/ethics/data/AI declarations, consent for processing and separate payment schedule acceptance where relevant. Never upload private manuscripts through static pages or arbitrary email.
Pre-review screening: scope, language readiness, anonymisation including file metadata, originality, prior dissemination, ethics approvals where applicable and methodological reporting. Disclose screening changes with a traceable note. Similarity tools can prompt inquiry, never automatically convict.
Reviews: normally two independent appropriate external reviewers; conflict and time checks before private access; researcher/participant confidentiality; structured author-facing and editor-only fields; non-automated final decisions. Review rubric: research significance and framing, literature synthesis, fit of design with question, analytic transparency, ethical integrity, evidence/interpretation warrant, contextual relevance and clarity. Each uses optional 1–5 *diagnostic* anchors; reject automatic summation as a substitute for qualitative judgement.
Decision: handling editor justification, invited reports, signed message, appeal channel, conflict recusal. Editorial safety: all manuscripts authored by Editor-in-Chief go to independent handling staff with no involvement by conflicted individuals. Demonstrate exceptions in staging, not only prose.
Production: copyedit and proof history, approved author affiliations, copyright and CC licence, Crossref deposit ONLY when lawful membership and DOI prefix exist, accessibility, preservation and stable article page. No unregistered DOI, issue, ISSN or indexing claim.

## 5. Dashboard metrics (do not fabricate)
Actual data-only aggregates: open manuscripts, new submissions by week, screening backlog and median age, pending reviewer invitations, declined/overdue invitations, accepted reviews, first-decision median and range (only after sufficient real cases), open revision rounds, production backlog, editorial conflicts with documented recusal, complaints/appeals, approved articles and online-first releases, failed outbound SMTP, manuscript file-access denials, unresolved integrity cases, waived/owed/reconciled APC. Show exact N and reporting window; small-N confidentiality; zero must not be conflated with unconnected data. Journal manager sees operational aggregates; an EIC sees scholarly decisions; finance receives billing-only views; reviewers only assigned work. Site master dashboard receives redacted service-health and aggregate evidence via a future scoped bridge, not duplicated manuscripts.

## 6. Publisher ethics and full public policy bundle
Complete, link and version separately: aims/scope and article types; scholarly governance and named consenting board; reviewer selection and double-anonymisation; editor-author conflict management; authorship/contributorship; human participants and safeguarding; data/materials/code availability and justified limitations; competing interests and funding; appropriate/limited AI assistance in writing and reviewer confidentiality; originality, duplicate publication and corrections/retractions/expressions of concern; appeals/complaints; rights/licences, reuse, preprint/self-archiving; reader access; fees/waivers/refunds/sponsorship; editorial independence; archiving; contact/publisher legal identity and real postal address; advertising and special issues. Never claim COPE membership, DOAJ acceptance, Web of Science/Scopus indexing, impact factor or named independent board before proof.

## 7. Fixed **prospective** fee schedule (journal website pages updated 2026-10-16)
- Submission, initial check, rejected article: CHF 0.
- Original research, methods, systematic review and theoretical research: **CHF 2,000**, only after acceptance, formally published activation and a verified lawful invoice/payment pathway.
- Brief research report, perspective, research note: **CHF 990**, same conditions.
- Correction, retraction, editorial record notice: CHF 0.
- All qualified articles actually published in the inaugural issue: **100% APC waiver**.
- Full waiver: corresponding authors based in World Bank low-income economies (subject to documented current classification); documented hardship: separate full/partial discretionary evaluation by finance staff, not editors.
- No paid expedited peer review, bought acceptance, optional DOI add-on, colour surcharge or undisclosed page charges. Preserve exact pre-submission tariff for the manuscript. Disclose taxes and currency clearly. Refund duplicates and erroneous charges, and full APC where publisher cannot fulfil accepted publication. Verify bank reconciliation and financial compliance; do not auto-enable an Iranian site gateway for CHF transactions without a valid currency/method/accounting process. Avoid banking/card data storage.
Market comparators researched 2026-10-16: MDPI Education Sciences CHF 2,000, Frontiers category model approximately CHF 990 to CHF 3,150 depending on article/journal, and PLOS fees in USD. These are *comparators*, not evidence of equal prestige or justified cost recovery. The charged fee and service level must undergo annual transparent review with publisher approval, with no retroactive rate changes. Fees are PUBLISHED PROSPECTIVE POLICY ONLY until actual public launch; no author currently owes any fee.

## 8. Editorial independence and scholarly reach
Professional visibility follows genuine work: verified founder, consented internationally diversified editorial board, clear journal contact, substantive original policies, legitimate research articles, relevant scholarly seminar/association announcements, bilingual ethical informational content, accessible article abstracts and indexing-ready metadata. Use Google Scholar scholarly-article inclusion guidelines and actual published full text; public promotional pages alone do not make the journal eligible for academic indexing. Update SEO only for released public information and genuine research content, with independent journal sitemap. No ghost issues or placeholder articles in sitemap.

## 9. Native OJS go-live acceptance gates — each currently unverified
1. **Infrastructure:** trusted TLS for singular host, correct virtual host, PHP/extensions DB compatibility with selected official package, verified OJS installer and patch level.
2. **Files:** private uploads outside public_html, filename/signature checks, malware defences, secure backups AND tested restore.
3. **Identity:** separate isolated OJS user database unless supported verified SSO integration; MFA where possible; trustworthy SMTP tests; privacy and retention.
4. **Roles:** native OJS author/reviewer/section editor/EIC/manager/copyeditor role tests with negative access probes and conflict recusal.
5. **Manuscript:** email verified account -> real upload -> durable OJS record -> two independently accepted reviews -> reasoned decision -> revision -> accepted copyedit -> proof -> publication fixture on staging. Test duplicate/replay, expiration, staff-authored papers, malicious files, missing SMTP, session expiration, 401/403, withdrawal.
6. **Commerce:** proper issuer, fixed prospective price, waiver/finance isolation, truthful invoice, lawful CHF or approved converted currency checkout, refunds and reconciliation; activation separately authorised by owner.
7. **Quality/academia:** legal publisher address, independent consenting editorial team, explicitly approved licence, identifiers when legally obtained, preservation and actual first issue; claim no indexing until independently confirmed.
8. **Design:** responsive 320–1440px real browser checks, keyboard, RTL/LTR, focus order, colour contrast, brand SVG/OJS theme, usable role workspaces, bilingual public policies.
9. **Search:** signed public sitemap and public content only, canonical and migration redirects after TLS/OJS true, independently verified search-crawler observations; no private indexing.
10. **Release:** all tests and actual production evidence logged, approved signed recovery procedure, owner-approved single final deployment, no premature public acceptance/payment.

**Acceptance scoring:** 10/10 means all ten gates pass with dated runtime evidence and no high-risk gaps, not a visual rating or assertion in a document. Native host/OJS/financial permissions are independent third-party/owner gates. Do not change platform/jhela-ojs-activation.json flags unless proof is present. Source commits below this line must not claim launch success.

## 10. Current completed source work, not deployed
- Independent English paper/reversed wordmarks added; homepage and public role dashboard display the reversed mark.
- Persian and English fee information pages expose fixed prospective amounts with grandfathered article pricing, founding-issue waiver, tax/invoicing/refund protections, impartial peer review, current offline payment status and source links.
- Preserved original identity.svg, original role dashboard, public and private URL distinctions, founding claims and independent XML.
- Native OJS installation, real peer-review records, reviewer accounts, payroll, bank receipts, licence approval, ISSN/DOI and subdomain TLS remain **unverified and inactive**.

## Primary external references
- PKP OJS 3.5 official guides: https://github.com/pkp/pkp-docs/tree/main/learning-ojs
- DOAJ/COPE/OASPA/WAME transparency: https://doaj.org/apply/transparency/
- DOAJ evaluation criteria: https://doaj.org/apply/guide/
- Education Sciences official fees: https://www.mdpi.com/journal/education/apc
- Frontiers fee framework: https://www.frontiersin.org/about/fee-policy
- Google Scholar inclusion: https://scholar.google.com/intl/en/scholar/inclusion.html
- Crossref membership/recording: https://www.crossref.org/membership/


## 11. Additive execution checkpoint — 2026-10-16, source only

The next committed batch strengthens *native OJS configuration readiness*, not the live service. Do not redo or remove earlier work:
- `assets/css/jhela-ojs-theme.css` — journal-scoped, reversible reader-interface style for PKP OJS 3.5; deploy only through OJS Website → Appearance → Advanced after the native application and backups pass gates. Do not overlay unverified controls or conceal system warnings.
- `docs/journal/JHELA_OJS_REVIEW_FORM_V1.md` — author-visible scientific review criteria and separate handling-editor confidential fields, including formal conflict/confidentiality declarations and consented user/role acceptance tests. Native OJS Review Forms must be configured manually in the approved journal account; the document is not a public data entry endpoint.
- `docs/journal/JHELA_OJS_EDITORIAL_MESSAGES_V1.md` — eight English OJS communication drafts, from successful submission receipt and reviewer invitation to editorial decisions, fee notices and appeals. Placeholder syntax is **not** the set of native OJS template tags.
- `scripts/jhela-ojs-origin-probe.mjs` — nonmutating HTTPS checks with strict CA validation; deterministic `--self-test` and explicit `--live` mode. Outputs only statuses and safe classifications; never uploads/retrieves private manuscript files or emits response bodies.
- `.github/workflows/jhela-ojs-origin-probe.yml` — manually triggered public surface check, never an application deployment.
- `scripts/jhela-editorial-policy-contract-audit.mjs` — expanded static safety contracts for accessibility CSS, review form, correspondence, read-only probe and separation of real/private editorial powers.
- `platform/jhela-ojs-editorial-workflow-v1.json` — six conceptual native OJS editorial roles and two integrations not yet built (finance and security audit). Neither the finance/audit role specifications nor the public information dashboard mean these environments are live.
- [GitHub issue #65](https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/65) contains the operational owner/operator blocker checklist and a dated progress note.

**Verification level:** Eight source artifacts were reread from the authoritative branch and compared with their declared contracts; no file mismatch found by this structural review. The actual Node script, OJS PHP server, external Action run and browser testing could not be executed from the present chat and thus are not claimed to have passed. The live OJS origin could not be reliably fetched in this environment. The source defaults remain fail-closed and the owner-coordinated final release is not authorised by this document.

**Next operational dependency:** obtain independent CA-trusted TLS and parent-path access evidence; verify native OJS files/private storage/dedicated database; configure staff roles and review form; exercise staging submissions, two independent reviews, decision and revision; verify mail, backup restore and negative permissions; complete separate lawful CHF invoicing. Until these are proven, `platform/jhela-ojs-activation.json` must retain its false activation flags and manuscript/payment intake stays closed.


## 12. Operator workstream and author preparation — 2026-10-16

This additive batch implements tangible bilingual JHELA user experience while preserving the real native-OJS boundary:
- MFA-contained existing administrator pages `fa/app/admin/index.html` and `en/account/admin/index.html` now contain a JHELA workstream with eight accessible role tabs, action links and five unresolved external launch gates; `assets/js/operations-jhela-workstream.js` and `assets/css/operations-jhela-workstream.css` control keyboard navigation, including Persian RTL. All information is non-sensitive, and the workspace is hidden until the established administrator authorization completes; this does **not** authenticate OJS journal personnel.
- Public English and Persian author-guideline pages include `assets/js/jhela-author-readiness.js` for eight research/ethics/blinding/rights preparation checks. This visitor tool does not store, send, upload, identify or accept manuscripts.
- `platform/jhela-ojs-role-policy-v1.json` codifies staff-only permissions and PKP OJS 3.5's **Permit changes to Settings** role control. Journal Manager alone should retain such access; this requires native OJS configuration and negative role testing. Correspondence, submissions and reviewer accounts remain disabled pending actual OJS installation.
- `platform/jhela-ojs-editorial-workflow-v1.json` maps thirteen structured reviewer form fields into eight author-facing scientific criteria and five handling-editor-only fields. The original eight summary fields remain for compatibility with existing non-operational contracts; no live reviewer records exist by implication.
- Node regression scripts `tests/jhela-admin-workstream.test.mjs` and `tests/jhela-author-readiness.test.mjs` are wired to the independent, nondeploying `.github/workflows/jhela-ojs-readiness.yml`. Structural reading of fourteen actual source files reported zero inconsistencies; **the Node suite, real browsers and GitHub runner outcomes were not independently witnessed in this chat**, and consequently no runtime pass has been claimed.
- Operational blocker issue: https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/65 (ongoing, no false completed checkboxes).

**Version verification:** the official PKP download page checked 16 October 2026 lists OJS 3.5.0-5 LTS as its newest 3.5 package, released 30 June 2026, while OJS 3.4.0-11 is also listed as a newer 3.4 release. Prioritise a maintained 3.5 LTS package only after independent security/runtime compatibility checks. Source https://pkp.sfu.ca/software/ojs/download/. PKP role guide: https://github.com/pkp/pkp-docs/blob/main/learning-ojs/journal-managers/en/users.md.

**Deployment:** none. All statuses in `platform/jhela-ojs-activation.json` remain unverified/false. The live author submission intake, reviewer/author native OJS screens, manuscript privacy, editor authentication, payment and publication are NOT YET CERTIFIED. Do not switch any of these on until a fully documented hosted OJS, independent restore, end-to-end manuscript workflow and owner-approved coordinated release exist.


## 13. Public international-excellence roadmap and independent indexing gates

By owner direction (16 October 2026), JHELA's public research-publishing roadmap explicitly proceeds **beyond initial launch to the highest realistically attainable levels of international scholarly standing**. The roadmap is now a governed, additive canonical source:
- `docs/journal/JHELA_ULTIMATE_INTERNATIONAL_ROADMAP_20261016.md`: analytical ten-stage international roadmap, scientific ethics, finance and sustainability principles, external-index criteria and evidence gates.
- `platform/jhela-international-roadmap-v1.json`: ten machine-readable milestones with Persian and English scholarly descriptions, evidential thresholds and official source references; no fictitious completed/verified stages.
- `journal/roadmap/index.html` and `journal/fa/roadmap/index.html`: public fully contextualised English/Persian roadmaps. Indexed public information only, not an OJS author/decision dashboard. The separate JHELA XML sitemap, public search index, preserved route identities and AI discovery inventory include both new URLs.
- `assets/css/jhela-roadmap.css`: responsive long-form editorial presentation, semantic stage headings, accessible evidence disclosures and print styles.
- Journal English/Persian homepages and public scholarly dashboards link to the new roadmap; MFA-gated bilingual owner admin panels also include all ten **planned** phases.
- `tests/jhela-international-roadmap.test.mjs` and `.github/workflows/jhela-ojs-readiness.yml` extend source constraints against fake publication, indexing, DOI/ISSN or quartile claims.

**Core evidence criteria:** DOAJ active journal >= 5 research papers per year and, for new journals, >1 year of publication history **OR** >=10 genuine OA research articles; Scopus dropped a generic 2-year wait in Aug 2024 but still demands evaluable history; Clarivate uses 24 journal-quality and four separate impact criteria. A possible ESCI listing is distinct from SSCI; Q1 is only verifiable for a specified year/database/subject category. These are eligibility/selection criteria and aspirational goals, not external admissions already earned. All may change; re-check at application time.

**No new public submission/fee activation.** No live OJS, indexed status, editorial board verification, ISSN, DOI or financial settlement is certified here. Adhere to the existing release gate and master publisher policies.

## 14. Host-independent future architecture decision — JHELA-ADR-001

By owner direction of 16 October 2026, **the current hosting allocation shall not constrain JHELA's target publishing capacity or scientific operations**. The owner plans an additional five gigabytes of hosting space for 17 October 2026; it remains a temporary, unverified capacity allowance, not the long-term server specification or permission to activate OJS.

The canonical ADR is `docs/journal/JHELA_FUTURE_SCALE_ARCHITECTURE_ADR_20261016.md` and the machine-readable design contract is `platform/jhela-target-architecture-v1.json`. These specify nine logically isolated zones, four progressive capacity tiers (transition, dedicated academic production, tested high availability, optional scholarly publishing network), OJS-native private files and database, independent finance/audit connections, safe migration/rollback and evidence-bound service targets. DO NOT imply that OJS 3.5 natively provides S3 manuscript storage or that file expansion alone solves backend infrastructure.

The protected Persian and English master administrator JHELA workstreams now display those four target tiers. Their stage status is a design objective, not a live infrastructure or manuscript count. Regression tests in `tests/jhela-target-architecture.test.mjs` are linked to the independent JHELA nondeploying source workflow. Any future provider purchase must be evaluated using OJS PHP/DB/SMTP, private-file permissions, trusted TLS, valid backup restore, privacy and full editorial workflow tests, not disk size alone.

The scientific roadmap in `docs/journal/JHELA_ULTIMATE_INTERNATIONAL_ROADMAP_20261016.md` remains the scholarly acceptance source; technical availability is necessary but not sufficient for DOAJ, Scopus or Web of Science qualification. Production release remains manually owner-authorized and all OJS activation flags remain false without dated runtime proof.


## 15. Owner-MFA scholarly maturity data view — package tested

In the existing central administrator dashboards, a new opt-in **governance evidence status** view reads `GET /api/admin/operations/jhela/maturity` from `api/operations-jhela.php`. The endpoint is mounted in `api/operations.php` only after actual verified owner membership, a current TOTP/MFA elevation, rate limits, and private no-store headers. It does not accept writes, download OJS manuscripts, disclose reviewer identities, call another host, or issue publisher indexing/fee claims.

The `platform/` directory is intentionally excluded from public release artifacts. To keep the new endpoint functional without leaking project source, `scripts/build-public-site.mjs` now creates a precisely whitelisted source projection inside protected `.public-site/api/internal/`. Native Apache direct web access is denied by `api/internal/.htaccess`; independently verify this denial on the actual host. Source evidence and reviewer files never become part of the projection.

Test coverage: `tests/jhela-operations-snapshot.php`, `tests/jhela-maturity-api.test.mjs`, `tests/jhela-packaged-admin-projection.test.mjs`, `tests/jhela-operations-packaged-snapshot.php`; these are wired into `.github/workflows/jhela-ojs-readiness.yml`. [GitHub OJS readiness run 38852884545](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38852884545) completed successfully, including the production-package projection tests. This is source/package evidence, **not evidence of deployment to Bertina or a live OJS integration**.

The full operational guide is `docs/journal/JHELA_OWNER_MATURITY_DASHBOARD_RUNBOOK_20261016.md`. Scientific stages remain evidence-unverified, actual submitted/reviewed manuscripts are unknown rather than zero, and the intended five-gigabyte host expansion is not recorded as installed. A future verified private-OJS adapter and independently governed evidence vault must be built before any real journal metric or indexing award can appear.

**Release note:** source `assets/js/site.js` exceeded its strict 25 KiB limit by 170 bytes; redundant JavaScript indentation and one explanatory comment were removed without intentional behavioural change (214-byte reduction), allowing the size guard to be re-evaluated. This change does not waive browser regression or other main-site release gates; unrelated bookstore tests still require independent attention. Formal OJS submissions and payments remain closed.


## 16. Native OJS 3.5 metadata quality, ORCID, ROR and Crossref publication gates

The **16 October 2026 JHELA article-level metadata quality contract** adds a systematic, privacy-preserving preparation layer to the existing scientific/operational master:
- `platform/jhela-article-metadata-quality-policy-v1.json` — English scholarly metadata and article-type standards, ethical and funding declarations, rights and licence signoff, consented public bibliographic authors/affiliations, blind-review privacy and historical dates.
- `scripts/jhela-article-metadata-audit.mjs` — offline-only article quality validation, ORCID MOD 11-2 checksum, ROR identifier format, DOI syntax, anonymous review privacy checks and a strict separation between content QA and actual OJS acceptance, Crossref DOI registration or journal indexing.
- `tests/jhela-article-metadata.test.mjs` — eight synthetic positive/negative tests, never using real research participants, private reviewers or journal credentials.
- `docs/journal/JHELA_OJS_METADATA_PRODUCTION_QA_20261016.md` — operating procedure for native OJS editorial workflow, article identity, Crossref Manager, DOI registration status, ORCID/ROR, peer review, copyediting, proof, licence, preservation and re-deposit.
- `.github/workflows/jhela-ojs-readiness.yml` — source-quality tests on push and PR, with no automated deployment or activation.

A successful metadata lint **never means** that the article has been accepted by reviewers, that the DOI resolves or has been registered, that the journal has an ISSN, or that Scopus/DOAJ/Web of Science has indexed it. Author and reviewer accounts, OJS database, secure files and DOI issuance remain closed or unverified until independently witnessed runtime tests and lawful publisher verification.

**Official, current technical references:** [Crossref OJS 3.5 guidance, last updated September 2026](https://www.crossref.org/documentation/register-maintain-records/ojs-plugin/ojs-3.5/); [PKP editorial peer-review workflow](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/editorial-workflow/en/review.md); [PKP journal publication guide](https://github.com/pkp/pkp-docs/blob/main/learning-ojs/editorial-workflow/en/publication.md).


## 17. Master design v3 — canonical bilingual identity and eight role-specific workspaces

By express owner instruction, JHELA shall maintain a **single luxury, international, future-scalable academic design identity** across every touchpoint and retain independence from present hosting constraints. Frozen parent foundations are `foundation/DESIGN-SYSTEM.md` and `identity/brand-governance.md`. Journal-specific implementation is `platform/jhela-unified-brand-v3.json`, with navy `#0B203C`, brass `#B48A3F`, ivory `#F4F0E6` and the previously approved English JHELA wordmark; the parent Persian calligraphic mark is not replaced.

**Complete current public masthead rollout:** all discovered 33 journal English/Persian `index.html` pages share `assets/css/journal-v2.css` and the same brand family. 31 standard page headers use `assets/images/jhela/mark-en-reverse.svg`—the verbatim source emblem from the existing reverse English wordmark; both international roadmap pages use the full approved wordmark. All brand files retain explicit provenance in `assets/media-registry.json`, current official image dimensions/first-screen loading and the ability to roll back to the original journal identity asset.

**Seven harmonised scholarly A4 design specimens:** `identity/jhela-document.css` and `identity/templates/jhela-*-preview-en.html` include reviewer invitation, decision letter, future finance/waiver notice, article galley, reviewer report, future issue cover and a consent-based future reviewer certificate. All are labelled **DRAFT TEMPLATE — NOT ISSUED** and do not constitute official decisions, financial obligations, reviewer service, issue release, certification, DOI or ISSN.

**Eight separate source-only premium role interface specimens** derived strictly from `platform/jhela-ojs-editorial-workflow-v1.json` are under `docs/journal/prototypes/`: author, reviewer, handling editor, editor-in-chief, journal manager, production editor, financial officer and audit officer. Each shows its authorised conceptual views and actions, confidentiality warning and disconnected status using one `jhela-role-showroom.css` visual system. The entire directory is **excluded from published deployment artifacts**. It is not a replacement for native OJS, live accounts, reviewer permissions or a functioning editorial back end. Finance, editorial and audit authority remain technically separated.

**Source and packaging release gates:** `tests/jhela-brand-route-coverage.test.mjs` and `tests/jhela-role-prototype.test.mjs` validate 33 public headers, authentic emblem origin, typography contrast, seven print specimens, role scope boundaries and preview-only content. `tests/jhela-role-showroom-packaged.test.mjs` ensures private role specimens do not leak into the sanitized production package. All are invoked by the nondeploying JHELA OJS readiness workflow. The design contracts additionally must pass native OJS role/browser, responsive 320/375/768/1440 px, print A4, 200% zoom, WCAG 2.2 AA, mobile, RTL and source-licensed asset checks **before** owner-approved publication; green source CI is not real visual or OJS signoff.

**Observed source CI:** [JHELA OJS Operational Readiness run 38857223408](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38857223408) succeeded after the eight-role package-safety tests. General website SEO runs still report separate bookstore-contract failures. Neither claim implies that OJS submission/payment/DOI/ISSN is active; all protected manuscript and payment gates remain closed without independently validated runtime evidence.
