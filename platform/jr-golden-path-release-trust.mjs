/**
 * JR Golden Path -> BAHAR: independently attested professional release.
 *
 * A self-asserted reviewer_user_id is never authorization for private
 * learning or automatic career advice. This wrapper verifies an external
 * HMAC attestation of the exact reviewed synthesis and related audit record,
 * then uses the canonical Golden Path handoff functions unchanged.
 *
 * Signing secret MUST come from the authorized backend, never from visitor
 * JSON, browser memory, repository or an owner-provided PDF.
 * No storage, payments, network calls or automatic learner progress claims.
 */
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {releaseGoldenPath,createBaharHandoff} from './golden-path-synthesis.mjs';
export const JR_GOLDEN_PATH_RELEASE_TRUST_VERSION='1.0.0';
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{1,127}$/.test(v);
const iso=v=>typeof v==='string'&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)&&
  Number.isFinite(Date.parse(v));
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const freezeNested=v=>{
  if(Array.isArray(v)){v.forEach(freezeNested);return Object.freeze(v);}
  if(v&&typeof v==='object'){Object.values(v).forEach(freezeNested);return Object.freeze(v);}
  return v;
};
const integrity=v=>createHash('sha256').update(JSON.stringify(v),'utf8').digest('hex');
function approvedSignature(secret,payload,signature){
  if(!Buffer.isBuffer(secret)||secret.length<32||!sha(signature))return false;
  const actual=createHmac('sha256',secret).update(payload,'utf8').digest();
  return timingSafeEqual(actual,Buffer.from(signature,'hex'));
}
/**
 * @param synthesis An existing Golden Path evidence-traceable PENDING object.
 * @param professional A trusted record of review and authorization.
 * @param serverContext The independently controlled reviewer signing key.
 */
export function prepareAttestedGoldenPathBaharHandoff({
  synthesis=null,professional=null,serverContext=null
}={}){
  const errors=[];
  if(!synthesis||typeof synthesis!=='object'||
    synthesis.release_status!=='PENDING_PROFESSIONAL_RELEASE'||
    synthesis.requires_professional_release!==true||
    !Array.isArray(synthesis.sections)||synthesis.sections.length!==6||
    synthesis.total_score!==null||synthesis.normative_label!==null||
    synthesis.automatic_career_prescription!==null)
    errors.push('NO_COMPLETE_HUMAN_REVIEWED_PENDING_GOLDEN_PATH');
  if(!professional||typeof professional!=='object'||
    !id(professional.releaseId)||
    !id(professional.reviewerId)||
    !id(professional.routeRunId)||
    !id(professional.auditReference)||
    !iso(professional.releasedAt)||
    professional.decision!=='PROFESSIONALLY_APPROVED'||
    professional.scope!=='GOLDEN_PATH_RELEASE_TO_BAHAR'||
    professional.consentVerified!==true||
    professional.roleVerified!==true)
    errors.push('VERIFIED_REVIEWER_CONSENT_AND_AUDIT_REQUIRED');
  if(errors.length)return Object.freeze({
    ok:false,errors:Object.freeze(errors),handoff:null,
    releaseGranted:false
  });
  if(synthesis.route_run_id!==professional.routeRunId)
    errors.push('SOURCE_ROUTE_IDENTITY_MISMATCH');
  const snapshotSha256=integrity(synthesis);
  if(professional.synthesisSha256!==snapshotSha256)
    errors.push('REVIEW_SNAPSHOT_DIGEST_MISMATCH');
  const payload=JSON.stringify([
    'jr.golden-path-attested-professional-release.v1',
    professional.releaseId,professional.reviewerId,
    professional.routeRunId,professional.auditReference,
    professional.releasedAt,professional.synthesisSha256,
    professional.decision,professional.scope
  ]);
  if(!approvedSignature(serverContext?.reviewerSecret,payload,professional.signature))
    errors.push('INDEPENDENT_PRIVATE_PROFESSIONAL_SIGNATURE_REQUIRED');
  if(errors.length)return Object.freeze({
    ok:false,errors:Object.freeze(errors),handoff:null,
    releaseGranted:false
  });
  try{
    // The legacy engine is reused, not rewritten, so existing released
    // evidence contracts and public URLs stay unchanged.
    const released=releaseGoldenPath(synthesis,{
      release_id:professional.releaseId,
      reviewer_user_id:professional.reviewerId,
      released_at:professional.releasedAt,
      route_run_id:professional.routeRunId
    });
    const draft=createBaharHandoff(released);
    return freezeNested({
      ok:true,
      source:'PROFESSIONAL_GOLDEN_PATH_RELEASE',
      reviewedSnapshotSha256:snapshotSha256,
      sourceAuditReference:professional.auditReference,
      handoff:{
        ...draft,
        // This is STILL a DRAFT; only a learner/guardian + human mentor
        // can decide goals and evidence after consent and account checks.
        compass_status:'DRAFT_REQUIRES_LEARNER_GOAL',
        sourceTrust:'SIGNED_PROFESSIONAL_REVIEW',
        requires_human_goal_setting:true,
        diagnosticInterpretation:null,
        admissionProbability:null,
        automaticAccountWrite:false,
        automaticPurchaseEntitlement:false
      },
      releaseGranted:true
    });
  }catch{
    return Object.freeze({
      ok:false,errors:Object.freeze(['SOURCE_RELEASE_CONTRACT_REJECTED']),
      handoff:null,releaseGranted:false
    });
  }
}
