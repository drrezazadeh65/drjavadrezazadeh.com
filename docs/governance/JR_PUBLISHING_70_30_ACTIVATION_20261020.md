# JR Future Publishing — Mirkarimi 70/30 Owner Decision and Release Gate

**Recorded:** 2026-10-20 · **Stage:** source-ready commercial policy, **NOT independently verified for live sales**.

## Authority and scope

The owner has replaced the earlier 60/40 **future-sale** policy with these final per-bundle amounts:

| Basis (integer toman, IRT) | Value |
|---|---:|
| Customer gross price | 1,000,000 |
| Author's gross entitlement | 700,000 (70%) |
| Talent-support fund earmark | 300,000 (30%) |
| Sum of allocations | 1,000,000 |
| Separately funded operating cost reserve, if approved | 70,000 (7% of gross, **not** a buyer surcharge) |

Policy ID: `mehrab-gross-70-30-v2`. Historical server-origin orders without a policy ID and with the original 600,000/400,000 split retain the distinct `mehrab-gross-60-40-v1` interpretation. Never edit previous completed payments or their financial entries. Author entitlement, fund earmark and actual bank settlement/beneficiary disbursement are **different** states.

This is a final *website-owner technical pricing decision*, not a forged author-signed licence or an independent legal distribution clearance.

## Existing components reused

- Existing IRT `publishing_offers` row and `commerce_orders.items_json` snapshot; no second catalogue or payment provider.
- Existing BitPay Stage09 verified-callback transaction, unique payment claims, two private asset grants and notification outbox.
- Existing `publishing_sale_allocation_entries` ledger, protected author dashboard, operating cost ledger, and existing `publishing_audit_events`.
- Existing content pages at `/fa/shop/authors/mehrab-mirkarimi/` and `/en/shop/authors/mehrab-mirkarimi/`.
- Existing unchanged one-click Bertina deployment and private migration approvals.

The policy is applied to **new** `jrPubDigitalOffer()` checkout lines, each of which now snapshots `allocationPolicy=mehrab-gross-70-30-v2`, 700000 and 300000 in a server-origin immutable order. Stage09 must verify the bank response and the locked order before committing one author allocation, one fund allocation, two private grants and queued notifications. The email worker must read the **stored paid order's policy snapshot**, not the latest advertised offer.

## Owner-only private Bertina operator steps (not GitHub CI)

1. **No public site/database change during code review.** Before touching the existing product row, independently verify a recent restorable database backup, payment/gateway status, pending orders and the exact existing author/work/offer IDs. The production database and both original PDFs are inaccessible from GitHub alone.
2. Check the current row using the CLI-only tool:
   `php api/internal/jr-publishing-policy-70-30-cli.php --check`.
3. If the row is the original 60/40 version and a qualified Bertina operator is ready, apply **only** the existing-offer split inside a locked transaction:
   `JR_PUBLISHING_70_30_OWNER_APPROVED=YES_20261020 php api/internal/jr-publishing-policy-70-30-cli.php --apply`.
   The switch is operator-context authorization only; it does **not** approve a bank debit, sign the author's rights, set `checkout_enabled`, turn on public commerce, or settle funds. The CLI is idempotent and appends an audit record without rewriting any `commerce_orders` or old allocation ledger.
4. Recheck the exact SQL offer and compare it to the public `assets/data/jr-publishing-prelaunch.json`: 1m price and 700k/300k split. **Do not** run an unreviewed re-seed of the authors or a draft/incompatible migration.
5. Verify `jr-publishing-preflight-cli.php` in the private environment. Block public checkout if the two complete approved/scanned PDF originals are missing or their immutable hashes differ; if SMTP, verified author account, private storage, schema or payments cannot be confirmed; or if rights/licensing issues prevent legitimate distribution. A technical preflight never fabricates a bilateral signature.
6. Perform isolated MySQL fixture and synthetic callback/retry/refund tests in CI. Separately obtain explicit authorization for **one real controlled payment**, verify BitPay bank reconciliation, buyer email, both individual protected PDF downloads, author notice, ledger and refund behavior. A past ordinary BitPay test unrelated to this digital SKU is not proof of this product's delivery.
7. Only after every independent product acceptance gate is satisfied may an operator enable digital checkout using the existing private switch and activation workflow. Do not bypass `commerceReady()` or security controls merely to show a Buy button.

## Acceptance and known limits

**Source-stage definition:** corrected bilingual product/author copy; future 70/30 policy; legacy-order protection; immutable server snapshot, current-price guard and SMTP totals; offline policy tests; disposable MySQL fixtures; public pages remain accurate without claiming verified payments.

**External blocking dependencies:** private original PDF custody and hashes, actual site database state, author recipient/onboarding, legal digital distribution authority, mail worker delivery, refund/settlement reconciliation, and an authorized live 2-PDF purchase. Do not label the product `READY FOR REAL SALES` until these are witnessed, irrespective of green CI.

## Other unfinished project work

The Analytics adapter remains `enabled=false`; GTM `GTM-P6LWCLKM` has an unpublished GA4 tag configured by the owner but no approved firing trigger. Clarity `z0mzp0dp74` remains disabled. Owner observed no consent banner; investigate the current deployed disabled analytics configuration and test opt-in without double-counting or recording assessments. No GTM Submit or Bertina deployment is implied by this document. Search Console/GSC API is separate from GA4 data collection. The nondeploying PageSpeed post-release pipeline has a recorded SHA-proof configuration issue for follow-up. IndexNow must remain changed-only, release-verified and deduplicated.

Historical 2026-10-17 documents describing 60/40 are archived decision records, **not current operational pricing authority**.
