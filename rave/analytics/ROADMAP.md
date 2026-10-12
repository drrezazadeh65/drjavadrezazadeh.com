# RAVE measurement implementation sequence

P0: Event contract, validation, duplicate prevention, aggregate privacy suppression, trusted purchase boundary. **Implemented as code foundation; not live instrumentation.**

P0: Audit existing checkout, article and service DOM to identify stable service IDs and safe event hooks; do not alter production checkout.

P0: Consent UI and storage policy, portable collection API, private storage and signed server-side payment verification; no raw analytics in public repo.

P0: Read-only Search Console and Bing data ingestion, with authenticated credentials and historical trend reports.

P1: Dashboard showing acquisition > content > service > checkout > verified revenue by locale and campaign, with uncertainty and sample size.

P1: Compare performance across 27 services and 45 articles; map verified catalog IDs, not guessed labels.

P2: Experiments, lifecycle segmentation, retention cohorts, AI referral detection, and revenue forecasting with explicit limitations.

Do not label measurement 'live' until real traffic and verified purchase reconciliation have been observed.
