import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServiceGrowthWorkboard} from './service-growth-workboard.mjs';
test('task identifiers remain stable when another service is added',()=>{
 const a={id:'alpha'},b={id:'beta'};
 const first=buildServiceGrowthWorkboard([a]);
 const second=buildServiceGrowthWorkboard([b,a]);
 const original=new Set(first.tasks.map(t=>t.id));
 const after=new Set(second.tasks.filter(t=>t.serviceId==='alpha').map(t=>t.id));
 assert.deepEqual(after,original);
});
test('different services do not share task identifiers',()=>{
 const board=buildServiceGrowthWorkboard([{id:'alpha'},{id:'beta'}]);
 assert.equal(new Set(board.tasks.map(t=>t.id)).size,board.tasks.length);
});
