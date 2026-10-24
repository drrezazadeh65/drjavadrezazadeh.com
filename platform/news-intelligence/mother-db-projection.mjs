/**
 * Exact mother-DB/PHP editorial revision -> JREI Node source-model bridge.
 *
 * PHP stores approval_digest = SHA256(raw UTF-8 persisted editorial JSON).
 * Node's alternative object-serialization digest MUST NOT silently replace it.
 * Never accept this projection from a visitor/model; the caller must read
 * locked immutable rows and current source/media/owner grants server-side.
 */
import {assert,isHash,isId,plain,safeText,sha256,utcInstant} from './contracts.mjs';
const publicRoute=p=>typeof p==='string'&&
  /^\/(?:fa|en)\/[a-z0-9/-]+\/$/.test(p)&&!p.includes('//');
export function mapMotherRevisionToNewsPreview({
  versionRow,candidateRow,evidenceRow,approvedMedia,approvedPublicRoutes,
  authority
}={}){
  assert(plain(authority)&&authority.source==='ORIGINAL_BERTINA_MOTHER_DB'&&
    authority.authenticatedPrivateRead===true&&
    authority.exactImmutableRevisionLocked===true&&
    authority.currentSourcePolicyRechecked===true&&
    authority.ownerEditorialScope===true,
    'NEWS_DB_PROJECTION_REQUIRES_TRUSTED_PRIVATE_READ');
  assert(plain(versionRow)&&isId(versionRow.revision_id)&&
    versionRow.editorial_state==='PENDING_OWNER_APPROVAL'&&
    isHash(versionRow.approval_digest)&&
    typeof versionRow.bilingual_editorial_json==='string'&&
    versionRow.bilingual_editorial_json.length<=250000&&
    sha256(versionRow.bilingual_editorial_json)===versionRow.approval_digest,
    'NEWS_DB_STORED_APPROVAL_DIGEST_MISMATCH');
  assert(plain(candidateRow)&&candidateRow.candidate_id===versionRow.candidate_id&&
    isHash(candidateRow.fingerprint_sha256)&&
    isHash(candidateRow.content_sha256)&&
    plain(evidenceRow)&&evidenceRow.review_id===versionRow.evidence_review_id&&
    evidenceRow.candidate_id===candidateRow.candidate_id&&
    evidenceRow.verification_state==='APPROVED'&&
    evidenceRow.issuer_verified===true&&
    evidenceRow.usage_rights_verified===true&&
    evidenceRow.content_sha256===candidateRow.content_sha256&&
    utcInstant(evidenceRow.reviewedAtUtc),
    'NEWS_DB_INDEPENDENT_SOURCE_REVIEW_INVALID');
  let data;try{data=JSON.parse(versionRow.bilingual_editorial_json);}
  catch{throw Error('NEWS_DB_PRIVATE_REVISION_JSON_INVALID');}
  assert(plain(data)&&
    data.schema==='jr.jrei.news-owner-editorial-payload.v1'&&
    data.candidateId===candidateRow.candidate_id&&
    data.reviewId===evidenceRow.review_id&&
    data.evidenceSha256===candidateRow.content_sha256&&
    plain(data.fa)&&plain(data.en)&&
    data.fa.language==='fa'&&data.en.language==='en'&&
    data.fa.sourceUrl===candidateRow.source_url&&
    data.en.sourceUrl===candidateRow.source_url,
    'NEWS_DB_REVISION_SOURCE_OR_LANGUAGE_MISMATCH');
  assert(plain(approvedMedia)&&
    approvedMedia.assetReference===data.imageAssetReference&&
    approvedMedia.rightsReviewed===true&&
    plain(candidateRow)&&
    Array.isArray(approvedPublicRoutes)&&approvedPublicRoutes.length<=5000,
    'NEWS_DB_IMAGE_OR_ROUTE_REGISTRY_NOT_REVIEWED');
  const routes=new Map();
  for(const item of approvedPublicRoutes){
    if(plain(item)&&publicRoute(item.path)&&
      item.publicIndexable===true&&item.approved===true&&
      item.private!==true&&item.noindex!==true)routes.set(item.path,item);
  }
  const internalLinks=[];
  for(const item of data.internalLinks??[]){
    assert(plain(item)&&
      ['fa','en'].includes(item.language)&&
      publicRoute(item.path)&&
      item.path.startsWith('/'+item.language+'/')&&
      safeText(item.anchor,3,100)&&routes.has(item.path),
      'NEWS_DB_LINK_NOT_EXISTING_PUBLIC_APPROVED_ROUTE');
    internalLinks.push({
      language:item.language,path:item.path,
      anchor:item.anchor,
      reason:'Existing owner-approved public topic reference'});
  }
  assert(internalLinks.length<=16,'NEWS_DB_LINKS_EXCEED_CAP');
  const row={
    schema:'jr.jrei.news-editorial-preview.v1',
    candidateFingerprint:candidateRow.fingerprint_sha256,
    sourceUrl:candidateRow.source_url,
    evidenceSha256:candidateRow.content_sha256,
    priority:candidateRow.priority_code,
    eventType:candidateRow.event_type,
    verification:{
      reviewerId:evidenceRow.reviewer_account_id,
      reviewedAt:evidenceRow.reviewedAtUtc},
    fa:{...data.fa},en:{...data.en},
    image:{...approvedMedia},
    internalLinks,
    editorialStatus:'PENDING_OWNER_APPROVAL',
    publicVisible:false,
    approvalDigest:versionRow.approval_digest,
    storedRevisionId:versionRow.revision_id,
    storedRevisionNumber:versionRow.revision_number,
    digestAlgorithm:'SHA256_EXACT_PERSISTED_PHP_EDITORIAL_JSON_UTF8',
    currentServerOwnedProofRequiredAtEveryApproval:true
  };
  return Object.freeze(row);
}
