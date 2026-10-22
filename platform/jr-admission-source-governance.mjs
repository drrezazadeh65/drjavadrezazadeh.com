/**
 * JR Official Admission Source Registry — conservative ingestion gate.
 * No crawling, downloading, database writes or scheduled activity occurs here.
 * The administrator must explicitly approve each source and enable intake.
 */
export const ADMISSION_SOURCE_REGISTRY_VERSION='1.0.0';
export const DEFAULT_ADMISSION_INTAKE_POLICY=Object.freeze({
  enabled:false,scheduled:false,allowAutomaticPublication:false,
  requireHumanReview:true,requireOfficialIssuer:true,
  requireDocumentVersion:true,requireSourcePage:true,
  requireAuditTrail:true,allowPrediction:false
});
const clean=(x,n=200)=>typeof x==='string'?x.trim().slice(0,n):'';
const hasText=x=>typeof x==='string'&&x.trim().length>0;
const isDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
export function evaluateAdmissionSource(candidate, policy=DEFAULT_ADMISSION_INTAKE_POLICY) {
  const reasons=[];
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return Object.freeze({accepted:false,reasons:['invalid-candidate']});
  if(policy?.enabled!==true)reasons.push('intake-disabled');
  if(candidate.officialIssuerVerified!==true)reasons.push('issuer-not-verified');
  if(candidate.adminApproved!==true)reasons.push('admin-approval-required');
  if(candidate.humanReviewed!==true)reasons.push('human-review-required');
  if(!hasText(candidate.issuer))reasons.push('missing-issuer');
  if(!hasText(candidate.documentTitle))reasons.push('missing-document-title');
  if(!hasText(candidate.documentVersion))reasons.push('missing-document-version');
  if(!hasText(candidate.sourceUrl)||!/^https:\/\//i.test(candidate.sourceUrl))reasons.push('missing-secure-source-url');
  if(!Number.isInteger(candidate.page)||candidate.page<1)reasons.push('missing-source-page');
  if(!isDate(candidate.reviewDate))reasons.push('missing-review-date');
  if(!hasText(candidate.auditReference))reasons.push('missing-audit-reference');
  if(candidate.synthetic===true)reasons.push('synthetic-data-prohibited');
  return Object.freeze({
    accepted:reasons.length===0,
    reasons:Object.freeze(reasons),
    provenance:reasons.length===0?Object.freeze({
      issuer:clean(candidate.issuer),title:clean(candidate.documentTitle),
      version:clean(candidate.documentVersion),url:clean(candidate.sourceUrl,2000),
      page:candidate.page,reviewDate:candidate.reviewDate,
      auditReference:clean(candidate.auditReference)
    }):null,
    admissionProbability:null
  });
}
export function mayPublishAdmissionRecord(record,policy=DEFAULT_ADMISSION_INTAKE_POLICY) {
  if(policy?.allowAutomaticPublication!==true)return false;
  return evaluateAdmissionSource(record,policy).accepted===true && record.publicationApproved===true;
}
