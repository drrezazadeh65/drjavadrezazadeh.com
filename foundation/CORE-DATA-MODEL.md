# CORE DATA MODEL — v1.0

**Status:** FROZEN logical model; physical database implementation waits for backend/provider selection.

## Role architecture
The private platform is role-specific rather than a universal dashboard. Current/future experiences include Student, Parent, Teacher, Adviser/Consultant, Researcher, Consultation Client, Institution and Admin. A role label alone never grants access: verified relationships, assignment, consent, server authorisation and audit rules remain authoritative.

## Identity
- User
- Role
- UserRole
- Profile
- StudentProfile
- ParentProfile
- TeacherProfile
- ConsultantProfile
- ParentStudentRelationship
- TeacherStudentAssignment

## Educational Record
- EducationalRecord
- AcademicHistory
- GradeRecord
- Goal
- InterestRecord
- Observation
- UploadedDocument
- Recommendation
- DevelopmentEvent

## Longitudinal Development & Decision Intelligence
- StudyPlan
- StudyPlanRevision
- StudyTask
- ProgressMeasurement
- SavedPathwayOption
- EducationalDecision
- DecisionSupportExplanation

**Rules:** comparable observations retain source/date/context; one observation never becomes a trend; pathway options retain jurisdiction/source/version; consequential recommendations preserve supporting evidence, counterevidence, contextual constraints, uncertainty and human-review state.

## Professional Service Intake
The ConsultationRequest/Triage lifecycle is the shared intake backbone for student, academic/researcher, teacher and institutional professional services. EducationStage is optional outside student services; RequesterContext and ContextLabel support minimal routing without collecting confidential content at first contact.

Supported service families include student guidance, field selection, entrance-exam support, talent/report-card/parent consultation, academic English editing, manuscript diagnostics, research/publication consultation, reviewer-response support, academic career consultation, teacher mentoring, assessment consultation, institutional consulting and speaking/training.

## Consultation
- ConsultationRequest
- ConsultationTriage
- Appointment
- ConsultationCase
- ConsultationNote
- ConsultationRecommendation
- FollowUp
- CaseAttachment

## Assessment
- Assessment
- AssessmentVersion
- Dimension
- Item
- ItemOption
- AssessmentSession
- Response
- ScoringVersion
- Score
- InterpretationVersion
- Interpretation
- ReportTemplateVersion
- Report
- HumanReviewEvent

## Golden Talent
- TalentProfile
- EvidenceSource
- StudentEvidence
- ParentEvidence
- TeacherEvidence
- AcademicEvidence
- ContextEvidence
- GoldenPath
- GoldenPathAction

## Coaching / Recurring Development
- CoachingProgram
- CoachingEnrollment
- CoachingReview

Recurring programmes may represent monthly coaching, quarterly review, annual development and premium long-term support. Payment/entitlement state is separate from professional review state; verified payment may grant access but never determines an educational judgement.

## Commerce
- Product
- ProductVariant
- Price
- Cart
- CartItem
- Order
- OrderItem
- PaymentIntent
- Payment
- Refund
- Entitlement
- Fulfilment
- Invoice
- Coupon

## Pathway Reference / Local Education Modules
- PathwayReference
- CareerReference
- EducationProgramReference
- QualificationReference
- PathwayHypothesis
- JurisdictionAdapter
- ReferenceDatasetVersion

Country- or system-specific data (for example Iran yearly admissions data, IB, A-Level, AP or national curricula) must enter through versioned adapters with source system, source version, source record ID, jurisdiction, locale, source URL/licence where applicable, retrieval/effective dates and provenance. Local modules never redefine the country-agnostic student core.

## Content/SEO
- ContentEntry
- ContentRevision
- SEORecord
- Redirect
- MediaAsset
- TranslationLink

## Communication
- MessageThread
- Message
- Notification
- EmailEvent

## Consent/Governance
- ConsentType
- ConsentRecord
- PrivacyRequest
- AuditEvent
- DataRetentionEvent

## Research
- Study
- StudyVersion
- ResearchCase
- DatasetFreeze
- DatasetExport
- CodebookVersion
- ResearchAccessGrant

## Journal recruitment only
- JournalCandidate
- ReviewerApplication
- EditorialApplication
- ExpertiseTag
- ApplicationReview

**Journal manuscripts, peer review, issues and DOI publication records belong in the dedicated journal/OJS domain rather than the education-platform operational schema.**

## Mandatory cross-cutting fields

Versioned/scientific entities should support:
- stable UUID;
- version number;
- created_at;
- created_by;
- status;
- provenance/source;
- effective_from;
- supersedes/superseded_by where relevant.

Sensitive operational entities should support:
- owner/subject ID;
- access scope;
- auditability;
- retention class.

Research exports should never depend on mutable display names or email addresses as case identifiers.
