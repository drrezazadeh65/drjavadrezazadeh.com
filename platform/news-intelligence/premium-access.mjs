/**
 * Paid extras use EXISTING verified commerce entitlements; universal essential
 * examination announcements and official deadlines remain free.
 */
import {assert,isId,plain,utcInstant} from './contracts.mjs';
const EXTRAS=Object.freeze(['PERSONALIZED_OPPORTUNITY_ANALYSIS',
  'ADVANCED_STUDY_PATH','MULTI_EXAM_PLANNING',
  'PREMIUM_RESEARCH_DIGEST','FAMILY_DASHBOARD']);
export function newsFeatureAccess({feature,accountId=null,
  existingCommerceEntitlement=null,atUtc}={}){
  assert(EXTRAS.includes(feature)&&utcInstant(atUtc)&&
    (accountId===null||isId(accountId)),
    'NEWS_PREMIUM_ACCESS_INVALID');
  const granted=accountId!==null&&plain(existingCommerceEntitlement)&&
    existingCommerceEntitlement.accountId===accountId&&
    existingCommerceEntitlement.productFamily==='JREI_NEWS_PREMIUM'&&
    existingCommerceEntitlement.status==='ACTIVE'&&
    existingCommerceEntitlement.verifiedServerSide===true&&
    existingCommerceEntitlement.orderSettledAndNotRefunded===true&&
    utcInstant(existingCommerceEntitlement.expiresAt)&&
    Date.parse(existingCommerceEntitlement.expiresAt)>Date.parse(atUtc);
  return Object.freeze({schema:'jr.jrei.news-premium-access.v1',
    feature,accountId,granted,requiresServerVerifiedCommerce:true,
    publicNewsAlwaysFree:true,officialDeadlineAlertsAlwaysFree:true,
    noPriceInvented:true,individualSubscriptionOffByDefault:true});
}
export function premiumProductProposal({features,language='fa',
  ownerCommercialApproval=false}={}){
  assert(Array.isArray(features)&&features.length<=EXTRAS.length&&
    features.every(f=>EXTRAS.includes(f))&&
    ['fa','en'].includes(language),'NEWS_PREMIUM_PRODUCT_INVALID');
  return Object.freeze({schema:'jr.jrei.news-premium-product-proposal.v1',
    selectedFeatures:[...new Set(features)],language,
    ownerCommercialApproval,price:null,currency:null,
    existingCommerceCatalogRegistrationRequired:true,
    buyerPaymentOrEntitlementNotAssumed:true,
    activationAllowed:false});
}
