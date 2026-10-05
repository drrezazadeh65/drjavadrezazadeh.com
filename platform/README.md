# Production Platform Foundation

This directory contains implementation-facing assets for the future private ecosystem.

It is deliberately separate from the public static website.

## Current state

No production backend is live yet. These files define stable contracts and provider-neutral database foundations so that authentication, consultation, commerce, assessment and research can be connected without redesigning the public site.

## Migration order

1. `001_identity_consultation.sql`
   - users/roles/profile
   - consent
   - consultation request/triage/appointment/case
   - notes/recommendations
   - audit events

2. `002_commerce_payments.sql`
   - products/prices
   - cart/order/order items
   - provider-neutral payment intents
   - verified payments/refunds
   - entitlements/invoices

3. `003_assessment_golden_talent.sql`
   - immutable assessment versions
   - items/dimensions/responses
   - scoring/interpretation versions
   - report versions
   - multi-source talent evidence
   - Golden Path versions/actions

4. `004_research_governance.sql`
   - study registry/versioning
   - pseudonymous research cases
   - separated identity links
   - consent snapshots
   - de-identification runs
   - codebook versions
   - dataset freezes/exports
   - research access grants

5. `005_relationships_documents_privacy.sql`
   - verified parent–student relationships
   - scoped teacher–student assignments
   - private-document metadata
   - document access grants
   - privacy requests and retention events

6. `006_educational_record.sql`
   - educational record and academic history
   - grades, goals and interests
   - role-scoped educational observations
   - recommendations
   - developmental timeline

7. `007_service_booking.sql`
   - service catalogue
   - consultant-service eligibility
   - recurring availability rules
   - availability exceptions
   - appointment status history

8. `008_communication_notifications.sql`
   - secure message threads
   - notifications
   - communication preferences
   - transactional email events

9. `009_cms_seo_media.sql`
   - content/revision workflow
   - SEO records
   - media provenance
   - redirect governance
   - publication events
   - SEO release checks

## API contract

See `/foundation/API-CONTRACT-v1.yaml` and the Golden Talent-specific `/foundation/GOLDEN-TALENT-API-CONTRACT-v1.yaml`.

## Safety rules

- Never apply these migrations directly to a production database without backup/rollback planning.
- Production database credentials never enter Git.
- Provider-specific row-level security or IAM rules must be added before real user data is accepted.
- Sensitive uploads require private object storage and short-lived signed access.
- Staging uses test/fake data only.
- Payment success is server-verified.
- Research identity links require more restrictive permissions than de-identified research data.
- Journal manuscripts belong in OJS, not this schema.

## Next implementation step

After a provider passes the decision gate:

1. provision DEVELOPMENT/STAGING;
2. apply migrations in order;
3. connect authentication identity to `app_user`;
4. implement RBAC/row policies;
5. implement consultation request API;
6. enable the secure intake form;
7. add booking;
8. add payment sandbox;
9. test backup/restore and audit logging;
10. only then create production.

- `011_profile_market_locale.sql` — optional ISO country context for account profile; never treated as proof of residence/identity/payment eligibility.
