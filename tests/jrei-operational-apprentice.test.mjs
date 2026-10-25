import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessHistoricalEngineeringTask,identifyHistoricalRepairCandidates
} from '../platform/jrei-v5/jrei-operational-apprentice.mjs';
const sha=s=>s.repeat(40);
const commits=[
 {commitSha:sha('a'),committedAt:'2026-10-20T08:00:00Z',
   fileCount:2,categories:{UI_UX:2,DESIGN:1,CODE:1}},
 {commitSha:sha('b'),committedAt:'2026-10-21T08:00:00Z',
   fileCount:1,categories:{UI_UX:1,TESTING:1}},
 {commitSha:sha('c'),committedAt:'2026-10-22T08:00:00Z',
   fileCount:1,categories:{SECURITY:1,CODE:1}}
];
const reports=[
 {runId:5,commitSha:sha('a'),workflow:'Public UI QA',createdAt:'2026-10-20T09:00:00Z',conclusion:'failure'},
 {runId:6,commitSha:sha('b'),workflow:'Public UI QA',createdAt:'2026-10-21T09:00:00Z',conclusion:'success'},
 {runId:7,commitSha:sha('c'),workflow:'Public UI QA',createdAt:'2026-10-22T09:00:00Z',conclusion:'cancelled'}
];
const history={
 schema:'jr.jrei.site-apprentice-github-history.v1',
 repository:'drrezazadeh65/drjavadrezazadeh.com',
 gitCommitObservations:commits,
 runObservations:reports,deploymentObservations:[],
 completeness:{workflowRunsComplete:false,deploymentsComplete:true}
};
test('retrieve possible prior UI failures and improvements without claiming mastery',()=>{
 const x=assessHistoricalEngineeringTask({history,
  task:{goal:'Repair the mobile navigation and accessibility of a public page',
    action:'PROPOSE_UI_FIX',domains:['UI_UX','DESIGN']}});
 assert.equal(x.matchingHistoricalCommitCount,2);
 assert.equal(x.precedents[0].commitSha,sha('a'));
 assert.equal(x.precedents[0].rootCauseVerified,false);
 assert.equal(x.precedents[0].safeSourceDiffReviewed,false);
 assert.equal(x.canEditRepository,false);
 assert.equal(x.canRelease,false);
 assert.equal(x.proofOfIndependentDesignIntelligence,false);
 assert.equal(x.workflowHistoryTruncated,true);
 assert.equal(x.nextWork.at(-1).privilege,'OWNER_GATED');
});
test('do not conflate passing GitHub Actions with an actual Bertina deployment',()=>{
 const x=assessHistoricalEngineeringTask({history,
  task:{goal:'Test a new responsive navigation without regressions',
   action:'DIAGNOSE_REGRESSION',domains:['UI_UX']}});
 assert.ok(x.precedents.every(p=>p.deployedToBertinaVerified===false));
 assert.equal(x.doesNotTrainModelWeights,true);
});
test('find an observed fail->pass pair but decline to certify causal root cause',()=>{
 const r=identifyHistoricalRepairCandidates({history,workflow:'Public UI QA'});
 assert.equal(r.possiblePairCount,1);
 assert.deepEqual(r.pairs[0].failedCommitSha,sha('a'));
 assert.equal(r.pairs[0].laterSuccessfulCommitSha,sha('b'));
 assert.equal(r.pairs[0].actualFixNotProven,true);
 assert.equal(r.verifiedFixes,0);
});
test('reject data outside original repo, malformed task and fake commit refs',()=>{
 assert.throws(()=>assessHistoricalEngineeringTask({
  history:{...history,repository:'someone-else/repo'},
  task:{goal:'Repair design',action:'PROPOSE_UI_FIX',domains:['UI_UX']}
 }),/SCHEMA/);
 assert.throws(()=>assessHistoricalEngineeringTask({
  history,task:{goal:'Run arbitrary shell command',action:'RUN_SHELL',domains:['CODE']}
 }),/TASK_INVALID/);
 assert.throws(()=>assessHistoricalEngineeringTask({
  history:{...history,runObservations:[{...reports[0],commitSha:'no-sha'}]},
  task:{goal:'Fix a regression',action:'DIAGNOSE_REGRESSION',domains:['CODE']}
 }),/SHA_INVALID/);
});
test('subject domains are whitelisted and bounded',()=>{
 assert.throws(()=>assessHistoricalEngineeringTask({
  history,task:{goal:'Change all permissions',action:'PROPOSE_CODE_FIX',
    domains:['UNREGISTERED_PRIVILEGE']}
 }),/TASK_INVALID/);
});
