# Dedicated Master Migration — v1

**Target window:** the next 2–3 weeks, subject to the server/provider becoming available.
**Goal:** move from the current static/public staging foundation to a dedicated production master without rebuilding the product architecture.

## Migration principle

The master is an execution environment, not a new architecture. Domain logic, route contracts, SEO ownership, privacy rules, evidence provenance, payment state, user roles and Golden Talent lifecycle remain unchanged when hosting changes.

The deployment target is split into four logical surfaces: Public Web, Private App, Versioned API and a Private Data Plane.

## Master baseline

The dedicated environment must support TLS renewal, reverse proxying, isolated application runtime, private database ingress, private object storage, background worker/queue, transactional email, runtime-only secrets, health checks, structured monitoring, backups and a tested restore path.

No production secret belongs in Git, a browser bundle, analytics, static HTML or a public CI log.

## Portability requirements

Provider-specific code is an adapter, never the domain core. This applies to payment gateways, email, storage, analytics and future external reference taxonomies. Replacing a provider must not require rewriting consultation states, order states, Golden Talent evidence logic, consent rules or public URLs.

## Migration sequence

Stage A — provision staging, runtime identities, secret store, PostgreSQL, private storage, backups and non-production email.

Stage B — deploy private app/API, apply versioned migrations, activate least privilege/RLS, health probes and permanent-domain routing.

Stage C — prove authentication/recovery, role/relationship checks, consent withdrawal, consultation intake/booking, payment sandbox, signed private files, Golden Talent review/release, backup/restore and idempotent failure recovery.

Stage D — freeze one release commit, promote the same tested artifact, run smoke tests and activate only modules whose own release gates pass.

## Intentionally disabled until their gates pass

Payment stays disabled until exact approved gateway credentials and callback verification are tested. High-consequence Golden Talent outputs remain human-reviewed. Any future psychometric score or norm requires empirical validation. Unreleased research stays outside public routes and metadata.

## Migration-ready definition

The project is migration-ready when the platform readiness control passes, CI is green, the target master satisfies platform/deployment-topology.json, and staging can complete a restore test. Production-ready is stricter: every enabled feature must also pass its own privacy, security, payment, scientific and SEO release gates.
