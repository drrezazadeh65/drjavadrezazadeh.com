import test from 'node:test';import assert from 'node:assert/strict';import {funnel,serviceDemand} from './funnel.mjs';
const base={schema:'rave.event.v1',event_id:'event_001',event_name:'service_view',occurred_at:'2026-10-09T12:00:00Z',source_system:'web',consent:'granted',locale:'fa',service_id:'service_01'};
test('duplicate events counted once',()=>assert.equal(funnel([base,base]).find(x=>x.step==='service_view').count,1));
test('untrusted revenue is rejected',()=>assert.throws(()=>serviceDemand([{...base,event_name:'payment_verified',value_minor:1000}])));
test('small demand cohorts are suppressed',()=>assert.deepEqual(serviceDemand([base]),[]));
test('report does not imply user-level funnel',()=>assert.equal(funnel([base])[0].method,'event_counts_not_user_cohorts'));
