/**
 * JREI News Intelligence: immutable, fail-closed editorial data contracts.
 * SOURCE ONLY: no HTTP, database, email, model inference or publication.
 * Trust metadata must be read from authenticated server-owned records.
 */
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
const ID=/^[A-Za-z0-9._:-]{1,80}$/;
const HASH=/^[a-f0-9]{64}$/;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
export const assert=(ok,code)=>{if(!ok)throw Error(code);};
export const safeText=(s,min=1,max=1000)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max&&!/[\u0000-\u001f\u007f]/.test(s);
export const sha256=s=>createHash('sha256').update(s).digest('hex');
export const isHash=s=>typeof s==='string'&&HASH.test(s);
export const isId=s=>typeof s==='string'&&ID.test(s);
export function utcInstant(value){
  if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value))return false;
  const ms=Date.parse(value);
  if(!Number.isFinite(ms))return false;
  const canonical=new Date(ms).toISOString();
  return canonical===value||canonical.replace('.000Z','Z')===value;
}
export function publicHttps(value){
  assert(safeText(value,12,1000)&&!value.includes('\\'),'NEWS_URL_INVALID');
  let u;try{u=new URL(value);}catch{throw Error('NEWS_URL_INVALID');}
  const h=u.hostname.toLowerCase().replace(/\.$/,'');
  assert(u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&
    (!u.port||u.port==='443')&&h===u.hostname&&h.includes('.')&&
    isIP(h)===0&&!/\.(?:local|localhost|internal|test|invalid|example)$/.test(h),
    'NEWS_URL_NOT_PUBLIC_HTTPS');
  // Preflight only: governed transport MUST independently enforce DNS pinning,
  // redirect checks, robots, rate limits, rights and private-IP rejection.
  return u.href;
}
export const NEWS_PRIORITY=Object.freeze({
  RESULTS_RELEASED:'P0',REGISTRATION_OPENED:'P0',
  REGISTRATION_DEADLINE_CHANGED:'P0',EXAM_CANCELLED_OR_POSTPONED:'P0',
  ADMIT_CARD_RELEASED:'P0',ADMISSION_DECISION_RELEASED:'P0',
  APPLICATION_GUIDANCE:'P1',SCHOLARSHIP_OPPORTUNITY:'P1',
  ADMISSION_RULES_CHANGED:'P1',EMPLOYMENT_EXAM:'P1',
  UNIVERSITY_NEWS:'P2',RESEARCH_NEWS:'P2',GENERAL_EDUCATION:'P2'
});
export function normalizeNewsSource(s){
  assert(plain(s),'NEWS_SOURCE_INVALID');
  for(const k of ['sourceId','sourceName','canonicalUrl','trustClass','usageRights',
    'language','reviewStatus','reviewedBy','robotsPermission','termsPermission','pollIntervalMinutes'])
    assert(own(s,k),'NEWS_SOURCE_FIELDS_INVALID');
  assert(isId(s.sourceId)&&isId(s.reviewedBy)&&safeText(s.sourceName,3,160)&&
    ['OFFICIAL','INSTITUTIONAL','PEER_REVIEWED'].includes(s.trustClass)&&
    ['METADATA_ONLY','PUBLIC_REUSE_APPROVED'].includes(s.usageRights)&&
    ['fa','en','mixed'].includes(s.language)&&s.reviewStatus==='APPROVED'&&
    s.robotsPermission==='ALLOWED'&&s.termsPermission==='ALLOWED'&&
    Number.isInteger(s.pollIntervalMinutes)&&s.pollIntervalMinutes>=5&&
    s.pollIntervalMinutes<=1440,'NEWS_SOURCE_NOT_AUTHORIZED');
  return Object.freeze({...s,canonicalUrl:publicHttps(s.canonicalUrl)});
}
export function stageNewsCandidate({approvedSource,sourceUrl,title,observedAt,
  publishedAt=null,evidenceSha256,eventType,officialEventAt=null}={}){
  const source=normalizeNewsSource(approvedSource),url=publicHttps(sourceUrl);
  assert(new URL(url).hostname===new URL(source.canonicalUrl).hostname,
    'NEWS_SOURCE_ORIGIN_MISMATCH');
  assert(safeText(title,8,240)&&isHash(evidenceSha256)&&utcInstant(observedAt)&&
    (publishedAt===null||utcInstant(publishedAt))&&
    (officialEventAt===null||utcInstant(officialEventAt))&&
    own(NEWS_PRIORITY,eventType),'NEWS_CANDIDATE_METADATA_INVALID');
  const fingerprint=sha256([source.sourceId,url,evidenceSha256,eventType].join('\n'));
  return Object.freeze({schema:'jr.jrei.news-candidate.v1',fingerprint,
    sourceId:source.sourceId,sourceUrl:url,title:title.trim(),
    eventType,priority:NEWS_PRIORITY[eventType],observedAt,publishedAt,
    officialEventAt,evidenceSha256,sourceTrust:source.trustClass,
    usageRights:source.usageRights,status:'PENDING_EVIDENCE_VERIFICATION',
    verified:false,publicVisible:false,canPublish:false});
}
export function prepareEditorialPreview({candidate,verification,fa,en,image,
  internalLinks=[]}={}){
  assert(plain(candidate)&&candidate.schema==='jr.jrei.news-candidate.v1'&&
    candidate.status==='PENDING_EVIDENCE_VERIFICATION'&&
    isHash(candidate.fingerprint)&&isHash(candidate.evidenceSha256),
    'NEWS_CANDIDATE_INVALID');
  assert(plain(verification)&&verification.sourceRegistryRead===true&&
    verification.evidenceReviewed===true&&verification.issuerVerified===true&&
    verification.sourceStillCurrent===true&&
    verification.evidenceSha256===candidate.evidenceSha256&&
    isId(verification.reviewerId)&&utcInstant(verification.reviewedAt),
    'NEWS_VERIFICATION_REQUIRED');
  for(const [lang,entry] of [['fa',fa],['en',en]]){
    assert(plain(entry)&&entry.language===lang&&
      safeText(entry.headline,8,240)&&safeText(entry.summary,20,1000)&&
      safeText(entry.body,40,30000)&&safeText(entry.nextSteps,10,3000)&&
      entry.sourceUrl===candidate.sourceUrl,'NEWS_BILINGUAL_EDITORIAL_INCOMPLETE');
  }
  assert(plain(image)&&
    ['LICENSED_OFFICIAL','ORIGINAL_DESIGN','ORIGINAL_AI_ILLUSTRATION'].includes(image.provenance)&&
    safeText(image.altFa,5,300)&&safeText(image.altEn,5,300)&&
    safeText(image.assetReference,5,500)&&image.rightsReviewed===true&&
    typeof image.isDocumentaryPhoto==='boolean'&&
    !(image.provenance==='ORIGINAL_AI_ILLUSTRATION'&&image.isDocumentaryPhoto),
    'NEWS_IMAGE_PROVENANCE_INVALID');
  assert(Array.isArray(internalLinks)&&internalLinks.length<=16,'NEWS_LINK_COUNT_INVALID');
  const seen=new Set();
  for(const l of internalLinks){
    assert(plain(l)&&['fa','en'].includes(l.language)&&
      safeText(l.anchor,3,100)&&safeText(l.reason,8,300)&&
      safeText(l.path,5,240)&&l.path.startsWith('/'+l.language+'/')&&
      !/[?#]/.test(l.path)&&!l.path.includes('//')&&!seen.has(l.path),
      'NEWS_INTERNAL_LINK_INVALID');
    seen.add(l.path);
  }
  const draft={schema:'jr.jrei.news-editorial-preview.v1',
    candidateFingerprint:candidate.fingerprint,sourceUrl:candidate.sourceUrl,
    evidenceSha256:candidate.evidenceSha256,priority:candidate.priority,
    eventType:candidate.eventType,verification:{reviewerId:verification.reviewerId,
      reviewedAt:verification.reviewedAt},fa:{...fa},en:{...en},
    image:{...image},internalLinks:internalLinks.map(l=>({...l})),
    editorialStatus:'PENDING_OWNER_APPROVAL',publicVisible:false};
  return Object.freeze({...draft,approvalDigest:sha256(JSON.stringify(draft))});
}
/* Eligibility decision only. The authenticated publisher MUST re-read exact
 * preview/version and owner authorization from trusted mother-DB records. */
export function decideEditorialApproval({preview,ownerAction,serverAuthorization}={}){
  assert(plain(preview)&&preview.schema==='jr.jrei.news-editorial-preview.v1'&&
    preview.editorialStatus==='PENDING_OWNER_APPROVAL'&&isHash(preview.approvalDigest),
    'NEWS_PREVIEW_INVALID');
  assert(plain(ownerAction)&&['APPROVE','REJECT','REQUEST_REVISION'].includes(ownerAction.action)&&
    isId(ownerAction.ownerId)&&ownerAction.approvalDigest===preview.approvalDigest&&
    utcInstant(ownerAction.actionAt),'NEWS_OWNER_ACTION_INVALID');
  assert(plain(serverAuthorization)&&serverAuthorization.ownerSessionVerified===true&&
    serverAuthorization.mfaVerified===true&&serverAuthorization.csrfVerified===true&&
    serverAuthorization.currentSourceVerified===true&&
    serverAuthorization.storedPreviewDigest===preview.approvalDigest&&
    serverAuthorization.authorizedOwnerId===ownerAction.ownerId,
    'NEWS_OWNER_AUTHORIZATION_REQUIRED');
  const status=ownerAction.action==='APPROVE'?'APPROVED_FOR_PRIVATE_PUBLICATION_QUEUE':
    ownerAction.action==='REJECT'?'REJECTED':'REVISION_REQUESTED';
  return Object.freeze({schema:'jr.jrei.news-owner-decision.v1',
    candidateFingerprint:preview.candidateFingerprint,
    approvalDigest:preview.approvalDigest,actionAt:ownerAction.actionAt,
    ownerId:ownerAction.ownerId,status,
    canDispatch:status==='APPROVED_FOR_PRIVATE_PUBLICATION_QUEUE',
    published:false,delivered:false,requiresExistingAuthenticatedPublisher:true});
}
