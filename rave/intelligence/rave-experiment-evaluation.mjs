/** Offline randomized-experiment summary. No causal claim without design checks. */
export function evaluateRaveExperiment({control,treatment,randomized=false,metric='conversion'}={}){
 const valid=arm=>arm&&Number.isSafeInteger(arm.visitors)&&arm.visitors>0&&Number.isSafeInteger(arm.conversions)&&arm.conversions>=0&&arm.conversions<=arm.visitors;
 if(!valid(control)||!valid(treatment))throw new TypeError('Invalid experiment arms');
 const p0=control.conversions/control.visitors,p1=treatment.conversions/treatment.visitors;
 const pooled=(control.conversions+treatment.conversions)/(control.visitors+treatment.visitors);
 const se=Math.sqrt(pooled*(1-pooled)*(1/control.visitors+1/treatment.visitors));
 const z=se===0?null:(p1-p0)/se;
 const guardrails={randomized:Boolean(randomized),minimumPerArm:control.visitors>=100&&treatment.visitors>=100,validBinaryMetric:true};
 return {metric,controlRate:p0,treatmentRate:p1,absoluteLift:p1-p0,relativeLift:p0>0?(p1-p0)/p0:null,zScore:z,guardrails,decision:'inconclusive',reason:'Exploratory summary only: no power, sequential-testing or multiplicity controls.',productionTouched:false};
}
