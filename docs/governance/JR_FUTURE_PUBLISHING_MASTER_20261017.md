> **Historical pricing notice (2026-10-20):** The original 60/40 references below are archived context only. The owner's final technical policy for future Mirkarimi sales is **1,000,000 toman gross / 700,000 author / 300,000 talent support**, version `mehrab-gross-70-30-v2`. See [`JR_PUBLISHING_70_30_ACTIVATION_20261020.md`](JR_PUBLISHING_70_30_ACTIVATION_20261020.md). Do not rewrite completed orders. Private PDF/payment/rights proof still gates live sales.

# JR Future Publishing — Multi-Author and Talent-Support Master Architecture
Version: 0.1.0 · 2026-10-17 · SOURCE ONLY / NOT DEPLOYED OR APPROVED FOR TAKING PAYMENTS

## Mission and boundaries
Extend the existing Bertina PHP/MySQL/SMTP, store, accounts and talent-support modules. This is an **additive feature**, not a new shop, checkout provider, user registry, donation service, deployment workflow or public API gateway. Do not replace approved cover art, SEO ids, routes, authentication or scientific-review status. Build author profiles and products as repeatable content entities; the first candidate is Seyyed Mehrab Mirkarimi, with a 36-year TEFL MA entrance-exam questions/answers collection, 425 + 572 = 997 PDF pages.

Author-submitted identity facts (University of Tehran MSc student, 2026 rank 1, University of Golestan BA 19.62) require independent documentary evidence before displaying unqualified awards in schema. Academic review by Dr. Javad Rezazadeh Yazdeli is **in progress**, NOT an approved endorsement until a signed review record and owner approval. Two print volumes are **planned**, not in press without publisher acceptance/contract/ISBN. PDFs supplied in chat are review copies; do not put paid files or originals under public_html or any Git repository.

## Fixed economics for this work
Buyer pays: 1,000,000 IRANIAN TOMAN per complete two-PDF bundle (10,000,000 IRR, 1,000,000 IRT). Author gross share: 600,000 toman (60%). Talent-support fund gross share: 400,000 toman (40%). The owner explicitly chose **40% of each sale, NOT 40% of profit**. Gateway/SMTP/storage/refund processing costs must be funded separately or owner must reconfirm revised economics before activation. Never claim amounts have been donated or disbursed simply because an order succeeded.

## Information architecture
- /fa/shop/authors/mehrab-mirkarimi/ — crawlable launch-accurate author/product editorial detail; no functional purchase button until end-to-end gates are green.
- /fa/app/author/ — email-authenticated private author workspace; noindex; no fabricated balance/status. Reuse existing verified customer identity; author role via independent staff approval.
- /en/shop/authors/mehrab-mirkarimi/ — translate only with reviewed equivalent copy and exact reciprocal hreflang; do not create false hreflang until it exists.
- New authors use a registry (immutable author_id, stable public slug), not hard-coded PHP templates. Work versions, split contracts, moderation, rights and payouts are entities associated with one author/edition.
- Public author profile must not leak private contact email; public support and sales pages must not expose minors' identities.

## Visual language (extend, not override, existing JR ecosystem)
Deep ink #0b1727, midnight #101c30, brushed gold #c9a56b, parchment #f3ead7, muted #bac5d3. Typography: site-installed Persian font, readable Persian body, carefully sized English scholarly titles. 8pt spacing system, 4.5:1 contrast for body, 3:1 large display, 44px touch targets, reduced motion, 320–430px first, responsive tablet/desktop, accessible keyboard. Cover variants must be approved by author; never present new speculative design as an official printed book. Reusable Figma/Canva templates: profile hero; 2 cover fronts + spine/back; verified review label; author dossier; sample chapter; email receipt; certificate with review scope; social square/story; refund notice; quarterly fund impact report. User photograph is a supplied original; obtain publication/derivative image permission, do not invent degree certificates, endorsements or university logos.

## Review and permissions
Lifecycle: invited -> application -> identity-checked -> rights-signed -> manuscript-received -> scientific-review -> changes-requested -> review-approved -> legal/commerce-approval -> scheduled -> listed -> retired. All transitions recorded actor, time, evidence, review version and signed approval; a title may remain publicly discoverable as "upcoming" before paid release, but must not imply approved review.
Separate checks: (1) original author rights and permission for digitization/derivatives/preview; (2) scientific correctness, citations and answer-key disagreements; (3) personal profile claims; (4) artwork/portrait consent; (5) publication contract and financial split; (6) fulfilment and settlement evidence.

## Multi-author data model (proposed private MySQL migration)
authors, author_account_links, author_works, work_versions, review_decisions, author_rights, work_prices, work_assets (private storage pointers only), sale_allocation_entries, author_settlements, digital_access_grants, publishing_outbox, publishing_audit. Public read models can be generated from approved records. Live writes and fund movements require private migrations, backups, application operators and acceptance; no automatic migration through GitHub CI.

## Sales integration (never bypass existing gateway)
Existing /api/commerce routes and verified BitPay callback remain the only paid order authority. A new SKU kind (digital) must be reviewed against existing inventory, catalog and stage9 service/outbox contracts before enabling it; do NOT fake it as a stock-tracked physical book or a "service". Price and allocation must be server-origin snapshot values. The payment event is committed once to InnoDB; create one 600000/400000 allocation pair per eligible purchase in the same atomic transaction or an idempotent outbox consumer that double-checks verified payment claim. Refunds generate balancing reversal entries, no overwriting immutable ledgers.

Private delivery: store the real PDFs outside web root on Bertina with content digest, MIME+magic, antivirus scan, optional at-rest encryption and explicit role permissions. Upon verified payment mint high-entropy tokens with hashes only persisted, bounded expiry and download limits; send email link over TLS, and allow verified buyer reissue from their existing dashboard. Never cache token responses in Service Worker/CDN; rate-limit and audit. A seller dashboard is not a customer's download token.

Email outbox: buyer receipt/link, author new-sale notice, operator exception, and optional fund-ledger notification; each with unique (order,line,event-type,recipient) delivery key, retry/backoff and dead-letter alert. Never mark message "sent" before SMTP returns acceptable result; repeated provider callbacks must not duplicate messages. No buyer personal data is shared with the author by default.

Accounting: author_share_pending != author_share_settled; fund_earmarked != fund_disbursed. Reconcile against gateway totals, refunds and settlement statements; two-person approval for outward transfers and talent-support disbursement. Public quarterly aggregates only once bank and beneficiary safeguards are verified. No fabricated impact statistics.

## Security and operations
The owner has a 100% global release freeze; comply with docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json and .github/workflows/deploy-bertina.yml. No new competing deployment workflow. Fail closed for missing TLS, SMTP, schema, signed authorship rights, approved reviewer certificate, fund governance, SKU verification, email dispatch, malware scanner or escrow/liability reconciliation. Staff roles use existing authenticated account, least privilege and elevated MFA. Private author routes must be noindex, uncacheable, CSRF protected, rate limited. Protect children and purchasers; no identifiable child information on pages or in author emails.

## Launch acceptance (NOT YET EVIDENCED)
- [ ] Rights and portrait publication permission, identity/rank evidence, approved cover art
- [ ] Dr. Rezazadeh reviews signed sample and final PDFs; summary of scope and limitations
- [ ] Written owner/author signed 60/40 gross split contract and fund rules
- [ ] Clean staged schema migration + rollback + seeded author work/catalog and price
- [ ] Real transaction gateway callback is bank-verified and exactly-once under concurrent retries
- [ ] Buyer gets both nonpublic PDFs once; token expires/reissue works; no leak or CDN caching
- [ ] Author email and private dashboard show exact author share, but not buyer identity
- [ ] Refund reversal and settlement ledger match verified bank records
- [ ] Fund reporting privacy and truthful use of 400000 toman allocation
- [ ] Persian/English mobile, keyboard, RTL/LTR, SEO, Core Web Vitals, links, no broken paths
- [ ] Run existing full masterplan release gate; explicit owner's final deployment approval

## Assets and collaboration
Canva design system folder: https://www.canva.com/folder/FAHYQMWW2kk
Figma/FigJam architecture: https://www.figma.com/board/i8AjV7Ya5owbzhFEga7mR1
Concept hero image from ChatGPT is a *visual study only*, not publication-grade factual portrait, print claim or scientific endorsement. Official portrait and covers require preservation and consent.

## Legal contract, signature evidence and financial reporting amendment — 2026-10-17
Legal foundation: Iranian Electronic Commerce Law (1382), esp. arts. 6-14, 62; Iranian Authors/Composers/Artists Law (1348), esp. arts. 3-5, 14. The first author requires a reviewed **written fixed-version contract signed by both parties**, archived in private custody. This can be a paper-signed scan initially; later a legally supported secure e-signature with independently verified identity may supplement the workflow. A checkbox by itself is NOT marked a secure legal signature. Never create fake documents, approvals, dates, signers or signature images. A qualified Iranian legal professional must verify the final version before signing.
- Signed agreement must address party identities and capacity, limited (recommended nonexclusive) DIGITAL distribution license, 12-month suggested term with negotiated fields, provenance of national exam content and author's original commentary, use of AI disclosures, scientific review and rights; privacy/portrait/cover consent; accessible redress, corrections, refund and cancellation; account/reporting/audit/settlement; non-automatic PRINT rights; final disputes and termination.
- Private digital contract state machine: draft -> legal_review -> awaiting_author -> awaiting_owner -> both_signed -> effective -> expired/terminated. Audit changes and each signer's verified contract SHA, method and time. Do not allow signing of a revised agreement without explicit acceptance of the new hash. Independent owner and author evidence per version; publishable commercial approval requires both accepted. Recipient email stays in private SMTP/account settings, never public JSON/HTML/repository history or analytics.
- Proposed additive migration: `docs/migrations/20261017_jr_publishing_contract_and_reserve.sql`, solely AFTER approved canonical `docs/migrations/20261017_jr_future_publishing.sql`. Do not run the overlapping experimental `docs/migrations/20261017_jr_future_publishing_draft.sql` unless a future audited canonical decision explicitly selects it. These are mutually incompatible schemas.
- Contract template working copy was prepared in the assistant conversation as **JR_Future_Publishing_Author_Agreement_DRAFT_FA.docx**; it is not signed, not a public site asset, and requires independent lawyer review.
- Confidential author sale notification email, supplied by the owner, must be configured only via privately stored author account details and a verified SMTP recipient binding, not a file committed here.
- Transaction projection: 1,000,000 IRT checkout price; 600,000 IRT author share; 400,000 IRT fund earmark; 70,000 IRT (7%) independent SITE reserve. Total platform cost and entitlements = 1,070,000 IRT, requiring minimum 70,000 IRT **funding from a source external to the buyer transaction**, plus potential gateway costs, BEFORE money can be accepted. The 7% is not a statutory tax rate. Distinguish reserve accrual, approved budget and BANK-verified funding from actual tax paid. Do not allow negative unbudgeted capital flow as a proof of sustainable operations.
- Source helper `jrPublishingGrossWithOperatingReserve` computes the 7% amount without reducing either contracted beneficiary. Read-only author dashboard now includes *actual server-verified* platform reserve/funding totals only if postmigration data exist; no sample transactions or invented real-time author payouts.
- Buyer statutory withdrawal/refund rights MUST NOT be removed by an unsupported blanket "all digital sales final" declaration; review Iranian consumer-law rules and exceptions with legal counsel.
- End-to-end rollout status: **NOT READY** until signed contract and permission evidence, reviewer consent, proven unique verified payment event, legally compatible PDF licensing and original question rights, private storage, SMTP sale notices, refunds, source CI, MySQL rollback and owner global release freeze are independently satisfied.
