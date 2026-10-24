/**
 * Exact two-language static HTML bundle from PHP's persisted editorial JSON.
 * Requires ORIGINAL CMS source/media/route validation and public release gate.
 * The module only returns bytes and SHA256. It NEVER writes or deploys.
 */
import {assert,isHash,plain,publicHttps,safeText,sha256,utcInstant} from './contracts.mjs';
import {renderPublicNewsPage} from './render-public.mjs';
const ORIGIN='https://drjavadrezazadeh.com';
export function prepareExactNewsPublisherArtifacts({
  exactPersistedEditorialJson,publicationPlan,publisherAuthority,
  verifiedSource,verifiedMedia,
  intendedPublicationAt,modifiedAt,existingPublicFilesystemPaths=[]
}={}){
  assert(typeof exactPersistedEditorialJson==='string'&&
    exactPersistedEditorialJson.length<=250000&&
    plain(publicationPlan)&&
    publicationPlan.schema==='jr.jrei.news-publication-plan.v1'&&
    isHash(publicationPlan.approvalDigest)&&
    sha256(exactPersistedEditorialJson)===publicationPlan.approvalDigest&&
    plain(publisherAuthority)&&
    publisherAuthority.source==='ORIGINAL_AUTHENTICATED_CMS'&&
    publisherAuthority.ownerMfaDecisionVerified===true&&
    publisherAuthority.currentSourceEvidenceVerified===true&&
    publisherAuthority.licensedMediaVerified===true&&
    publisherAuthority.publicReleaseActivated===true&&
    plain(verifiedSource)&&
    verifiedSource.source==='ORIGINAL_JREI_REVIEWED_SOURCE'&&
    verifiedSource.current===true&&verifiedSource.republicationRightsCurrent===true&&
    safeText(verifiedSource.issuerName,3,160)&&
    isHash(verifiedSource.evidenceSha256)&&
    plain(verifiedMedia)&&
    verifiedMedia.source==='ORIGINAL_SITE_MEDIA_REGISTRY'&&
    verifiedMedia.rightsReviewed===true&&
    plain(publicationPlan.languagePaths)&&
    utcInstant(intendedPublicationAt)&&utcInstant(modifiedAt)&&
    Date.parse(modifiedAt)>=Date.parse(intendedPublicationAt)&&
    Array.isArray(existingPublicFilesystemPaths)&&
    existingPublicFilesystemPaths.length<=500000,
    'NEWS_STATIC_ARTIFACT_APPROVAL_INVALID');
  let persisted;
  try{persisted=JSON.parse(exactPersistedEditorialJson);}
  catch{throw Error('NEWS_STORED_EDITORIAL_JSON_INVALID');}
  assert(plain(persisted)&&
    persisted.schema==='jr.jrei.news-owner-editorial-payload.v1'&&
    plain(persisted.fa)&&plain(persisted.en)&&
    plain(persisted.routeProposal)&&
    persisted.routeProposal.faPath===publicationPlan.languagePaths.fa&&
    persisted.routeProposal.enPath===publicationPlan.languagePaths.en&&
    persisted.evidenceSha256===verifiedSource.evidenceSha256&&
    persisted.fa.sourceUrl===persisted.en.sourceUrl&&
    persisted.fa.sourceUrl===verifiedSource.sourceUrl&&
    persisted.imageAssetReference===verifiedMedia.assetReference,
    'NEWS_ARTIFACT_STORED_DIGEST_SOURCE_ROUTE_MISMATCH');
  const sourceUrl=publicHttps(verifiedSource.sourceUrl);
  assert(sourceUrl===verifiedSource.sourceUrl,
    'NEWS_ARTIFACT_OFFICIAL_URL_NOT_CANONICAL');
  let imagePath=verifiedMedia.assetReference;
  if(typeof imagePath==='string'&&imagePath.startsWith('assets/images/'))
    imagePath='/'+imagePath;
  assert(typeof imagePath==='string'&&
    /^\/assets\/images\/[a-zA-Z0-9_.\/-]+\.(webp|png|jpeg|jpg|avif)$/
      .test(imagePath)&&!imagePath.includes('..')&&
    ['LICENSED_OFFICIAL','ORIGINAL_DESIGN','ORIGINAL_AI_ILLUSTRATION']
      .includes(verifiedMedia.provenance)&&
    safeText(verifiedMedia.altFa,5,300)&&
    safeText(verifiedMedia.altEn,5,300),
    'NEWS_ARTIFACT_MEDIA_NOT_PUBLISHABLE');
  const article={
    id:persisted.candidateId,
    approvalDigest:publicationPlan.approvalDigest,
    publicationState:'OWNER_APPROVED_FOR_PUBLICATION',
    ownerApproved:true,sourceUrl,
    priority:verifiedSource.priority,
    fa:{...persisted.fa,imageAlt:verifiedMedia.altFa},
    en:{...persisted.en,imageAlt:verifiedMedia.altEn}
  };
  const auth={
    source:'ORIGINAL_AUTHENTICATED_CMS',
    exactStoredApprovalDigest:publicationPlan.approvalDigest,
    sourceAndRightsRechecked:true,
    bilingualRouteReservationsVerified:true,
    publicActivationApproved:true
  };
  const paths=publicationPlan.languagePaths;
  const rendered=[
    renderPublicNewsPage({
      article,language:'fa',route:paths.fa,otherLanguageRoute:paths.en,
      featuredImage:imagePath,sourceTitle:verifiedSource.issuerName,
      publicationDate:intendedPublicationAt,modifiedDate:modifiedAt,
      relatedLinks:persisted.internalLinks??[],
      publisherAuthorization:auth
    }),
    renderPublicNewsPage({
      article,language:'en',route:paths.en,otherLanguageRoute:paths.fa,
      featuredImage:imagePath,sourceTitle:verifiedSource.issuerName,
      publicationDate:intendedPublicationAt,modifiedDate:modifiedAt,
      relatedLinks:persisted.internalLinks??[],
      publisherAuthorization:auth
    })
  ];
  const existing=new Set(existingPublicFilesystemPaths);
  const artifacts=rendered.map(result=>{
    const relativePath=result.route.slice(1)+'index.html';
    assert(!existing.has(relativePath)&&
      result.canonical===ORIGIN+result.route,
      'NEWS_ARTIFACT_EXISTING_PUBLIC_PATH_COLLISION');
    return Object.freeze({
      relativePath,canonical:result.canonical,language:result.language,
      mimeType:'text/html; charset=utf-8',utf8Content:result.html,
      sha256:sha256(result.html),
      originalCmsOwnerApprovalDigest:publicationPlan.approvalDigest,
      currentlyPublic:false
    });
  });
  assert(artifacts.length===2&&
    artifacts[0].relativePath!==artifacts[1].relativePath,
    'NEWS_STATIC_BILINGUAL_ARTIFACT_COLLISION');
  return Object.freeze({
    schema:'jr.jrei.news-static-artifact-bundle.v1',
    publicationPlanDigest:publicationPlan.approvalDigest,
    originalCmsRequired:true,fa:artifacts[0],en:artifacts[1],
    storedContentHashFa:artifacts[0].sha256,
    storedContentHashEn:artifacts[1].sha256,
    filesystemWritesPerformed:0,assetsPublished:false,
    sitemapUpdated:false,socialPostsSent:false,
    requiresAuthenticOriginalCmsReceipt:true
  });
}
