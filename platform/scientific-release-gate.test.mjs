import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateScientificRelease as gate } from './scientific-release-gate.mjs';
const instrument={status:'PILOT',code:'RCAS',version:'1.0',item_bank_checksum:'sha256:test',scoring_version:'1.0',locale:'fa'};
const safeguarding={record_source:'TRUSTED_BACKEND',subject_id:'synthetic-learner',age_attestation_state:'VERIFIED',age_classification:'ADULT',age_attestation_expires_at:'2099-01-01T00:00:00Z'};
const administration={instrument_code:'RCAS',instrument_version:'1.0',item_bank_checksum:'sha256:test',scoring_version:'1.0',locale:'fa',persisted:true,consent_verified:true,authorisation_verified:true,review_state:'RELEASED',reviewer_verified:true,subject_id:'synthetic-learner',release_audience:'SELF',safeguarding_context:safeguarding};
test('pilot permits reviewed descriptive report but not validated claims',()=>{
 assert.equal(gate({instrument,administration}).allowed,true);
 assert.equal(gate({instrument,administration,claim:'VALIDATED_USE_CLAIM'}).allowed,false);
});
test('unknown version, absent consent and unreviewed output fail closed',()=>{
 assert.equal(gate({instrument,administration:{...administration,instrument_version:'2.0'}}).allowed,false);
 assert.equal(gate({instrument,administration:{...administration,consent_verified:false}}).allowed,false);
 assert.equal(gate({instrument,administration:{...administration,review_state:'DRAFT'}}).allowed,false);
});

const syntheticEvidence={
  schema_version:'scientific-reviewed-claim-v1',
  record_source:'SERVER_APPROVED_EVIDENCE_LEDGER',
  approval_state:'APPROVED_FOR_SPECIFIED_USE',
  scientific_status:'VALIDATED_FOR_SPECIFIED_USE',
  claim_type:'VALIDATED_USE_CLAIM',
  instrument_code:'RCAS',instrument_version:'1.0',
  instrument_content_sha256:'c'.repeat(64),
  item_bank_checksum:'sha256:test',
  scoring_version:'1.0',locale:'fa',
  evidence_bundle_sha256:'b'.repeat(64),
  validity_dossier_sha256:'a'.repeat(64),
  precision_dossier_sha256:'d'.repeat(64),
  fairness_review_sha256:'e'.repeat(64),
  study_preregistration_reference:'test-prereg-1',
  ethics_clearance_reference:'test-ethics-1',
  independent_review_record:'test-signed-board-1',
  author_id:'author-synthetic',
  target_population:'students-12-15',
  intended_use:'formative-guidance',
  decision_at:'2026-09-15T00:00:00Z',
  valid_until:'2027-01-01T00:00:00Z',
  research_evidence_verified:true,
  safeguarding_review_verified:true,
  version_lock_verified:true,
  audit_replayable:true,
  independent_review_approved:true,
  review_reference:'review-1',
  validity_dossier_reference:'v1',
  precision_dossier_reference:'p1',
  fairness_review_reference:'f1',
  reviewers:[
   {account_id:'independent-1',role:'MEASUREMENT_METHODS',independence_verified:true,
    conflict_of_interest_cleared:true,decision:'APPROVED',
    decision_digest_sha256:'1'.repeat(64),signed_at:'2026-09-15T00:00:00Z'},
   {account_id:'independent-2',role:'ETHICS_FAIRNESS',independence_verified:true,
    conflict_of_interest_cleared:true,decision:'APPROVED',
    decision_digest_sha256:'2'.repeat(64),signed_at:'2026-09-15T00:00:00Z'}
  ]
};
// Fixture booleans and hashes test the release logic, not real studies
// or cryptographic verification of real independent reviewer signatures.

test('validated-use claims require independent scope-specific evidence',()=>{
 const validated={...instrument,status:'VALIDATED_FOR_SPECIFIED_USE',content_sha256:'c'.repeat(64),validation_evidence:syntheticEvidence};
 const scoped={...administration,target_population:'students-12-15',intended_use:'formative-guidance'};
 assert.equal(gate({instrument:validated,administration:scoped,claim:'VALIDATED_USE_CLAIM',now:'2026-10-16'}).allowed,true);
 assert.equal(gate({instrument:validated,administration:{...scoped,target_population:'adults'},claim:'VALIDATED_USE_CLAIM',now:'2026-10-16'}).allowed,false);
 assert.equal(gate({instrument:validated,administration:scoped,claim:'VALIDATED_USE_CLAIM',now:'2028-01-01'}).allowed,false);
});

test('even a human-reviewed pilot report fails without current independent age proof',()=>{
 for(const unsafe of [
   {...administration,safeguarding_context:null},
   {...administration,safeguarding_context:{...safeguarding,record_source:'CLIENT'}},
   {...administration,safeguarding_context:{...safeguarding,age_attestation_state:'UNKNOWN'}},
   {...administration,safeguarding_context:{...safeguarding,subject_id:'other-learner'}},
   {...administration,safeguarding_context:{...safeguarding,age_attestation_expires_at:'2025-01-01'}},
   {...administration,release_audience:'UNKNOWN'}
 ]) {
   const result=gate({instrument,administration:unsafe,now:'2026-10-16T12:00:00Z'});
   assert.equal(result.allowed,false);
 }
});
test('minor reviewed reports require guardian authority, current independent assent and notice digest',()=>{
 const minor={...safeguarding,age_classification:'MINOR',
   guardian_relationship_state:'VERIFIED',learner_assent_state:'VERIFIED',
   learner_assent_notice_version:'learner-v1',learner_assent_notice_sha256:'f'.repeat(64),
   learner_assent_expires_at:'2027-01-01T00:00:00Z',
   parent_visibility_consent_state:'GRANTED'};
 const self={...administration,release_audience:'SELF',safeguarding_context:minor};
 assert.equal(gate({instrument,administration:self,now:'2026-10-16T12:00:00Z'}).allowed,true);
 for(const bad of [
   {...minor,guardian_relationship_state:'EXPIRED'},
   {...minor,learner_assent_state:'WITHDRAWN'},
   {...minor,learner_assent_notice_version:''},
   {...minor,learner_assent_notice_sha256:'tampered'},
   {...minor,learner_assent_expires_at:'2026-10-16T11:00:00Z'}
 ]) assert.equal(gate({instrument,administration:{...self,safeguarding_context:bad},
       now:'2026-10-16T12:00:00Z'}).allowed,false);
});
test('release to guardian also requires distinct current parent visibility consent',()=>{
 const minor={...safeguarding,age_classification:'MINOR',
   guardian_relationship_state:'VERIFIED',learner_assent_state:'VERIFIED',
   learner_assent_notice_version:'learner-v1',
   learner_assent_notice_sha256:'b'.repeat(64),
   learner_assent_expires_at:'2027-01-01T00:00:00Z',
   parent_visibility_consent_state:'GRANTED'};
 const guardian={...administration,release_audience:'GUARDIAN',safeguarding_context:minor};
 assert.equal(gate({instrument,administration:guardian,now:'2026-10-16T12:00:00Z'}).allowed,true);
 assert.equal(gate({instrument,administration:{...guardian,
   safeguarding_context:{...minor,parent_visibility_consent_state:'WITHDRAWN'}},
   now:'2026-10-16T12:00:00Z'}).allowed,false);
 assert.equal(gate({instrument,administration:{...guardian,
   safeguarding_context:{...minor,parent_visibility_consent_state:undefined}},
   now:'2026-10-16T12:00:00Z'}).allowed,false);
 assert.equal(gate({instrument,administration:{...guardian,
   safeguarding_context:safeguarding},
   now:'2026-10-16T12:00:00Z'}).allowed,false);
});


test('scoped release rejects self-approved and unverifiable research dossiers',()=>{
 const validated={...instrument,status:'VALIDATED_FOR_SPECIFIED_USE',
    content_sha256:'c'.repeat(64),validation_evidence:syntheticEvidence};
 const scoped={...administration,target_population:'students-12-15',intended_use:'formative-guidance'};
 const submit=evidence=>gate({instrument:{...validated,validation_evidence:evidence},
    administration:scoped,claim:'VALIDATED_USE_CLAIM',now:'2026-10-16T12:00:00Z'});
 assert.equal(submit(syntheticEvidence).allowed,true);
 for(const changed of [
  {...syntheticEvidence,record_source:'USER_SUBMITTED'},
  {...syntheticEvidence,approval_state:'PENDING'},
  {...syntheticEvidence,scientific_status:'PREVALIDATION'},
  {...syntheticEvidence,evidence_bundle_sha256:'pending'},
  {...syntheticEvidence,validity_dossier_sha256:'NOT_EXISTING'},
  {...syntheticEvidence,decision_at:'2027-01-01T00:00:00Z'},
  {...syntheticEvidence,ethics_clearance_reference:''},
  {...syntheticEvidence,version_lock_verified:false},
  {...syntheticEvidence,safeguarding_review_verified:false},
  {...syntheticEvidence,reviewers:[syntheticEvidence.reviewers[0]]},
  {...syntheticEvidence,reviewers:syntheticEvidence.reviewers.map(r=>({...r,account_id:'identical-id'}))},
  {...syntheticEvidence,reviewers:syntheticEvidence.reviewers.map(r=>({...r,account_id:'author-synthetic'}))},
  {...syntheticEvidence,reviewers:syntheticEvidence.reviewers.map(r=>({...r,independence_verified:false}))},
  {...syntheticEvidence,reviewers:syntheticEvidence.reviewers.map(r=>({...r,conflict_of_interest_cleared:false}))},
  {...syntheticEvidence,reviewers:syntheticEvidence.reviewers.map(r=>({...r,role:'EDITOR'}))},
  {...syntheticEvidence,reviewers:syntheticEvidence.reviewers.map(r=>({...r,decision_digest_sha256:'invalid'}))}
 ]){
  const decision=submit(changed);
  assert.equal(decision.allowed,false,'Malformed source or review must fail closed');
 }
 assert.equal(gate({instrument:{...validated,content_sha256:'f'.repeat(64)},
   administration:scoped,claim:'VALIDATED_USE_CLAIM',
   now:'2026-10-16T12:00:00Z'}).allowed,false);
});
