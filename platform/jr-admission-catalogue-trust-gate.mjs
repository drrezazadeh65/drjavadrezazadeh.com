/**
 * JR official admissions catalogue trust gate — RESEARCH/STAGING CONTRACT.
 *
 * Build NO records unless independent humans have reviewed the ORIGINAL PDF
 * AND each extracted programme row, with two separate trusted attestations.
 * Guide authority and PDF page fingerprint do not validate OCR/extraction.
 * Page-level reviewer attestations are required: a single 1405 PDF may
 * contain hundreds of distinct page proofs under one document source key.
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
function rowApproved(row,review,trustedReviewContext){
  if(!review||typeof review!=='object'||!review.approval||
    Object.hasOwn(review,'reviewerKey')||
    Object.hasOwn(review,'administratorKey')||
    !identifier(review.approval.reviewerId)||
    !identifier(review.approval.administratorId)||
    review.approval.reviewerId===review.approval.administratorId||
    !day(review.approval.reviewedOn)||
    review.approval.decision!=='APPROVED'||
    review.approval.scope!=='PROGRAMME_ROW_SOURCE_REVIEW')
    return false;
  const payload=rowPayload(row,review.approval);
  return macMatches(trustedReviewContext?.rowReviewerKey,payload,review.approval.reviewerSignature)&&
    macMatches(trustedReviewContext?.rowAdministratorKey,payload,review.approval.administratorSignature);
}
/**
 * Coverage review includes all relevant 1405 examination groups AND the
 * competent issuer's amendments index. Bare booleans from an import are not
 * enough: two independent trusted scientific attestations are required.
 */
const REQUIRED_GROUPS=Object.freeze([
  'ARTS','EXPERIMENTAL_SCIENCES','FOREIGN_LANGUAGES','HUMANITIES','MATHEMATICS'
]);
function verifiedCoverage(coverage,cycle,trustedCoverageContext){
  if(!coverage||typeof coverage!=='object'||Array.isArray(coverage)||
    Object.hasOwn(coverage,'trustedServerContext')||
    coverage.actualCycle!==cycle||coverage.amendmentsReviewed!==true||
    coverage.languagesGuideReviewed!==true||
    coverage.teacherTrainingChangesReviewed!==true||
    !identifier(coverage.signedAuditReference)||
    !day(coverage.checkedOn)||
    !sha(coverage.officialNoticeIndexSha256)||
    !Array.isArray(coverage.coveredGroups)||
    coverage.coveredGroups.length!==REQUIRED_GROUPS.length||
    coverage.coveredGroups.some(v=>!REQUIRED_GROUPS.includes(v))||
    new Set(coverage.coveredGroups).size!==REQUIRED_GROUPS.length)
    return false;
  const auth=coverage.authorization;
  if(!auth||!identifier(auth.reviewerId)||
    !identifier(auth.administratorId)||
    auth.reviewerId===auth.administratorId||
    auth.scope!=='COMPLETE_ANNUAL_OFFICIAL_SOURCE_COVERAGE'||
    auth.decision!=='APPROVED')return false;
  const payload=JSON.stringify([
    'jr.official-annual-coverage-v1',cycle,
    [...coverage.coveredGroups].sort(),
    coverage.officialNoticeIndexSha256,coverage.signedAuditReference,
    coverage.checkedOn,auth.reviewerId,auth.administratorId,auth.scope,
    auth.decision
  ]);
  // Keys must be provided by an independently authorized private server,
  // never stored in the uploaded annual-coverage record or repository.
  const ctx=trustedCoverageContext;
  // Approval identities AND their independently controlled keys must differ.
  if(!validKey(ctx?.reviewerKey)||!validKey(ctx?.administratorKey)||
    ctx.reviewerKey.equals(ctx.administratorKey))return false;
  return macMatches(ctx.reviewerKey,payload,auth.reviewerSignature)&&
    macMatches(ctx.administratorKey,payload,auth.administratorSignature);
}

/**
 * Pure source compilation. Call only after server-side identity, reviewer-role,
 * signing-key custody, PDF-origin and current-cycle policy verification.
 *
 * Every item in sources:
 *  {key,reviewCandidate,attestation} with metadata and signed approvals ONLY.
 * Every item in programmeRows:
 *  {data,review} with metadata and signed approvals ONLY.
 * trustedReviewContext: FOUR independently provisioned, server-owned Buffer
 * keys for source reviewer, source administrator, row reviewer and row admin.
 * Never embed these keys in the source arrays, CSV files or API JSON.
 * trustedCoverageContext: independently held server-owned keys for whole-year
 * amendments and guide coverage, never embedded in imported coverage JSON.
 *
 * This interface is never a request-body shape. Never serialize key buffers
 * or return input review objects to clients.
 */
export function compileOfficialAdmissionsCatalogue({
  cycle=1405,sources=[],programmeRows=[],coverage=null,
  trustedReviewContext=null,trustedCoverageContext=null,
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
  if(!Array.isArray(sources)||sources.length===0||sources.length>6000)
    issues.push('INVALID_SOURCE_COLLECTION');
  if(!Array.isArray(programmeRows)||programmeRows.length>50000)
    issues.push('INVALID_PROGRAMME_COLLECTION');
  if(!verifiedCoverage(coverage,cycle,trustedCoverageContext))
    issues.push('UNRESOLVED_OFFICIAL_SOURCE_COVERAGE');
  const keySet=trustedReviewContext?[
    trustedReviewContext.sourceReviewerKey,
    trustedReviewContext.sourceAdministratorKey,
    trustedReviewContext.rowReviewerKey,
    trustedReviewContext.rowAdministratorKey
  ]:[];
  if(keySet.length!==4||keySet.some(key=>!validKey(key))||
     keySet.some((key,index)=>keySet.some((other,otherIndex)=>
       otherIndex>index&&key.equals(other))))
    issues.push('INDEPENDENT_TRUSTED_REVIEW_KEYS_MISSING');
  const trustedSources=new Map();
  if(Array.isArray(sources)&&sources.length<=6000)for(const s of sources){
    if(!s||!identifier(s.key)||
      !s.reviewCandidate||!s.attestation||
      Object.hasOwn(s,'context')||
      Object.hasOwn(s,'reviewerKey')||
      Object.hasOwn(s,'administratorKey')){
      issues.push('INVALID_SOURCE_REVIEW_ENTRY');
      continue;
    }
    const context={
      reviewerKey:trustedReviewContext?.sourceReviewerKey,
      administratorKey:trustedReviewContext?.sourceAdministratorKey,
      attestation:s.attestation
    };
    const check=evaluateAdmissionSource(s.reviewCandidate,policy,context);
    if(!check.accepted||check.provenance===null||
      s.attestation?.scope!=='SOURCE_PUBLICATION'){
      issues.push('UNVERIFIED_OFFICIAL_SOURCE');
      continue;
    }
    const pageKey=s.key+'|'+check.provenance.page;
    if(trustedSources.has(pageKey)){
      issues.push('DUPLICATE_SOURCE_PAGE_REVIEW');continue;
    }
    trustedSources.set(pageKey,check.provenance);
  }
  const accepted=[];
  const identity=new Set(),readRevision=new Map();
  if(Array.isArray(programmeRows)&&programmeRows.length<=50000){
    for(const item of programmeRows){
      const row=normalizedRow(item?.data,cycle);
      if(!row){issues.push('INVALID_OR_UNREVIEWED_PROGRAMME_ROW');continue;}
      const src=trustedSources.get(row.sourceKey+'|'+row.pdfPage);
      if(!src||src.pdfSha256!==row.sourceDocumentSha256||
        !Number.isSafeInteger(src.page)||src.page!==row.pdfPage){
        issues.push('SOURCE_PAGE_AND_ROW_DIGEST_MISMATCH');continue;
      }
      if(!rowApproved(row,item?.review,trustedReviewContext)){
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
    cycle,reviewedSourcePageCount:trustedSources.size,
    reviewedGuideCount:new Set([...trustedSources.keys()].map(key=>key.split('|')[0])).size,
    receivedRows:Array.isArray(programmeRows)?programmeRows.length:null,
    authorised:permissible,
    // Compilation never publishes. Publication remains a separate owner
    // approval and delivery event after final end-to-end acceptance.
    canPublish:false,
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
