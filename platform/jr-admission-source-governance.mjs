/**
 * JR Official Admission Source Registry — non-crawling, evidence-gated module.
 *
 * Intake OFF by default. No DB/network/browser actions here.
 * Self-asserted "humanReviewed" and "adminApproved" booleans are NEVER proof.
 * An independently authorized server must supply two distinct review
 * attestations, bound to exact source fingerprint/page/version/review action.
 * Without separately provisioned server signing keys the gate fails closed.
 */
import {createHmac,timingSafeEqual} from 'node:crypto';

export const ADMISSION_SOURCE_REGISTRY_VERSION='2.0.0';
export const DEFAULT_ADMISSION_INTAKE_POLICY=Object.freeze({
  enabled:false,scheduled:false,allowAutomaticPublication:false,
  requireHumanReview:true,requireOfficialIssuer:true,
  requireDocumentVersion:true,requireSourcePage:true,
  requireAuditTrail:true,requireTwoPersonAttestation:true,
  allowPrediction:false
});
const clean=(value,max=200)=>typeof value==='string'?value.trim().slice(0,max):'';
const hasText=(value,max=2000)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const isDate=(value)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const isId=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{1,127}$/.test(value);
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);

/**
 * The canonical sequence prevents signature replay for another PDF, page,
 * amendment, reviewer pair or publication permission. User-authored fields
 * must be bounded and checked before this function is ever called.
 */
function attestationPayload(record,approval){
  return JSON.stringify([
    'jr.official-1405.review.v2',
    record.issuer,record.documentTitle,record.documentVersion,
    record.sourceUrl,record.documentSha256,record.page,
    record.reviewDate,record.auditReference,
    approval.reviewerId,approval.administratorId,
    approval.reviewedAt,approval.decision,approval.scope
  ]);
}
function verifiedHmac(key,payload,signature){
  if(!Buffer.isBuffer(key)||key.length<32||!hex(signature))return false;
  const expected=createHmac('sha256',key).update(payload,'utf8').digest();
  return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
/**
 * Returns true ONLY for a server-bound two-person scientific review record.
 * The context is NOT request JSON. Supply keys from separate, private
 * reviewer and administrator authorities on a trusted server exclusively.
 */
export function verifiedTwoPersonAdmissionReview(record,context){
  if(!record||typeof record!=='object'||!context||typeof context!=='object')return false;
  const a=context.attestation;
  if(!a||typeof a!=='object'||Array.isArray(a))return false;
  if(!isId(a.reviewerId)||!isId(a.administratorId)||
    a.reviewerId===a.administratorId||
    !isDate(a.reviewedAt)||a.decision!=='APPROVED'||
    !['INTAKE_ONLY','SOURCE_PUBLICATION'].includes(a.scope)||
    !hex(record.documentSha256))return false;
  if(a.reviewedAt!==record.reviewDate)return false;
  const payload=attestationPayload(record,a);
  return verifiedHmac(context.reviewerKey,payload,a.reviewerSignature)&&
    verifiedHmac(context.administratorKey,payload,a.administratorSignature);
}

/**
 * sourceContext is server-owned: never deserialize it from a client payload.
 * A source that is only pending visual review remains explicitly unapproved.
 * All document checks are provenance checks, NOT admission probabilities.
 */
export function evaluateAdmissionSource(
  candidate,policy=DEFAULT_ADMISSION_INTAKE_POLICY,sourceContext=null
){
  const reasons=[];
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
    return Object.freeze({accepted:false,reasons:Object.freeze(['invalid-candidate']),provenance:null,admissionProbability:null});
  if(policy?.enabled!==true)reasons.push('intake-disabled');
  if(policy?.requireTwoPersonAttestation!==true)reasons.push('two-person-policy-required');
  if(policy?.allowPrediction===true)reasons.push('predictive-use-not-permitted');
  if(candidate.officialIssuerVerified!==true)reasons.push('issuer-not-verified');
  if(candidate.adminApproved!==true)reasons.push('admin-approval-required');
  if(candidate.humanReviewed!==true)reasons.push('human-review-required');
  if(!hasText(candidate.issuer,200))reasons.push('missing-issuer');
  if(!hasText(candidate.documentTitle,300))reasons.push('missing-document-title');
  if(!hasText(candidate.documentVersion,80))reasons.push('missing-document-version');
  if(!hasText(candidate.sourceUrl,2000)||!/^https:\/\//i.test(candidate.sourceUrl))
    reasons.push('missing-secure-source-url');
  if(!Number.isInteger(candidate.page)||candidate.page<1||candidate.page>10000)
    reasons.push('missing-source-page');
  if(!hex(candidate.documentSha256))reasons.push('missing-verified-original-pdf-fingerprint');
  if(!isDate(candidate.reviewDate))reasons.push('missing-review-date');
  if(!isId(candidate.auditReference))reasons.push('missing-audit-reference');
  if(candidate.synthetic===true)reasons.push('synthetic-data-prohibited');
  if(!reasons.length&&!verifiedTwoPersonAdmissionReview(candidate,sourceContext))
    reasons.push('cryptographically-verified-independent-review-required');
  const accepted=reasons.length===0;
  return Object.freeze({
    accepted,reasons:Object.freeze(reasons),
    provenance:accepted?Object.freeze({
      issuer:clean(candidate.issuer),title:clean(candidate.documentTitle,300),
      version:clean(candidate.documentVersion,80),url:clean(candidate.sourceUrl,2000),
      pdfSha256:candidate.documentSha256,page:candidate.page,
      reviewDate:candidate.reviewDate,auditReference:clean(candidate.auditReference,128),
      evidenceScope:sourceContext.attestation.scope,
      sourceReviewVerified:true
    }):null,
    admissionProbability:null,
    sourceTrust:accepted?'DUAL_ATTESTED_SOURCE':'UNREVIEWED'
  });
}
/** Publication is a separate approval scope; never enabled by intake alone. */
export function mayPublishAdmissionRecord(
  record,policy=DEFAULT_ADMISSION_INTAKE_POLICY,serverReviewContext=null
){
  if(policy?.allowAutomaticPublication!==true||record?.publicationApproved!==true)
    return false;
  const check=evaluateAdmissionSource(record,policy,serverReviewContext);
  return check.accepted===true&&serverReviewContext?.attestation?.scope==='SOURCE_PUBLICATION';
}
