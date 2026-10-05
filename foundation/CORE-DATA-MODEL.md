# CORE DATA MODEL — v1.0

**Status:** FROZEN logical model; physical database implementation waits for backend/provider selection.

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
