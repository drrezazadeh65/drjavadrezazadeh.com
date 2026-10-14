# Ecosystem Journey Coordinator — Design and Integration Contract v1

**Status:** source-only development foundation. No real-user event store, booking, payment or scientific interpretation was activated by this addition.

## Scope and data flow
The journey coordinator uses already verified milestone events from the existing identity, consultation, commerce, Golden Talent/RCAS, BAHAR and coaching modules. It is not a replacement for any domain engine. The authoritative domain service first persists its own transaction, and a future private event-adapter records a minimal event (event ID, journey reference, domain reference, type, server source and timestamp). The coordinator then proposes a next action. Displaying or executing that proposal requires fresh backend authorization.

The coordinator never considers a shopping-cart click or payment intention to be a verified payment, a consultation mode preference to be a confirmed appointment, or an assessment response to be a validated talent judgement. Event references for the latest order, case and assessment must match; previous paid orders and bookings cannot authorize later orders or cases.

## Privacy, consent and threat boundaries
All state is server-authoritative and private; public web pages cannot supply attested events. Do not store emails, names, questionnaire answers, raw student records, medical information, article contents, counselling notes or payment credentials in the journey event stream. Existing consent and verified guardian/teacher relationship policies must be checked on every protected request. For minors, withdrawal and scope of consent must be rechecked in the underlying consent service; a historical milestone is never proof of current consent.

The proposed event object deliberately rejects all unknown fields, and professional assessment/development review requires a reviewer ID. The current in-memory pure planner is not cryptographic attestation and is not a production inbox or message queue.

## Failure modes and future work
- Implement private SQL tables for event envelope, a per-domain transactional outbox, unique event identity and replay checkpoints using the existing Bertina database; no parallel database.
- Reconcile event streams with current domain state before execution; reject missing records, revoked entitlement, changed consent, cancelled slots and disputed payment. Expired/cancelled milestones require explicit compensating events in the next contract version.
- Track queue lag, stale reference, duplicate collision, domain-event rejection and journey version without logging personal payloads.
- Each connected module retains a disable switch. Turning this coordinator OFF must not interrupt existing accounts, purchases, confirmed consultations or educational records.
- Respect approved telephone/video preference; in-person meetings belong only to eligible VIP and annual coaching clients in Tehran or Kashan under the current consultation policy.
- For Golden Talent, RCAS and BAHAR, keep human-reviewed evidence and PREVALIDATION boundaries until scientific validation supports stronger claims.
- Preserve owner-approved FULL development releases on Bertina and host-managed backup responsibility, without introducing extra backup inspection gates.

## Release gate and regression evidence
Source contract: `platform/ecosystem-journey-orchestrator.mjs`.
Regression coverage: `platform/ecosystem-journey-orchestrator.test.mjs`.
Run: `node platform/ecosystem-journey-orchestrator.test.mjs`.

Production runtime remains OFF until domain-event adapters, private persistence, role/consent checks, idempotent execution, compensation/replay and module telemetry are wired and reviewed. Complete full end-to-end integration testing only after the other ecosystem tracks are assembled, as directed by the owner.
