# Commerce deployment handoff — 2026-10-15

## Scope
Canonical repository: `drrezazadeh65/drjavadrezazadeh.com`.
Deployment source: `migration/bertina-linux6`. Production deployment is owner-authorized and manual.

## Already established
- Owner has confirmed successful real BitPay transactions and working Bertina email receipts. Do not demand another real payment solely to establish the gateway.
- Commerce supports the 21 sellable service SKUs and 6 enabled VIP SKUs with manual post-payment scheduling.
- Donations use the separate `/api/donations/create` route.
- Paid book checkout permits manual post-payment shipping **only after** database stock reconciliation and atomic reservation. Do not fabricate inventory or bypass `stage9BookStockReady`.
- When books cannot be charged, the storefront can record an unpaid order through `/api/commerce/prepare`.
- The release-candidate workflow now runs `tests/paid-service-gateway-contract.test.mjs` and JavaScript syntax checks for the three payment frontends.

## Required deployment evidence
1. The latest `DrJavad v5.1.0 First Usable Nondeploying Candidate` workflow on the exact intended HEAD must complete successfully. A committed test is not evidence of a passing test.
2. Review its existing production-readiness and security gates. Do not weaken them to force a green release.
3. If paid books are required immediately, verify that `commerce_book_stock` has real, reconciled quantities and matching reservations for every sellable book SKU. The public catalogue's `IN_STOCK` label is **not** inventory evidence.
4. Confirm private Bertina runtime settings and database migration state through existing administrative mechanisms; never copy secrets into Git or public documents.
5. Use the existing `Deploy to Bertina` manual `workflow_dispatch` on `migration/bertina-linux6`, with the exact approved HEAD and current live SHA required by the workflow. Do not use an archive branch or a replacement deployment mechanism.

## Release decision
**Candidate prepared, production readiness not yet independently certified.** The BitPay provider itself is established as working. Pending evidence concerns the newly changed application checkout paths, private stock and release workflow result. Do not call the new release deployed until the deployment workflow succeeds and the live release identity matches the approved commit.
