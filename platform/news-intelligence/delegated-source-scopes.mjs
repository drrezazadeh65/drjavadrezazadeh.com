/**
 * Owner-approved delegated source scopes for low-touch educational newsroom.
 * Goal: avoid asking the owner to approve EACH article discovery when the
 * ORIGINAL JREI registry explicitly authorizes a bounded source/site scope.
 *
 * This does NOT grant a scope, fetch URLs, register them into JREI or change
 * source rights. Actual original-JREI source registration MUST enforce the
 * same server-signed policy and independently check each link/redirect.
 */
import {assert,isHash,plain,publicHttps,utcInstant,sha256} from './contracts.mjs';
export function planDelegatedOfficialSourceDiscovery({
  originalOwnerSourceScope,discoveredUrl,atUtc,originalJreiSourceAuthority
}={}){
  assert(plain(originalOwnerSourceScope)&&
    originalOwnerSourceScope.source==='ORIGINAL_JREI_SIGNED_SOURCE_SCOPE'&&
    originalOwnerSourceScope.ownerMfaScopeApproved===true&&
    originalOwnerSourceScope.policyNotRevoked===true&&
    originalOwnerSourceScope.allowScopeBoundMetadataDiscovery===true&&
    originalOwnerSourceScope.sourceRegistryId!==undefined&&
    isHash(originalOwnerSourceScope.policyEvidenceSha256)&&
    utcInstant(originalOwnerSourceScope.validUntilUtc)&&
    utcInstant(atUtc)&&
    Date.parse(atUtc)<Date.parse(originalOwnerSourceScope.validUntilUtc)&&
    plain(originalJreiSourceAuthority)&&
    originalJreiSourceAuthority.source==='ORIGINAL_JREI_SOURCE_REGISTRY'&&
    originalJreiSourceAuthority.currentPolicyRevision===
      originalOwnerSourceScope.currentPolicyRevision&&
    originalJreiSourceAuthority.sourceId===
      originalOwnerSourceScope.sourceRegistryId&&
    originalJreiSourceAuthority.termsCurrent===true&&
    originalJreiSourceAuthority.robotsCurrent===true,
    'NEWS_JREI_DELEGATED_SOURCE_SCOPE_NOT_APPROVED');
  const found=new URL(publicHttps(discoveredUrl));
  const origin=new URL(publicHttps(originalOwnerSourceScope.approvedOrigin));
  const prefix=originalOwnerSourceScope.approvedPathPrefix;
  assert(origin.origin===found.origin&&
    typeof prefix==='string'&&prefix.startsWith('/')&&
    prefix.length<=220&&
    !prefix.includes('..')&&!prefix.includes('//')&&
    found.pathname.startsWith(prefix)&&
    found.search.length<=300&&
    Number.isSafeInteger(originalOwnerSourceScope.maxPerHostHourlyRequests)&&
    originalOwnerSourceScope.maxPerHostHourlyRequests>=1&&
    originalOwnerSourceScope.maxPerHostHourlyRequests<=60,
    'NEWS_DELEGATED_DISCOVERY_OUTSIDE_APPROVED_SCOPE');
  return Object.freeze({
    schema:'jr.jrei.news-delegated-article-discovery.v1',
    requestedArticleUrl:found.href,
    originalSourceId:originalOwnerSourceScope.sourceRegistryId,
    scopePolicyRevision:originalOwnerSourceScope.currentPolicyRevision,
    policyEvidenceSha256:originalOwnerSourceScope.policyEvidenceSha256,
    candidateKey:sha256(originalOwnerSourceScope.sourceRegistryId+'|'+found.href),
    requiresOriginalJreiSpecificUrlRegistration:true,
    originalJreiRegistryMustVerifyDelegateSignature:true,
    directFetchAuthorizedByThisModule:false,
    articleContentReproductionAuthorized:false,
    automaticOwnerPublicationAllowed:false,
    personalOrLoginBypassAllowed:false,
    originalHostQuotaAndRobotsRequired:true
  });
}
