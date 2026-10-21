import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastRevenue} from '../assets/js/revenue-planner-model.mjs';
const base={currency:'USD',lines:[{quantity:20,unitPriceMinor:15000,unitCostMinor:2000,minutesPerUnit:60}],monthlyGoalMinor:1000000,fixedCostMinor:50000,refundReserveBasisPoints:500,availableMinutes:1800};
test('commercial forecast uses integer minor units and never claims verified income',()=>{
 const r=forecastRevenue(base);
 assert.equal(r.grossMinor,300000);
 assert.equal(r.reserveMinor,15000);
 assert.equal(r.directCostMinor,40000);
 assert.equal(r.contributionMinor,245000);
 assert.equal(r.afterFixedCostMinor,195000);
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
 assert.equal(r.contributionMinor,-200);
 assert.equal(r.afterFixedCostMinor,-400);
});


test('contribution and gross targets are distinct; a 10k sale need not yield 10k after costs',()=>{
 const gross=forecastRevenue({...base,monthlyGoalMinor:300000,goalMetric:'GROSS'});
 assert.equal(gross.grossMinor,300000);
 assert.equal(gross.contributionMinor,245000);
 assert.equal(gross.selectedGoalGapMinor,0);
 assert.equal(gross.selectedGoalMet,true);
 const contribution=forecastRevenue({...base,monthlyGoalMinor:300000,goalMetric:'CONTRIBUTION'});
 assert.equal(contribution.goalGapMinor,0,'gross-only gap is preserved for existing callers');
 assert.equal(contribution.selectedGoalGapMinor,55000);
 assert.equal(contribution.selectedGoalMet,false);
 assert.equal(contribution.goalMetric,'CONTRIBUTION');
 assert.equal(contribution.isOperationalEvidence,false);
});
test('negative contribution cannot silently count toward the income goal',()=>{
 const bad=forecastRevenue({currency:'USD',goalMetric:'CONTRIBUTION',
   monthlyGoalMinor:1000000,fixedCostMinor:5000,lines:[{
     quantity:1,unitPriceMinor:1000,unitCostMinor:3000,minutesPerUnit:30
   }]});
 assert.equal(bad.contributionMinor,-2000);
 assert.equal(bad.afterFixedCostMinor,-7000);
 assert.equal(bad.selectedGoalGapMinor,1002000);
 assert.equal(bad.selectedGoalMet,false);
});
test('an invalid contribution goal metric fails closed',()=>{
 assert.throws(()=>forecastRevenue({...base,goalMetric:'AFTER_TAX_NET'}),RangeError);
});

test('monthly contribution deducts provider, acquisition and attributable costs but not fixed overhead',()=>{
 const r=forecastRevenue({
  currency:'USD',goalMetric:'CONTRIBUTION',monthlyGoalMinor:100000,
  fixedCostMinor:12000,refundReserveBasisPoints:1000,availableMinutes:300,
  lines:[{quantity:2,unitPriceMinor:50000,unitCostMinor:10000,
   unitGatewayFeeMinor:1500,unitMarketingCostMinor:2500,unitOtherAttributableCostMinor:500,
   minutesPerUnit:60}]
 });
 assert.equal(r.grossMinor,100000);
 assert.equal(r.reserveMinor,10000);
 assert.equal(r.directCostMinor,20000);
 assert.equal(r.gatewayFeeMinor,3000);
 assert.equal(r.marketingCostMinor,5000);
 assert.equal(r.otherAttributableCostMinor,1000);
 assert.equal(r.contributionMinor,61000);
 assert.equal(r.afterFixedCostMinor,49000);
 assert.equal(r.selectedGoalGapMinor,39000);
 assert.equal(r.isOperationalEvidence,false);
});
test('additional cost inputs cannot become negative or non-integer',()=>{
 for(const field of ['unitGatewayFeeMinor','unitMarketingCostMinor','unitOtherAttributableCostMinor']){
  assert.throws(()=>forecastRevenue({...base,lines:[{...base.lines[0],[field]:-1}]}),RangeError);
  assert.throws(()=>forecastRevenue({...base,lines:[{...base.lines[0],[field]:1.2}]}),RangeError);
 }
});
