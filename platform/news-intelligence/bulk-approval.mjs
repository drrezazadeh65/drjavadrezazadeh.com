/**
 * Explicit per-version multi-article approval by existing MFA owner.
 * One action may approve multiple individually displayed exact digests.
 * This module does not write to the publisher or database.
 */
import {assert,isHash,isId,plain,sha256,utcInstant} from './contracts.mjs';
export function ownerBulkApproval({previews,ownerAction,serverAuth,nowUtc}={}){
  assert(Array.isArray(previews)&&previews.length>=1&&previews.length<=40&&
    previews.every(p=>plain(p)&&
      p.schema==='jr.jrei.news-editorial-preview.v1'&&
      p.editorialStatus==='PENDING_OWNER_APPROVAL'&&
      isHash(p.approvalDigest))&&
    plain(ownerAction)&&isId(ownerAction.ownerId)&&
    ownerAction.action==='APPROVE_SELECTED'&&
    Array.isArray(ownerAction.selectedDigests)&&
    ownerAction.selectedDigests.length>=1&&
    new Set(ownerAction.selectedDigests).size===
      ownerAction.selectedDigests.length&&
    plain(serverAuth)&&serverAuth.ownerId===ownerAction.ownerId&&
    serverAuth.ownerMfaSessionValid===true&&
    serverAuth.csrfValidated===true&&
    serverAuth.authorizedNewsReviewScope===true&&
    Array.isArray(serverAuth.currentApprovedDigests)&&
    utcInstant(nowUtc),'NEWS_BULK_OWNER_AUTHORIZATION_INVALID');
  const visible=new Set(previews.map(p=>p.approvalDigest));
  const fresh=new Set(serverAuth.currentApprovedDigests);
  assert(ownerAction.selectedDigests.every(d=>isHash(d)&&
    visible.has(d)&&fresh.has(d)),'NEWS_BULK_STALE_PREVIEW');
  const selected=previews.filter(p=>ownerAction.selectedDigests.includes(
    p.approvalDigest));
  return Object.freeze({schema:'jr.jrei.news-bulk-owner-approval.v1',
    ownerId:ownerAction.ownerId,approvedAt:nowUtc,
    exactApprovedDigests:selected.map(p=>p.approvalDigest),
    excludedDigests:previews.filter(p=>!ownerAction.selectedDigests.includes(
      p.approvalDigest)).map(p=>p.approvalDigest),
    batchDigest:sha256(selected.map(p=>p.approvalDigest).sort().join('|')),
    needsAtomicMotherDbDecisionRecording:true,
    noAutomaticPublicPublishing:true,
    MFARequiredOnFinalDispatch:true});
}
