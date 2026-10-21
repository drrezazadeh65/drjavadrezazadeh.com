/**
 * JR Revenue Planning Studio — hypothetical arithmetic only.
 * No sales, bank, customer, analytics or payment records are read here.
 * Currency is deliberately not converted: inputs and outputs use minor units.
 */
const safe=(v,label,max=Number.MAX_SAFE_INTEGER)=>{
  if(!Number.isSafeInteger(v)||v<0||v>max)throw new RangeError(label+' must be a non-negative safe integer');
  return v;
};
const add=(a,b,label)=>safe(a+b,label);
const multiply=(a,b,label)=>safe(a*b,label);
export function forecastRevenue({currency,lines=[],monthlyGoalMinor=0,fixedCostMinor=0,refundReserveBasisPoints=0,availableMinutes=null,goalMetric='GROSS'}={}){
  if(!['IRT','USD'].includes(currency))throw new RangeError('unsupported currency');
  if(!Array.isArray(lines)||lines.length>30)throw new RangeError('invalid scenario lines');
  safe(monthlyGoalMinor,'monthly goal');safe(fixedCostMinor,'fixed cost');
  if(!['GROSS','CONTRIBUTION'].includes(goalMetric))throw new RangeError('invalid goal metric');
  safe(refundReserveBasisPoints,'reserve',10000);
  if(availableMinutes!==null)safe(availableMinutes,'available minutes');
  let grossMinor=0,directCostMinor=0,gatewayFeeMinor=0,marketingCostMinor=0,otherAttributableCostMinor=0,units=0,requiredMinutes=0,unknownEffort=false;
  for(const line of lines){
    if(!line||typeof line!=='object')throw new RangeError('invalid line');
    const quantity=safe(line.quantity,'quantity',100000);
    const price=safe(line.unitPriceMinor,'unit price');
    const direct=safe(line.unitCostMinor,'unit delivery cost');
    const fee=safe(line.unitGatewayFeeMinor??0,'unit gateway fee');
    const marketing=safe(line.unitMarketingCostMinor??0,'unit marketing cost');
    const other=safe(line.unitOtherAttributableCostMinor??0,'unit other attributable cost');
    if(line.minutesPerUnit!==null)safe(line.minutesPerUnit,'delivery minutes',100000);
    grossMinor=add(grossMinor,multiply(price,quantity,'line gross'),'gross');
    directCostMinor=add(directCostMinor,multiply(direct,quantity,'line cost'),'direct cost');
    gatewayFeeMinor=add(gatewayFeeMinor,multiply(fee,quantity,'gateway fees'),'gateway fees');
    marketingCostMinor=add(marketingCostMinor,multiply(marketing,quantity,'marketing costs'),'marketing costs');
    otherAttributableCostMinor=add(otherAttributableCostMinor,multiply(other,quantity,'other costs'),'other costs');
    units=add(units,quantity,'units');
    if(quantity>0&&line.minutesPerUnit===null)unknownEffort=true;
    if(line.minutesPerUnit!==null)requiredMinutes=add(requiredMinutes,multiply(line.minutesPerUnit,quantity,'line minutes'),'minutes');
  }
  const reserveMinor=safe(Math.round(grossMinor*refundReserveBasisPoints/10000),'reserve amount');
  // Monthly contribution excludes fixed overhead and tax by definition.
  // Show the after-fixed balance separately; it is not audited net profit.
  const contributionMinor=grossMinor-reserveMinor-directCostMinor-gatewayFeeMinor-marketingCostMinor-otherAttributableCostMinor;
  const afterFixedCostMinor=contributionMinor-fixedCostMinor;
  if(!Number.isSafeInteger(contributionMinor)||!Number.isSafeInteger(afterFixedCostMinor))
    throw new RangeError('contribution overflow');
  const selectedValueMinor=goalMetric==='GROSS'?grossMinor:contributionMinor;
  const selectedGoalGapMinor=monthlyGoalMinor-selectedValueMinor;
  if(!Number.isSafeInteger(selectedGoalGapMinor))throw new RangeError('goal gap overflow');
  return {
    kind:'HYPOTHETICAL_NOT_VERIFIED_REVENUE',currency,units,grossMinor,reserveMinor,
    directCostMinor,gatewayFeeMinor,marketingCostMinor,otherAttributableCostMinor,
    fixedCostMinor,contributionMinor,afterFixedCostMinor,
    goalMinor:monthlyGoalMinor,goalMetric,goalGapMinor:Math.max(0,monthlyGoalMinor-grossMinor),
    selectedGoalGapMinor:Math.max(0,selectedGoalGapMinor),
    selectedGoalMet:selectedGoalGapMinor<=0,
    requiredMinutes:unknownEffort?null:requiredMinutes,
    capacityStatus:unknownEffort||availableMinutes===null?'UNKNOWN':requiredMinutes>availableMinutes?'OVER_CAPACITY':'WITHIN_CAPACITY',
    isOperationalEvidence:false
  };
}
