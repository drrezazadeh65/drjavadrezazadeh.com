import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDashboard} from './dashboard-model.mjs';
const base={period:'2026-10-09',source:'commerce_backend',currency:'IRR'};
test('dashboard defaults to non-operational',()=>assert.equal(buildDashboard([]).operational,false));
test('net revenue respects verified refund metrics',()=>{
 const rows=[{...base,metric:'gross_revenue_minor',value:10000},{...base,metric:'refunds_minor',value:2500}];
 assert.equal(buildDashboard(rows).commerce.balances[0].net_minor,7500);
});
test('currencies remain separate',()=>{
 const rows=[{...base,metric:'gross_revenue_minor',value:10000},{...base,currency:'USD',metric:'gross_revenue_minor',value:100}];
 assert.equal(buildDashboard(rows).commerce.balances.length,2);
});
