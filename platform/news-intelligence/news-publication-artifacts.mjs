/**
 * Exact two-language static HTML artifact bundle for EXISTING site CMS.
 * Does not touch filesystem, sitemap, Git refs, SMTP, API, storage or host.
 * The original publisher must consume artifacts and issue authentic receipts.
 */
import {assert,isHash,plain,publicHttps,safeText,sha256,utcInstant} from './contracts.mjs';
import {renderPublicNewsPage} from './render-public.mjs';
const ORIGIN='https://drjavadrezazadeh.com';
export function prepareExactNewsPublisherArtifacts({
  approvedEditorial,publicationPlan,publisherAuthority,
  intendedPublicationAt,modifiedAt,
  existingPublicFilesystemPaths=[]
}={}){
  assert(plain(publicationPlan)&&
    publicationPlan.schema==='jr.jrei.news-publication-plan.v1'&&
    plain(approvedEditorial)&&
    approvedEditorial.schema==='jr.jrei.news-owner-editorial-payload.v1'&&
    isHash(publicationPlan.approvalDigest)&&
    approvedEditorial.storedApprovalDigest===publicationPlan.approvalDigest&&
    plain(publisherAuthority)&&
    publisherAuthority.source==='ORIGINAL_AUTHENTICATED_CMS'&&
    publisherAuthority.ownerMfaDecisionVerified===true&&
    publisherAuthority.currentSourceEvidenceVerified===true&&
    publisherAuthority.licensedMediaVerified===true&&
    publisherAuthority.publicReleaseActivated===true&&
    plain(publicationPlan.languagePaths)&&
    utcInstant(intendedPublicationAt)&&utcInstant(modifiedAt)&&
    Date.parse(modifiedAt)>=Date.parse(intendedPublicationAt)&&
    Array.isArray(existingPublicFilesystemPaths)&&
    existingPublicFilesystemPaths.length<=500000,
    'NEWS_STATIC_ARTIFACT_APPROVAL_INVALID');
  const image=approvedEditorial.image;
  assert(plain(image)&&image.rightsReviewed===true&&
    ['LICENSED_OFFICIAL','ORIGINAL_DESIGN','ORIGINAL_AI_ILLUSTRATION']
      .includes(image.provenance)&&
    typeof image.assetReference==='string'&&
    /^\/assets\/images\/[a-zA-Z0-9_.\/-]+\.(webp|png|jpeg|jpg|avif)$/
      .test(image.assetReference)&&
    !image.assetReference.includes('..')&&
    safeText(image.altFa,5,300)&&safeText(image.altEn,5,300),
    'NEWS_STATIC_ARTIFACT_MEDIA_UNVERIFIED');
  publicHttps(approvedEditorial.sourceUrl);
  assert(approvedEditorial.sourceUrl.startsWith('https://')&&
    approvedEditorial.fa?.sourceUrl===approvedEditorial.sourceUrl&&
    approvedEditorial.en?.sourceUrl===approvedEditorial.sourceUrl,
    'NEWS_STATIC_ARTIFACT_OFFICIAL_SOURCE_INVALID');
  const article={
    id:approvedEditorial.candidateId,
    approvalDigest:publicationPlan.approvalDigest,
    publicationState:'OWNER_APPROVED_FOR_PUBLICATION',
    ownerApproved:true,sourceUrl:approvedEditorial.sourceUrl,
    priority:approvedEditorial.priority,
    fa:{...approvedEditorial.fa,imageAlt:image.altFa},
    en:{...approvedEditorial.en,imageAlt:image.altEn}
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
      featuredImage:image.assetReference,sourceTitle:approvedEditorial.sourceTitle,
      publicationDate:intendedPublicationAt,modifiedDate:modifiedAt,
      relatedLinks:approvedEditorial.internalLinks??[],
      publisherAuthorization:auth
    }),
    renderPublicNewsPage({
      article,language:'en',route:paths.en,otherLanguageRoute:paths.fa,
      featuredImage:image.assetReference,sourceTitle:approvedEditorial.sourceTitle,
      publicationDate:intendedPublicationAt,modifiedDate:modifiedAt,
      relatedLinks:approvedEditorial.internalLinks??[],
      publisherAuthorization:auth
    })
  ];
  const existing=new Set(existingPublicFilesystemPaths);
  const artifacts=rendered.map(result=>{
    const relativePath=result.route.slice(1)+'index.html';
    assert(!existing.has(relativePath)&&
      result.canonical===ORIGIN+result.route,
      'NEWS_STATIC_ARTIFACT_EXISTING_PUBLIC_PATH_COLLISION');
    return Object.freeze({
      relativePath,canonical:result.canonical,language:result.language,
      mimeType:'text/html; charset=utf-8',utf8Content:result.html,
      sha256:sha256(result.html),originalCmsOwnerApprovalDigest:
        publicationPlan.approvalDigest,currentlyPublic:false
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
