# PRIVACY & DATA GOVERNANCE BASELINE — v1.0

**Status:** FROZEN product/privacy baseline; jurisdiction-specific legal review remains required before production launch.

## Principles

1. Collect the minimum information needed for the current service.
2. Keep public content and private educational records technically separate.
3. Do not ask for sensitive documents before they are needed.
4. Keep service consent, privacy acknowledgement, research consent, publication consent and marketing consent separate.
5. Give users understandable access, correction, export and deletion-request paths where operational/legal obligations allow.
6. Do not sell personal data.
7. Do not use private educational records as public content.
8. Research use requires an approved study path, appropriate consent/lawful basis, de-identification and a frozen research dataset.
9. Payment-card credentials are handled by the payment provider and are not stored by the ecosystem.
10. Administrative access to sensitive records is logged.

## Data classes

### Public
- public profile information;
- published articles/books metadata;
- public services;
- public journal/publisher information.

### Account
- email;
- preferred language;
- role;
- account/security events.

### Educational
- academic history;
- goals;
- observations;
- assessment responses;
- reports;
- recommendations.

### Consultation
- consultation request;
- triage;
- appointment;
- professional notes;
- follow-up.

### Sensitive documents
- report cards;
- certificates;
- approved consultation documents.

These remain private and use signed/time-limited access.

### Commerce
- orders;
- invoices;
- payment status/reference.
Raw card credentials are not stored.

### Research
- pseudonymous case ID;
- study/version metadata;
- de-identified variables;
- dataset freeze provenance.

Direct identity is stored separately from research cases.

## Retention classes

Retention periods are not hard-coded until legal/business requirements are confirmed. Every production data entity must belong to a retention class such as:
- ACCOUNT_ACTIVE;
- SERVICE_RECORD;
- FINANCIAL_RECORD;
- EDUCATIONAL_RECORD;
- RESEARCH_RECORD;
- SECURITY_AUDIT;
- TEMPORARY_UPLOAD.

A future retention schedule will define duration and deletion/archival events per class.

## Children/minors

Because educational services may involve minors:
- parent/guardian relationships must be verifiable;
- the system must not assume a parent relationship from an email address;
- collection must be age-appropriate and minimised;
- visibility of records between student and parent must be policy-driven;
- research participation involving minors requires a dedicated protocol.

## Production launch blockers

Before accepting real private records:
- jurisdiction/privacy notice finalised;
- consent versions created;
- auth/RBAC active;
- private storage active;
- backup/restore tested;
- privacy-request workflow active;
- audit logging active;
- incident-response contact/path defined.
