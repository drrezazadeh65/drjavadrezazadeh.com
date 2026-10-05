# PRIVATE APP INFORMATION ARCHITECTURE — v1.0

**Status:** FROZEN navigation baseline  
**Target:** app.drjavadrezazadeh.com after production launch

## Global mobile navigation

1. Home
2. Discover
3. Tests
4. My Path
5. Account

Role-specific surfaces appear inside these stable destinations rather than creating a different app for every role.

## Student

### Home
- current goals
- next consultation
- unfinished assessment
- new report
- current Golden Path action

### Discover
- public learning resources
- recommended experiences
- parent/teacher-supported activities

### Tests
- eligible assessments
- resume
- completed history
- report access

### My Path
- integrated talent profile
- goals
- recommendations
- Golden Path
- developmental timeline

### Account
- profile
- documents
- consultations
- purchases
- privacy requests
- settings

## Parent

### Home
- linked children
- pending parent observation
- appointments
- authorised reports

### Discover
- parent resources
- guidance articles
- family support actions

### Tests
- parent-report instruments
- status of linked multi-source assessment

### My Path
- each child's authorised developmental actions
- parent-support tasks
- follow-up status

### Account
- relationships
- consultations
- payments
- privacy/settings

## Teacher

### Home
- assigned classes/students
- observation tasks
- pending follow-up

### Discover
- teacher resources
- observation guidance

### Tests
- teacher observation instruments
- assigned assessment contributions

### My Path
- authorised student-development actions
- teaching support recommendations

### Account
- assignments
- messages
- settings/privacy

## Consultant

### Home
- new triage queue
- today's appointments
- assigned follow-ups

### Discover
- internal professional resources
- approved service protocols

### Tests
- assessment status for assigned cases
- human review queue

### My Path
- case pathways
- recommendations
- Golden Path review

### Account
- service eligibility
- availability
- communication settings
- audit/access history

## Admin surfaces

Admin and Super Admin do not use the ordinary five-tab navigation for privileged operations.

Separate admin modules:
- content/SEO
- users/roles/relationships
- consultations/booking
- assessments/reports
- products/orders/payments
- research exports
- audit/security

## Navigation security rule

A menu item is never an authorisation mechanism.

The UI may hide irrelevant capabilities, but API/database/private-file authorisation must independently enforce the RBAC matrix.
