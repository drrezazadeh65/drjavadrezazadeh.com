/**
 * Independent, read-only acceptance for PUBLIC deployment surfaces.
 * Unlike the legacy 17-check smoke verdict, this cannot pass if the tested
 * Git SHA is not actually deployed, /home/ is 404, or bilingual routes fail.
 * Does NOT certify payments, privacy RBAC, PKP OJS, SMTP, backups or 41 gates.
 */
const find=(gates,id)=>Array.isArray(gates)?gates.find(x=>x&&x.name===id):undefined;

export function assessPublicReleaseEvidence(evidence){
 const blockers=[];
 const requireCheck=(yes,code)=>{if(!yes)blockers.push(code);};
 const exp=evidence?.expectedReleaseSha,obs=evidence?.observedReleaseSha;
 const sha=/^[0-9a-f]{40}$/;
 requireCheck(evidence?.passed===true,'legacy_anonymous_smoke_not_passing');
 requireCheck(typeof exp==='string'&&sha.test(exp),'immutable_expected_sha_absent');
 requireCheck(typeof obs==='string'&&sha.test(obs),'observed_live_sha_missing');
 requireCheck(sha.test(exp||'')&&obs===exp,'deployed_source_sha_mismatch');

 const home=find(evidence?.operationalGates,'gsc-home-legacy-301');
 requireCheck(home?.status==='LIVE_VERIFIED'&&home.httpStatus===301&&home.destination==='/'&&home.oneHopPermanentCanonical===true,'gsc_home_301_not_verified');

 const bilingual=find(evidence?.operationalGates,'bilingual-public-service-pages-21x2');
 requireCheck(bilingual?.status==='LIVE_VERIFIED'
   &&bilingual.expectedPages===42&&bilingual.inspectedPages===42
   &&bilingual.publicPagesMatchingContract===42
   &&Array.isArray(bilingual.failedRoutes)&&bilingual.failedRoutes.length===0,
   'bilingual_42_routes_not_verified');

 const product=find(evidence?.operationalGates,'mirkarimi-public-author-and-digital-offer');
 requireCheck(product?.status==='LIVE_VERIFIED'
   &&product.pageHttpStatus===200&&product.publicPagePassesSourceDisclosure===true
   &&product.offerHttpStatus===200,
   'publishing_public_offer_not_verified');
 // Checkout remains fail-closed until private commercial evidence exists.
 // Never infer bank delivery or a signed licence from a public offer response.
 const tls=find(evidence?.operationalGates,'jhela-ojs-subdomain-tls');
 const journalTlsPublicHandshakeObserved=tls?.trustedTlsHandshake===true;
 return {
  schema:'jr-public-deployment-acceptance-v1',
  publicP0Acceptance: blockers.length===0?'PUBLIC_SURFACES_VERIFIED':'BLOCKED',
  passed: blockers.length===0,
  blockers,
  checks:{
   legacySmokePass:evidence?.passed===true,
   immutableShaMatches:typeof exp==='string'&&sha.test(exp)&&obs===exp,
   homeOneHop301:home?.status==='LIVE_VERIFIED'&&home.oneHopPermanentCanonical===true,
   bilingualRoutes:typeof bilingual?.publicPagesMatchingContract==='number'?bilingual.publicPagesMatchingContract:null,
   expectedBilingualRoutes:42,
   publishingPageAndOffer:product?.status==='LIVE_VERIFIED',
   journalTlsPublicHandshakeObserved
  },
  productionOwnerAccepted:false,
  fullMasterplanCertified:false,
  commercialE2EVerified:false,
  scientificPsychometricsVerified:false,
  ojsEditorialE2EVerified:false,
  note:'Public anonymous HTTP checks only, not production services, private-file safety or legal/scientific certification.'
 };
}
