# JR Education v4 — Phase 6 commercial evidence bridge (source-only)

**Date:** 2026-10-22. **Branch:** `migration/bertina-linux6`. **Release state:** NOT TESTED / NOT DEPLOYED.

## What has been added to existing functionality

The existing bilingual master administrator pages now include a small, explicitly requested **real commerce evidence** area directly alongside the proposed education offer catalogue and owner draft price controls. It reuses the **existing** `/api/admin/operations/commerce` service, its authenticated first-party MySQL order/claim/service reports and a separate aggregate-only read of `/api/admin/operations/education-interests` (without `includeContacts`). A direct navigation control opens the original commerce dashboard; no duplicate reporting database, unauthorized payment operation or pricing system is created.

The view displays distinct counts for: actual order rows marked paid, provider-claim-matched orders, paid-order rows over 30 days, existing open service cases, refund requests awaiting handling, paid rows requiring provider reconciliation, recorded future internal consultation bookings, paid-state orders without a recorded receipt-email timestamp, and first-party educational-interest contacts who **explicitly opted in and verified their email**. Pending interest confirmations are shown as a separate category. Anonymous web traffic, SEO impressions, sales conversion, profitability, net revenue, bank settlement, refund payouts, external consultation availability and real message delivery are **never inferred**.

**Evidence boundaries:** `commerce_orders.state='paid'` does not prove bank settlement. Matched internal provider claims are not a settlement receipt. Verified educational email interest is not the same as purchase. Missing receipt timestamps are not proof that the customer never received a message. Unavailable source data are reported as UNKNOWN, never zero. No customer addresses, recipient emails, order UUIDs, student notes, workbook data or gateway references appear in the new report.

**Implementation files:**
- `assets/js/operations-education-business-bridge-v1.js` — read-only report with explicit on-demand fetch and clearing on admin logout, page hiding or section close
- `fa/app/admin/index.html` and `en/account/admin/index.html` — existing page sections only; internal anchor `#jr-education-business-report`; original page URLs unchanged
- `assets/js/operations-education-readiness-v1.js` — direct executive dashboard shortcut to this report

## Source-first owner controls and single integrated acceptance

1. **No new migration** is needed for this specific read-only bridge. It depends on the site’s existing Stage09 commerce/consultation schemas and separate previously developed email-interest table. If those are absent, the source reports UNAVAILABLE.
2. Proposed educational prices in `api/internal/educational-offer-proposals.json` and `operations_educational_offer_drafts` remain **not for sale** and disconnected from the live checkout, order ledger and entitlements. The first four introductory education stages remain free.
3. The already staged, *unapplied* additive migrations for BAHAR encrypted account storage, owner pricing drafts, and optional BAHAR incident rules are separate dependencies. Never assume they were installed merely because corresponding PHP routes and admin controls exist.
4. To provision the mother database **after the owner authorizes the final implementation phase**, first inventory the actual cPanel database and PHP version, confirm a recent encrypted restorable backup and document the source migration SQL and checksums. Compare each `CREATE TABLE` and foreign key with the observed schema; stage only additive changes without modifying any published URL. Record each applied migration in the canonical migration ledger only after its success is evidenced. Keep all owner service switches OFF.
5. **One end-stage integrated test** is explicitly deferred by the owner until implementable source development is finished. It must cover authenticated RBAC/MFA, consent, original official admission sources, secure workbook and key management, draft revision conflicts, legacy BitPay/USDT and consultation payment claims, service fulfilment, email outbox, mobile accessibility, PWA privacy, structured SEO/hreflang, immutable sitemap URLs, DB backup/restore, and live-compatible PHP/LiteSpeed.
6. Source commit or internal UI appearance does not certify actual payment, scientifically validated scores, legal compliance, saved learner data, operational emails or deployment. Never claim tests passed before independently collecting evidence.

**Binding law:** Existing published addresses, prior XML sitemap `<loc>` URLs and canonical identities remain unchanged. New page content, additively created new addresses and correctly linked internal navigation are permitted.


## Further Phase 6 source integration: Tehran consultation week and downloadable summary

The owner report also obtains the site's **already-existing public non-personal** `/api/commerce/consultation-week` snapshot on demand. Its seven days (Tehran timezone) show only owner-published one-hour windows and internal BOOKED/FULL state. Unavailable or malformed data remain UNKNOWN rather than generating fictional times. This is not a reservation system, a promise of time availability, an external calendar check or a payment/appointment confirmation.

The private dashboard includes an explicit **download of the visible aggregate-only CSV**, with spreadsheet formula injection protection and no personally identifiable fields. It includes, as a clearly identified internal source value, the exact matched-claim-order amount in *toman* without treating it as bank settlement, profit, net receipts or USD. All monetary estimates, marketing conversion rate and external booked consultations remain outside this source-only panel unless independently verified.

New source additions: `assets/js/operations-education-business-bridge-v1.js`, `assets/css/operations-educational-offers-v1.css`, and the existing two bilingual administrator HTML files. Previously published page addresses and XML sitemap URLs are unchanged. No tests, staged migrations, bank inquiries or live deployment were performed during this source-only development phase.
