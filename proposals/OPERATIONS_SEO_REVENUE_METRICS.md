# Operations evidence ingestion and SEO metrics specification

**Status:** proposal, not deployed. No external API credentials, PII, session cookies, gateway keys or customer records may appear in client-side reports.

## SEO panel — measured vs estimated

| Metric | Numerator / denominator | Source | Closure |
|---|---|---|---|
| Public canonical correctness | exact matching indexable canonicals / indexable HTML routes tested | Bertina strict crawl + frozen URL manifest | 100%, zero cross-language canonicals |
| Hreflang reciprocity | reciprocal valid FA/EN pairs / bilingual pairs tested | strict crawl | 100% |
| Broken internal links | failing internal targets | production crawl | 0 (with exceptions explicitly reviewed) |
| Sitemap health | HTTP 200 valid sitemap URLs / declared sitemaps | strict public fetch | 100% |
| Robots/indexation governance | compliant routes / routes tested | source + production HTTP | 100% |
| Historical redirects | one-hop permanent redirects with correct destination / registered redirects | strict public fetch | 100%, no soft-404 redirects |
| Structured data | eligible validated templates / eligible templates | schema tests and rich-results validation | 100%, no critical errors |
| Core Web Vitals | good eligible URLs / URLs with field data | GSC CrUX field reports | report coverage and 75th percentile, not fabricated 100% |
| Google indexing | indexed submitted canonical URLs / eligible submitted canonical URLs | verified GSC property | separate metric, never infer from sitemap |
| Bing discovery | indexed URLs / submitted URLs when provider reports both | Bing Webmaster Tools | report verified values or unavailable |
| Historical backlink targets | classified referring target URLs / all exported target URLs | Ahrefs CSV + server 404 logs | 100% triaged, no blind redirects |
| Content evidence audit | claim-checked and sourced articles / all eligible articles | editorial ledger | 100% only after per-article review |

Each metric must include `observedAt`, `environment`, `source`, `sourceUrl`, `numerator`, `denominator`, `result`, `testVersion` and `confidence`. Null means unknown, not zero. Estimated progress and measured scores are separate series.

## Revenue activation funnel

1. Public service/book page reachable, with valid schema and no false offline.
2. Registration form, verification mail received, account verified, login and recovery E2E.
3. Cart/order captured in Bertina MySQL without client-controlled price.
4. Gateway configuration privately verified, IRT→IRR multiplier tested.
5. Signed/idempotent callback and order state transitions tested.
6. Receipt, refund, support, delivery/booking fulfillment verified.
7. Owner-authorized low-value real purchase reconciled end to end.

Until 4–7 are complete, show `Payment: BLOCKED` and do not infer sales from order capture. Donation flow has a separate approval gate.

## Evidence trust model

A CI report may certify only the test it ran. Production health probes certify availability, not an actual customer lifecycle. GSC and Bing results certify only their own search-engine state. `verified_complete` requires an allowlisted trusted server-side gate with immutable evidence, timestamp, test environment, and reviewer authorization. A browser-imported JSON file must never be able to assert verified completion.

## Implementation checklist

- [x] Static mobile-friendly 36-section prototype in isolated proposal branch
- [x] Report export, filters, evidence import/export
- [x] Same-origin read-only API contract and fail-closed example
- [x] SEO/revenue metric definitions
- [ ] Bind API to existing Bertina administrator RBAC and CSRF/session architecture
- [ ] Persist evidence in protected MySQL tables, add audit history and retention
- [ ] Add server-side GitHub Actions ingest with provenance verification
- [ ] Add strict TLS and production SEO crawl ingestion
- [ ] Add GSC/Bing authenticated server-side ingestion
- [ ] Add transaction funnel from redacted order state aggregates
- [ ] Run threat model, test and deploy after Codex release-lock reconciliation

## Handoff

Keep PR #35 draft until review under GitHub issue #28. Never merge an old `main` snapshot into `migration/bertina-linux6` blindly.
