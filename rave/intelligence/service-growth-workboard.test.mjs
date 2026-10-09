import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServiceGrowthWorkboard,submitGrowthEvidence} from './service-growth-workboard.mjs';
test('creates blocked, reviewable work items and never deploys',()=>{
 const board=buildServiceGrowthWorkboard([{id:'s1'}]);
 assert.ok(board.tasks.length>0);
 assert.ok(board.tasks.every(t=>t.state==='blocked-on-evidence'&&!t.approved));
 assert.equal(board.autoDeploy,false);
});
test('evidence submission does not approve a task or mutate prior board',()=>{
 const board=buildServiceGrowthWorkboard([{id:'s1'}]);
 const next=submitGrowthEvidence(board,board.tasks[0].id,{references:['internal:service-brief-v1'],reviewer:'editor1'});
 assert.equal(next.tasks[0].state,'awaiting-review');
 assert.equal(next.tasks[0].approved,false);
 assert.equal(board.tasks[0].state,'blocked-on-evidence');
 assert.equal(next.productionTouched,false);
});
test('rejects empty evidence',()=>{
 const board=buildServiceGrowthWorkboard([{id:'s1'}]);
 assert.throws(()=>submitGrowthEvidence(board,board.tasks[0].id,{references:[],reviewer:'editor1'}));
});
