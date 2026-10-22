/**
 * JR university-admissions forecasting — offline scientific validation gate.
 *
 * NOT a trained model and NEVER a prediction service. This module only
 * assesses an independently collected, de-identified, time-held-out research
 * sample, and cannot turn research metrics into live predictions by itself.
 *
 * Brier score, calibration ECE, log loss, prevalence baseline, group coverage,
 * temporal holdout checks and independent evidence attestations are explicit.
 * No online data, no PII or persisted scores. No simulated admissions data.
 */
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export const ADMISSION_VALIDATION_VERSION='1.0.0';
export const ADMISSION_VALIDATION_DEFAULTS=Object.freeze({
  minHoldoutN:400,minPositiveOutcomes:75,minNegativeOutcomes:75,
  minGroupN:70,minGroupPositive:15,minGroupNegative:15,
  minBrierSkill:0.05,maxExpectedCalibrationError:0.08,
  maxGroupCalibrationError:0.12,
  requiredIndependentHoldoutCycles:1,requireIndependentDataSteward:true,
  requireIndependentScientificReviewer:true,allowLiveDeployment:false
});
const goodId=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(x);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const groups=new Set(['HUMANITIES','EXPERIMENTAL_SCIENCES','MATHEMATICS','ARTS','FOREIGN_LANGUAGES']);
const year=x=>Number.isInteger(x)&&x>=1400&&x<=1500;
const rounded=x=>Number.isFinite(x)?Number(x.toFixed(6)):null;
const digest=rows=>createHash('sha256').update(JSON.stringify(rows),'utf8').digest('hex');
function macMatches(secret,data,signature){
  if(!Buffer.isBuffer(secret)||secret.length<32||!hex(signature))return false;
  return timingSafeEqual(
    createHmac('sha256',secret).update(data,'utf8').digest(),
    Buffer.from(signature,'hex')
  );
}
const freezeObject=x=>Object.freeze(x);
function computeMetrics(rows){
  const n=rows.length;
  if(n===0)return null;
  let positive=0,brier=0,logloss=0;
  const bins=Array.from({length:10},()=>({n:0,predicted:0,observed:0}));
  for(const row of rows){
    const p=row.probability,y=row.admitted?1:0;
    positive+=y;
    brier+=(p-y)**2;
    const pSafe=Math.min(1-1e-12,Math.max(1e-12,p));
    logloss-=y*Math.log(pSafe)+(1-y)*Math.log(1-pSafe);
    const bin=bins[Math.min(9,Math.floor(p*10))];
    bin.n++;bin.predicted+=p;bin.observed+=y;
  }
  brier/=n;logloss/=n;
  const base=positive/n;
  const baselineBrier=base*(1-base);
  const calibration=bins.filter(b=>b.n>0).map(b=>({
    count:b.n,meanForecast:rounded(b.predicted/b.n),
    observedRate:rounded(b.observed/b.n)
  }));
  const ece=bins.reduce((sum,b)=>sum+(b.n?
    b.n/n*Math.abs(b.predicted/b.n-b.observed/b.n):0),0);
  return freezeObject({
    sampleSize:n,admitted:positive,notAdmitted:n-positive,
    prevalence:rounded(base),brier:rounded(brier),logLoss:rounded(logloss),
    prevalenceBaselineBrier:rounded(baselineBrier),
    brierSkill:baselineBrier===0?null:rounded(1-brier/baselineBrier),
    expectedCalibrationError:rounded(ece),
    calibrationByDecile:Object.freeze(calibration.map(freezeObject))
  });
}
/**
 * The data and review attestations can only be supplied by offline, trusted
 * scientific infrastructure with independent custody of two HMAC keys.
 * The signed payload binds to exact cycle splits, metric code and data digest.
 */
function independentApproval({modelVersion,trainCycles,holdoutCycles,dataSha256},ctx){
  const a=ctx?.approval;
  if(!plain(a)||!goodId(a.dataStewardId)||!goodId(a.scientificReviewerId)||
    a.dataStewardId===a.scientificReviewerId||
    !goodId(a.approvalReference)||a.decision!=='APPROVED'||
    a.scope!=='TEMPORAL_HOLDOUT_MODEL_VALIDATION')return false;
  const msg=JSON.stringify([
    'jr.admission-validation-v1',modelVersion,trainCycles,holdoutCycles,
    dataSha256,a.dataStewardId,a.scientificReviewerId,
    a.approvalReference,a.decision,a.scope
  ]);
  return macMatches(ctx.dataStewardKey,msg,a.dataStewardSignature)&&
    macMatches(ctx.scientificReviewerKey,msg,a.scientificReviewerSignature);
}
/**
 * @param trainingCycles array of Jalali academic cycles from model training.
 * @param holdoutRows exactly de-identified [cycle, examinationGroup,
 *        probability, admitted] observations. No personal IDs accepted.
 * @returns a source-only scientific audit, not a publishable model endpoint.
 */
export function assessAdmissionForecastValidation({
  modelVersion='',trainingCycles=[],holdoutCycles=[],holdoutRows=[],
  scientificContext=null,policy=ADMISSION_VALIDATION_DEFAULTS
}={}){
  const problems=[];
  if(!goodId(modelVersion))problems.push('INVALID_MODEL_VERSION');
  if(!Array.isArray(trainingCycles)||!trainingCycles.length||
    trainingCycles.length>20||!trainingCycles.every(year)||
    new Set(trainingCycles).size!==trainingCycles.length)
    problems.push('INVALID_TRAINING_CYCLES');
  if(!Array.isArray(holdoutCycles)||!holdoutCycles.length||
    holdoutCycles.length>10||!holdoutCycles.every(year)||
    new Set(holdoutCycles).size!==holdoutCycles.length)
    problems.push('INVALID_HOLDOUT_CYCLES');
  if(Array.isArray(trainingCycles)&&Array.isArray(holdoutCycles)&&
    (holdoutCycles.some(y=>trainingCycles.includes(y))||
    Math.min(...holdoutCycles)<=Math.max(...trainingCycles)))
    problems.push('TEMPORAL_LEAKAGE_OR_OVERLAP');
  if(!Array.isArray(holdoutRows)||holdoutRows.length>100000)
    problems.push('INVALID_HOLDOUT_SAMPLE');
  const records=[];
  if(Array.isArray(holdoutRows)&&holdoutRows.length<=100000){
    for(const row of holdoutRows){
      if(!plain(row)||Object.keys(row).sort().join('|')!==
        'admitted|cycle|examinationGroup|probability'||
        !year(row.cycle)||!groups.has(row.examinationGroup)||
        !Array.isArray(holdoutCycles)||!holdoutCycles.includes(row.cycle)||
        typeof row.probability!=='number'||
        !Number.isFinite(row.probability)||
        row.probability<0||row.probability>1||
        typeof row.admitted!=='boolean'){
        problems.push('UNTRUSTED_OR_IDENTIFYING_OUTCOME_ROW');
        break;
      }
      records.push({
        cycle:row.cycle,examinationGroup:row.examinationGroup,
        probability:row.probability,admitted:row.admitted
      });
    }
  }
  if(problems.length)return Object.freeze({
    schema:'jr.admission-validation-report.v1',
    status:'INVALID_RESEARCH_SAMPLE',blockers:Object.freeze([...new Set(problems)]),
    metrics:null,groupMetrics:Object.freeze([]),
    dataSha256:null,independentScientificApproval:false,
    canPublishProbabilities:false,admissionProbability:null,
    modelValidationEstablished:false
  });
  const metric=computeMetrics(records);
  const minCount=Math.max(400,Number.isSafeInteger(policy?.minHoldoutN)?policy.minHoldoutN:400);
  const minPositive=Math.max(75,Number.isSafeInteger(policy?.minPositiveOutcomes)?policy.minPositiveOutcomes:75);
  const minNegative=Math.max(75,Number.isSafeInteger(policy?.minNegativeOutcomes)?policy.minNegativeOutcomes:75);
  if(metric.sampleSize<minCount)problems.push('INSUFFICIENT_HELD_OUT_SAMPLE');
  if(metric.admitted<minPositive||metric.notAdmitted<minNegative)
    problems.push('INSUFFICIENT_OUTCOME_EVENT_COUNTS');
  const subgroup=[];
  for(const key of [...groups].sort()){
    const rows=records.filter(r=>r.examinationGroup===key);
    if(!rows.length)continue;
    const n=rows.length,positive=rows.filter(r=>r.admitted).length;
    const reveal=n>=Math.max(70,policy?.minGroupN||70)&&
      positive>=Math.max(15,policy?.minGroupPositive||15)&&
      n-positive>=Math.max(15,policy?.minGroupNegative||15);
    if(!reveal){problems.push('SUBGROUP_CALIBRATION_SAMPLE_INSUFFICIENT');continue;}
    const groupMetric=computeMetrics(rows);
    subgroup.push(Object.freeze({
      group:key,sampleSize:n,positiveOutcomes:positive,
      expectedCalibrationError:groupMetric.expectedCalibrationError,
      brier:groupMetric.brier,
      meetsCalibrationThreshold:
        groupMetric.expectedCalibrationError<=
        Math.min(0.12,policy?.maxGroupCalibrationError??0.12)
    }));
    if(!subgroup.at(-1).meetsCalibrationThreshold)
      problems.push('SUBGROUP_CALIBRATION_BELOW_STANDARD');
  }
  if(!subgroup.length)problems.push('NO_REPORTABLE_SUBGROUPS');
  if(metric.brierSkill===null||metric.brierSkill<
    Math.max(.05,policy?.minBrierSkill??.05))
    problems.push('PREDICTION_NOT_BETTER_THAN_PREVALENCE_BASELINE');
  if(metric.expectedCalibrationError>
    Math.min(.08,policy?.maxExpectedCalibrationError??.08))
    problems.push('GLOBAL_CALIBRATION_BELOW_STANDARD');
  const cycles=Object.freeze([...holdoutCycles].sort((a,b)=>a-b));
  const training=Object.freeze([...trainingCycles].sort((a,b)=>a-b));
  const sorted=[...records].sort((a,b)=>
    a.cycle-b.cycle||a.examinationGroup.localeCompare(b.examinationGroup)||
    a.probability-b.probability||Number(a.admitted)-Number(b.admitted));
  const dataSha256=digest(sorted);
  const trusted=independentApproval({
    modelVersion,trainCycles:training,holdoutCycles:cycles,dataSha256
  },scientificContext);
  if(!trusted)problems.push('INDEPENDENT_SCIENTIFIC_APPROVAL_MISSING');
  const evidenceAccepted=problems.length===0;
  return Object.freeze({
    schema:'jr.admission-validation-report.v1',
    version:ADMISSION_VALIDATION_VERSION,
    modelVersion,trainingCycles:training,holdoutCycles:cycles,
    dataSha256,
    status:evidenceAccepted?'OFFLINE_SCIENTIFIC_REVIEW_PASSED':'RESEARCH_METRICS_NOT_APPROVED',
    blockers:Object.freeze([...new Set(problems)].sort()),
    metrics:metric,groupMetrics:Object.freeze(subgroup),
    independentScientificApproval:trusted,
    // A quality audit is a NECESSARY but not SUFFICIENT condition.
    // The separate production gates require user consent, current-cycle
    // relevance, financial/security operational approvals and model monitoring.
    canPublishProbabilities:false,admissionProbability:null,
    modelValidationEstablished:evidenceAccepted,
    releaseRequiresIndependentProductionAuthorization:true
  });
}
