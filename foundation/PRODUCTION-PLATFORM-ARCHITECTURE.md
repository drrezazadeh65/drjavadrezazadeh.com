# PRODUCTION PLATFORM ARCHITECTURE — v1.0

**Status:** FROZEN architecture baseline  
**Purpose:** move the ecosystem from a static public website to a secure education, consulting, assessment, commerce and research platform without sacrificing SEO or privacy.

---

## 1. Separation of concerns

### Public Web
Purpose:
- authority;
- SEO content;
- services;
- books;
- publisher;
- public Golden Talent resources;
- JHELA public/founding information.

Characteristics:
- static/SSR/SSG where possible;
- fast and crawlable;
- no private user data;
- no secrets;
- public media only.

### Private App
Target namespace: `app.drjavadrezazadeh.com`

Purpose:
- authentication;
- student/parent/teacher/consultant dashboards;
- consultation intake;
- appointments;
- assessments;
- reports;
- educational records;
- orders;
- secure messages;
- document uploads.

Characteristics:
- authentication required;
- noindex;
- role-based access;
- private storage;
- audit logging;
- CSRF/session protections appropriate to implementation.

### API
Target: `/api/v1/` or equivalent production API domain.

Purpose:
- stable service boundary between web/app/admin;
- versioned contracts;
- no direct client access to privileged database operations.

---

## 2. Core production services

### Identity
Required capabilities:
- email verification;
- secure login;
- password reset/account recovery;
- session revocation;
- MFA for administrators;
- multiple roles per account;
- parent-child relationship verification;
- audit log for privilege changes.

### Database
Preferred model: relational/PostgreSQL-compatible.

Core domains:
- identity/profile;
- educational record;
- consultation;
- assessment/versioning;
- reports;
- commerce;
- consent;
- journal recruitment (separate from journal article workflow);
- research registry;
- audit/observability.

### Private object storage
For:
- report cards;
- certificates;
- assessment attachments;
- consultation documents;
- generated reports.

Rules:
- private by default;
- signed/time-limited access;
- MIME/type/size checks;
- malware scanning where infrastructure permits;
- no predictable public URLs.

### Transactional email
For:
- verification;
- appointment confirmations;
- reminders;
- receipts;
- password recovery;
- reviewer/editorial application status.

Marketing/newsletter email is a separate consent domain.

---

## 3. Consultation pipeline

State machine:

`DRAFT → SUBMITTED → TRIAGED → AWAITING_BOOKING → BOOKED → AWAITING_PAYMENT → CONFIRMED → COMPLETED → FOLLOW_UP → CLOSED`

Optional terminal states:
- CANCELLED
- NO_SHOW
- DECLINED
- REFUNDED

### Intake
Collect only information needed for the requested service.

Possible fields:
- service type;
- student age/education stage;
- current question/problem;
- target decision;
- relevant deadline;
- documents available;
- preferred communication language;
- consent/privacy acknowledgement.

Do not request sensitive documents before they are needed.

### Triage
Output:
- correct service;
- required preparation/documents;
- appropriate session length;
- whether assessment is needed first;
- whether parent/student should attend;
- whether payment is required before booking.

### Appointment
Requirements:
- timezone-aware;
- reschedule/cancel rules;
- reminders;
- appointment status history;
- link to consultation record.

### Consultation record
Private:
- professional notes;
- evidence reviewed;
- recommendations;
- follow-up actions;
- attachments;
- report link;
- author/reviewer identity where human review occurs.

---

## 4. Commerce architecture

One commerce engine supports:
- consultation;
- physical book;
- eBook;
- workbook/toolkit;
- assessment;
- automated report;
- human-reviewed report;
- course/webinar;
- school/institution service.

Entities:
`Product → Price → Cart → Order → OrderItem → PaymentIntent → Payment → Fulfilment/Entitlement → Refund`

### Payment abstraction
The application must not couple business logic to one gateway.

Interface:
- create payment intent;
- redirect/initiate;
- verify callback/webhook;
- reconcile;
- refund where supported;
- record gateway reference.

No card credentials are stored by the ecosystem.

Gateway selection remains WAITING until legal/jurisdiction/business eligibility is confirmed.

---

## 5. Golden Talent / assessment architecture

Immutable chain:

`Assessment → AssessmentVersion → Dimension → Item → Response → ScoringVersion → Score → InterpretationVersion → ReportTemplateVersion → Report`

Multi-source linking:
- student;
- parent;
- teacher;
- academic record;
- contextual evidence.

Rules:
- published assessment versions are immutable;
- scoring changes create new versions;
- old reports retain their original provenance;
- human review is a separate event, never a silent overwrite;
- research export uses pseudonymous case IDs.

---

## 6. Role model

Roles:
- STUDENT
- PARENT
- TEACHER
- CONSULTANT
- RESEARCHER
- EDITOR
- ADMIN
- SUPER_ADMIN

One identity may hold multiple roles.

Permissions are capability-based, not merely page-based.

Examples:
- parent can access only linked children;
- teacher can access only assigned classes/students and authorised record types;
- consultant can access assigned consultation cases;
- researcher cannot access direct identity by default;
- editor does not gain consultation/admin rights;
- admin privileges are logged.

---

## 7. CMS/admin boundary

Admin modules:
- content;
- SEO metadata;
- services;
- products/prices;
- users/roles;
- consultations;
- appointments;
- assessments;
- reports;
- orders/payments;
- research exports;
- audit logs.

Publishing workflow:
`DRAFT → REVIEW → APPROVED → PUBLISHED → UPDATED/ARCHIVED`

SEO-sensitive edits to slug/canonical/index state require explicit confirmation and redirect impact review.

---

## 8. Research-ready architecture

Operational data and research data remain separate.

Pipeline:
`Operational DB → approved extraction → de-identification → frozen research mart → codebook/export`

Required provenance:
- study ID;
- case ID;
- instrument version;
- item version;
- scoring version;
- interpretation version;
- consent state;
- extraction date;
- transformation log.

Exports:
- CSV;
- XLSX;
- SPSS-compatible;
- R/Python;
- qualitative text package for MAXQDA/NVivo-style workflows.

---

## 9. JHELA boundary

JHELA article submission/review/publishing should use a dedicated scholarly workflow platform (OJS target) rather than being rebuilt inside the educational app.

The ecosystem may share:
- publisher identity;
- public navigation;
- domain architecture;
- editorial recruitment records.

It must not merge:
- consultation clients with journal authors/reviewers;
- educational private records with journal workflow;
- payment acceptance with editorial decisions.

---

## 10. Security baseline

Target: OWASP ASVS Level 2.

Required:
- TLS;
- secure password/auth provider;
- admin MFA;
- least privilege;
- rate limiting;
- server-side validation;
- signed upload/download access;
- secrets outside repository;
- CSRF protection where cookie sessions are used;
- audit logging;
- backup/restore testing;
- vulnerability update process;
- incident-response procedure.

---

## 11. Environments

`LOCAL → DEVELOPMENT → STAGING → PRODUCTION`

Rules:
- staging is noindex;
- production secrets never enter Git;
- test payments are isolated;
- test users/data never mix with production;
- database migrations are versioned;
- rollback procedures exist.

---

## 12. Delivery sequence

### Platform Foundation
1. select lawful/available hosting, auth, database, storage and email services;
2. provision staging;
3. create schema/migrations;
4. authentication + RBAC;
5. audit/consent core;
6. private storage.

### Consultation MVP
1. intake;
2. triage;
3. booking;
4. payment abstraction;
5. consultation record;
6. follow-up.

### Commerce MVP
1. product/price;
2. cart;
3. checkout;
4. order/payment;
5. fulfilment;
6. refund.

### Golden Talent MVP
1. assessment versioning;
2. response flow;
3. scoring;
4. report;
5. multi-source linking;
6. human review.

---

## 13. Production definition of done

A feature is not production-ready because its UI exists.

It is DONE only when:
- access control is real;
- validation is server-side;
- privacy boundary is enforced;
- failure states work;
- audit events exist where needed;
- backup/recovery has been tested;
- production monitoring exists;
- no secrets are exposed;
- legal/payment eligibility is confirmed where applicable.
