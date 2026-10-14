# JR Revenue & Growth Engine — Source Implementation v1 (2026-10-14)

## Objective and scope
This release **extends the existing Stage 14** rather than establishing a parallel financial or customer system. The added **Revenue & Capacity Scenario Studio** appears within the existing authenticated / MFA-oriented operations workspace at `/fa/app/admin/` and `/en/account/admin/`. It never changes checkout, booking, catalog prices, customer data, inventory, bank integrations or settlement accounting.

## Implemented source components
- `assets/js/revenue-planner-model.mjs`: deterministic, currency-separated, safe-integer simulation of hypothetical monthly gross revenue, refund reserve, direct fulfilment cost, monthly fixed cost, contribution, target shortfall and service delivery capacity.
- `assets/js/operations-revenue-planner.mjs`: bilingual responsive admin-only interface. Domestic mode reads the **existing published** 21 service + 6 VIP + 3 book catalog entries (IRT/toman), preserving their source prices. International mode uses **owner-entered** hypothetical USD pricing and explicitly does not offer or transact these products.
- `assets/css/operations-revenue-planner.css`: narrow-screen, keyboard-focusable, readable inputs without disturbing site-wide tokens.
- Both existing admin HTML entrypoints: one integrated planning panel, no additional public route.
- Automated unit and integration/source-policy checks in `tests/revenue-planner-model.test.mjs` and `scripts/revenue-planner-contract-audit.mjs`.

## Revenue evidence hierarchy
1. Page events: discovery/interest, **not** leads or revenue.
2. Verified-account, explicit-consent lead: request received, **not** booked/paid.
3. Qualified lead: human triage, **not** confirmed demand.
4. Accepted booking: a reserved slot, **not** money.
5. Gateway-confirmed paid order: payment evidence, **not** independent bank settlement.
6. Reconciled financial statement: eligible *real* gross settled turnover, with independently matched refunds.
7. Fulfilment record: delivered service/book; must not be inferred from a paid state.

The existing server-only growth endpoint remains authoritative for operational counts. Planning numbers are **not** injected into that endpoint and must never be summed with production measurements.

## Hypothesis, not a forecast of achieved $10,000
The initial USD goal input is 10,000 per month, reflecting a **target requested for planning**. No international price, customer count, conversion rate, bank exchange rate or actual paid activity is assumed. Local-mode target starts unset. The operator must enter volumes, direct expenses, fixed costs, refund reserve and delivery time. The UI highlights missing operating assumptions and capacity gaps. It must never imply that priced instruments are psychometrically validated.

## Acceptance gates
### Source
- `node --check assets/js/revenue-planner-model.mjs`
- `node --check assets/js/operations-revenue-planner.mjs`
- `node --test tests/revenue-planner-model.test.mjs`
- `node scripts/revenue-planner-contract-audit.mjs`
- `node scripts/stage14-organic-growth-audit.mjs`
- Existing SEO, 320/390/430px accessibility, link-integrity, cache/privacy and full commercial CI gates remain mandatory.

### Production
- Compare fresh canonical HEAD, CI checks and the release fingerprint before controlled deployment.
- Independently verify strict public HTTPS and JavaScript module MIME types.
- Verify genuine administrator login and recent MFA; anonymous users must not see private operations data.
- Test Persian and English UI on touch/mobile/keyboard/screen reader; test valid/invalid domestic catalogs, missing costs, over-capacity warnings, USD/IRT separation, and no state transmission.
- Do **not** activate payment or claim business revenue without gateway + statement + refund/fulfilment reconciliation. Retain existing fail-closed payment controls.

## Commercial execution priorities
**P0:** Verify trusted origin and real admin access; qualify the current 30 SKUs and distinguish genuinely deliverable products from aspirational packages. Review 3 offers for academic consultation, early talent guidance and institutional advice against capacity and verifiable outcomes. Publish transparent scope/limitations and preserve existing URLs.

**P1:** Establish a privacy-safe traffic baseline and lead-to-booking journey: measured, consented article/service discovery → verified account and separate opt-in → request qualification → scheduled delivery → optional approved checkout → independent settlement → fulfilment. Work from existing Stage 14, Stage 9 and customer dashboard; no duplicate CRM.

**P2:** Test price/volume and fulfilment-cost hypotheses on real evidence. Expand international professional-development and institutional offerings only with contractual clarity, reachable payments, support capacity, and any scientific validation required for instruments. Compare acquisition sources, cancellation/refund rates, contribution and repeat customers after adequate data exists.

## Not completed by this source contribution
No public production deployment, real payment acceptance, live bank reconciliation, visitor-to-lead conversion certification, demand estimate, $10k revenue achievement, independent SSL proof or end-user browser acceptance is claimed by these commits.
