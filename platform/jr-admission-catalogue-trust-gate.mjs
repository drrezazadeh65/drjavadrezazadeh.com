/**
 * JR official admissions catalogue trust gate — RESEARCH/STAGING CONTRACT.
 *
 * Build NO records unless independent humans have reviewed the ORIGINAL PDF
 * AND each extracted programme row, with two separate trusted attestations.
 * Guide authority and PDF page fingerprint do not validate OCR/extraction.
 * Never use self-asserted approved/sourcePageReviewed flags as proof.
 * No file/network/DB access, no automatic publication, no admission odds.
 */
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {
  evaluateAdmissionSource,DEFAULT_ADMISSION_INTAKE_POLICY
} from './jr-admission-source-governance.mjs';

export const JR_OFFICIAL_CATALOGUE_GATE_VERSION='1.0.0';
export const JR_CATALOGUE_DEFAULT_POLICY=Object.freeze({
  ...DEFAULT_ADMISSION_INTAKE_POLICY,
  enabled:false,allowAutomaticPublication:false,allowPrediction:false,
  requireAmendmentClearance:true,requireRowAttestation:true,
  requireHumanReview:true,requireTwoPersonAttestation:true
});
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(v);
const string=(v,max=240)=>typeof v==='string'&&v.trim().length>0&&v===v.trim()&&
  v.length<=max&&!/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
  Number.isFinite(Date.parse(v+'T00:00:00Z'))&&
  new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const group=new Set([
  'HUMANITIES','EXPERIMENTAL_SCIENCES','MATHEMATICS','ARTS','FOREIGN_LANGUAGES'
]);
const careerPaths=new Set(['EXAM','RECORDS_BASED']);
const digest=v=>createHash('sha256').update(JSON.stringify(v),'utf8').digest('hex');
const keyOf=row=>row.cycle+'|'+row.track+'|'+row.examinationGroup+'|'+
  row.programmeCode+'|'+row.quotaKey;
const validKey=(key)=>Buffer.isBuffer(key)&&key.length>=32;
const macMatches=(key,payload,signature)=>{
  if(!validKey(key)||!sha(signature))return false;
  return timingSafeEqual(
    createHmac('sha256',key).update(payload,'utf8').digest(),
    Buffer.from(signature,'hex')
  );
};
const avoidEnrichment=rows=>Object.freeze(rows.map(row=>Object.freeze(row)));
/** Preserve only minimal research metadata; no student identifiers. */
function normalizedRow(row,cycle){
  if(!row||typeof row!=='object'||Array.isArray(row))return null;
  if(row.cycle!==cycle||!careerPaths.has(row.track)||
    !group.has(row.examinationGroup)||!identifier(row.sourceKey)||
    !/^[0-9]{5,8}$/.test(row.programmeCode)||
    !string(row.programmeTitle,300)||!string(row.institutionTitle,300)||
    !identifier(row.quotaKey)||!identifier(row.reviewReference)||
    !Number.isSafeInteger(row.pdfPage)||row.pdfPage<1||row.pdfPage>10000||
    !Number.isSafeInteger(row.tableRowNumber)||row.tableRowNumber<1||
    row.tableRowNumber>10000||
    !day(row.effectiveDate)||!Number.isSafeInteger(row.capacity)||
    row.capacity<0||row.capacity>100000||
    (row.status!=='ACTIVE'&&row.status!=='WITHDRAWN')||
    !sha(row.sourceDocumentSha256)||
    (row.supersedes!==null&&row.supersedes!==undefined&&!identifier(row.supersedes)))
    return null;
  return {
    cycle,track:row.track,examinationGroup:row.examinationGroup,
    programmeCode:row.programmeCode,programmeTitle:row.programmeTitle,
    institutionTitle:row.institutionTitle,
    quotaKey:row.quotaKey,capacity:row.capacity,
    sourceKey:row.sourceKey,sourceDocumentSha256:row.sourceDocumentSha256,
    pdfPage:row.pdfPage,tableRowNumber:row.tableRowNumber,
    effectiveDate:row.effectiveDate,reviewReference:row.reviewReference,
    supersedes:row.supersedes||null,status:row.status
  };
}
function rowPayload(row,approval){
  return JSON.stringify([
    'jr.official-admission-programme-row.v1',...[
      row.cycle,row.track,row.examinationGroup,row.programmeCode,
      row.programmeTitle,row.institutionTitle,row.quotaKey,row.capacity,
      row.sourceKey,row.sourceDocumentSha256,row.pdfPage,
      row.tableRowNumber,row.effectiveDate,row.reviewReference,
      row.supersedes,row.status
    ],
    approval.reviewerId,approval.administratorId,approval.decision,
    approval.reviewedOn,approval.scope
  ]);
}
function rowApproved(row,review){
  if(!review||typeof review!=='object'||!review.approval||
    !identifier(review.approval.reviewerId)||
    !identifier(review.approval.administratorId)||
    review.approval.reviewerId===review.approval.administratorId||
    !day(review.approval.reviewedOn)||
    review.approval.decision!=='APPROVED'||
    review.approval.scope!=='PROGRAMME_ROW_SOURCE_REVIEW')
    return false;
  const payload=rowPayload(row,review.approval);
  return macMatches(review.reviewerKey,payload,review.approval.reviewerSignature)&&
    macMatches(review.administratorKey,payload,review.approval.administratorSignature);
}
/**
 * Pure source compilation. Call only after server-side identity, reviewer-role,
 * signing-key custody, PDF-origin and current-cycle policy verification.
 *
 * Every item in sources:
 *  {key,reviewCandidate,context} where context contains PRIVATE signing keys.
 * Every item in programmeRows:
 *  {data,review} where review contains separate PRIVATE signing keys.
 *
 * This interface is never a request-body shape. Never serialize key buffers
 * or return input review objects to clients.
 */
export function compileOfficialAdmissionsCatalogue({
  cycle=1405,sources=[],programmeRows=[],coverage=null,
  policy=JR_CATALOGUE_DEFAULT_POLICY
}={}){
  const issues=[];
  if(!Number.isInteger(cycle)||cycle<1400||cycle>1500)
    issues.push('INVALID_ADMISSION_CYCLE');
  if(policy?.enabled!==true)issues.push('ADMIN_SOURCE_INTAKE_DISABLED');
  if(policy?.requireRowAttestation!==true||
     policy?.requireTwoPersonAttestation!==true)
    issues.push('INDEPENDENT_ROW_REVIEW_POLICY_REQUIRED');
  if(policy?.allowPrediction===true)
    issues.push('PREDICTION_CANNOT_BE_AUTHORIZED_BY_CATALOGUE');
  if(!Array.isArray(sources)||sources.length===0||sources.length>80)
    issues.push('INVALID_SOURCE_COLLECTION');
  if(!Array.isArray(programmeRows)||programmeRows.length>5000)
    issues.push('INVALID_PROGRAMME_COLLECTION');
  if(!coverage||typeof coverage!=='object'||
    coverage.amendmentsReviewed!==true||
    coverage.languagesGuideReviewed!==true||
    coverage.teacherTrainingChangesReviewed!==true||
    coverage.actualCycle!==cycle||
    !identifier(coverage.signedAuditReference)){
    issues.push('UNRESOLVED_OFFICIAL_SOURCE_COVERAGE');
  }
  const trustedSources=new Map();
  if(Array.isArray(sources)&&sources.length<=80)for(const s of sources){
    if(!s||!identifier(s.key)||trustedSources.has(s.key)||
      !s.reviewCandidate||!s.context){
      issues.push('INVALID_OR_DUPLICATE_SOURCE');
      continue;
    }
    const check=evaluateAdmissionSource(s.reviewCandidate,policy,s.context);
    if(!check.accepted||check.provenance===null||
      s.context?.attestation?.scope!=='SOURCE_PUBLICATION'){
      issues.push('UNVERIFIED_OFFICIAL_SOURCE');
      continue;
    }
    trustedSources.set(s.key,check.provenance);
  }
  const accepted=[];
  const identity=new Set(),readRevision=new Map();
  if(Array.isArray(programmeRows)&&programmeRows.length<=5000){
    for(const item of programmeRows){
      const row=normalizedRow(item?.data,cycle);
      if(!row){issues.push('INVALID_OR_UNREVIEWED_PROGRAMME_ROW');continue;}
      const src=trustedSources.get(row.sourceKey);
      if(!src||src.pdfSha256!==row.sourceDocumentSha256||
        !Number.isSafeInteger(src.page)||src.page!==row.pdfPage){
        issues.push('SOURCE_PAGE_AND_ROW_DIGEST_MISMATCH');continue;
      }
      if(!rowApproved(row,item?.review)){
        issues.push('INDEPENDENT_ROW_ATTESTATION_MISSING');continue;
      }
      const id=keyOf(row);
      // Multiple historical revisions are only meaningful when an
      // independently reviewed explicit supersedes reference exists.
      const prior=readRevision.get(id);
      if(prior&&(
        row.supersedes!==prior.reviewReference||
        row.effectiveDate<=prior.effectiveDate
      )){
        issues.push('AMBIGUOUS_AMENDMENT_PRECEDENCE');continue;
      }
      if(identity.has(row.reviewReference)){
        issues.push('REUSED_REVIEW_REFERENCE');continue;
      }
      identity.add(row.reviewReference);
      readRevision.set(id,row);
      accepted.push(row);
    }
  }
  if(!issues.length&&accepted.length===0)issues.push('NO_VERIFIED_PROGRAMME_ROWS');
  const permissible=issues.length===0;
  return Object.freeze({
    schema:'jr.official-programme-catalogue-gate.v1',
    cycle,sourceCount:trustedSources.size,
    receivedRows:Array.isArray(programmeRows)?programmeRows.length:null,
    authorised:permissible,
    canPublish:permissible&&policy?.allowAutomaticPublication===true,
    canPredictAdmission:false,
    admissionProbability:null,
    status:permissible?'SOURCE_AND_ROW_ATTESTED':'INCOMPLETE_OFFICIAL_SOURCE_EVIDENCE',
    blockers:Object.freeze([...new Set(issues)].sort()),
    // Only release the latest currently active rows if ALL prior
    // official records are internally consistent and fully reviewed.
    rows:permissible?avoidEnrichment(
      [...readRevision.values()].filter(r=>r.status==='ACTIVE')
        .map(r=>({...r,provenanceState:'DUAL_REVIEWED_SOURCE_ROW'}))
    ):Object.freeze([]),
    fingerprint:permissible?digest([...readRevision.values()].map(r=>[
      keyOf(r),r.sourceDocumentSha256,r.pdfPage,r.reviewReference
    ]).sort((a,b)=>a[0].localeCompare(b[0]))):null,
    explanation:permissible
      ?'Source and row provenance approved; this does not prove candidate eligibility or admission probability.'
      :'Insufficient independently verified official-guide, amendment or row evidence.'
  });
}
