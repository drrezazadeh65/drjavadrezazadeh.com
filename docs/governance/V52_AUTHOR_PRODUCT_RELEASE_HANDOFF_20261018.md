# v5.2 author, digital product and controlled Bertina release handoff
Date: 2026-10-18 · Source-only handoff, **not a production acceptance certificate**.

## Existing implementation preserved
- Public author's educational product and biography: `fa/shop/authors/mehrab-mirkarimi/index.html`.
- Verified-account author dashboard: `fa/app/author/index.html`, `assets/js/jr-author-workspace-v1.js`, `api/publishing.php`.
- Private author KYC, bank evidence, documents and consent: `assets/js/jr-author-onboarding-v1.js`, `api/publishing-onboarding.php`.
- Commerce: existing BitPay/Stage09 routes and `api/internal/jr-publishing-digital.php`; no new payment gateway.
- Price approved by owner: 1,000,000 toman per bundle; 600,000 author + 400,000 educational talent-support earmark. Separately funded 70,000 toman platform cost reserve must never dilute these two amounts.

## Scope of this incremental change
- Accessible native disclosure sections, search through **only the latest 50 authorised sale records**, and easy navigation to the private onboarding/account evidence form; user interface changes neither payouts nor financial transactions.
- Multi-author account selection in onboarding when a login is legitimately linked to multiple approved author identities. The selected author remains selected through permitted form refreshes. Each POST continues to carry only the chosen and server-authorised authorId.
- Public author page now links to the existing noindex authenticated author dashboard; no buyer data or private file names are exposed.
- Static targeted tests incorporated into nondeploying v5 release-candidate workflow. Passing tests **does not** demonstrate real author rights, live deployment or bank settlement.

## Private product payload verified in ChatGPT working session
Library artifact: `JR_Publishing_PDF_Private_Server_Staging_v2.zip`.
- Total ZIP size 9,031,196 bytes; SHA-256 `a0fb784d92f0b3b40fc03f370444bfda41af40a1dc72d6b90568c4c9ffcdbbcf`.
- `tefl_1370_1405_questions.pdf`: 3,660,392 bytes; SHA-256 `6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8`.
- `tefl_1370_1405_answers.pdf`: 7,656,609 bytes; SHA-256 `db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4`.
- Bundle includes `private-asset-manifest.json` and `READ_ME_PRIVATE_DEPLOYMENT.txt`.
- **Do not add these PDFs or ZIP to this public GitHub repository or to Bertina `public_html`.** Transfer only via an authorised private host channel; use the already-developed `api/internal/jr-publishing-private-install-cli.php` with exact hash/file permission checks. Private hosting install **has not occurred in this session**.

## Remaining legitimate publication prerequisites
1. Author's independently verified digital distribution rights, including any relevant third-party examination-material rights; no invented signatures.
2. Registered email-verified author account and owner/MFA-approved author role; KYC and independent bank verification, if disbursement is contemplated.
3. Correct current MariaDB schema and private hosting storage, PDF hashes + malware scan, evidence of backup/recovery and non-public URL access.
4. SMTP/notification cron, bank payment callback, full real permitted test purchase, exactly two secured PDF entitlements, refund replay/deduplication and 600k/400k reconciliation. The independent 7% platform subsidy needs funding verification.
5. Stable current HEAD CI, source-vs-live version/URL test, protected exact-SHA Bertina workflow invocation by the repository owner. Only scope-approved changes can deploy; never treat missing OJS 41-gate as VERIFIED.
6. JHELA manuscript creation/upload remains owner-suspended; no OJS installs 2026-10-18 through 2026-10-27, no automatic reopen afterward.

## Deployment limitations
GitHub source connection offers commit/tree/read tools but **no workflow_dispatch** or Bertina FTP/SFTP/cPanel action. A source commit cannot upload confidential ZIP bytes, run MySQL migrations or prove a live bank test. The existing `.github/workflows/deploy-bertina.yml` requires the owner's manual authenticated invocation, exact SHA and live-release fingerprint and all scoped safety gates. Do not force an automatic deploy by adding a parallel workflow or bypassing safeguards.

## v5.2 English author discoverability QA correction (2026-10-18)
The approved English Mirkarimi author/profile resource was added to the reciprocal sitemap before it was registered in the immutable-route inventory or linked from the English shop. This change registers the new approved URL, provides a genuine accessible route from the established English bookstore, and revises internal engineering language in English visible text and the public search index. Existing Persian route, product rights/payment gating, author dashboard, pricing and JHELA manuscript hold remain unchanged. The four original audit findings and current exact-SHA CI results must be inspected before recommending any scoped production release; this documentation alone does not constitute acceptance.

## v5.2 visual identity correction — scoped source candidate, 2026-10-18

The owner rejected the previous author-page appearance because it still resembled the original blue-heavy template instead of the frozen Persian-first black/gold/ivory academic design. A targeted additive author-page CSS layer now applies to **only** the existing FA/EN Mirkarimi author routes. Reused assets and page content remain: the original Persian biographical, exam and allocation facts, the rights-gated digital checkout and the same product entity IDs. The speculative Persian 3-D book-cover mockup has been replaced with the already-approved educational editorial illustration and an explicitly non-cover folio; no photograph of the real author is represented as such.

New verified-in-source elements: bilingual breadcrumbs, an anchored reading/navigation index, aligned hero typography, a gold/ivory editorial black layout, accessibility-focused author/price cards, and an English five-destination mobile app dock. CSS is independently scoped, uses the frozen mother-brand palette, and specifies reduced-motion, focused controls and 390/700/800/1040px responsive behavior. The change **does not** enable paid product access, change bank flows, fabricate author permissions or publish any live build.

Source tests: `node --test tests/v52-author-visual-evolution.test.mjs tests/v52-bilingual-author-product.test.mjs tests/v52-author-dashboard-contract.test.mjs`. For deploy readiness, obtain CI, representative mobile/desktop browser screenshots, bilingual page URLs, the currently deployed Bertina SHA, permission/rights and payment protections, and approved same-SHA recovery evidence. Preserve active donation and customer order behavior. No full-41-gate completion claim, no OJS installation and no article intake.

**Atomic packaging guard:** `scripts/build-public-site.mjs` now requires the approved public illustration, both author routes and the distinct v5.2 author stylesheet in the deployable public artifact. Absent any of these, the build must fail rather than ship an old-looking or image-broken page.
