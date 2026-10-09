import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServiceGrowthWorkboard,submitGrowthEvidence} from './service-growth-workboard.mjs';
import {reviewGrowthTask} from './service-growth-review.mjs';
test('requires evidence and independent review before offline approval',()=>{
 const original=buildServiceGrowthWorkboard([{id:'s1'}]);
 const taskId=original.tasks[0].id;
 assert.throws(()=>reviewGrowthTask(original,taskId,{reviewer:'reviewer2',decision:'approve',reason:'Checked'}));
 const submitted=submitGrowthEvidence(original,taskId,{references:['internal:brief-v1'],reviewer:'editor1'});
 assert.throws(()=>reviewGrowthTask(submitted,taskId,{reviewer:'editor1',decision:'approve',reason:'Checked'}));
 const reviewed=reviewGrowthTask(submitted,taskId,{reviewer:'reviewer2',decision:'approve',reason:'Source verified'});
 assert.equal(reviewed.tasks[0].state,'approved-for-offline-work');
 assert.equal(reviewed.tasks[0].approved,true);
 assert.equal(submitted.tasks[0].approved,false);
 assert.equal(reviewed.autoDeploy,false);
 assert.equal(reviewed.productionTouched,false);
});
test('rejection does not authorize implementation',()=>{
 const board=buildServiceGrowthWorkboard([{id:'s1'}]);
 const submitted=submitGrowthEvidence(board,board.tasks[0].id,{references:['internal:brief'],reviewer:'editor1'});
 const reviewed=reviewGrowthTask(submitted,board.tasks[0].id,{reviewer:'reviewer2',decision:'reject',reason:'Insufficient source'});
 assert.equal(reviewed.tasks[0].approved,false);
 assert.equal(reviewed.tasks[0].state,'changes-requested');
});
