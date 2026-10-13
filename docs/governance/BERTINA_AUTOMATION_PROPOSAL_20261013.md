# Bertina automatic release — owner review and activation

This proposal preserves the existing release gates and avoids a blanket bypass of protected-file checks.

## Proposed policy
1. **Public-content changes:** automatic push deployment, after the full existing test suite, live SHA check, backup/recovery policy check, and stale-commit guard.
2. **Protected workflow, API, payment, authentication, database, and deployment changes:** use a dedicated review/approval stage with an owner-controlled GitHub Environment, required reviewers, and least-privilege deployment credentials. Once approved, the same tested commit is promoted without re-entering SHA values.
3. **Never deploy on failing checks.** Verify artifact checksums, exact commit identity, and live health. Retain a known-good release and a recoverable backup. Do not alter stock, orders, or production data to make checks pass.
4. **Avoid duplicate releases:** retain concurrency locking; verify the branch head before upload and verify the deployed SHA afterwards.
5. **Auditability:** record the approving identity, source SHA, release SHA, test results, backup evidence, and post-deployment acceptance results.

## One-time owner activation
- In GitHub Settings → Environments, create a production environment with required reviewers and restrict deployment branches.
- Scope Bertina deployment secrets to that environment, not untrusted pull requests.
- Review the workflow change via a PR; confirm the environment protection rules cannot be bypassed by the workflow.
- Merge after CI passes. Test a public-content push and a protected-change approval separately.
- Verify live /sw.js SHA, authentication readiness, commerce read-only health, and public pages.
- Perform an isolated restore test before treating backup recoverability as certified.

## Acceptance
No recurring manual SHA entry for routine changes; protected changes receive explicit accountable authorization; no security gate is silently disabled; successful deployment and rollback are evidenced, not assumed.

Current state: design proposal only. No production deployment or workflow modification is claimed.
