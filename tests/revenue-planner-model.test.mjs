import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastRevenue} from '../assets/js/revenue-planner-model.mjs';
const base={currency:'USD',lines:[{quantity:20,unitPriceMinor:15000,unitCostMinor:2000,minutesPerUnit:60}],monthlyGoalMinor:1000000,fixedCostMinor:50000,refundReserveBasisPoints:500,availableMinutes:1800};
test('commercial forecast uses integer minor units and never claims verified income',()=>{
 const r=forecastRevenue(base);
 assert.equal(r.grossMinor,300000);
 assert.equal(r.reserveMinor,15000);
 assert.equal(r.directCostMinor,40000);
 assert.equal(r.contributionMinor,195000);
 assert.equal(r.goalGapMinor,700000);
 assert.equal(r.capacityStatus,'WITHIN_CAPACITY');
 assert.equal(r.isOperationalEvidence,false);
});
test('capacity exception is visible',()=>assert.equal(forecastRevenue({...base,availableMinutes:1000}).capacityStatus,'OVER_CAPACITY'));
test('unknown effort is never interpreted as free capacity',()=>assert.equal(forecastRevenue({...base,lines:[{quantity:1,unitPriceMinor:100,unitCostMinor:0,minutesPerUnit:null}]}).capacityStatus,'UNKNOWN'));
test('unknown available time is not certified',()=>assert.equal(forecastRevenue({...base,availableMinutes:null}).capacityStatus,'UNKNOWN'));
test('without price assumptions there is no projected revenue',()=>assert.equal(forecastRevenue({currency:'IRT'}).grossMinor,0));
test('invalid inputs cannot create fake scenarios',()=>{
 for(const v of [-1,NaN,Infinity,1.5])assert.throws(()=>forecastRevenue({...base,monthlyGoalMinor:v}),RangeError);
 assert.throws(()=>forecastRevenue({...base,currency:'USD/IRT'}),RangeError);
 assert.throws(()=>forecastRevenue({...base,refundReserveBasisPoints:11000}),RangeError);
 assert.throws(()=>forecastRevenue({...base,lines:[{quantity:1,unitPriceMinor:-1,unitCostMinor:0,minutesPerUnit:0}]}),RangeError);
});
test('negative contribution is reported without disguising it as revenue',()=>{
 const r=forecastRevenue({currency:'IRT',fixedCostMinor:200,lines:[{quantity:1,unitPriceMinor:100,unitCostMinor:300,minutesPerUnit:60}]});
 assert.equal(r.contributionMinor,-400);
});
