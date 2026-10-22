/**
 * JR Integrated Educational Intelligence — source-only coordination v1.
 *
 * Need -> actual pre-existing published route -> suitable educational stage.
 * This facade NEVER fetches, grades people, predicts admissions, changes
 * student/account data, charges money or activates administrative collectors.
 *
 * Evaluation is a closed state machine. Research/official/commerce privileges
 * cannot be derived from flags supplied by a visitor. Human scientific
 * approvals and server-held attestations stay outside this application layer.
 */
import {routeEducationalNeed,listEducationalJourneys} from './jr-educational-journey-router.mjs';
import {getFreeBaharStarter,createLocalBaharCycle,createLocalBaharCompass} from './jr-bahar-study-bridge.mjs';
import {prepareChoiceStudioEvidence} from './jr-educational-evidence-exchange.mjs';
import {compileOfficialAdmissionsCatalogue,JR_CATALOGUE_DEFAULT_POLICY} from './jr-admission-catalogue-trust-gate.mjs';
import {assessAdmissionForecastValidation} from './jr-admission-outcome-validation.mjs';

export const EDUCATIONAL_MASTER_VERSION='1.0.0';
export const EDUCATIONAL_MASTER_SCHEMA='jr.educational-master-coordination.v1';
export const ENGINE_STATUS=Object.freeze({
  'golden-talent':'RESEARCH_PREVALIDATION',
  rcas:'RESEARCH_PREVALIDATION',
  bahar:'TWO_FREE_INTRO_MODULES',
  'golden-path':'HUMAN_RELEASE_REQUIRED',
  'admission-intelligence':'OFFICIAL_SOURCE_VALIDATION_REQUIRED',
  'choice-studio':'NONPREDICTIVE_PERSONAL_COMPARISON'
});
const ENGINES=Object.freeze(Object.keys(ENGINE_STATUS));
const staticLimits=Object.freeze({
  predictsAdmissions:false,psychometricAssessment:false,
  activatesPaidContent:false,collectsPersonalIdentifiers:false,
  publishesOfficialAdmissionCatalogue:false,
  requiresExplicitConsentBeforeSensitiveInput:true,
  mandatesHumanReviewForValidatedClaims:true
});
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const done=(stage,details)=>{
  return Object.freeze({schema:EDUCATIONAL_MASTER_SCHEMA,
    version:EDUCATIONAL_MASTER_VERSION,stage,...details,
    boundaries:staticLimits});
};
const noTrust=()=>Object.freeze({
  officialProgrammeRowsApproved:0,
  officialCataloguePublished:false,
  predictionValidated:false,
  predictionPublished:false,
  offerEntitlementsActivated:false
});
/** A public catalogue of route labels and factual source readiness, never PII. */
export function educationalPublicDirectory(language='fa'){
  const locale=language==='en'?'en':'fa';
  return done('NEED_FIRST_DIRECTORY',{
    locale,engines:ENGINES.map(id=>Object.freeze({
      id,state:ENGINE_STATUS[id]})),
    routes:listEducationalJourneys(locale).map(route=>Object.freeze({
      need:route.need,href:route.href,label:route.label,
      engine:route.engine,stage:route.stage,predictive:false
    })),
    readiness:noTrust(),candidateProfile:null
  });
}
/**
 * Need-initiated routing. Declare only a preapproved NEED code, never an
 * unbounded free-text learner profile; the caller decides what to display.
 */
export function requestEducationalJourney({need,language='fa'}={}){
  const route=routeEducationalNeed(need,{language});
  if(!route.ok)return done('INVALID_NEED',{
    ok:false,errors:Object.freeze(['UNKNOWN_EDUCATIONAL_NEED']),
    route:null,nextAction:'CHOOSE_PREAPPROVED_NEED',
    readiness:noTrust()
  });
  const official=route.needsOfficialSource||route.engine==='admission-intelligence';
  return done('PRELIMINARY_EDUCATIONAL_ROUTE',{
    ok:true,route:Object.freeze({
      need:route.need,href:route.href,label:route.label,engine:route.engine,
      stage:route.stage,requiresOfficialSource:official
    }),
    nextAction:official?'VERIFY_OFFICIAL_SOURCES_WITH_HUMAN':'OPEN_INFORMATIONAL_PAGE',
    humanJudgementRequired:true,consentForPrivateInputsRequired:true,
    readiness:noTrust()
  });
}
/**
 * BAHAR has only its first two modules free. Other modules remain
 * access-controlled by the original mother-database entitlements.
 */
export function requestFreeBaharResource(){
  const starter=getFreeBaharStarter();
  return done('FREE_EDUCATIONAL_STARTER',{
    ok:true,engine:'bahar',
    resource:starter,
    visibleSections:2,
    paidContentReturned:false,
    writableAccountDataReturned:false,
    entitlementStatus:'NOT_ASSESSED'
  });
}
export function prepareBaharPersonalDraft({
  type='week',goal='',action='',weekStart='',
  successEvidence='',context=''
}={}){
  const result=type==='week'
    ?createLocalBaharCycle({goal,action,weekStart})
    :type==='compass'
      ?createLocalBaharCompass({goal,successEvidence,context})
      :{ok:false,reason:'Unsupported BAHAR draft type'};
  return done('LOCAL_PERSONAL_WORKSHEET',{
    ok:result.ok===true,engine:'bahar',type,
    draft:result.ok===true?Object.freeze(
      type==='week'?result.cycle:result.compass
    ):null,
    reason:result.ok===true?null:result.reason,
    persistence:'NONE',humanReviewRequired:true,
    interpretation:'SELF_AUTHORED_RESEARCH_STAGE_NOT_VALIDATED'
  });
}
/**
 * Explicit user-originated evidence exchange. This is an owner-side
 * research contract; the trusted context cannot come from the browser.
 */
export function prepareEducationToChoiceContext({
  evidence,consent=false,trustedReviewContext=null
}={}){
  if(consent!==true)return done('CONSENT_REQUIRED',{
    ok:false,reason:'Explicit user consent required',
    context:null
  });
  if(!plain(evidence)||evidence.consent!==true)
    return done('INVALID_EVIDENCE',{
      ok:false,reason:'Evidence must carry explicit exchange consent',
      context:null
    });
  const review=prepareChoiceStudioEvidence(evidence,trustedReviewContext);
  return done(review.ok?'DESCRIPTIVE_CHOICES_CONTEXT':'EVIDENCE_NOT_AUTHORIZED',{
    ok:review.ok===true,context:review.ok?review.value:null,
    reason:review.ok?null:review.errors,
    admissionProbability:null,
    fiveCriteriaAltered:false
  });
}
/**
 * Official sources are disabled unless a separately approved, server-owned
 * policy and independent signed reviewer evidence are provided.
 */
export function prepareOfficialCatalogueForReview({
  cycle=1405,sources=[],programmeRows=[],coverage=null
}={}){
  // Force the repository's OFF policy. A UI-supplied "enabled" cannot
  // activate admission research or publish programme rows.
  const result=compileOfficialAdmissionsCatalogue({
    cycle,sources,programmeRows,coverage,policy:JR_CATALOGUE_DEFAULT_POLICY
  });
  return done('OFFICIAL_SOURCES_PENDING_INDEPENDENT_REVIEW',{
    ok:false,cycle,
    scannedRows:result.receivedRows,
    approvedRows:0,
    blockers:result.blockers,
    canPublish:false,canPredictAdmission:false,
    admissionProbability:null,
    releaseAuthority:'NOT_GRANTED'
  });
}
/** This surface can summarize an offline audit, never return a prediction. */
export function inspectPredictionResearch({
  modelVersion='',trainingCycles=[],holdoutCycles=[],holdoutRows=[]
}={}){
  const report=assessAdmissionForecastValidation({
    modelVersion,trainingCycles,holdoutCycles,holdoutRows,
    scientificContext:null
  });
  return done('PREDICTION_RESEARCH_NOT_AUTHORIZED',{
    ok:report.status!=='INVALID_RESEARCH_SAMPLE',
    modelVersion:report.modelVersion??null,
    reportedMetrics:report.metrics??null,
    reportBlockers:report.blockers,
    scientificallyApproved:false,
    predictionsEnabled:false,admissionProbability:null,
    productionModelId:null
  });
}
