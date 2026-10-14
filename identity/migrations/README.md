# Document registry migration — HOLD / not production-approved

The proposed `identity_document_registry` table belongs inside the **existing Bertina MariaDB database**, never a parallel database. This migration has **not** been executed or approved for live use.

## Mandatory preconditions
1. Inspect actual canonical schema and check for existing document, receipt and audit tables to avoid duplication.
2. Verify production MariaDB version and table/column conventions, storage encryption and backup recovery.
3. Confirm the canonical account reference and add a foreign key only after checking real column types and migration impact.
4. Reconcile key generation: the application must store exactly the `issuanceIdempotencyKey` output, and enforce unique insertion inside a transaction.
5. Test two concurrent issuance requests for the same source; only one may transition to `issued`.
6. Never store PDFs, personal assessment contents, secrets or provider payloads in public webroot or audit logs.
7. Restrict `private_storage_reference` to server-controlled private paths and require authorization on every retrieval.
8. Record immutable financial evidence in the existing payment subsystem; the registry is **not** proof of settlement.
9. Confirm document revocation/supersession policy, retention, consent and guardian controls.
10. Take and independently restore a staging backup, then obtain explicit migration approval.

## Atomic workflow contract
Begin transaction; authenticate and authorize; read authoritative source with appropriate locking; validate settlement or approved assessment; insert the registry record with unique idempotency key; on duplicate, return existing authorized document reference (never issue twice); write an auditable issuance event; commit. Render/store only through an approved recovery-aware outbox/worker protocol. If rendering fails, transition to `failed` with a retriable event and never falsely mark as `issued`.

The SQL file is a **review artifact**, not a runnable automatic deployment step.
