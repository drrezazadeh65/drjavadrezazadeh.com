import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEngineDashboardView} from './admin-engine-dashboard-view.mjs';
const at='2026-10-09T20:00:00Z';
test('fresh verified active status stays active',()=>{
 const v=buildEngineDashboardView({as_of:at,engines:[{id:'crm',status:'ACTIVE',last_verified_at:'2026-10-09T19:59:00Z'}]},{now:new Date(at)});
 assert.equal(v.totals.ACTIVE,1);assert.equal(v.live_verified,1);
});
test('stale and future-dated active status never appears active',()=>{
 const v=buildEngineDashboardView({as_of:at,engines:[{id:'crm',status:'ACTIVE',last_verified_at:'2026-10-09T19:00:00Z'},{id:'commerce',status:'ACTIVE',last_verified_at:'2026-10-09T20:01:00Z'}]},{now:new Date(at)});
 assert.equal(v.totals.ACTIVE,0);assert.equal(v.totals.UNVERIFIED,2);
});
test('problem states appear before healthy states and unknown data is unverified',()=>{
 const v=buildEngineDashboardView({as_of:at,engines:[{id:'crm',status:'ACTIVE',last_verified_at:at},{id:'commerce',status:'BLOCKED',last_verified_at:at},{id:'assessment',status:'BROKEN'}]},{now:new Date(at)});
 assert.deepEqual(v.engines.map(e=>e.status),['BLOCKED','UNVERIFIED','ACTIVE']);
});
