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
| `.github/workflows/deploy-bertina.yml` | `8278e2e95af453fa3c5ce905db1b8e4d3964cfb5` (owner-authorized runner-only exception to prior `280c6ac95d534ef6db9b292ddbe7467053f0ba76`) |
| `scripts/bertina-phased-release-gate.mjs` | `14a3641a43bf441ff56dcead5154dbc8bdd80237` |
| `scripts/bertina-hosting-managed-release.php` | `0839f9e244da6eead0bac4526919f4b1dd7e4f40` |
| `scripts/bertina-controlled-cpanel-gate.php` | `43f2a4eb28790baa4e657262e4ccb60aca99317e` |
| `scripts/bertina-private-recovery-gate.php` | `23f01c3720c243efa6f56cfa2d196cae6660dee0` |

This is an in-repository preventive control, not a claim that a repository administrator or hosting administrator is technically incapable of changing the policy. Do not edit these files or the guard during ordinary development.

## Allowed evolution

Develop the website, publishing, journal, shop, dashboards, SEO, tests, content, and design independently, provided that the deployment contract above remains unchanged and all required release checks pass.

**Owner's governing instruction:** The successful #395 deployment method is frozen permanently. No future website improvement is authorization to alter it.

## Compatibility exception — 22 November 2026 (OWNER APPROVED AND MERGED)

The owner expressly authorized a constrained compatibility repair in this conversation, on the condition that the working website, its newsroom, and the one-click production safety flow remain intact. GitHub merged [PR #95](https://github.com/drrezazadeh65/drjavadrezazadeh.com/pull/95) as source commit `8685bc36aa0dd3ce574e281ddcff84fcfa24a3bd`.

**The ONLY executable production workflow modification is:**
```diff
-    runs-on: ubuntu-latest
+    runs-on: ubuntu-24.04
```

This one-line change is necessary because the Ubuntu 26.04 runner reached through `ubuntu-latest` did not support the repository's pinned Playwright 1.56.0 browser installation. Ubuntu 24.04 was already validated by independent browser and visual CI. The new workflow blob is `8278e2e95af453fa3c5ce905db1b8e4d3964cfb5`, whose complete contents become exactly the original owner-frozen `280c6ac95d534ef6db9b292ddbe7467053f0ba76` when that one label is reversed. A dedicated source contract test enforces this byte-level guarantee.

The four other protected authorization, recovery and host-control scripts retain all previous Git blob fingerprints. Owner-only manual dispatch, source/live SHA checks, explicit recovery acknowledgement, staging gates, public URL continuity, MySQL checks, TLS, receipts and newsroom freeze are not weakened or bypassed.

**This exception authorizes only the compatible runner and its corresponding exact SHA assertions. It does NOT authorize further changes to the deployment machinery, and it is not a production release.** The owner must still initiate `Deploy to Bertina` manually, and its runtime gates may fail closed. No real payment or disaster-recovery restoration is certified by a source-only PR.
