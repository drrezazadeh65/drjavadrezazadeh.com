import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPriorityLaunch} from './priority-growth-release-gates.mjs';
test('does not declare empty inputs ready for release',()=>{
 const r=assessPriorityLaunch();
 assert.equal(r.readyForLiveRelease,false);
 assert.deepEqual(r.missingEvidence,['seo','commerce','magazine','ai']);
 assert.equal(r.productionTouched,false);
});
test('reports commerce quality blockers',()=>{
 const r=assessPriorityLaunch({products:[{sku:'x',titleFa:'کتاب',priceMinor:100,currency:'IRR'}]});
 assert.equal(r.gates.commerce,false);
 assert.ok(r.details.commerce.issues.some(x=>x.code==='missing-en-title'));
});
