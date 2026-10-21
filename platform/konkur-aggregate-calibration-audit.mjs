/* Statistical QA of aggregate, fixed-probability historical holdout bins only.
 * Not a trained model, model authorization, official rank or privacy certification.
 */
export const CALIBRATION_AUDIT_SCHEMA='jr-admission-aggregate-holdout-v1';
const groups=new Set(['HUMANITIES','EXPERIMENTAL_SCIENCES','MATHEMATICS','ARTS','FOREIGN_LANGUAGES']);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const version=s=>typeof s==='string'&&/^[a-zA-Z0-9._-]{3,64}$/.test(s);
const round6=n=>Math.round(n*1e6)/1e6;
const response=(status,reason,extra={})=>Object.freeze({
 schema:CALIBRATION_AUDIT_SCHEMA,status,reason,
 admissionProbabilityEnabled:false,modelDeploymentApproved:false,
 independentlyValidated:false,privateLearnerDataAccessed:false,...extra
});
export function auditAggregatedHoldout(report){
 if(report===undefined||report===null)return response('NO_EVIDENCE','CONSENTED_OUTCOME_AGGREGATES_ABSENT');
 if(!exact(report,['schema','modelVersion','trainingCycles','holdoutCycle','outcomeProvenance','bins']))
  return response('REJECTED','UNKNOWN_FIELDS_OR_PRIVATE_IDENTIFIERS');
 if(report.schema!==CALIBRATION_AUDIT_SCHEMA||!version(report.modelVersion)||
   !Array.isArray(report.trainingCycles)||report.trainingCycles.length<2||
   report.trainingCycles.length>5||new Set(report.trainingCycles).size!==report.trainingCycles.length||
   !Number.isSafeInteger(report.holdoutCycle)||report.holdoutCycle<1390||report.holdoutCycle>1410||
   report.trainingCycles.some(y=>!Number.isSafeInteger(y)||y<1390||y>=report.holdoutCycle)||
   report.outcomeProvenance!=='INDEPENDENT_VERIFICATION_PENDING')
  return response('REJECTED','HOLDOUT_OR_PROVENANCE_INVALID');
 if(!Array.isArray(report.bins)||report.bins.length===0||report.bins.length>100)
  return response('REJECTED','BIN_COLLECTION_INVALID');
 let total=0,brier=0,calibration=0;const byGroup=new Map(),seen=new Set();
 for(const b of report.bins){
  if(!exact(b,['group','binCode','cases','admitted','fixedProbability'])||
    !groups.has(b.group)||!version(b.binCode)||seen.has(b.group+':'+b.binCode)||
    !Number.isSafeInteger(b.cases)||b.cases<30||b.cases>1000000||
    !Number.isSafeInteger(b.admitted)||b.admitted<0||b.admitted>b.cases||
    typeof b.fixedProbability!=='number'||!Number.isFinite(b.fixedProbability)||
    b.fixedProbability<0||b.fixedProbability>1)return response('REJECTED','UNSAFE_OR_IDENTIFIABLE_OUTCOME_BIN');
  seen.add(b.group+':'+b.binCode);total+=b.cases;
  if(total>10000000)return response('REJECTED','UNBOUNDED_COHORT');
  const p=b.fixedProbability;
  brier+=b.admitted*(1-p)**2+(b.cases-b.admitted)*p**2;
  calibration+=b.cases*Math.abs(b.admitted/b.cases-p);
  byGroup.set(b.group,(byGroup.get(b.group)||0)+b.cases);
 }
 if(total<500||byGroup.size<2||[...byGroup.values()].some(n=>n<100))
  return response('INSUFFICIENT_EVIDENCE','HOLDOUT_AND_GROUP_COVERAGE_TOO_SMALL',
   {holdoutCases:total,groupsCovered:byGroup.size});
 return response('METRICS_ONLY_UNVERIFIED','INDEPENDENT_HOLDOUT_AND_GROUP_AUDIT_REQUIRED',{
  holdoutCycle:report.holdoutCycle,holdoutCases:total,groupsCovered:byGroup.size,
  metrics:Object.freeze({brierScore:round6(brier/total),
   expectedCalibrationError:round6(calibration/total)}),
  caveat:'No rank estimation, admission prediction, interval calibration, bias assessment, drift monitoring or independent data verification is established by these bins.'
 });
}
