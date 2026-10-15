import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateScientificRelease as gate } from './scientific-release-gate.mjs';
const instrument={status:'PILOT',code:'RCAS',version:'1.0',item_bank_checksum:'sha256:test',scoring_version:'1.0',locale:'fa'};
const administration={instrument_code:'RCAS',instrument_version:'1.0',item_bank_checksum:'sha256:test',scoring_version:'1.0',locale:'fa',persisted:true,consent_verified:true,authorisation_verified:true,review_state:'RELEASED',reviewer_verified:true};
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
