# Admin engine activation — development ledger

State: IN DEVELOPMENT. No tests run; no deployment authorized.

## Source-of-truth architecture
The existing authenticated FA and EN administrative dashboards, the ENG-01 through ENG-13 engine architecture, the master operations controller, the 52 Action IDs and the 36 OP reports must be extended in place. The public /fa/app/engine-status/ is read-only and is not the admin controller.

## External reporting
The existing platform/free-resources-registry.json is a catalog of 30 candidate providers, not 30 active connections. The complete 50+ provider claim needs reconciliation with the actual admin card registry. Each source requires a provider ID, owning engine, consent/credential requirements, collection mechanism, observed timestamp, provenance, data freshness, last error and a truthful connectivity state.

## Activation acceptance contract
Every existing card must map to a real authenticated backend endpoint or an explicitly unavailable state with the precise prerequisite. Each action must have a supported executor, server-side authorization, CSRF protection for mutations, audit history, idempotency where appropriate and a safe failure mode. Never present a hyperlink, static sample, historical observation or local script as a live third-party integration.

## Work sequence
1. Inventory every admin card, 13 engines, master controller, 52 actions, 36 reports and all provider references.
2. Reuse existing PHP/MySQL and adapters; implement missing real operations without a duplicate dashboard or database.
3. Complete provider connection status, secure configuration and evidence-backed reporting.
4. Complete bilingual interface, errors, recovery, permissions and accessibility.
5. Only after all development: run the integrated tests and seek release approval. No test or deployment during implementation.

## Evidence as of this checkpoint
- api/operations.php includes existing reporting, commerce, social, journal, GSC, action-run and consultation modules.
- api/operations-reporting.php includes bounded evidence readers for Crossref and PageSpeed; historical observations are not live measurements.
- platform/admin-intelligence-modules.json marks several capabilities partial, unverified or not live.
- .github/workflows/deploy-bertina.yml requires owner-initiated workflow_dispatch; no deployment was requested.

This ledger is documentation only, not proof of activated cards or completed integrations.
