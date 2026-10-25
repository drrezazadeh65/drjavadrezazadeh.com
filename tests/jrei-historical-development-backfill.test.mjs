import test from 'node:test';import assert from 'node:assert/strict';
import {classifyHistoricalRun,summarizeHistory}
  from '../scripts/jrei-historical-development-backfill.mjs';
const run={id:12,head_sha:'a'.repeat(40),name:'Bertina Publish',
 created_at:'2026-10-21T12:00:00Z',status:'completed',conclusion:'success'};
test('a successful GitHub run does not certify a deployed Bertina release',()=>{
 const r=classifyHistoricalRun(run);
 assert.equal(r.possibleDeployment,true);
 assert.equal(r.liveDeploymentVerified,false);
 assert.equal(r.lessonApproved,false);
 assert.equal(r.promotionEvidence,'NOT_INDEPENDENTLY_VERIFIED');
});
test('failed and cancelled workflow runs are equally retained and counted',()=>{
 const runs=[
  classifyHistoricalRun({...run,id:12}),
  classifyHistoricalRun({...run,id:13,conclusion:'failure'}),
  classifyHistoricalRun({...run,id:14,conclusion:'cancelled'})
 ];
 const d=summarizeHistory(runs,[],{workflowRunsComplete:true,deploymentsComplete:true});
 assert.equal(d.workflowStatistics[0].success,1);
 assert.equal(d.workflowStatistics[0].failure,1);
 assert.equal(d.workflowStatistics[0].cancelled,1);
 assert.equal(d.trainingExecuted,false);
 assert.equal(d.rootCausesIndependentlyEstablished,false);
 assert.equal(d.originalBertinaReleaseReceiptsVerified,false);
});
test('forged non-SHA run evidence is rejected',()=>{
 assert.throws(()=>classifyHistoricalRun({...run,head_sha:'NOT_SHA'}),/INVALID/);
});
