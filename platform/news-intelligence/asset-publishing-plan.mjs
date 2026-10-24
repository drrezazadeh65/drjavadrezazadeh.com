/**
 * Source-only asset packaging manifest. The complete News module lives in
 * platform/news-intelligence/ui/ until final owner-approved integration.
 *
 * Public HTML refers to /assets/js/news-*.js and
 * /assets/css/news-intelligence.css. Without actual original CMS asset
 * packaging these URLs MUST NOT be claimed ready, tested or deployed.
 */
import {assert,isHash,plain,sha256} from './contracts.mjs';
export const NEWS_ASSETS=Object.freeze([
  {source:'platform/news-intelligence/ui/news-intelligence.css',
    target:'assets/css/news-intelligence.css',visibility:'PUBLIC'},
  {source:'platform/news-intelligence/ui/news-reader.js',
    target:'assets/js/news-reader.js',visibility:'PUBLIC'},
  {source:'platform/news-intelligence/ui/news-search.js',
    target:'assets/js/news-search.js',visibility:'PUBLIC'},
  {source:'platform/news-intelligence/ui/news-assistant.js',
    target:'assets/js/news-assistant.js',visibility:'PUBLIC'},
  {source:'platform/news-intelligence/ui/news-calendar.js',
    target:'assets/js/news-calendar.js',visibility:'PUBLIC'},
  {source:'platform/news-intelligence/ui/admin-newsroom.js',
    target:'assets/js/admin-newsroom.js',visibility:'AUTHENTICATED_ADMIN_ONLY'},
  {source:'platform/news-intelligence/ui/admin-newsroom.css',
    target:'assets/css/admin-newsroom.css',visibility:'AUTHENTICATED_ADMIN_ONLY'},
  {source:'platform/news-intelligence/ui/news-preferences.js',
    target:'assets/js/news-preferences.js',visibility:'AUTHENTICATED_ACCOUNT_ONLY'}
].map(x=>Object.freeze(x)));
export function newsAssetPublishingPlan({sourceFiles,existingAssetRegistry,
  authenticatedPublisherPolicy}={}){
  assert(plain(sourceFiles)&&plain(existingAssetRegistry)&&
    Array.isArray(existingAssetRegistry.destinations)&&
    plain(authenticatedPublisherPolicy)&&
    authenticatedPublisherPolicy.source==='ORIGINAL_AUTHENTICATED_SITE_PUBLISHER'&&
    authenticatedPublisherPolicy.ownerApprovedAssets===true&&
    authenticatedPublisherPolicy.stableAssetPathPolicyChecked===true,
    'NEWS_ASSET_ORIGINAL_PUBLISHER_AUTHORIZATION_MISSING');
  const tasks=[];
  for(const asset of NEWS_ASSETS){
    const file=sourceFiles[asset.source];
    assert(plain(file)&&typeof file.content==='string'&&
      isHash(file.contentSha256)&&
      sha256(file.content)===file.contentSha256&&
      file.sourcePath===asset.source,
      'NEWS_ASSET_SOURCE_DIGEST_UNVERIFIED');
    const target=existingAssetRegistry.destinations.find(x=>
      plain(x)&&x.path===asset.target);
    assert(target===undefined||(
      target.currentContentSha256===file.contentSha256&&
      target.ownerApprovedForNews===true),
      'NEWS_ASSET_DESTINATION_COLLISION');
    tasks.push({source:asset.source,target:asset.target,
      sha256:file.contentSha256,visibility:asset.visibility,
      requiredExistingPublisherReview:true,
      noFileWrittenYet:true});
  }
  return Object.freeze({schema:'jr.jrei.news-asset-publish-plan.v1',
    tasks,allAssetsValidatedByDigestContractOnly:true,
    actualFilesystemWrites:0,
    originalCmsMustProvideImmutableReceipts:true,
    currentAvailabilityOnPublicWebsiteUnverified:true});
}
