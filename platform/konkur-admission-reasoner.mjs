/* JR Admission Intelligence: deterministic, explainable, evidence-gated choice analysis.
 * This is a decision-support core, not a trained prediction model.
 * No database I/O, external services, personal identifiers or automatic admissions.
 */
export const ADMISSION_REASONER_VERSION='0.1.0';
const TRACKS=new Set(['EXAM','RECORDS_BASED']);
function integer(v){return Number.isSafeInteger(v)&&v>=0;}
function freeze(value){return Object.freeze(value);}
export function evaluateAdmissionChoice({candidate,offering,rule}={}){
 const issues=[],evidence=[];
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))issues.push('MISSING_CANDIDATE');
 if(!offering||typeof offering!=='object'||Array.isArray(offering))issues.push('MISSING_OFFERING');
 if(!rule||typeof rule!=='object'||Array.isArray(rule))issues.push('MISSING_RULE');
 if(issues.length)return freeze({status:'INSUFFICIENT_EVIDENCE',issues,evidence,eligible:null,admissionProbability:null,rank:null});
 if(!TRACKS.has(offering.admissionTrack))issues.push('UNSUPPORTED_ADMISSION_TRACK');
 if(offering.reviewState!=='APPROVED'||offering.sourcePageReviewed!==true||offering.conditionsReviewed!==true||offering.documentApproved!==true)
  issues.push('OFFERING_NOT_INDEPENDENTLY_VERIFIED');
 if(rule.reviewState!=='APPROVED'||rule.version==null||rule.sourceVerified!==true)
  issues.push('RULE_NOT_INDEPENDENTLY_VERIFIED');
 if(candidate.examYear!==offering.year||rule.year!==offering.year)issues.push('YEAR_MISMATCH');
 if(candidate.examinationGroup!==offering.examinationGroup)issues.push('EXAMINATION_GROUP_MISMATCH');
 if(rule.admissionTrack!==offering.admissionTrack)issues.push('RULE_TRACK_MISMATCH');
 if(offering.admissionTrack==='EXAM'){
  if(!integer(candidate.rank)||candidate.rank===0)issues.push('NO_VERIFIED_RANK');
  if(candidate.rankSourceVerified!==true)issues.push('RANK_SOURCE_UNVERIFIED');
 }else{
  if(typeof candidate.academicRecordStatus!=='string'||candidate.academicRecordStatus!=='VERIFIED')
   issues.push('ACADEMIC_RECORD_NOT_VERIFIED');
 }
 if(!Array.isArray(offering.requirements))issues.push('REQUIREMENTS_NOT_REVIEWED');
 else for(const req of offering.requirements){
  if(!req||typeof req.code!=='string'||!['MET','NOT_MET','UNKNOWN'].includes(req.status))issues.push('INVALID_REQUIREMENT');
  else if(req.status==='UNKNOWN')issues.push('UNRESOLVED_REQUIREMENT:'+req.code);
  else if(req.status==='NOT_MET')evidence.push('UNMET_REQUIREMENT:'+req.code);
 }
 if(issues.length)return freeze({status:'INSUFFICIENT_EVIDENCE',issues:[...new Set(issues)].sort(),evidence,eligible:null,admissionProbability:null,rank:null});
 const eligible=evidence.length===0;
 return freeze({status:eligible?'REQUIREMENTS_SATISFIED':'REQUIREMENTS_NOT_SATISFIED',
  issues:[],evidence,eligible,admissionProbability:null,rank:null,
  explanation:eligible?'Known verified requirements are satisfied; admission is not guaranteed.':'At least one verified requirement is not met.',
  ruleVersion:String(rule.version)});
}
export function evaluateAdmissionChoices({candidate,offerings,rules}={}){
 if(!Array.isArray(offerings)||offerings.length>500||!Array.isArray(rules)||rules.length>100)
  throw new TypeError('Bounded offerings and rules arrays required');
 return freeze({schema:'jr-admission-reasoner-v1',version:ADMISSION_REASONER_VERSION,
  results:offerings.map(offering=>evaluateAdmissionChoice({candidate,offering,
   rule:rules.find(r=>r.year===offering?.year&&r.admissionTrack===offering?.admissionTrack)})),
  probabilityModelTrained:false,automatedAdmission:false,personalDataPersisted:false});
}
