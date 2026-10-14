# JR Identity OS — integration contract v1.0

## Existing runtime, not a new silo
Use the existing Bertina PHP/MariaDB customer identity and commerce records. The `database/unified/README.md` architecture is **design and isolated certification only**; do not assume 198 proposed tables are installed. PostgreSQL model migrations under `platform/db/migrations/` must never run on Bertina.

## Canonical sources and issuance gates
| Document | Trusted source | Issuance gate |
| --- | --- | --- |
| Receipt | Existing commerce order + server-verified provider settlement | paid/settled state, matching amount/currency/order, unique event |
| Invoice | Canonical order, line items, applicable tax policy | server-computed immutable financial snapshot |
| Consultation confirmation | Existing verified booking record | accepted appointment, available slot, correct user |
| Assessment report | Versioned RCAS/BAHAR/Golden Talent response and interpretation records | subject authorization, consent, instrument and model versions, review where required |
| Certificate | Approved programme attendance/completion records | authorized issuer and approved claim |
| Donation acknowledgement | Verified donation transaction | confirmed provider event, no tax deductibility claim without legal basis |

Never infer payment truth from a browser redirect or from a `growth_lead_requests` row. An enquiry is not an appointment. A draft report is not a validated scientific conclusion.

## Server-side workflow (future implementation)
1. Authenticate using existing account session; authorize resource and purpose.
2. Resolve authoritative order/booking/assessment/award records.
3. Check guardian permissions for minors and consent scope.
4. Assemble minimal document payload, attach immutable template/brand/instrument versions.
5. Enforce idempotency using `source_type + source_id + document_type + template_version`.
6. Render via reviewed, accessible bilingual templates. For PDF use a trusted server renderer with bundled licensed fonts and print tests.
7. Store private document bytes outside public webroot; keep only metadata and restricted storage reference in the canonical DB.
8. Log actor, action, timestamp, template version and pseudonymous document reference (never full document contents).
9. Serve via scoped authorization and short-lived retrieval; revocation and supersession are explicit.
10. Public verification, if enabled, reveals only minimal authenticity status via opaque unpredictable token, rate limits and expiry.

## API shape — proposed, not implemented
- `POST /api/documents/preview`: authenticated, role-scoped, watermark mandatory.
- `POST /api/documents/issue`: server-to-server or privileged issuer, verified source only.
- `GET /api/documents/{id}`: owner/authorized delegate only, private no-store response.
- `GET /verify/{opaque-token}`: privacy-reviewed minimal status only.

No new route is deployed by this document. Do not modify live APIs, schema or frozen SEO routes before integration tests.
