# Google Search Console provider policy — 2026-10-20

## Owner decision
GSC Wizard is retired as an operational integration. Do not call, renew, purchase, or depend on GSC Wizard for Search Console, URL Inspection, indexing, analytics, sitemap or Bing verification.

## Canonical integration
Use the existing keyless Google Search Console API integration in `.github/workflows/google-search-console-sync.yml` and `scripts/gsc_oidc_verify.py`, through GitHub OIDC and Google Workload Identity Federation. Preserve its read-only scope, exact property check, access-token secrecy, and Google-side IAM review requirement. Do not introduce service-account JSON keys or another workflow.

## Historical provenance
Previously recorded GSC Wizard observations in `docs/governance/` and `api/internal/operations-gsc-observation.json` remain historical evidence only. Their source labels and observation dates must not be rewritten, since that would falsify provenance. They do not imply an active vendor integration or current indexing status.

## Future evidence
New observations must identify the actual independent source, observation time, property, query/date scope, and whether results are absent versus zero. Do not claim URL Inspection or sitemap checks based solely on the historical snapshot or Search Analytics aggregate API call.

## External account removal
Deleting a GitHub reference does not revoke a third-party OAuth grant, uninstall a ChatGPT plugin, cancel a vendor subscription, or erase vendor-held data. Those actions require the respective account controls and verification.

## Deployment
This change is repository-only. Production deployment remains owner-controlled; no release is authorized by this policy file.
