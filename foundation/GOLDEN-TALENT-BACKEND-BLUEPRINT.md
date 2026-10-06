# Golden Talent Deployable Backend Blueprint — v1.0

**Status:** implementation blueprint; production remains blocked until infrastructure is provisioned and verified.

## Trust topology

Public Web (static/SSR, no private data) → Private App (authenticated, noindex) → API v1 → PostgreSQL + private object storage + job queue.

Only the API/workers receive service credentials. Browsers never receive database, storage-signing, payment, email or administrative secrets.

## Runtime boundaries

- **API:** authentication context, validation, authorization, idempotency, transaction orchestration.
- **Worker:** route/reassessment/report jobs using persisted immutable inputs; no browser-originated authority.
- **Database:** relational source of truth, version history, constraints and RLS/least-privilege enforcement.
- **Private storage:** opaque object keys, malware status, signed short-lived access.
- **Payment adapters:** provider-neutral server modules; callbacks are reverified.
- **Audit/monitoring:** privacy-minimised events, operational alerts and correlation IDs.

## Environment separation

LOCAL, DEVELOPMENT, STAGING and PRODUCTION use separate databases, storage namespaces, payment credentials and signing secrets. Staging remains noindex. Production data must never be copied into lower environments unless an approved de-identification process creates a separate dataset.

## Configuration versus secrets

Safe configuration may include public origin, environment name, feature flags, instrument registry version and non-secret provider identifiers.

Secrets include database credentials, session/signing keys, OAuth client secrets, storage signing credentials, payment/webhook secrets, email credentials and encryption keys. Secrets are injected at runtime from the deployment secret store and never committed to Git, HTML, JavaScript bundles, logs or audit metadata.

## Database identities

Use separate least-privilege identities for migrations, API runtime, background worker, read-only operational reporting and approved research export. Application runtime must not use the migration owner/superuser identity.

## Request security context

After authentication the API establishes a server-controlled request context containing actor user ID, roles, subject scope/case assignment and correlation ID. Client headers cannot self-assert roles, subject relationships, consent, entitlement, reviewer status or database role.

## RLS defence in depth

RLS or an equivalent database enforcement layer is required for subject-scoped private tables. Policies must deny by default and rely on server-established identity/context plus persisted ACTIVE relationships/assignments. Service jobs that require elevated access use a distinct worker identity, explicit job purpose and audit trail.

## Deployment gates

Before real private records:
1. staging backend and database provisioned;
2. migrations applied from clean database and upgrade path tested;
3. auth/session revocation and admin MFA tested;
4. RLS/authorization negative tests pass;
5. private storage signed access and malware workflow tested;
6. secrets rotation procedure tested;
7. backup plus restore drill completed;
8. audit/monitoring alerts exercised;
9. privacy notice/consent versions legally reviewed;
10. payment provider verification/reconciliation tested before paid entitlement.

Static GitHub Pages remains the public-site host only; it is not the secure backend.
