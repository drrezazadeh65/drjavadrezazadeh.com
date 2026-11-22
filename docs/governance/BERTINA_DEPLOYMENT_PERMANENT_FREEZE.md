# PERMANENT DEPLOYMENT FREEZE — Bertina production

**Decision:** 2026-10-18, owner-directed. **Reference success:** GitHub Actions `Deploy to Bertina #395`, branch `migration/bertina-linux6`, deployed target commit `e626e55cc386e35ca8935506c0a1faaa6de4f905` (as reported by the successful workflow).

## Non-negotiable release contract

The owner has approved and permanently frozen the exact successful one-click production release method. Site development may continue, but no future work may modify, refactor, replace, bypass, weaken, or silently change this deployment method.

1. Only the repository owner manually starts `Deploy to Bertina` by choosing the canonical branch and clicking **Run workflow**. Do not introduce push-triggered, scheduled, or unattended production deployment.
2. Source HEAD SHA and current live SHA are resolved and checked automatically. The owner never needs to supply SHA values manually.
3. Defaults remain `phased_live_audit`, `hosting_managed`, the existing owner-risk acknowledgement, and the existing phased release confirmation. `hosting_managed` does not assert an independently verified backup or successful restore; responsibility is acknowledged by the owner.
4. Retain the exact-source/live-SHA drift guards, identity check, CI tests, TLS transfer, package extraction checksums, database compatibility preflight, post-deploy verification, and sensitive-data safeguards.
5. Do not activate deferred PDF distribution, SQL migrations, payouts, or full masterplan certification by implication of a successful staged deployment.
6. Do not delete live data, change database contents, or remove existing working functionality to make a deployment pass.
7. Treat any change to the frozen release workflow or gate implementation as a failed release. Do not auto-regenerate fingerprint approvals.

## Technical enforcement

The existing pre-deployment test suite `tests/bertina-phased-release-gate.test.mjs` includes a permanent Git-blob fingerprint guard for the approved workflow and its four recovery/authorization gate sources. That test already runs within the frozen workflow **before** upload. It fails closed if any frozen source changes.

Approved immutable blob fingerprints:

| File | Git blob SHA-1 |
| --- | --- |
| `.github/workflows/deploy-bertina.yml` | `280c6ac95d534ef6db9b292ddbe7467053f0ba76` |
| `scripts/bertina-phased-release-gate.mjs` | `14a3641a43bf441ff56dcead5154dbc8bdd80237` |
| `scripts/bertina-hosting-managed-release.php` | `0839f9e244da6eead0bac4526919f4b1dd7e4f40` |
| `scripts/bertina-controlled-cpanel-gate.php` | `43f2a4eb28790baa4e657262e4ccb60aca99317e` |
| `scripts/bertina-private-recovery-gate.php` | `23f01c3720c243efa6f56cfa2d196cae6660dee0` |

This is an in-repository preventive control, not a claim that a repository administrator or hosting administrator is technically incapable of changing the policy. Do not edit these files or the guard during ordinary development.

## Allowed evolution

Develop the website, publishing, journal, shop, dashboards, SEO, tests, content, and design independently, provided that the deployment contract above remains unchanged and all required release checks pass.

**Owner's governing instruction:** The successful #395 deployment method is frozen permanently. No future website improvement is authorization to alter it.

## Compatibility exception proposal — 22 November 2026 (NOT APPROVED)

GitHub changed the runtime resolved by `ubuntu-latest` to Ubuntu 26.04, which fails the frozen Playwright 1.56.0 Chromium installer before any production upload. The existing independent browser CI successfully uses Ubuntu 24.04.

A narrowly scoped **proposed exception**, held in a separate unmerged PR pending the owner's **explicit approval of this specific frozen-workflow deviation**, would change only:
`    runs-on: ubuntu-latest` → `    runs-on: ubuntu-24.04`

The candidate workflow Git blob would become `8278e2e95af453fa3c5ce905db1b8e4d3964cfb5`; its complete bytes after reversing the one label must SHA-1 hash exactly to the historical, owner-approved blob `280c6ac95d534ef6db9b292ddbe7467053f0ba76`. All four protected authorization, recovery and server gates retain their existing exact Git blobs and tests. Manual-only execution, release scope, SHA authorization, owner identity, backups, MySQL, TLS, payment and newsroom protection stay unchanged.

**This section is a PROPOSAL, not an owner approval. Do not merge or deploy the maintenance PR without an explicit exceptional owner instruction acknowledging the original freeze.** A successful CI on the proposal does not override this requirement.
