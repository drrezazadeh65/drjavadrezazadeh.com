import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendRaveActions} from './rave-growth-recommendations.mjs';
const e=(stage,count)=>({stage,count});
test('maps checkout drop-off to payment investigation without changing site',()=>{
 const r=recommendRaveActions([e('visit',100),e('engagement',90),e('lead',80),e('checkout',70),e('purchase',7)]);
 assert.ok(r.recommendations.some(x=>x.action==='audit-payment-and-checkout-errors'&&x.status==='hypothesis-needs-experiment'));
 assert.equal(r.productionTouched,false);
 assert.ok(r.recommendations.every(x=>x.autoApply===false));
});
test('prioritizes data quality over optimization advice',()=>{
 const r=recommendRaveActions([e('visit',20),e('engagement',40)]);
 assert.equal(r.recommendations[0].action,'validate-event-instrumentation');
 assert.equal(r.recommendations[0].status,'requires-data-review');
});
test('avoids suggestions without sufficient evidence',()=>{
 const r=recommendRaveActions([e('visit',3),e('engagement',1)]);
 assert.equal(r.recommendations.length,0);
});
