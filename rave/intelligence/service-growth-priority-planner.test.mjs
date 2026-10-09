import test from 'node:test';
import assert from 'node:assert/strict';
import {prioritizeServiceGrowthFixes} from './service-growth-priority-planner.mjs';
test('checkout and identity policy blockers are prioritized',()=>{
 const r=prioritizeServiceGrowthFixes([{id:'s1',titleFa:'خدمت',checkout:{enabled:false,emailRequired:false,phoneVerification:true}}]);
 assert.ok(r.tasks.length>0);
 assert.equal(r.tasks[0].priority,100);
 assert.ok(r.tasks.some(t=>t.code==='missing-academic-basis'));
 assert.equal(r.autoApply,false);assert.equal(r.productionTouched,false);
});
test('empty service set is not treated as measured revenue opportunity',()=>{
 const r=prioritizeServiceGrowthFixes([]);
 assert.equal(r.totalTasks,0);assert.equal(r.revenueImpactMeasured,false);
});
