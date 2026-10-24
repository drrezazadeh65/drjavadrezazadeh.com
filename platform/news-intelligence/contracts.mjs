/**
 * JREI News Intelligence — SOURCE-ONLY, fail-closed editorial contracts.
 *
 * No HTTP, filesystem, database, email, scheduling, AI invocation or publishing.
 * Caller must obtain source/verification/owner identity from authenticated
 * server-side records. Client/model-supplied approval flags are never trusted.
 * All source collection must use existing governed JREI acquisition adapters.
 */
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

const ID = /^[A-Za-z0-9._:-]{1,80}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const LANGUAGES = new Set(['fa', 'en', 'mixed']);
const RIGHTS = new Set(['METADATA_ONLY', 'PUBLIC_REUSE_APPROVED']);
const TRUST = new Set(['OFFICIAL', 'INSTITUTIONAL', 'PEER_REVIEWED']);
const PRIORITIES = Object.freeze({
  RESULTS_RELEASED: 'P0',
  REGISTRATION_OPENED: 'P0',
  REGISTRATION_DEADLINE_CHANGED: 'P0',
  ADMISSION_DECISION_RELEASED: 'P0',
  EXAM_CANCELLED_OR_POSTPONED: 'P0',
  ADMIT_CARD_RELEASED: 'P0',
  APPLICATION_GUIDANCE: 'P1',
  SCHOLARSHIP_OPPORTUNITY: 'P1',
  ADMISSION_RULES_CHANGED: 'P1',
  EMPLOYMENT_EXAM: 'P1',
  GENERAL_EDUCATION: 'P2',
  RESEARCH_NEWS: 'P2',
  UNIVERSITY_NEWS: 'P2'
});
const own = (x,k) => Object.prototype.hasOwnProperty.call(x,k);
const plain = x => x!==null && typeof x==='object' &&
  !Array.isArray(x) && Object.getPrototypeOf(x)===Object.prototype;
const text = (x,min,max) => typeof x==='string' &&
  x.trim().length>=min && x.length<=max &&
  !/[\u0000-\u001f\u007f]/.test(x);
const sha = x => createHash('sha256').update(x).digest('hex');
const iso = x => typeof x==='string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(x) &&
  !Number.isNaN(Date.parse(x)) && new Date(x).toISOString() ===
    new Date(x).toISOString(); // Valid UTC ISO timestamp, not a local guess.

function publicHttps(value) {
  if (!text(value,12,1000) || value.includes('\\')) throw Error('NEWS_URL_INVALID');
  let u;
  try { u = new URL(value); } catch { throw Error('NEWS_URL_INVALID'); }
  const host=u.hostname.toLowerCase().replace(/\.$/,'');
  if (u.protocol!=='https:' || u.username || u.password || u.hash ||
      (u.port && u.port!=='443') || host!==u.hostname ||
      !host.includes('.') || isIP(host)!==0 || host==='localhost' ||
      /\.(?:local|localhost|internal|test|invalid|example)$/.test(host))
    throw Error('NEWS_URL_NOT_APPROVED_PUBLIC_HTTPS');
  // Preflight only: existing JREI transport must independently pin DNS,
  // reject private ranges, enforce robots/terms and validate redirects.
  return u.href;
}
function assert(condition,code) { if(!condition) throw Error(code); }
function freeze(value) { return Object.freeze(value); }

/** Source Registry: approval must come from server-owned reviewed records. */
export function normalizeNewsSource(source) {
  assert(plain(source),'NEWS_SOURCE_INVALID');
  const keys=['sourceId','sourceName','canonicalUrl','trustClass',
    'usageRights','language','reviewStatus','reviewedBy',
    'robotsPermission','termsPermission','pollIntervalMinutes'];
  assert(Object.keys(source).sort().join('|')===keys.sort().join('|'),
    'NEWS_SOURCE_FIELDS_INVALID');
  assert(ID.test(source.sourceId??'') && ID.test(source.reviewedBy??'') &&
    text(source.sourceName,3,160) && TRUST.has(source.trustClass) &&
    RIGHTS.has(source.usageRights) && LANGUAGES.has(source.language) &&
    source.reviewStatus==='APPROVED' &&
    source.robotsPermission==='ALLOWED' &&
    source.termsPermission==='ALLOWED' &&
    Number.isInteger(source.pollIntervalMinutes) &&
    source.pollIntervalMinutes>=5 && source.pollIntervalMinutes<=1440,
    'NEWS_SOURCE_NOT_AUTHORIZED');
  return freeze({...source,canonicalUrl:publicHttps(source.canonicalUrl)});
}
export function newsPriority(eventType) {
  assert(own(PRIORITIES,eventType),'NEWS_EVENT_TYPE_UNKNOWN');
  return PRIORITIES[eventType];
}
export function newsPriorityCatalogue() {
  return freeze({...PRIORITIES});
}
/** Deterministic metadata-only discovery; NEVER marks a story as verified. */
export function stageNewsCandidate({
  approvedSource, sourceUrl, title, observedAt, publishedAt=null,
  evidenceSha256, eventType, officialEventAt=null
}={}) {
  const source=normalizeNewsSource(approvedSource);
  const url=publicHttps(sourceUrl);
  assert(new URL(url).hostname===new URL(source.canonicalUrl).hostname,
    'NEWS_SOURCE_ORIGIN_MISMATCH');
  assert(text(title,8,240) && SHA256.test(evidenceSha256??'') &&
    iso(observedAt) && (publishedAt===null || iso(publishedAt)) &&
    (officialEventAt===null || iso(officialEventAt)),
    'NEWS_EVIDENCE_METADATA_INVALID');
  assert(officialEventAt===null || publishedAt!==null,
    'NEWS_EVENT_WITHOUT_PUBLICATION_CONTEXT');
  const priority=newsPriority(eventType);
  const fingerprint=sha([source.sourceId,url,evidenceSha256,eventType]
    .join('\n'));
  return freeze({
    schema:'jr.jrei.news-candidate.v1',
    fingerprint,sourceId:source.sourceId,sourceUrl:url,
    title:title.trim(),eventType,priority,observedAt,publishedAt,
    officialEventAt,evidenceSha256,sourceTrust:source.trustClass,
    usageRights:source.usageRights,
    status:'PENDING_EVIDENCE_VERIFICATION',
    publicVisible:false,verified:false,canPublish:false
  });
}
/** Owner preview is possible only after a separately recorded verifier result. */
export function prepareEditorialPreview({
  candidate,verification,fa,en,image,internalLinks=[]
}={}) {
  assert(plain(candidate) &&
    candidate.schema==='jr.jrei.news-candidate.v1' &&
    candidate.status==='PENDING_EVIDENCE_VERIFICATION' &&
    SHA256.test(candidate.fingerprint??'') &&
    SHA256.test(candidate.evidenceSha256??''),
    'NEWS_CANDIDATE_INVALID');
  assert(plain(verification) &&
    verification.sourceRegistryRead===true &&
    verification.evidenceReviewed===true &&
    verification.issuerVerified===true &&
    verification.sourceStillCurrent===true &&
    verification.evidenceSha256===candidate.evidenceSha256 &&
    ID.test(verification.reviewerId??'') &&
    iso(verification.reviewedAt),
    'NEWS_VERIFICATION_REQUIRED');
  for(const [lang,entry] of [['fa',fa],['en',en]]) {
    assert(plain(entry) && entry.language===lang &&
      text(entry.headline,8,240) &&
      text(entry.summary,20,1000) &&
      text(entry.body,40,30000) &&
      text(entry.nextSteps,10,3000) &&
      entry.sourceUrl===candidate.sourceUrl,
      'NEWS_BILINGUAL_EDITORIAL_INCOMPLETE');
  }
  assert(plain(image) &&
    ['LICENSED_OFFICIAL','ORIGINAL_DESIGN','ORIGINAL_AI_ILLUSTRATION']
      .includes(image.provenance) &&
    text(image.altFa,5,300) && text(image.altEn,5,300) &&
    text(image.assetReference,5,500) &&
    image.rightsReviewed===true &&
    image.isDocumentaryPhoto!==true || false,
    'NEWS_IMAGE_PROVENANCE_INVALID');
  // An AI illustration is never allowed to masquerade as documentary media.
  assert(!(image.provenance==='ORIGINAL_AI_ILLUSTRATION' &&
    image.isDocumentaryPhoto===true),'NEWS_SYNTHETIC_DOCUMENTARY_BLOCKED');
  assert(Array.isArray(internalLinks) && internalLinks.length<=16,
    'NEWS_LINK_COUNT_INVALID');
  const seen=new Set();
  for(const link of internalLinks) {
    assert(plain(link) && ['fa','en'].includes(link.language) &&
      text(link.anchor,3,100) && text(link.reason,8,300) &&
      text(link.path,5,240) &&
      link.path.startsWith('/'+link.language+'/') &&
      !link.path.includes('?') && !link.path.includes('#') &&
      !link.path.includes('//') && !seen.has(link.path),
      'NEWS_INTERNAL_LINK_INVALID');
    seen.add(link.path);
  }
  const draft={schema:'jr.jrei.news-editorial-preview.v1',
    candidateFingerprint:candidate.fingerprint,
    sourceUrl:candidate.sourceUrl,evidenceSha256:candidate.evidenceSha256,
    priority:candidate.priority,eventType:candidate.eventType,
    verification:{reviewerId:verification.reviewerId,
      reviewedAt:verification.reviewedAt},
    fa:{...fa},en:{...en},image:{...image},
    internalLinks:internalLinks.map(link=>({...link})),
    editorialStatus:'PENDING_OWNER_APPROVAL',publicVisible:false};
  const approvalDigest=sha(JSON.stringify(draft));
  return freeze({...draft,approvalDigest});
}
/**
 * This is a queue-eligibility decision, NOT publication authorization itself.
 * Caller MUST verify MFA/session/CSRF and read exact preview + approval from
 * trusted server records. Never accept these booleans from a web visitor.
 */
export function decideEditorialApproval({
  preview,ownerAction,serverAuthorization
}={}) {
  assert(plain(preview) &&
    preview.schema==='jr.jrei.news-editorial-preview.v1' &&
    preview.editorialStatus==='PENDING_OWNER_APPROVAL' &&
    SHA256.test(preview.approvalDigest??''),
    'NEWS_PREVIEW_INVALID');
  assert(plain(ownerAction) &&
    ['APPROVE','REJECT','REQUEST_REVISION'].includes(ownerAction.action) &&
    ID.test(ownerAction.ownerId??'') &&
    ownerAction.approvalDigest===preview.approvalDigest &&
    iso(ownerAction.actionAt),
    'NEWS_OWNER_ACTION_INVALID');
  assert(plain(serverAuthorization) &&
    serverAuthorization.ownerSessionVerified===true &&
    serverAuthorization.mfaVerified===true &&
    serverAuthorization.csrfVerified===true &&
    serverAuthorization.currentSourceVerified===true &&
    serverAuthorization.storedPreviewDigest===preview.approvalDigest &&
    serverAuthorization.authorizedOwnerId===ownerAction.ownerId,
    'NEWS_OWNER_AUTHORIZATION_REQUIRED');
  const status=ownerAction.action==='APPROVE' ?
    'APPROVED_FOR_PRIVATE_PUBLICATION_QUEUE' :
    ownerAction.action==='REJECT' ? 'REJECTED' : 'REVISION_REQUESTED';
  return freeze({
    schema:'jr.jrei.news-owner-decision.v1',
    candidateFingerprint:preview.candidateFingerprint,
    approvalDigest:preview.approvalDigest,
    actionAt:ownerAction.actionAt,ownerId:ownerAction.ownerId,
    status,canDispatch:status==='APPROVED_FOR_PRIVATE_PUBLICATION_QUEUE',
    published:false,delivered:false,
    requiresExistingAuthenticatedPublisher:true
  });
}
