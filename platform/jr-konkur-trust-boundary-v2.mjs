/* JR Konkur trust boundary v2. Server-side evidence must be fetched independently.
 * Pure module; no DB writes, probabilities or public activation.
 */
export const TRUST_BOUNDARY_VERSION='2.0.0';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x);
const year=x=>Number.isSafeInteger(x)&&x>=1400&&x<=1500;
export function buildTrustedAdmissionContext({scorecard,trustedCatalogue,trustedRules}={}){
 const issues=[];
 if(!obj(scorecard))issues.push('INVALID_SCORECARD');
 if(!Array.isArray(trustedCatalogue)||trustedCatalogue.length>500)issues.push('INVALID_CATALOGUE');
 if(!Array.isArray(trustedRules)||trustedRules.length>100)issues.push('INVALID_RULES');
 if(issues.length)return Object.freeze({status:'REJECTED',issues:Object.freeze(issues),candidate:null,offerings:Object.freeze([]),rules:Object.freeze([]),admissionProbability:null,publicReady:false});
 const candidate=Object.freeze({examYear:scorecard.year,examinationGroup:scorecard.examinationGroup,
  rank:Number.isSafeInteger(scorecard.rank)&&scorecard.rank>0?scorecard.rank:null,
  rankSourceVerified:false,academicRecordStatus:'UNVERIFIED'});
 const offerings=[];
 for(const o of trustedCatalogue){
  if(!obj(o)||!id(o.id)||!year(o.year)||!id(o.sourceFileId)||!Number.isSafeInteger(o.page)||o.page<1||
     o.reviewState!=='APPROVED'||o.sourcePageReviewed!==true||o.conditionsReviewed!==true||o.documentApproved!==true||
     !Array.isArray(o.requirements)||o.requirements.length>200||
     o.requirements.some(r=>!obj(r)||typeof r.code!=='string'||!['MET','NOT_MET','UNKNOWN'].includes(r.status))){
   issues.push('UNVERIFIED_OFFERING');continue;
  }
  offerings.push(Object.freeze({...o,requirements:Object.freeze(o.requirements.map(r=>Object.freeze({...r})))}));
 }
 const rules=[];
 for(const r of trustedRules){
  if(!obj(r)||r.reviewState!=='APPROVED'||r.sourceVerified!==true||!year(r.year)||
     !['EXAM','RECORDS_BASED'].includes(r.admissionTrack)||typeof r.version!=='string'||!r.version.trim()){
   issues.push('UNVERIFIED_RULE');continue;
  }
  rules.push(Object.freeze({...r}));
 }
 return Object.freeze({status:issues.length?'PARTIAL_REJECTION':'READY_FOR_EVIDENCE_REVIEW',
  issues:Object.freeze([...new Set(issues)]),candidate,offerings:Object.freeze(offerings),
  rules:Object.freeze(rules),rankAcceptedAsOfficial:false,admissionProbability:null,publicReady:false});
}
