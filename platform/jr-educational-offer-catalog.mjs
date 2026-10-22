/**
 * JR commercial offer catalog — proposals only.
 * This module NEVER activates a payment, entitlement or sale.
 * Activation requires existing commerce integration and administrator approval.
 */
export const JR_OFFER_CATALOG_VERSION='2026-10-22-proposal-v1';
const offers=[
  ['talent-intro','Golden Talent — introductory step',0,'golden-talent'],
  ['talent-report','Golden Talent — expanded report',399000,'golden-talent'],
  ['rcas-intro','RCAS — introductory step',0,'rcas'],
  ['rcas-report','RCAS — advanced report',349000,'rcas'],
  ['bahar-intro','BAHAR — introduction and first two complete sections',0,'bahar'],
  ['bahar-full','BAHAR — full digital course',599000,'bahar'],
  ['scorecard-intro','Scorecard — preliminary analysis',0,'admission-intelligence'],
  ['scorecard-advanced','Scorecard — advanced analysis',249000,'admission-intelligence'],
  ['choice-studio-package','Choice Studio — admission package',699000,'choice-studio'],
  ['integrated-pathway','Integrated educational pathway',1490000,'golden-path'],
  ['human-review','Human admission review',2490000,'consultation'],
  ['vip-consultation','VIP consultation',5990000,'consultation']
];
export const JR_PROPOSED_OFFERS=Object.freeze(offers.map(([id,title,amountToman,engine])=>Object.freeze({
  id,title,amountToman,currency:'IRT_TOMAN_DISPLAY',engine,
  status:'proposal',publiclyPurchasable:false,
  scientificApprovalRequired:amountToman>0,
  paymentIntegrationVerified:false
})));
export function getProposedOffer(id) {
  return JR_PROPOSED_OFFERS.find(o=>o.id===id)??null;
}
export function canPublishPaidOffer(offer,gate) {
  if(!offer || offer.status!=='approved') return false;
  if(!gate || typeof gate!=='object') return false;
  return gate.adminApproved===true && gate.deliverableVerified===true &&
    gate.scientificClaimsReviewed===true && gate.entitlementEnforced===true &&
    gate.paymentIntegrationVerified===true;
}
