# JREI-KA acquisition — release candidate (24 October 2026)

**Status:** prepared code for review, **not deployed** and **not activated** on Bertina. This note grants no rights to download or publish third-party exam papers.

## Existing infrastructure

- The single Bertina master Cron calls `api/internal/operations-master-dispatcher.php`.
- Allowlisted jobs `jrei_ka_schedule` and `jrei_ka_private_acquisition` already exist with source-enforced minimum **3600-second** cadences; the host master Cron may tick every five minutes without making JREI collection happen every five minutes.
- The original mother DB contains source policies, jobs, observations and *unapproved* link candidates.
- Private storage and public-HTTPS, robots, rights, request spacing and byte limits are independently enforced by the workers. Collected content is **not** automatically published.
- Previous Bertina evidence confirmed four HTML page downloads and **zero verified exam PDF downloads**. These one-shot downloads did not establish automatic acquisition.

## Proposed improvement

Expand extraction of PDF candidate links from already acquired and independently approved HTML seed pages to safely cover document-relative (`paper.pdf`), dot-relative (`./answer.PDF?view=1`), root-relative, and same-host absolute HTTPS links. Keep the same-host restriction, an upper bound of **40** candidate links per page and a **4,000-anchor** ceiling. Reject unapproved schemes, scheme-relative or foreign-host links, URL fragments, traversal, encoded traversal indicators, invalid URLs and non-PDF paths. De-duplicate candidate URLs. Candidate links remain `DISCOVERED_REQUIRES_RIGHTS_REVIEW`, **not automatically fetched**.

## Release gates — required before activation

1. Inspect PR diff and complete PHP lint and `php tests/jrei-ka-safe-discovery-regression.php` with PHP CLI DOM/XML enabled, then run the repository's existing mandatory release QA. The current local test runtime lacked DOM, so full discovery execution remains **unverified**.
2. On Bertina confirm deployed SHA, PHP 8.3 CLI with cURL/DOM and subprocess functions, required mother-DB migrations, Cron status and the private, writable, non-web archive path.
3. In private configuration, independently review and enable `operations_cron_master_enabled`, `jrei_ka_schedule_enabled`, `jrei_ka_autofetch_enabled` and the intended time window (`jrei_ka_night_mode_enabled` for 02:00–05:00 Asia/Tehran, or separately reviewed `jrei_ka_continuous_enabled`). **Never commit private config or secrets.**
4. Through the MFA-protected owner controls, activate `jrei_ka_controls.scheduling_enabled` and `acquisition_enabled`; explicitly register and enable only the two corresponding `operations_cron_jobs` with approved cadences. Previously blocked or unknown attempts require reconciliation.
5. Approve at least one real, original exam source **only after confirming origin, license, terms, robots and allowed private reuse**. A row labelled `DISCOVERED` / `PERMISSION_UNVERIFIED` must remain excluded.
6. Verify one limited source-to-archive cycle: worker outcome, durable job record, private observation, candidate count, MIME and checksums, duplicate avoidance and host time window. Recurring acquisition must be established from repeated server timestamps rather than inferred from Cron installation.
7. Keep download, analysis, publication and commercialization decisions separate. Preserve all emergency switches and existing database and URL invariants. Do not broaden into non-public exam portals or protected pages.

## No silent production release

This staging branch and draft PR are for review. GitHub source changes **cannot** flip private Bertina settings or change the live mother DB. Do not merge until host checks pass and the owner explicitly requests release.