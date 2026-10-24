/**
 * JREI News editorial lifecycle. Pure commands, immutable snapshots, no writes.
 * A public publisher MUST re-read authoritative owner approval from mother DB.
 */
import {assert,isHash,isId,plain,sha256,utcInstant} from './contracts.mjs';
const FLOW=Object.freeze({
  DISCOVERED:['PENDING_SOURCE_REVIEW','REJECTED'],
  PENDING_SOURCE_REVIEW:['EVIDENCE_REVIEWED','REJECTED','QUARANTINED'],
  EVIDENCE_REVIEWED:['EDITORIAL_DRAFT','QUARANTINED'],
  EDITORIAL_DRAFT:['OWNER_REVIEW','QUARANTINED'],
  OWNER_REVIEW:['OWNER_APPROVED','REVISION_REQUESTED','REJECTED','QUARANTINED'],
  REVISION_REQUESTED:['EDITORIAL_DRAFT','REJECTED'],
  OWNER_APPROVED:['PUBLISHER_QUEUED','QUARANTINED'],
  PUBLISHER_QUEUED:['PUBLISHED','PUBLISH_FAILED','QUARANTINED'],
  PUBLISH_FAILED:['PUBLISHER_QUEUED','QUARANTINED'],
  PUBLISHED:['CORRECTION_PROPOSED','SUPERSEDED','RETRACTED'],
  CORRECTION_PROPOSED:['PUBLISHED','SUPERSEDED','RETRACTED'],
  QUARANTINED:['PENDING_SOURCE_REVIEW','REJECTED'],
  REJECTED:[],SUPERSEDED:[],RETRACTED:[]
});
export function initialNewsWorkflow({candidate,nowUtc,editorialId}={}){
  assert(plain(candidate)&&candidate.schema==='jr.jrei.news-candidate.v1'&&
    isHash(candidate.fingerprint)&&utcInstant(nowUtc)&&isId(editorialId),
    'NEWS_WORKFLOW_INPUT_INVALID');
  return Object.freeze({schema:'jr.jrei.news-workflow.v1',
    editorialId,fingerprint:candidate.fingerprint,revision:1,
    state:'DISCOVERED',lastChangedAt:nowUtc,approvedDigest:null,
    publishedRoute:null,ownerApproved:false,publicationOccurred:false});
}
export function transitionNewsWorkflow({workflow,to,actor,at,
  exactExpectedRevision,ownerApproval=null}={}){
  assert(plain(workflow)&&workflow.schema==='jr.jrei.news-workflow.v1'&&
    Number.isInteger(exactExpectedRevision)&&
    workflow.revision===exactExpectedRevision&&
    Array.isArray(FLOW[workflow.state])&&FLOW[workflow.state].includes(to)&&
    isId(actor)&&utcInstant(at),'NEWS_WORKFLOW_TRANSITION_BLOCKED');
  const requiresApproval=to==='OWNER_APPROVED';
  if(requiresApproval){
    assert(plain(ownerApproval)&&
      ownerApproval.schema==='jr.jrei.news-owner-decision.v1'&&
      ownerApproval.status==='APPROVED_FOR_PRIVATE_PUBLICATION_QUEUE'&&
      ownerApproval.ownerId===actor&&isHash(ownerApproval.approvalDigest)&&
      ownerApproval.candidateFingerprint===workflow.fingerprint,
      'NEWS_EXPLICIT_OWNER_APPROVAL_REQUIRED');
  }
  if(to==='PUBLISHED'){
    assert(workflow.ownerApproved===true&&isHash(workflow.approvedDigest),
      'NEWS_PUBLICATION_WITHOUT_OWNER_APPROVAL');
    // Actual publication receipt and canonical route are confirmed by
    // authenticated publisher, NOT this state machine.
    throw Error('NEWS_PUBLISH_RECEIPT_REQUIRED');
  }
  const preserve=workflow.ownerApproved&&
    !['REVISION_REQUESTED','EDITORIAL_DRAFT','PENDING_SOURCE_REVIEW',
      'QUARANTINED','REJECTED'].includes(to);
  return Object.freeze({...workflow,revision:workflow.revision+1,
    state:to,lastChangedAt:at,
    ownerApproved:requiresApproval||Boolean(preserve),
    approvedDigest:requiresApproval?ownerApproval.approvalDigest:
      preserve?workflow.approvedDigest:null});
}
export function confirmNewsPublication({workflow,receipt,at,
  exactExpectedRevision}={}){
  assert(plain(workflow)&&workflow.schema==='jr.jrei.news-workflow.v1'&&
    workflow.revision===exactExpectedRevision&&
    workflow.state==='PUBLISHER_QUEUED'&&workflow.ownerApproved===true&&
    isHash(workflow.approvedDigest)&&plain(receipt)&&
    receipt.verifiedPublisherIdentity===true&&
    receipt.approvalDigest===workflow.approvedDigest&&
    receipt.immutableContentWritten===true&&
    typeof receipt.publicRoute==='string'&&
    /^\/(?:fa|en)\/[a-z0-9/-]+\/$/.test(receipt.publicRoute)&&
    utcInstant(at),'NEWS_PUBLICATION_RECEIPT_INVALID');
  return Object.freeze({...workflow,revision:workflow.revision+1,
    state:'PUBLISHED',lastChangedAt:at,publicationOccurred:true,
    publishedRoute:receipt.publicRoute});
}
export function newsEditorialAuditDescriptor({workflow,action,actor,at,
  recordDigest,reason}={}){
  assert(plain(workflow)&&workflow.schema==='jr.jrei.news-workflow.v1'&&
    typeof action==='string'&&/^[A-Z_]{4,60}$/.test(action)&&
    isId(actor)&&utcInstant(at)&&isHash(recordDigest)&&
    typeof reason==='string'&&reason.length<=1000,
    'NEWS_AUDIT_INVALID');
  return Object.freeze({schema:'jr.jrei.news-audit-event.v1',
    fingerprint:workflow.fingerprint,revision:workflow.revision,
    state:workflow.state,action,actor,at,recordDigest,reason,
    auditIdempotencyKey:sha256([workflow.editorialId,
      workflow.revision,action,recordDigest].join('|'))});
}
