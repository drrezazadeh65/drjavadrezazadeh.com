import test from 'node:test';
import assert from 'node:assert/strict';
import {prioritizeDiscoveryRepairs} from './ai-discovery-repair-priorities.mjs';
const pages=[{path:'/fa/services/a/',kind:'service'},{path:'/en/research/a/',kind:'research'}];
test('verified service indexing gaps outrank unverified research coverage',()=>{
 const indexation={findings:[{code:'indexation-unverified',path:'/en/research/a/',source:'bing'},{code:'not-indexed',path:'/fa/services/a/',source:'google'}]};
 const result=prioritizeDiscoveryRepairs({pages,indexation});
 assert.equal(result.actions[0].path,'/fa/services/a/');
 assert.equal(result.actions[0].priority,'investigate-indexing');
 assert.equal(result.readyForAutomaticSubmission,false);
});
test('unknown indexing is never represented as confirmed failure',()=>{
 const result=prioritizeDiscoveryRepairs({pages,indexation:{findings:[{code:'indexation-unverified',path:'/fa/services/a/',source:'google'}]}});
 assert.equal(result.actions[0].evidenceLevel,'unknown');
 assert.equal(result.actions[0].priority,'obtain-indexing-evidence');
});
