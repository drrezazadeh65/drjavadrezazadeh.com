# Bookstore Operations — v1

The bookstore is implemented as a commerce-ready shell while prices, stock or formats, bibliographic details, shipping terms and payment credentials remain external data gates.

## Activation order

1. Verify each published book's ISBN if applicable, publisher, edition/year, cover rights, sellable format and fulfilment responsibility.
2. Create or activate the server product and price. Never place an invented or client-authoritative price in the storefront.
3. Confirm physical stock or digital-delivery asset, return/refund policy and shipping coverage.
4. Enable the book in `platform/book-catalog.json` only after the server catalogue contains the same commercial facts.
5. Run `node platform/book-commerce.test.mjs` and payment reconciliation tests.
6. Activate real checkout only after the selected payment provider is verified.
7. Add Product/Offer schema only when a genuine public offer exists and the route is approved for indexing.

The browser cart is convenience state only. It never proves price, stock, order creation, payment success, entitlement or shipment status.

## Current published titles in the catalogue

- «روشنایی»
- «تاریکی»
- «بن‌بست»

Their published status is public, but price, ISBN/publisher metadata, sellable format and inventory remain unset until verified. Works still in preparation are not treated as products for sale.
