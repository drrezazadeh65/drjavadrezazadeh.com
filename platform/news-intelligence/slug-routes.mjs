/**
 * Automatically propose STABLE bilingual paths for previously unpublished
 * articles. Uses normalized English headline, an immutable evidence marker,
 * and the EXISTING frozen URL registry. Routes stay proposals until the
 * original authenticated CMS reserves both without a collision.
 *
 * No public URL, DNS, filesystem or API route is created here.
 */
import {assert,isHash,plain,safeText,sha256} from './contracts.mjs';
export function proposeImmutableBilingualNewsRoutes({
  headlineEn,candidateFingerprint,existingCanonicalRoutes,
  originalPublicRouteRegistry
}={}){
  assert(safeText(headlineEn,8,180)&&isHash(candidateFingerprint)&&
    Array.isArray(existingCanonicalRoutes)&&
    existingCanonicalRoutes.length<=500000&&
    plain(originalPublicRouteRegistry)&&
    originalPublicRouteRegistry.source==='EXISTING_SITE_IMMUTABLE_URL_REGISTRY'&&
    originalPublicRouteRegistry.completeCurrentSnapshot===true,
    'NEWS_CANONICAL_OWNER_ROUTE_REGISTRY_MISSING');
  const words=headlineEn.normalize('NFKD').toLowerCase()
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
    .split('-').filter(Boolean).slice(0,9);
  const stem=words.join('-').slice(0,72).replace(/-$/,'')||'education-update';
  const end=candidateFingerprint.slice(0,12);
  const slug=stem+'-'+end;
  const routes={fa:'/fa/akhbar/'+slug+'/',en:'/en/news-insights/'+slug+'/'};
  const inUse=new Set(existingCanonicalRoutes);
  assert(!inUse.has(routes.fa)&&!inUse.has(routes.en)&&
    routes.fa!==routes.en,
    'NEWS_STABLE_SLUG_ALREADY_IN_USE');
  return Object.freeze({
    schema:'jr.jrei.news-bilingual-route-proposal.v1',
    faPath:routes.fa,enPath:routes.en,
    slug,candidateFingerprint,
    routeProposalDigest:sha256([candidateFingerprint,routes.fa,routes.en].join('|')),
    existingPublicUrlsPreserved:true,
    originalCmsReservationRequired:true,
    ownerApprovalMustDisplayTheseRoutes:true,
    dnsOrPublicPageChanged:false
  });
}
