import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseRaveFunnel} from './rave-conversion-diagnostics.mjs';
const e=(stage,count)=>({stage,count});
test('flags high drop-off without claiming causality',()=>{
 const r=diagnoseRaveFunnel([e('visit',100),e('engagement',60),e('lead',12),e('checkout',8),e('purchase',5)]);
 assert.ok(r.opportunities.some(x=>x.from==='engagement'&&x.to==='lead'&&x.priority==='high'));
 assert.equal(r.causalClaims,false);assert.equal(r.productionTouched,false);
});
test('flags inconsistent funnel data',()=>{
 const r=diagnoseRaveFunnel([e('visit',20),e('engagement',25)]);
 assert.ok(r.opportunities.some(x=>x.status==='data-quality'));
});
test('suppresses conclusions on insufficient baseline',()=>{
 const r=diagnoseRaveFunnel([e('visit',4),e('engagement',1)]);
 assert.equal(r.opportunities.length,0);
});
test('rejects invalid baseline',()=>assert.throws(()=>diagnoseRaveFunnel([],{minimumBaseline:0}),TypeError));
