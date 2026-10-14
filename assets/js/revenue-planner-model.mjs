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
export function forecastRevenue({currency,lines=[],monthlyGoalMinor=0,fixedCostMinor=0,refundReserveBasisPoints=0,availableMinutes=null}={}){
  if(!['IRT','USD'].includes(currency))throw new RangeError('unsupported currency');
  if(!Array.isArray(lines)||lines.length>30)throw new RangeError('invalid scenario lines');
  safe(monthlyGoalMinor,'monthly goal');safe(fixedCostMinor,'fixed cost');
  safe(refundReserveBasisPoints,'reserve',10000);
  if(availableMinutes!==null)safe(availableMinutes,'available minutes');
  let grossMinor=0,directCostMinor=0,units=0,requiredMinutes=0,unknownEffort=false;
  for(const line of lines){
    if(!line||typeof line!=='object')throw new RangeError('invalid line');
    const quantity=safe(line.quantity,'quantity',100000);
    const price=safe(line.unitPriceMinor,'unit price');
    const direct=safe(line.unitCostMinor,'unit delivery cost');
    if(line.minutesPerUnit!==null)safe(line.minutesPerUnit,'delivery minutes',100000);
    grossMinor=add(grossMinor,multiply(price,quantity,'line gross'),'gross');
    directCostMinor=add(directCostMinor,multiply(direct,quantity,'line cost'),'direct cost');
    units=add(units,quantity,'units');
    if(quantity>0&&line.minutesPerUnit===null)unknownEffort=true;
    if(line.minutesPerUnit!==null)requiredMinutes=add(requiredMinutes,multiply(line.minutesPerUnit,quantity,'line minutes'),'minutes');
  }
  const reserveMinor=safe(Math.round(grossMinor*refundReserveBasisPoints/10000),'reserve amount');
  const contributionMinor=grossMinor-reserveMinor-directCostMinor-fixedCostMinor;
  if(!Number.isSafeInteger(contributionMinor))throw new RangeError('contribution overflow');
  return {
    kind:'HYPOTHETICAL_NOT_VERIFIED_REVENUE',currency,units,grossMinor,reserveMinor,
    directCostMinor,fixedCostMinor,contributionMinor,
    goalMinor:monthlyGoalMinor,goalGapMinor:Math.max(0,monthlyGoalMinor-grossMinor),
    requiredMinutes:unknownEffort?null:requiredMinutes,
    capacityStatus:unknownEffort||availableMinutes===null?'UNKNOWN':requiredMinutes>availableMinutes?'OVER_CAPACITY':'WITHIN_CAPACITY',
    isOperationalEvidence:false
  };
}
