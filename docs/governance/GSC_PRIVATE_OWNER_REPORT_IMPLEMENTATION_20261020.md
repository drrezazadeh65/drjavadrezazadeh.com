# Direct GSC — private owner reporting integration (implementation checkpoint)

Date: 2026-10-20. Branch: `migration/bertina-linux6`. Source-only; no Bertina production deployment or database mutation.

## Integrated, forward-only components

- `api/operations-gsc-direct.php`: pure, bounded, fail-closed projection. Exact URL-prefix property; strict schema, aggregate-only v1, 72-hour freshness bound; never treats absent rows as zero. Checks a configured absolute real path outside the deployed public document tree.
- `api/operations.php`: `GET /api/admin/operations/gsc-direct` uses existing account verification, DB-backed admin membership, fresh TOTP/MFA, no-store headers, read throttling and **SUPER_ADMIN** role. No public endpoint or POST handler.
- `assets/js/operations-gsc-direct.js` and Persian/English admin shells: a read-only, localizable panel inside the existing hidden `#ops-workspace`. Resets on administrative lock and aborts stale requests.
- Existing Operations Workspace Index includes the panel. No independent dashboard, DB, credentials, or Google OAuth client.
- `scripts/build-public-site.mjs`: requires the backend module/UI in the same release package and rejects shipping the reserved private snapshot file.
- Offline unit/contract tests cover malformed provider data, unknown vs. true zero, access-control positioning, hostile paths, expiry and source/shape checks.

## Current production state

With no private snapshot path configured, the endpoint returns `status=unavailable`, `metrics={clicks:null,impressions:null,ctr:null,position:null}`, `apiLiveNow=false` and `provenanceAttested=false`. **Do not call this dashboard live, synced or source-verified.** The independent GitHub GSC connection tests previously established OIDC/WIF, Search Analytics, Sitemap API and URL Inspection API connectivity. These are separate facts; they do not populate the operational database.

## Private configuration, not yet activated

Only after an approved, authenticated data transfer has been designed and verified, a Bertina owner may provision a snapshot outside `public_html` and set this optional entry in the already existing private `api/config.local.php`:

```php
'gsc_private_snapshot_path' => '/absolute/private/path/gsc-direct-snapshot.json',
```

Do not create that file under `api/internal/` or within any deployed public artifact. Never commit its bytes, tokens, Google API response dumps, or a service-account JSON key. Do not use a `github.com` raw-file URL as a snapshot path. This configuration is **not required now** and must not be enabled until the transport trust boundary is certified.

The v1 snapshot is an object with exactly `schema`, `source`, `property`, `collectedAtUtc`, `startDate`, `endDate`, `rows`. Its source must be `google-search-console-api-direct` and property `https://drjavadrezazadeh.com/`. There may be zero rows (unknown metrics) or one metrics-only aggregate. Multiple rows have no dimensions and cannot be totaled. `ctr` is 0–1; UI renders it as a percentage. Google Search Analytics data has reporting lag, and a valid record is **not cryptographic evidence of source authenticity**.

## Deliberately postponed authentication step

Authenticated transport from GitHub Actions' ephemeral OIDC context to private Bertina storage remains unimplemented. A JSON `source` string is not a signature; the API intentionally reports `locally_validated_unattested` when a private file is present. Before claiming verified live reporting, design signed, replay-protected source delivery to private storage with audit logs, test it on isolated infrastructure and receive owner approval. Do not broaden the existing `webmasters.readonly` scope or change the frozen deploy system. Do not reuse historical GSC Wizard snapshots for new observations.

## Acceptance before release

- Green latest GSC workflow, Operations Control Center QA, full MySQL and mobile browser CI, and site build.
- Unauthorized customer HTTP 401; admin without fresh MFA HTTP 403; valid ADMIN (not SUPER_ADMIN) HTTP 403; owner with fresh MFA HTTP 200 and explicit `unavailable` until certified source exists.
- Private route noindex/no-store; no public access to private bytes; no new JS direct-to-Google requests; release package contains module but no private observations.
- Manual one-click Bertina deployment only after explicit owner approval, with rollback/recovery policy intact.
