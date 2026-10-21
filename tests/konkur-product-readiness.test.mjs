import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceOnlyAdmissionReadiness,classifyAdmissionReadiness} from '../scripts/konkur-product-readiness.mjs';
test('existing no-storage research experience can be release-candidate while official admissions stay blocked',()=>{
 const r=sourceOnlyAdmissionReadiness();
 assert.equal(r.researchCandidate,'SOURCE_CONTRACTS_READY_PENDING_CI_AND_OWNER_RELEASE');
 assert.deepEqual(r.researchIssues,[]);
 assert.equal(r.officialReleaseAuthorized,false);
 assert.equal(r.automaticDeploymentAuthorized,false);
 assert.equal(r.migrationAuthorized,false);
 assert.equal(r.admissionProbabilityEnabled,false);
 assert.equal(r.backendAndLiveSqlVerifiedByThisTool,false);
 assert.equal(r.requiredOfficialGates.length,5);
});
test('empty or missing evidence never produces a research-ready classification',()=>{
 const r=classifyAdmissionReadiness({});
 assert.equal(r.researchCandidate,'SOURCE_CONTRACTS_BLOCKED');
 assert.ok(r.researchIssues.length>0);
 assert.equal(r.officialReleaseAuthorized,false);
 assert.equal(r.verifiedProgrammeRecordsCertified,0);
});
