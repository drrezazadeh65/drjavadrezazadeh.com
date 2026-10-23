/**
 * JREI examinations — versioned, provider-neutral contracts.
 *
 * Pure source-only gates. The existing assessment-authoring/scoring engine
 * remains authoritative for consented sessions and declared scoring rules.
 * This module never crawls sites, evaluates learners, publishes questions,
 * chooses admission outcomes or stores private data.
 */
import {createHash} from 'node:crypto';

export const EXAM_CONTRACT_VERSION='jr.jrei.examinations.v1';
export const EXAM_LEVELS=Object.freeze([
  {code:'PRIMARY',grades:[1,2,3,4,5,6],scope:'SCHOOL'},
  {code:'LOWER_SECONDARY',grades:[7,8,9],scope:'SCHOOL'},
  {code:'UPPER_SECONDARY',grades:[10,11,12],scope:'SCHOOL'},
  {code:'UNDERGRADUATE_ENTRANCE',grades:[],scope:'ENTRANCE'},
  {code:'MASTERS_ENTRANCE',grades:[],scope:'ENTRANCE'},
  {code:'DOCTORAL_ENTRANCE',grades:[],scope:'ENTRANCE'},
  {code:'UNIVERSITY_ADVANCED',grades:[],scope:'HIGHER_EDUCATION'}
]);
export const EXAM_CATEGORIES=Object.freeze([
  'SCHOOL_INTERNAL','NATIONAL_FINAL','NATIONAL_ENTRANCE',
  'MASTERS_ENTRANCE','DOCTORAL_ENTRANCE','UNIVERSITY_COURSE',
  'ADVANCED_ACADEMIC'
]);
export const ITEM_STATES=Object.freeze([
  'DISCOVERED','EXTRACTED','DRAFT','GENERATED','INDEPENDENT_REVIEW',
  'APPROVED','EMPIRICALLY_EVALUATED','REJECTED','RETIRED'
]);
export const QUALITY_STATES=Object.freeze([
  'THEORETICAL_PROPOSITION','PROPOSED_OPERATIONAL_INDICATOR',
  'EXPERT_REVIEWED','EMPIRICALLY_INVESTIGATED',
  'VALIDATION_SUPPORTED','CONTRADICTED','RETIRED'
]);
export const PREPARATION_STAGES=Object.freeze([
  {code:'DIAGNOSTIC',defaultDaysBefore:30},
  {code:'PROGRESS',defaultDaysBefore:14},
  {code:'FINAL_MOCK',defaultDaysBefore:3}
]);

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const ident=x=>typeof x==='string'&&/^[A-Za-z0-9._:-]{1,100}$/.test(x);
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const norm=s=>String(s??'').normalize('NFKC').trim().replace(/\s+/g,' ');
const text=(x,limit=1200)=>typeof x==='string'&&
  x.trim().length>0&&x.length<=limit;
const result=(reason,extra={})=>Object.freeze({
  ok:false,publicReady:false,reason,...extra
});
const success=(extra={})=>Object.freeze({
  ok:true,publicReady:false,...extra
});
const isoDate=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&
  new Date(s+'T00:00:00Z').toISOString().startsWith(s);
const fingerprint=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

export function validateExamScope(input={}) {
  if(!object(input))return result('EXAM_SCOPE_INVALID');
  const {countryCode,curriculumId,curriculumVersion,level,grade,
    category,subjectId,disciplineId,year}=input;
  const levelInfo=EXAM_LEVELS.find(x=>x.code===level);
  if(!levelInfo||!EXAM_CATEGORIES.includes(category)||
    typeof countryCode!=='string'||!/^[A-Z]{2}$/.test(countryCode)||
    !ident(curriculumId)||!ident(curriculumVersion)||
    !ident(subjectId)||!Number.isInteger(year)||year<1300||year>2400)
    return result('EXAM_SCOPE_INVALID');
  if(disciplineId!==undefined&&disciplineId!==null&&!ident(disciplineId))
    return result('DISCIPLINE_INVALID');
  const school=levelInfo.scope==='SCHOOL';
  if(school&&!levelInfo.grades.includes(grade))
    return result('GRADE_LEVEL_MISMATCH');
  if(!school&&grade!==null&&grade!==undefined)
    return result('HIGHER_EXAM_HAS_NO_SCHOOL_GRADE');
  if(category==='SCHOOL_INTERNAL'&&!school)
    return result('SCHOOL_CATEGORY_LEVEL_MISMATCH');
  if(category==='NATIONAL_FINAL'&&level!=='UPPER_SECONDARY')
    return result('NATIONAL_FINAL_REQUIRES_VERIFIED_SCOPE');
  if(category==='MASTERS_ENTRANCE'&&level!=='MASTERS_ENTRANCE')
    return result('MASTERS_CATEGORY_LEVEL_MISMATCH');
  if(category==='DOCTORAL_ENTRANCE'&&level!=='DOCTORAL_ENTRANCE')
    return result('DOCTORAL_CATEGORY_LEVEL_MISMATCH');
  if(category==='NATIONAL_ENTRANCE'&&level!=='UNDERGRADUATE_ENTRANCE')
    return result('ENTRANCE_CATEGORY_LEVEL_MISMATCH');
  return success({scope:Object.freeze({
    countryCode,curriculumId,curriculumVersion,level,
    grade:school?grade:null,category,subjectId,
    disciplineId:disciplineId??null,year
  })});
}
const ALLOWED_RIGHTS=new Set([
  'DISCOVERY_METADATA_ONLY','PERMITTED_PRIVATE_ANALYSIS',
  'PERMITTED_PUBLIC_DISPLAY','PERMITTED_REPRODUCTION'
]);
/** Source metadata is not licence evidence on its own. */
export function assessExaminationSource({source,task='discover'}={}) {
  if(!object(source)||!ident(source.sourceId)||!ident(source.issuerId)||
    !text(source.title,240)||!isoDate(source.publicationDate)||
    !sha(source.originalSha256)||!ident(source.sourceVersion)||
    !ALLOWED_RIGHTS.has(source.permissionScope)||
    !['UNKNOWN','REVIEW_PENDING','AUTHORITATIVE_REVIEWED'].includes(source.reviewStatus)||
    source.revoked!==false||source.superseded!==false)
    return result('SOURCE_PROVENANCE_OR_RIGHTS_INCOMPLETE');
  if(task==='discover')return success({permission:'METADATA_ONLY'});
  if(!['extract','private_analysis','public_display','reproduce'].includes(task))
    return result('SOURCE_TASK_NOT_ALLOWLISTED');
  if(source.termsReviewApproved!==true||source.robotsAndAccessApproved!==true)
    return result('ACCESS_OR_TERMS_NOT_APPROVED');
  if(source.reviewStatus!=='AUTHORITATIVE_REVIEWED')
    return result('SOURCE_NOT_INDEPENDENTLY_REVIEWED');
  const rights=source.permissionScope;
  const approved=task==='extract'||task==='private_analysis'
    ? ['PERMITTED_PRIVATE_ANALYSIS','PERMITTED_PUBLIC_DISPLAY',
      'PERMITTED_REPRODUCTION'].includes(rights)
    :task==='public_display'
      ?['PERMITTED_PUBLIC_DISPLAY','PERMITTED_REPRODUCTION'].includes(rights)
      :rights==='PERMITTED_REPRODUCTION';
  return approved?success({permission:rights}):
    result('COPYRIGHT_PERMISSION_NOT_ESTABLISHED');
}

/** Explicit candidate lifecycle, no silent jump from generated to approved. */
const ALLOWED_TRANSITIONS=Object.freeze({
  DISCOVERED:['EXTRACTED','REJECTED'],EXTRACTED:['DRAFT','REJECTED'],
  DRAFT:['INDEPENDENT_REVIEW','REJECTED'],
  GENERATED:['INDEPENDENT_REVIEW','REJECTED'],
  INDEPENDENT_REVIEW:['DRAFT','APPROVED','REJECTED'],
  APPROVED:['EMPIRICALLY_EVALUATED','RETIRED'],
  EMPIRICALLY_EVALUATED:['RETIRED'],REJECTED:[],RETIRED:[]
});
export function transitionExamItem({
  item,to,reviewerAccountId,verification
}={}) {
  if(!object(item)||!ident(item.id)||!ident(item.version)||
    !ALLOWED_TRANSITIONS[item.status]?.includes(to))
    return result('ITEM_TRANSITION_FORBIDDEN');
  if(to==='APPROVED'){
    if(!ident(reviewerAccountId)||reviewerAccountId===item.authorAccountId)
      return result('INDEPENDENT_REVIEWER_REQUIRED');
    if(!object(verification)||
      ![
        'subjectCorrect','answerIndependentlyVerified','singleDefensibleAnswer',
        'distractorsReviewed','curriculumAligned','duplicateSearchReviewed',
        'sourceRightsConfirmed','diagramAndFormulaPreserved',
        'constructMatched','humanReviewApproved'
      ].every(k=>verification[k]===true))
      return result('ITEM_VERIFICATION_NOT_COMPLETE');
  }
  if(to==='EMPIRICALLY_EVALUATED'&&
     !(object(verification)&&verification.empiricalStudyId&&
       verification.methodReviewed===true))
    return result('EMPIRICAL_STUDY_NOT_VERIFIED');
  return success({next:Object.freeze({
    ...item,status:to,
    reviewerAccountId:to==='APPROVED'?reviewerAccountId:null
  })});
}

/**
 * Explicitly reject mere option relabelling in the B→C example.
 * Even a changed text fingerprint cannot prove semantic novelty;
 * independent expert attestation is indispensable.
 */
export function inspectGeneratedItem({
  original,candidate,qualityReview
}={}) {
  if(!object(original)||!object(candidate)||!object(qualityReview)||
    !ident(original.id)||!ident(candidate.id)||
    original.id===candidate.id||
    !text(original.stem,10000)||!text(candidate.stem,10000)||
    !Array.isArray(original.options)||!Array.isArray(candidate.options)||
    original.options.length<2||candidate.options.length<2||
    original.options.length!==candidate.options.length||
    !ident(original.correctOption)||!ident(candidate.correctOption))
    return result('ITEM_GENERATION_INPUT_INVALID');
  const choicesValid=(item)=>{
    const ids=new Set();
    for(const x of item.options){
      if(!object(x)||!ident(x.id)||!text(x.text,2000)||ids.has(x.id))
        return false;
      ids.add(x.id);
    }
    return ids.has(item.correctOption);
  };
  if(!choicesValid(original)||!choicesValid(candidate))
    return result('CHOICE_CONTRACT_INVALID');
  const core=(x)=>norm(x).toLocaleLowerCase('en-US');
  const originalCorrect=original.options.find(x=>x.id===original.correctOption);
  const candidateCorrect=candidate.options.find(x=>x.id===candidate.correctOption);
  const oldContent=original.options.map(x=>core(x.text)).sort();
  const newContent=candidate.options.map(x=>core(x.text)).sort();
  if(core(original.stem)===core(candidate.stem)&&
    fingerprint(oldContent)===fingerprint(newContent))
    return result('OPTIONS_REORDERED_ONLY');
  if(core(original.stem)===core(candidate.stem)&&
    core(originalCorrect.text)===core(candidateCorrect.text))
    return result('CORRECT_LABEL_CHANGED_WITHOUT_SUBSTANTIVE_EVIDENCE');
  const required=[
    'substantiveConceptualChange','sameOrLinkedConstruct','answerIndependentlyVerified',
    'oneUnambiguousCorrectAnswer','distractorsDefensible',
    'noCopyrightInfringement','curriculumVersionConfirmed',
    'sourceProvenanceReviewed','subjectExpertSigned'
  ];
  if(required.some(k=>qualityReview[k]!==true)||
     !ident(qualityReview.reviewerAccountId)||
     qualityReview.reviewerAccountId===candidate.authorAccountId)
    return result('GENERATED_ITEM_AWAITS_INDEPENDENT_REVIEW');
  return success({generatedItemStatus:'INDEPENDENT_REVIEW',
    noveltyMethod:'HUMAN_ATTESTED_SOURCE_PLUS_FINGERPRINT',
    originalFingerprint:fingerprint([core(original.stem),oldContent]),
    candidateFingerprint:fingerprint([core(candidate.stem),newContent]),
    noAutomaticPublication:true});
}

/** Default one-month/two-week/shortly-before stages, NOT official dates. */
export function planThreeStagePreparation({
  examDate,examDateAuthority,examDateVerified,
  blueprintVersion,blueprintApproved,scoringRulesVersion,
  stageOverrides={}
}={}) {
  if(!isoDate(examDate)||!ident(examDateAuthority)||
    examDateVerified!==true||!ident(blueprintVersion)||
    blueprintApproved!==true||!ident(scoringRulesVersion)||
    !object(stageOverrides))return result('OFFICIAL_EXAM_DATE_OR_BLUEPRINT_UNVERIFIED');
  const millis=Date.parse(examDate+'T00:00:00Z');
  const stages=[];
  for(const stage of PREPARATION_STAGES){
    const override=own(stageOverrides,stage.code)?stageOverrides[stage.code]:null;
    if(override!==null&&(!object(override)||
       !Number.isInteger(override.daysBefore)||
       override.daysBefore<1||override.daysBefore>365||
       !Number.isInteger(override.durationMinutes)||
       override.durationMinutes<1||override.durationMinutes>480))
      return result('INVALID_STAGE_OVERRIDE');
    const days=override?.daysBefore??stage.defaultDaysBefore;
    const date=new Date(millis-days*86400000).toISOString().slice(0,10);
    stages.push(Object.freeze({
      code:stage.code,scheduledDate:date,
      daysBeforeExam:days,durationMinutes:override?.durationMinutes??null,
      candidateEligibility:'REQUIRES_AUTHORIZED_CHECK',
      scoring:'REQUIRES_PUBLISHED_DECLARED_RULES',
      sourceBlueprintVersion:blueprintVersion,scoringRulesVersion,
      officialForecast:null,status:'SCHEDULE_PROPOSAL'
    }));
  }
  if(!(stages[0].daysBeforeExam>stages[1].daysBeforeExam&&
     stages[1].daysBeforeExam>stages[2].daysBeforeExam))
    return result('STAGE_ORDER_INVALID');
  return success({examDate,examDateAuthority,stages:Object.freeze(stages),
    officialPredictionAvailable:false,schedulePublished:false});
}
