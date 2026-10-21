import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAggregatedHoldout,CALIBRATION_AUDIT_SCHEMA} from '../platform/konkur-aggregate-calibration-audit.mjs';
const fixture={schema:CALIBRATION_AUDIT_SCHEMA,modelVersion:'TEST_ONLY_001',
 trainingCycles:[1401,1402],holdoutCycle:1404,
 outcomeProvenance:'INDEPENDENT_VERIFICATION_PENDING',
 bins:[{group:'MATHEMATICS',binCode:'BIN_LOW',cases:300,admitted:90,fixedProbability:0.3},
       {group:'EXPERIMENTAL_SCIENCES',binCode:'BIN_HIGH',cases:300,admitted:210,fixedProbability:0.7}]
};
test('absent outcome evidence cannot authorize any predictions',()=>{
 const x=auditAggregatedHoldout();
 assert.equal(x.status,'NO_EVIDENCE');
 assert.equal(x.admissionProbabilityEnabled,false);
 assert.equal(x.modelDeploymentApproved,false);
});
test('synthetic aggregate maths can be checked without promoting a model',()=>{
 const x=auditAggregatedHoldout(fixture);
 assert.equal(x.status,'METRICS_ONLY_UNVERIFIED');
 assert.equal(x.holdoutCases,600);
 assert.equal(x.metrics.brierScore,0.21);
 assert.equal(x.metrics.expectedCalibrationError,0);
 assert.equal(x.independentlyValidated,false);
 assert.equal(x.modelDeploymentApproved,false);
 assert.equal(JSON.stringify(x).includes('TEST_ONLY_001'),false);
});
test('small cells, PII, invalid chronology and unverifiable claims fail closed',()=>{
 for(const delta of [
  {email:'private'}, {bins:[{...fixture.bins[0],studentName:'PII'},fixture.bins[1]]},
  {bins:[{...fixture.bins[0],cases:12},fixture.bins[1]]},
  {bins:[{...fixture.bins[0],admitted:301},fixture.bins[1]]},
  {bins:[{...fixture.bins[0],fixedProbability:2},fixture.bins[1]]},
  {bins:[fixture.bins[0],fixture.bins[0]]},
  {trainingCycles:[1404,1405]}, {outcomeProvenance:'CLAIMED_VERIFIED'}, {bins:[fixture.bins[0]]}
 ]){
  const x=auditAggregatedHoldout({...fixture,...delta});
  assert.notEqual(x.status,'METRICS_ONLY_UNVERIFIED');
  assert.equal(x.modelDeploymentApproved,false);
 }
});
