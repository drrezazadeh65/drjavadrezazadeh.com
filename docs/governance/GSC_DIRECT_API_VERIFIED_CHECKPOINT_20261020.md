# Direct Google Search Console — verified integration checkpoint

Date: 2026-10-20. Source: owner-observed GitHub Actions workflow #5, commit `19ee5df86e4a829bc40e624bf51808206eaa84f6`, on `migration/bertina-linux6`. Evidence: GitHub Actions summary screenshot supplied by the owner in the project conversation. This is a repository documentation checkpoint, **not** an independent retrieval of full workflow logs.

## Observed and verified
- Existing keyless GitHub OIDC/WIF authentication accepted by Google.
- Exact URL-prefix property `https://drjavadrezazadeh.com/` accessible as `siteFullUser`.
- Historical Search Analytics aggregate HTTP 200, interval 2026-10-02 to 2026-10-16. The summary does not expose the aggregate values.
- Sitemap list HTTP 200, **seven entries returned**; this count is not proof that all entries are healthy or indexed.
- URL Inspection API HTTP 200 with a structured index-status response. **This does not establish that the inspected URL is indexed**, and no page-level indexing outcome was recorded in the summary.
- Workflow #5 passed in 29 seconds. Prior workflow #3 and #4 failed and were superseded by endpoint fixes.
- Official URL Inspection host: `https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`.
- No GSC Wizard is required; no production deployment occurred as part of these checks.

## Evidence boundaries
The pre-existing `api/internal/operations-gsc-observation.json` is a dated historical sample from 2026-10-10, originally attributed to GSC Wizard. Preserve its provenance; never label it as fresh or from the direct API. The existing `api/operations.php` reads this file and applies an expiry guard. Do not silently overwrite it with the new connectivity result.

## Next engineering gate
Before wiring new results into the Operations Control Center, implement a separate versioned, server-side ingestion contract for direct GSC observations. Require provenance, UTC timestamp, exact property, metric/date scope, bounded payload, freshness rules, admin-only authorization and fail-closed behavior. Reuse the existing mother database and existing Operations Control Center; do not create parallel databases or a public GSC endpoint. Add offline contract tests and a live read-only workflow test before any owner-approved deployment.

## Permissions
Retain read-only `https://www.googleapis.com/auth/webmasters.readonly`, no service-account JSON keys. Provider trust and repository IAM were reviewed via owner screenshots; successful authorized-path execution does not prove all unauthorized principals are rejected. No sitemap writes or Search Console permission escalation are authorized.
