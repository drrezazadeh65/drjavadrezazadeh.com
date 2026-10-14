# Super Master Directive — evidence-led reconciliation with external website audit
Date: 2026-10-15 | Scope: source governance and targeted nondeploying customer-experience changes.

## Authority and change-control hierarchy
1. The owner's complete **SUPER MASTER EXECUTION DIRECTIVE** is the controlling mission scope: [SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md](SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md).
2. Existing canonical architecture, binding source policies and the **frozen bilingual SEO baseline** govern implementation details; resolve conflicts with the owner rather than making a new parallel design.
3. An external-chat audit is **reported observational evidence**, not source truth or consent to activate payment, publishing, personal-data processing or hosting changes.
4. For every change: cite master section, confirm present source/live evidence, choose the minimal reversible approach, add tests, record source commit, and distinguish *committed / CI passed / deployed / independently live-verified*.
5. Work exclusively in `migration/bertina-linux6` and **never deploy production without specific owner authorization for the final release**. Retain existing private-data, scientific, pricing, links and indexation guards.

## Findings from the additional audit — triage and traceability

| Finding | Master directive | Status from canonical source | Action / remaining evidence |
| --- | --- | --- | --- |
| Installed PWA auto-redirects to stored language, skipping choice | §§16–17, 20–21 | **Independently confirmed in source**: `assets/js/language-gateway.js` redirected on `display-mode: standalone` | Removed automatic redirect; preserved language choice storage on user click; updated `tests/public-browser-qa.spec.js`. Browser CI and production recheck needed. |
| Consultation says booking disabled but also shows a requestable calendar | §§9–10, 20 | **Independently confirmed in source** in FA/EN intake copy; calendar already fetches published availability | Reworded FA/EN status so requested hour is clearly **not** a reserved or paid appointment; no booking/business logic changed. Runtime availability, double-booking and dashboard synchronization unverified. |
| Long mission/donation content appears before actual books | §§6, 11–12, 20 | **Independently confirmed in source** in FA/EN store | Moved existing **book catalog block** directly after hero and ahead of mission/support sections. Preserved donation area, product-price sources, payment rules, book artwork, IDs and URLs. Mobile/browser verification required. |
| Internal vocabulary and unfinished implementation notes visible to customers | §§6, 9, 11, 20 | **One source example confirmed** in Persian consent intake; cannot generalize to all pages | Replaced a developer-stage retention implementation note with an understandable user notice; run further source/live customer-copy audit without hiding material limitations. |
| Email composer might be mistaken for an actual request | §§9–10, 20–21 | **Confirmed in source**: `mailto:` requires user action | Keep explicit distinction between composing, sending, acknowledged intake, a slot request, booked appointment, paid order and fulfilled service. End-to-end mail receipt not tested. |
| Consultation slot colours and modality rules | §§9–10 | UI/JS source exists; live slots and server enforcement not verified | Require real-data and double-booking tests; telephone/video must be normal choices, in-person only eligible VIP/annual coaching in Tehran/Kashan. No fictitious capacity. |
| Donation separate from book purchasing | §§11–12 | Donation UI and links exist; live payment settlement not reverified | Preserve dedicated support page and distinct donation vs book order accounting; require callback and actual bank reconciliation for verified claims. |
| Book descriptions and purchase hierarchy | §§6, 11, 19, 20 | Catalogue rendered from live/public data; editorial completeness not examined per book | Review only authentic approved publication facts and source-approved covers; never invent extracts, metadata or scientific validation. |
| Keywords for admissions guidance, talent, Konkur, school guidance, regional discoverability | §§17–18, 24 | Secondary audit offers **strategy, not rank/volume evidence** | Reconcile against frozen bilingual SEO standard and existing URL/page intent map before any new page; use Search Console evidence, not fabricated ranking. |
| AI search discoverability | §§17–18, 24 | Crawl permissions/schema visible in source, not independent AI citations | Verify crawlers, indexation and public references with external evidence; permit no sensitive-route crawling. |
| 320–430px app UX, site speed, keyboard accessibility, all links | §§6, 16, 20–22, 24 | Browser/CI tests exist; complete live acceptance **not** independently proved | Await browser, visual, responsive and performance QA on the candidate; repair real failures before single release. |
| Registration, email recovery, booking + dashboard, concurrency, admin alerts/logs and scientific engines | §§8–10, 13–14, 21, 23, 28 | Source components exist; implementation claims must be kept separate from operational evidence | Preserve fail-closed gates; validate real workflows, consent, scientific interpretability and server privileges through synthetic QA then authorized live testing. |

## Priority order for next work (no feature inflation)
- **P0 source integrity**: CI failures, retention of one canonical source, protected research names, release manifest, auth/payment defaults.
- **P0 end-to-end public journey**: language choice → service/book understanding → account/intake/checkout → independent verification → dashboard follow-up, with normal mobile behaviour.
- **P1 scientific validity**: RCAS, BAHAR and Golden Talent must avoid deterministic predictions, unvalidated psychometric claims or fabricated scores.
- **P1 commercial and administrative integration**: single catalogs, server-authoritative inventory and prices; true payment/refund/fulfilment evidence; calendar scheduling and admin alerts.
- **P1 brand and content**: approved authentic imagery, user-first order, bilingual semantics, documentary book descriptions, accessible components.
- **P2 growth**: keyword intent/AI references only after preserving SEO baseline and obtaining evidence.

## Change ledger — do not confuse source edits with releases
- **Reference directive imported**: `docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md`. Public repository confidentiality guard required replacing one unpublished project codename in the repository copy; the owner-supplied original is retained separately in the conversation attachment, **not equivalent to public GitHub publication**.
- **PWA**: `assets/js/language-gateway.js` (source update), `tests/public-browser-qa.spec.js` (regression).
- **Consultation**: `fa/darkhast-moshavere/index.html`, `en/request-consultation/index.html` (status/copy; no reservation/payment modification).
- **Bookstore**: `fa/shop/index.html`, `en/shop/index.html` (reorder existing catalog only).
- **No production deployment requested or performed**. Browser CI, shop integration, and any unresolved commerce-privacy test failure are separate release blockers. Historical passes never justify skipping current-sha verification.
- Latest exact HEAD and CI run URLs must be fetched afresh when resuming; avoid stale fixed SHAs in operational instructions.

## Open questions deliberately NOT decided without evidence
- No search volume, competitor rank, actual AI citations or revenue is inferred.
- No claim that live appointments are bookable merely because seven-day calendar UI exists.
- No payment-gateway, SMTP, cPanel/AutoSSL, OJS or manuscript-data operation from this audit.
- No rebranding, new directory structure, URL migrations, new independent CRM/database or autonomous deployment.
- No declared scientific validation of RCAS, BAHAR or Golden Talent from a passing smoke test.
- No changing the original poetry, author's text, previously approved book covers or contractual prices.

## Definition of acceptance
Record per requirement: **owner intent → source evidence → change or reason not needed → automated result → responsive/browser evidence → real server authorization/observations → single-release approval**. Leave “completed” false whenever a required layer is missing.
