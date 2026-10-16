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
test('validated-use claims require independent scope-specific evidence',()=>{
 const validated={...instrument,status:'VALIDATED_FOR_SPECIFIED_USE',validation_evidence:{independent_review_approved:true,review_reference:'review-1',target_population:'students-12-15',intended_use:'formative-guidance',validity_dossier_reference:'v1',precision_dossier_reference:'p1',fairness_review_reference:'f1',valid_until:'2027-01-01'}};
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
