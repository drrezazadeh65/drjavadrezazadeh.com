# RBAC & PERMISSION MATRIX — v1.0

**Status:** FROZEN authorisation baseline  
**Scope:** private application, consultation, Golden Talent, commerce, research administration and platform operations.

## 1. Roles

- STUDENT
- PARENT
- TEACHER
- CONSULTANT
- COUNSELLOR
- RESEARCHER
- CONSULTATION_CLIENT
- INSTITUTION
- EDITOR
- ADMIN
- SUPER_ADMIN

One account may hold more than one role. Permissions are granted by capability and relationship, not merely by role name.

## 2. Core rule

A user may access a record only when both conditions are true:

1. the user has the required capability; and
2. the user has a valid relationship to that specific record.

Role alone is never sufficient for access to a student's private record.

## 3. Capability matrix

| Capability | Student | Parent | Teacher | Consultant | Researcher | Editor | Admin | Super Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| view own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| edit own profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| view own educational record | ✓ | — | — | assigned | — | — | support | ✓ |
| view linked child's record | — | relationship | — | assigned | — | — | support | ✓ |
| view assigned student observations | own | linked child | assigned | assigned | — | — | support | ✓ |
| create teacher observation | — | — | assigned only | — | — | — | policy | ✓ |
| create consultation request | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| triage consultation | — | — | — | assigned/authorised | — | — | ✓ | ✓ |
| write consultation note | — | — | — | assigned case | — | — | policy | ✓ |
| view private consultation notes | own-visible subset | linked-visible subset | — | assigned case | — | — | support with reason | ✓ |
| start eligible assessment | ✓ | linked/authorised | assigned/authorised | assigned/authorised | — | — | policy | ✓ |
| answer self assessment | ✓ | — | — | — | — | — | — | — |
| answer parent report | — | linked child | — | — | — | — | — | — |
| answer teacher observation | — | — | assigned student | — | — | — | — | — |
| read private report | owner | linked/authorised | explicit scope | assigned | de-identified only | — | support with reason | ✓ |
| human-review report | — | — | — | qualified/assigned | — | — | policy | ✓ |
| manage products/orders | — | — | — | — | — | — | ✓ | ✓ |
| access direct research identity | — | — | — | — | normally no | — | explicit grant only | explicit grant |
| access de-identified research data | — | — | — | — | approved study | — | explicit grant | explicit grant |
| edit public content | — | — | — | — | — | authorised | ✓ | ✓ |
| manage users/roles | — | — | — | — | — | — | limited | ✓ |
| view audit logs | own events only where exposed | — | — | scoped | study scope | — | operational | ✓ |

## 3.1 Master-vision role capability additions

| Capability | Counsellor | Consultation Client | Institution |
|---|---:|---:|---:|
| view own profile | ✓ | ✓ | organisation-scoped |
| create professional-service request | ✓ | ✓ | authorised representative |
| view own request / booking / order | own or assigned | own | organisation-scoped |
| triage professional service | assigned/authorised | — | — |
| write professional note | assigned case | — | — |
| view student educational evidence | assigned + purpose + scope | own only if subject | no default access |
| receive released deliverable | assigned workflow | own | organisation-scoped |
| manage institution members/contracts | — | — | explicit organisation capability |
| access payment credentials | — | — | — |

This extension does not weaken the original matrix: capability plus relationship/purpose remains mandatory.

Legend:
- **relationship** = validated parent-child link.
- **assigned** = explicit current assignment.
- **support with reason** = break-glass/support access requiring a recorded reason and audit event.
- **policy** = capability granted by explicit administrative policy, not default role.

## 4. Parent-child relationship

A parent account does not automatically gain access to a student account.

Relationship states:
- REQUESTED
- PENDING_VERIFICATION
- ACTIVE
- REJECTED
- REVOKED
- EXPIRED

Access is permitted only in ACTIVE state and may be narrower for older students according to policy and consent.

## 5. Teacher-student relationship

Teacher access is scoped to:
- assigned class/student;
- approved observation types;
- relevant time period.

Teachers do not receive consultation notes, family documents, payment information or unrelated assessment results by default.

## 6. Consultant access

Consultants see only assigned cases and data necessary for that case.

Case assignment:
- starts at a recorded time;
- can be revoked;
- is audited;
- does not create permanent access after case closure unless policy explicitly requires it.

## 6.1 Extended service and institution roles

### COUNSELLOR
COUNSELLOR is a verified professional-service role. It follows the same least-privilege rule as CONSULTANT and does not gain student-record access merely from the role label. Case assignment, purpose, consent where applicable and audit remain required.

### CONSULTATION_CLIENT
A consultation client may view and manage only that account's own service requests, appointments, permitted messages, invoices/orders and released deliverables. The role does not grant access to another person's educational record.

### INSTITUTION
INSTITUTION is an organisation-scoped role for future school/institution services, contracting, training and licensed programmes. It has no default access to individual student evidence. Any person-level access requires a separate lawful/authorised relationship, defined purpose, consent where applicable and a narrowly scoped capability.

These roles remain deny-by-default until their server-side capability and relationship rules are explicitly activated.

## 7. Research separation

Research access uses a separate research-case identifier.

By default researchers may see:
- de-identified variables;
- study/version metadata;
- codebook;
- provenance.

They do not see:
- name;
- email;
- direct account ID;
- private files;
- consultation notes;
- payment data.

Any identity-link access requires a separate explicit grant and audit trail.

## 8. Editorial separation

EDITOR is a content/journal-recruitment role only. It does not confer access to:
- student records;
- consultation cases;
- assessments;
- payments;
- research identity links.

JHELA manuscript workflow remains in OJS.

## 9. Administrative access

ADMIN is not unlimited.

Administrative support access to sensitive records must:
- state a reason;
- be time-bounded where possible;
- generate an AuditEvent;
- avoid exposing more data than required.

SUPER_ADMIN is reserved for infrastructure/security recovery and is not a normal working role.

## 10. Enforcement

Production implementation must enforce this matrix at:
- API authorisation;
- database/RLS or equivalent;
- private file access;
- admin UI;
- export jobs.

UI hiding alone is never authorisation.

## 11. Deny-by-default

If a permission or relationship is not explicitly defined, access is denied.
