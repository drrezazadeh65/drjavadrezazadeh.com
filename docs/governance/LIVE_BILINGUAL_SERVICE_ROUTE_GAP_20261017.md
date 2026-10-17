# Bertina live bilingual service route gap — verified observation, not final release acceptance

**Observed:** 2026-10-17 11:57–12:03 UTC (anonymous CA-trusted GET requests, no login or paid test).  
**Origin:** https://drjavadrezazadeh.com  
**Live service worker fingerprint during inspection:** `f0bc6178a437d24e23b65eec1b791a36e578d8fb`  
**Source branch:** `migration/bertina-linux6` (do not assume its latest HEAD matches the older live fingerprint).

## Reproducible evidence

- First 42-page observation: [GitHub Action #39030643569](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39030643569), artifact `bertina-postrelease-operational-evidence`: 0/42 source-contract-compliant public routes; 21 EN requests did not return 200 and 21 FA pages lacked expected fa/en/x-default hreflang.
- HTTP status differentiated follow-up: [GitHub Action #39030826424](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39030826424), same sanitized artifact, **21/21 English routes return HTTP 404**; **21/21 Persian routes return HTTP 200 but lack fa/en/x-default hreflang**. This is a live snapshot, not a permanent claim.
- Latest source-contract tests: [GitHub Action #39030687100](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39030687100) completed successfully against the development SHA `b6ec7345122fc9b04b71f0ef432975332c2df759`. The 21 source page pairs and checkout links are present in the canonical repository.
- Monitoring implementation: `scripts/bertina-postrelease-check.mjs` with pure source contract in `scripts/lib/public-service-route-contract.mjs` and `tests/bertina-live-service-route-contract.test.mjs`. It now distinguishes explicit HTTP 404 from network/TLS failures.

## Classification

**P0 for bilingual release completeness / user navigation / SEO.** A real search visitor can encounter broken English service URLs. The 21 Persian routes remain reachable, but their live hreflang relationships do not match the approved bilingual design. Do not tell the owner that all paid service pages or the international rollout are complete.

**Likely explanation (not proven):** live Bertina release fingerprint is older than the development branch, and the missing source-level pages/metadata are not deployed. Do not overwrite the already-working production Donation, active customer accounts, payment credentials or old orders with a speculative partial upload.

## Safe remediation & exit criteria

1. Compare the server's **actual deployed file inventory, source release stamp, 21 missing EN paths, and 21 existing FA files** against the reviewed immutable development commit. Keep live backups and rollback evidence before any upload.
2. Preserve approved existing URLs, price/catalog, PWA/cache, and the working owner-confirmed Donation flow; don't add redirect-to-Persian placeholders to conceal English 404s.
3. Apply approved changes via the existing single Bertina deployment workflow. The masterplan release gate is currently `BLOCKED_PENDING_FULL_ACCEPTANCE`; it must not be bypassed, marked VERIFIED without independent evidence, or replaced with a competing workflow. The later owner post-launch directive authorises exploring an evidence-based guarded phased release, not disabling security controls.
4. Re-run anonymous trusted-HTTPS 42-route observation. **Success for THIS criterion**: 42/42 return HTTP 200, each has its correct self-canonical, reciprocal fa/en/x-default hreflang and real checkout link, and no private route becomes indexable. Store the resulting Action artifact and exact deployed SHA.
5. Separately prove checkout, verified payment, receipt and service fulfilment for all 21 services in properly authorised staging/production. **42/42 public HTTP checks do not establish 21/21 independently verified paid-service acceptance.**
6. Record issue resolution only after authentic live evidence; the official `MASTERPLAN_100_RELEASE_ACCEPTANCE.json` verified counts remain unchanged meanwhile.

This record deliberately does **not** authorise deployment, record a production fix, or claim a real payment/refund test.
