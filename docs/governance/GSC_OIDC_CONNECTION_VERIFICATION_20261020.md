# Google Search Console — GitHub OIDC/WIF Connection Verification

**Date:** 2026-10-20 UTC · **Repository:** `drrezazadeh65/drjavadrezazadeh.com` · **Branch:** `migration/bertina-linux6`

**Overall status:** **PARTIALLY VERIFIED**: the actual keyless Google STS/service-account token path and real Search Console reads are **VERIFIED**; Google Cloud provider attribute mappings/CEL restrictions and all service-account IAM trust bindings are **not independently inspected**. No production deployment occurred as part of this integration.

## A. Reused infrastructure, no duplicate workflow

- Default branch independently returned by GitHub REST: `migration/bertina-linux6`. GitHub therefore exposes manually triggered `workflow_dispatch` for the existing file at `.github/workflows/google-search-console-sync.yml`. A real push run has also executed.
- Existing Google Cloud project `jr-search-intelligence` (number `301218972490`), WIF pool `jr-github-actions`, OIDC provider `github-actions`, and service account `jr-search-console-reader@jr-search-intelligence.iam.gserviceaccount.com` are the configured action targets. A Google Cloud IAM service-account console screenshot provided by the owner shows **Enabled** and **No keys** (console UI observation; not an independent API IAM audit).
- Current workflow grants default `contents: read`, job-specific `id-token: write`, `google-github-actions/auth@v2`, `access_token_scopes: https://www.googleapis.com/auth/webmasters.readonly`, a 600-second access token, `create_credentials_file: false`, `export_environment_variables: false`, and checkout `persist-credentials: false`.
- Job checks `github.repository` and `github.ref`, limited to the exact branch. The push trigger filters only the GSC workflow/script/test files. Separate `gsc-oidc-verify-${{ github.ref }}` concurrency has `cancel-in-progress: false`; **the frozen Bertina deploy workflow was not modified**.
- Existing historical indexing snapshot `api/internal/operations-gsc-observation.json` and `docs/governance/GSC_EVIDENCE_20261012.md` are separate, dated URL Inspection / GSC Wizard observations and were not overwritten with today's Search Analytics test.

## B. Real authentication and API results

Source commit: `826442b6c06a199d99174b4d2d0f250fce3f2edf`.

**[Real Google Search Console Connection Test run #1](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39396140105)** succeeded at 2026-10-20 08:49 UTC; all steps passed. Job logs returned exactly:

```text
GSC_VERIFICATION=VERIFIED provider=google-search-console method=oidc-wif
GSC_PROPERTY=https://drjavadrezazadeh.com/ permission=siteFullUser httpStatus=200
GSC_ANALYTICS=observed_aggregate httpStatus=200 interval=2026-10-02..2026-10-16 aggregateRows=1
```

This is an **actual API execution**, not the offline test fixtures. It demonstrates:
1. The GitHub OIDC → Google WIF → service-account impersonation route was usable from this trusted run, because Google accepted its access token.
2. `GET https://www.googleapis.com/webmasters/v3/sites` succeeded (HTTP 200) and returned the **exact URL-prefix** property `https://drjavadrezazadeh.com/` with `siteFullUser` permission. It did **not** silently substitute the `sc-domain:` property.
3. A historical, read-only `POST /webmasters/v3/sites/{encodedSiteUrl}/searchAnalytics/query` succeeded (HTTP 200) with `type=web`, `dataState=final`, no dimensions, `rowLimit=1`, and the 2026-10-02 through 2026-10-16 date range. Exactly one aggregate row was returned. Real click, impression, CTR and average position values were intentionally **not written into logs** and are therefore **not externally reportable from these job logs**.
4. The contract suite passed. Synthetic no-row responses are handled as `no_rows` with `aggregate=null`, not as authentication failure, nor as a claimed zero click count.

**Secret safety:** The observed GitHub log masks `GSC_ACCESS_TOKEN` as `***`; no raw access token, query/page-level analytics, key file or downloaded JSON credential was intentionally logged or uploaded. This does not certify absence of all secrets in external IAM configuration, which was not retrieved. Authentication status and API reads are the only certified Google Cloud operations here.

## C. Cancellation of progressive release CI run #2132

- [Run #2132](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39393175178), source `cb99cbbc12b0161ebfaef9a896ede42bdb3b3c17`, started 08:24:29 UTC and concluded `cancelled` at 08:27:01 UTC. `policy-contract` completed successfully.
- Its `full-preflight` job had already passed backend contracts/MySQL fixture; the Playwright step reached approximately **188/215** before GitHub emitted `The operation was canceled.` around **08:26:54 UTC**. Subsequent steps were **skipped**, not failed.
- The unchanged [`.github/workflows/progressive-release-tests.yml`](../../.github/workflows/progressive-release-tests.yml) explicitly sets `concurrency.group: progressive-release-tests-${{ github.ref }}` and `cancel-in-progress: true`. A newer push/run **#2133**, commit `d897094e...`, began at 08:26:41 UTC during #2132's browser run. The timing and concurrency settings are **strong evidence of expected supersession**. GitHub's retrieved run metadata did not include a field categorically identifying which cancellation actor triggered it, so cancellation by newer run is *highly likely*, not independently proven beyond doubt. No assertion failure or test regression was observed in #2132's log.
- Most importantly, [run #2136](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39396140041) completed **successfully** on `826442b6...`, including `policy-contract`, `full-preflight`, all browser regressions, sanitized release build, live fingerprint observation and public TLS checks. This is **non-deploying CI**. Do not disable concurrency or dilute browser tests to make an old cancelled run green.

## D. Exact previously implemented files and commits

The first original workflow was introduced in `cb99cbbc12b0161ebfaef9a896ede42bdb3b3c17`.

1. `43338fdeac65036dec30774398fa7a467c4de629` — added `scripts/gsc_oidc_verify.py`, bounded property-list and historical aggregate verifier.
2. `38838a9b9e9fb3eb76e59322b6ffd31db15cc88e` — added `tests/test_gsc_oidc_connection.py`, synthetic security, property-type, empty-data and Google HTTP failure contracts.
3. `826442b6c06a199d99174b4d2d0f250fce3f2edf` — updated existing `.github/workflows/google-search-console-sync.yml` to use branch-guarded, keyless OIDC with actual API/analytics verification and no independent deploy.

All three above were already committed before this independent evidence review; do not invent a second Search Console workflow. This document records the retrospective verification and outstanding GCP IAM review.

## E. Outstanding Google Cloud IAM security review (owner-authorised, read-only)

**Blocked in this session:** no live Google Cloud Workload Identity Provider/IAM policy reader is attached. The screenshot lists a service account but does **not** display a WIF attribute mapping, CEL condition or the service-account `roles/iam.workloadIdentityUser` bindings. A successful OIDC request for the authorised branch does **not** prove that requests from other identities are denied.

A Google Cloud project owner can inspect the policies without sharing secrets, preferably via Cloud Shell:

```bash
gcloud iam workload-identity-pools providers describe github-actions \
  --project=jr-search-intelligence \
  --location=global \
  --workload-identity-pool=jr-github-actions \
  --format='yaml(name,state,oidc.issuerUri,attributeMapping,attributeCondition)'

gcloud iam service-accounts get-iam-policy \
  jr-search-console-reader@jr-search-intelligence.iam.gserviceaccount.com \
  --project=jr-search-intelligence \
  --format='yaml(bindings)'
```

Owner review must check:
- Issuer is `https://token.actions.githubusercontent.com`; `google.subject` and any mapped `attribute.repository`, `attribute.repository_id`, `attribute.repository_owner_id`, `attribute.ref` resolve to actual token claims.
- **Google-side**, not only GitHub YAML, rejects repository/ref outside `drrezazadeh65/drjavadrezazadeh.com` and `refs/heads/migration/bertina-linux6`; immutable numeric repository/owner IDs provide stronger takeover resistance when available.
- Service-account impersonation `roles/iam.workloadIdentityUser` members reference only the intended WIF pool/verified identity. No project-wide `principalSet` or unrelated repository/branch can mint this account's tokens.
- No active user-managed service-account JSON keys; only Search Console access required for API reads. The `webmasters.readonly` OAuth scope is not a substitute for checking IAM trust policy.
- Prefer using the Google Cloud IAM console to review, not posting IAM tokens/keys or complete credential dumps in public GitHub issues.

Only mark **WIF TRUST BOUNDARY VERIFIED** after provider mapping/condition and IAM member policies are independently evidenced. Any tightening must be owner-approved and regression tested; this file performs **no automatic Google IAM mutations**.

## F. Next minimal Search Intelligence path (no duplicate system)

Keep Search Console's **measured Google Search** analytics distinct from Ubersuggest's AI mention sampling, crawler policies and 2026-10-10 URL Inspection snapshots. Existing owner-only `/api/admin/operations` data/reporting and bilingual MFA dashboard are the destinations for future bounded observations; do not create another admin UI or database.

When owner approves persistence: collect small, separated, consent/privacy-reviewed `web` Search Analytics aggregates with date/region/device dimensions, distinguish unreturned/anonymised query rows, bound the `rowLimit` and retain collection provenance. Store provider timestamp, date span, property, dimensions, API query type, observed row count and `null` on missing data; require a comparable previous window for trend claims. Respect GSC latency and aggregation/truncation limits, and never infer ChatGPT/Gemini traffic from this Google Search API. Do not publish raw queries, site traffic or service-account scopes to public pages.

**No persistence, DB migration, public endpoint, token export, new scheduler or deploy is introduced by this verification.**

## G. Final acceptance

- **VERIFIED**: Valid GitHub workflow on active/default branch; job-level permissions; successful Google OIDC/ST​​S token path for this run; real HTTP 200 property listing and siteFullUser exact URL-prefix; real HTTP 200 historical Search Analytics; offline contracts and subsequent complete nondeploying release CI.
- **PROBABLE / EVIDENCE-BOUND**: run #2132 cancelled through `cancel-in-progress` supersession as new run #2133 started; no code test failure indicated.
- **NOT YET VERIFIED**: Google Cloud trust attribute mapping/CEL restriction, exact principalSet IAM bindings, adverse foreign-repo/ref rejection, long-running analytics ingestion, per-page/query data, any new production deploy or improvement to Google indexing.

**Overall: PARTIALLY VERIFIED** until Google-side WIF trust-policy review is completed. This is not a blocker for the already confirmed Google Search Console *read-only* API connectivity and does not authorize production deployment.
