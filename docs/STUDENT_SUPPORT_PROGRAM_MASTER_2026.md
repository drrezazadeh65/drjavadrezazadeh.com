# Student Support Programme — Canonical Safeguarded Master (v1.0 / 2026-10-11)

## Mission, identity and boundaries

**Persian public programme title:** «حمایت از دانش‌آموزان بااستعداد کم‌بضاعت»

**English public title:** “Support Talented Students Facing Financial Hardship”

**Purpose:** Support verified educational and essential needs of talented students with financial hardship. Eligible categories: (1) scholarships/tuition; (2) books, school materials and study tools; (3) educational services, mentoring and evaluations where appropriate; (4) essential clothing and school participation needs; (5) general equal-opportunity allocation to a verified priority.

**Non-goals:** This is not an unqualified charity/tax-deductibility claim, direct student-sponsor messaging platform, student marketplace, a means of exposing child identities, or a guarantee of admissions/achievement.

## Roles and registration policy

| Role | Payment | Login / verification | What they may see |
|---|---|---|---|
| Guest supporter | YES, without account | NO | Payment and anonymous receipt only |
| Verified sponsor | May give as guest or while logged in | YES, email verified | Only own receipts and separately approved student cases |
| Student | NO obligation to donate | Account and age-appropriate supervision | Own approved case, private needs and progress |
| Legal guardian | NO obligation to donate | Verified account and guardian status confirmed by staff | Their student case and consent controls |
| Programme reviewer | NO | Staff account, elevated MFA, segregation of duties | Assigned private review materials only |
| Finance/fulfilment | NO | Elevated staff access | Approved allocations and proof of delivery only |
| System administrator | NO | Elevated MFA and audit | Operational controls; PII only when necessary |

A paid receipt **never** confers sponsorship, identity access, private case viewing or permission to contact a minor. Account creation is required for purchases of books/services, but guest giving must remain independent. Book/service account enforcement must not be declared operational while Bertina email verification remains unresolved.

## Mutual visibility: four separate controls

1. Guardian relationship is verified; the student provides age-appropriate assent.
2. Sponsor explicitly consents to identity display before a student sees the sponsor's approved display name.
3. Student/guardian explicitly consent to a limited identity display before the sponsor sees the student's staff-approved display name.
4. Staff safeguarding approval, purpose limitation, expiration and revocation are mandatory. A sponsor's payment **cannot** change these permissions.

Default = anonymous both ways. Permissions can be withdrawn by a sponsor, student or legal guardian, with logging. Names are curated for safe limited display; never send telephone, address, specific school, government ID, health, household circumstances, documents or location coordinates to sponsors. No direct chat, private messaging, calls, email exchange or offline introductions are offered by this system.

## Source of truth

- **Transactions:** `commerce_orders` remains authoritative for `paid`. New programme contributions use `sku: support:students`, `program: talented-students-v1`, `allocation: pending_verified_need`, and a restricted `focus` vocabulary. Previous `support:voluntary` receipts are historical and never silently reclassified.
- **Eligibility:** Only verified `student_support_cases` can be funded, after an independent legal guardian check and assessment of financial/educational need.
- **Requests:** Student/guardian submits private proposed needs. A sponsor cannot edit them. Staff must review summaries before sponsor visibility. No contact details are allowed in summaries.
- **Sponsor relationships:** Account + explicit consents + safeguarder approval + non-expired assignment. Default is zero access. No public child directory.
- **Progress:** Staff-approved and deliberately deidentified milestones. Never fabricated grades, evaluations, achievements, visits or delivery.
- **Financial allocations:** A donation's bank-verified payment is distinct from proposed allocation, approval, disbursement, delivery and expense reconciliation.

## Financial / governance gates

Until an auditable funding allocation module has been formally approved and provisioned, **all new payments are received but remain labelled as pending verified allocation**; payment confirmation must never be described as proof of final disbursement. A separate ledger should reconcile each `paid` support receipt to its categories and each approved allocation. Financial transitions require per-order and per-need row locks, checking unallocated balances, dual staff authorisation for disbursements, verified invoices or proof of procurement, and explicit refund/reversal handling. No fund transfers or student shopping orders can be initiated from sponsor chat or a public form.

Before operational expansion, the owner must confirm legal eligibility to solicit and hold earmarked educational contributions, merchant account terms for this purpose, accounting/tax treatment, permissible use of personal data, programme safeguarding policy, verified child/guardian onboarding, appeal/complaint channel and case retention/deletion schedule. Do not advertise a charity registration number, tax exemption, named beneficiaries, partner organisations or allocation statistics that have not been proven.

## Dashboard structure

The unified private dashboard retains the existing customer identity and receives an additional high-priority module for Student Support:

- **Supporter:** My verified contributions (after authenticated ownership claim), sponsorship requests, approved case aliases, verified approved needs, progress timeline, approval/revocation, financial transparency.
- **Student/guardian:** private case, needs draft and review, guardian/assent settings, sponsor visibility preferences, education plan and evidence. No supporter contact details.
- **Reviewer:** eligibility queue, checklists and redaction, approval gates; not accessible to public users.
- **Fulfilment:** approved procurement, delivery receipts, spending evidence, and audit events; not a public messaging system.
- **Administrative analytics:** paid contributions, earmarks, approved allocations, disbursements, reversals and unresolved cases; independently reconciled, with aggregation limits and no child PII.

Avoid synthetic records, progress percentages and false completion badges. A missing schema, email service or valid session must display a helpful fail-closed state instead of anonymous student data.

## Implementation and release gates

1. Public /fa/ and /en/ programme pages with consistent canonical/hreflang, no private student fields, and optional guest support payment — implemented.
2. New donation tagging and bilingual explanations; preserve legacy receipt semantics — implemented.
3. New private, role- and consent-gated API scaffold and premium dashboard shell — implemented but unavailable to real cases until the migration is installed and account registration/verification is operational.
4. Isolated MySQL privacy, guest payment, receipt, mismatch and role tests — mandatory on each production release.
5. Production private case tables: `docs/BERTINA_STUDENT_SUPPORT_SCHEMA.sql` requires backup, approval and Bertina execution (not executed by GitHub static deploy).
6. Staff verification and dual-control allocation workflows, real operational onboarding and identity consent recording — pending; do not claim case management complete.
7. SMTP ticket `t833905` is pending technical action; do not bypass email verification. Guest contributions remain independent.
8. Revalidate production donation, login, student privacy, historical redirects and SEO before launch of real profiles.

## Non-negotiables

Mobile-first, accessible, secure HTTPS; no child PII in URLs, static assets, logs or analytics; no fake student profiles; no sharing full donor/student names by default; no direct-contact channel; no public financial or case-specific claims without supporting records; consent revocable; minimum-privilege server authorization and immutable audit evidence for sensitive actions.
