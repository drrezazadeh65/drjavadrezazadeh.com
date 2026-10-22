# JR Integrated Education v4.0 — SINGLE FINAL ACCEPTANCE MATRIX

**Status:** WRITTEN PLAN ONLY — ALL TESTS NOT RUN.  
**Date:** 2026-10-22.  
**Source:** `migration/bertina-linux6` on `drrezazadeh65/drjavadrezazadeh.com`.  
**Binding instructions:** owner has prohibited interim testing; collect full source changes first and execute one end-stage integrated verification only after work is complete. GOV-004 / SEO-URL-001 permanently protects established public URLs. This file performs **no tests, deployment, migration, activation or financial transaction**.

## Science and reliability gates — owner cannot waive external factual evidence

| Gate | Required end-stage proof | Why the gate matters |
|---|---|---|
| SCI-01 | Original official 1405 PDF fingerprints, pages, amendments, applicable languages and teacher-training coverage independently reviewed by qualified persons | A PDF inventory is not an authoritative programme catalogue |
| SCI-02 | Every official programme row has exact source edition, page, row ordinal, current amendment status, independently signed reviewer and administrator attestation | Prevents invented capacity, fee, course, eligibility or admission claims |
| SCI-03 | Golden Talent and RCAS scoring instruments versioned and reviewed against reliability, validity, Humanability and fairness; unsupported claims remain labeled research-stage | Prevents psychometric overclaiming |
| SCI-04 | BAHAR free introduction and two full sections independently editorial/scientifically reviewed; advanced paid sections verified as delivered products before offering purchase | Prevents premature monetization and misleading courses |
| SCI-05 | Golden Path releases require verified personal/guardian consent, independently attested professional review and unambiguous provenance of all six domains | Prevents automated talent labeling or career prescriptions |
| SCI-06 | Any prediction must have independent year-held-out real outcomes, no train/holdout leakage, baseline comparison, Brier score, log loss, global/subgroup calibration, uncertainty and scope checks, signed scientific review, operational monitoring and separate production authorization | No fabricated prediction or fake probability of admission |

## Product, privacy, security and integration gates

| Gate | Required end-stage proof |
|---|---|
| FUN-01 | All bilingual need-first choices navigate to their correct live Golden Talent, RCAS, BAHAR, scorecard, Choice Studio and growth pages without dead links, path renames or cross-locale errors |
| FUN-02 | Two BAHAR introductory modules, weekly planner, eight-week compass, print, export, import and reset work without unauthorized server persistence; consent withdrawal cancels pending reads |
| FUN-03 | Private learner, parent and practitioner access matches verified identity and current purpose-specific consent; cross-account, child/adult and role boundaries deny untrusted requests |
| FUN-04 | Existing five-criterion Choice Studio scores are unchanged by imported BAHAR narratives; Golden Path professional release remains independently gated |
| FUN-05 | Customer dashboard access, private BAHAR evidence, profile reports, signed document delivery and lawful deletion/retention lifecycle verified on the real mother DB |
| FUN-07 | Learner-initiated BAHAR erasure request is account-scoped, idempotent, persisted to eco_privacy_requests/eco_privacy_actions/eco_audit_events, tracked in private account, and conservatively held under a verified legal restriction |
| FUN-08 | SUPER_ADMIN can read only bounded erasure request metadata, may complete only the requested account's workbook erasure after fresh MFA/CSRF and server-side hold recheck, and receives accurate request statuses; no unrelated customer/order, guardian or journal records are touched |
| FUN-11 | On the single mother database, age eligibility approval/revocation and pending cancellation serialize on the SAME owner account row as private GET/PUT, consent and deletion. A renewed adult review clears stale approval/digest fields; under concurrent traffic no revoked or canceled review can authorize a new workbook save |
| FUN-12 | A new or legacy direct workbook deletion, a blocked erasure request, and the owner completion of a historic pending erasure atomically withdraw the prior BAHAR storage consent, without modifying unrelated customer data. A deleted/held workbook cannot silently reappear via stale consent or a same-tab transfer; only a new purpose-specific grant may permit subsequent saving |
| FUN-13 | Private storage activation remains fail-closed unless `eco_privacy_requests`, `eco_privacy_actions`, `eco_subjects`, consent, audit, legal-hold and three dedicated BAHAR tables have all been reconciled on the existing mother database. A grant under a retired or changed notice is rejected; a withdrawal and regrant with the same timestamp cannot be misread as continued consent |
| FUN-15 | The existing Persian and English unified customer dashboards expose an on-demand BAHAR privacy bridge. Only an explicit user tap fetches the account’s own `GET /api/bahar/account/status` with no-store, without fetching workbook content, saving browser data, inventing storage readiness, triggering consent, opening paid checkout, or leaking account identifiers. The status panel clears on tab hide/pagehide, supports mobile 320px and keyboard navigation and links to the original locale-specific BAHAR workbook route |
| FUN-14 | Bilingual learner clients never display the storage consent popup or automatically retry server saving while an erasure request is RECEIVED, PENDING, IN_REVIEW or BLOCKED. Free study, personal local export and request tracking remain available without payment or marketing consent |
| FUN-09 | Both new indexable RCAS introduction routes preserve the existing noindex free assessment destinations, link correctly into the bilingual user journey, and display non-diagnostic and unapproved-commerce limitations without claiming independent validity |
| FUN-10 | Owner-MFA educational command lists fixed same-origin public entry links only for known engines; FA/EN links, source presence and live-unverified flags remain truthful and do not expose private assessment routes or new approval rights |
| FUN-06 | SUPER_ADMIN MFA, CSRF, origin policy, SQL least privilege, rate limiting, optimistic owner draft-price edits, audit log and expiry work as documented; read-only admin views do not authorize releases |
| DATA-01 | MariaDB additive source migrations reconciled with observed production schema; backup, restore, rollback, foreign keys, indexes and retention policies independently reviewed before migration |
| DATA-02 | Admin control of individual/all data collectors, schedules, disabled-by-default master switch, per-source diagnostics and safe retention previews preserved; no unexpected Cron/provider calls |
| SEC-01 | Headers, TLS/HTTPS, CSP, session management, CSRF, XSS, upload handling, encrypted storage and secret handling checked end-to-end; no identifiable learner data in logs or caches |
| SEC-02 | All private URLs, account APIs, commerce pages, administration, guardian reports and uploaded workbooks remain uncached/noindex; public PWA offline fallback uses exactly matching public paths |
| COM-01 | Existing BitPay and manual USDT order/claim/sponsor flows do not regress; real fulfilment only after verified payment and, where required, human approval; no fabricated transaction evidence |
| COM-03 | Owner release-preparation ledger for every proposed educational offer reconciles 6 explicit scientific/content/delivery/privacy/payment/UX criteria; free intros remain without payment gate, optimistic revisions are stored in the existing mother DB, owner CSV contains no personal data, and READY_FOR_REVIEW never grants actual publishing or checkout rights |
| COM-04 | Precisely four fixed free introductory offer IDs exist in the canonical 12-offer catalogue at 0 toman, remain free after owner price changes, and alone waive the PAYMENT preparation criterion; a separate zero-price professional draft must never inherit the permanent-free or PAYMENT-not-applicable flag. The bilingual admin editors display free stage and unapproved sale status consistently |
| COM-02 | All proposed educational offers remain unlisted/unpurchasable until owner-approved content, price, entitlement, verified actual provider checkout, refund/receipt, and legal/economic policy gates are satisfied |
| SEO-01 | Frozen historical sitemap <loc> URLs, established public routes, canonicals, live 200 responses, permanent redirects and backlink destinations preserved; new routes have accurate XML additions |
| SEO-03 | Newly created FA/EN RCAS introductions have neutral research-stage instrument naming, original-language cards on both homepages, grounded WebPage/BreadcrumbList/OG metadata and preserved original methodology URLs; never claim live-indexing without direct proof |
| SEO-02 | Canonical/hreflang reciprocal bilingual routes, structured data without invented reviews/claims, internal linking and content quality reviewed by page; no private sitemap entries |
| UX-02 | Both existing FA/EN homepage bottom docks provide exactly four primary 44px+ reachable actions Home, Explore, AI Assistant and My Account. Real existing assistant panel opens in one tap if present, accurate static/on-device fallback works if unavailable, focus returns to the visible control on close/Escape, and no duplicate mobile floating launcher obscures the page; unchanged More, Shop, Consultation, Talent, BAHAR and desktop navigation remain reachable with 320px safe areas |
| UX-01 | Actual 320/360/375/390/430px mobile, tablet and desktop portrait/landscape browsing: RTL/LTR, usable forms, keyboard navigation, focus, contrast, 44px targets, screen-reader and reduced-motion behavior |
| PWA-02 | New public RCAS explanatory pages install/update through the existing SW scope, maintain mobile safe-area navigation and original published route identity, and work with exact-shell offline fallback; RCAS assessments and authenticated workbooks remain uncached |
| PWA-01 | Existing site/PWA installation remains compatible on mobile and desktop; one controlled update flow; CSS/JS refresh; no stale home banner, broken navigation or unsafe offline cache |
| PERF-01 | Post-build real-user and lab observations for LCP/INP/CLS, Core Web Vitals, transfer size, assets and LiteSpeed/PHP 8.3.35 compatibility; no fictional performance grade |
| OPS-01 | Alerts, DB errors, 404, page quality, SEO/GEO and admin controls show observed data with explicit unknown states; email only on enabled owner preferences |
| OPS-03 | Any newly proposed BAHAR privacy-erasure email scope stays OFF and must show its actual emitter readiness; do not enable or claim user-request mail delivery without a wired and approved incident producer and real owner SMTP evidence |
| OPS-04 | A new committed BAHAR erasure request emits one non-identifying existing-operations incident after the privacy transaction, while reuse does not emit again; configured global/rule/feature scope/recipient/worker gates control actual email, and recorder unavailability cannot undo erasure or expose personal data |
| OPS-05 | MFA owner dashboard shows all defined alert rules, including missing additive DB rows, with accurate producer coverage and default OFF statuses; writes to alert rules and per-feature email preferences are atomic with audit, return 409 for absent rule rows, and do not claim saved settings when unavailable. The responsive first-screen health drilldowns work when optional observer schemas are absent, and unknown observations never become zero or green health claims |
| OPS-06 | First-screen bilingual owner health summary uses real stored incident and HTTP-observer counts, sourced table inventory and source-only page grades; missing or stale observations show UNKNOWN, every drilldown opens a real supported panel even when optional observer schema is absent, and no live success/green health status is fabricated |
| OPS-02 | GitHub workflow, immutable URL guard, exact artifact source, build inventory, host SSH/cPanel/permissions, rollback and post-release live checks all evidenced |
| LEGAL-01 | Privacy notice, minors/guardian verification, research consent, advertising claims, sales terms, refund rules, payment/crypto handling and journal compliance reviewed for relevant jurisdictions |

## Single-integrated-test execution discipline (future only)

1. **Do not run this matrix before all independently implementable source work is finished.** External credential, official guide, institutional, legal and scientific blockers must be declared as blockers, not silently passed.
2. Freeze a release candidate commit on the canonical branch and a published-URL registry; make an immutable backup of the production database and static files.
3. Execute the complete integrated matrix on a safe, production-representative staging environment, then reconcile any findings; repeated corrective tests inside final acceptance do not waive the user's prohibition on earlier iterative testing.
4. Re-check protected canonical URLs, redirect behavior, HTTPS, cookie boundaries, private PWA caches and all authenticated workflows.
5. Verify each financial action with live provider/bank evidence only if the owner authorizes an actual settlement or a safe documented provider sandbox; do not fabricate payments.
6. Publish only through the authorized Bertina owner-controlled workflow when every mandatory condition is met. Verify actual live state separately and restore promptly on regression.
7. A signed and dated gate report must distinguish PASS, FAIL, NOT RUN, BLOCKED and NOT APPLICABLE. An empty status is **never** PASS.

## Explicit status at creation

**All gates:** NOT RUN / NOT VERIFIED.  
**Production launch approved:** NO.  
**New paid educational offers enabled:** NO.  
**Official predictions enabled:** NO.  
**Previously published URLs renamed:** NO REQUEST OR AUTHORIZATION.

A source commit is evidence that text/code was saved in the GitHub branch, not evidence of full system functionality, acceptance or production deployment.
