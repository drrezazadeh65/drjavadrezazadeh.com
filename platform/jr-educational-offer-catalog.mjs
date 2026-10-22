/**
 * JR educational proposal catalogue. Single source of truth is private JSON;
 * this ESM projection does not grant or activate any sale or entitlement.
 * Existing customer offers and financial contracts remain unchanged.
 */
import registry from '../api/internal/educational-offer-proposals.json' with { type:'json' };
export const JR_OFFER_CATALOG_VERSION=registry.version+'-proposal';
export const JR_PROPOSED_OFFERS=Object.freeze(registry.offers.map(entry=>Object.freeze({
  id:entry.id,title:entry.titleEn,titleFa:entry.titleFa,
  amountToman:entry.proposedPriceToman,currency:'IRT_TOMAN_DISPLAY',
  engine:entry.engine,status:'proposal',publiclyPurchasable:false,
  scientificApprovalRequired:entry.proposedPriceToman>0,
  paymentIntegrationVerified:false,
  entitlementIntegrationVerified:false
})));
export function getProposedOffer(id){
  return JR_PROPOSED_OFFERS.find(o=>o.id===id)??null;
}
/** This is an eligibility preflight, never an actual checkout activation. */
export function canPublishPaidOffer(offer,gate){
  if(!offer || offer.status!=='approved')return false;
  if(!gate||typeof gate!=='object')return false;
  return gate.adminApproved===true&&gate.deliverableVerified===true&&
    gate.scientificClaimsReviewed===true&&gate.entitlementEnforced===true&&
    gate.paymentIntegrationVerified===true;
}
