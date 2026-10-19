import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assessPublicReleaseEvidence} from '../scripts/lib/public-release-acceptance.mjs';

const sha='a'.repeat(40);
const good=()=>({
 expectedReleaseSha:sha,observedReleaseSha:sha,passed:true,
 operationalGates:[
  {name:'gsc-home-legacy-301',status:'LIVE_VERIFIED',httpStatus:301,
   destination:'/',oneHopPermanentCanonical:true,googleIndexConsolidationVerified:false},
  {name:'bilingual-public-service-pages-21x2',status:'LIVE_VERIFIED',
   expectedPages:42,inspectedPages:42,publicPagesMatchingContract:42,
   failedRoutes:[],verifiedEndToEndPurchase:false},
  {name:'mirkarimi-public-author-and-digital-offer',status:'LIVE_VERIFIED',
   pageHttpStatus:200,publicPagePassesSourceDisclosure:true,offerHttpStatus:200,
   actualBankPaymentAndVerifiedPrivatePdfDelivery:false},
  {name:'jhela-native-subdomain-tls',status:'HOST_UNVERIFIED',trustedTlsHandshake:false}
 ]
});
const by=(e,id)=>e.operationalGates.find(x=>x.name===id);

test('full immutable deployed public surfaces get a PUBLIC-only PASS, not an owner/full-masterplan PASS',()=>{
 const r=assessPublicReleaseEvidence(good());
 assert.equal(r.passed,true);
 assert.equal(r.publicP0Acceptance,'PUBLIC_SURFACES_VERIFIED');
 assert.deepEqual(r.blockers,[]);
 assert.equal(r.productionOwnerAccepted,false);
 assert.equal(r.commercialE2EVerified,false);
 assert.equal(r.nativeJournalEditorialE2EVerified,false);
 assert.equal(r.fullMasterplanCertified,false);
 assert.equal(r.checks.bilingualRoutes,42);
});

test('legacy 17-check smoke can pass while current production /home/ is still 404',()=>{
 const e=good();
 const h=by(e,'gsc-home-legacy-301');h.status='HOST_UNVERIFIED';h.httpStatus=404;h.oneHopPermanentCanonical=false;
 const r=assessPublicReleaseEvidence(e);
 assert.equal(e.passed,true);
 assert.equal(r.passed,false);
 assert.ok(r.blockers.includes('gsc_home_301_not_verified'));
});

test('21/21 English service pages missing means blocked even if old smoke is green',()=>{
 const e=good(),b=by(e,'bilingual-public-service-pages-21x2');
 b.status='HOST_UNVERIFIED';b.inspectedPages=42;b.publicPagesMatchingContract=21;
 b.failedRoutes=Array.from({length:21},(_,i)=>({path:'/en/services/test'+i+'/',failures:['http_status_404']}));
 const r=assessPublicReleaseEvidence(e);
 assert.equal(r.passed,false);
 assert.ok(r.blockers.includes('bilingual_42_routes_not_verified'));
});

test('a report with 42 successes but only 41 inspected must fail closed',()=>{
 const e=good(),b=by(e,'bilingual-public-service-pages-21x2');
 b.inspectedPages=41;
 assert.ok(assessPublicReleaseEvidence(e).blockers.includes('bilingual_42_routes_not_verified'));
});

test('deployed SHA mismatch or missing expected SHA cannot claim completed release',()=>{
 const e=good();e.observedReleaseSha='b'.repeat(40);
 assert.ok(assessPublicReleaseEvidence(e).blockers.includes('deployed_source_sha_mismatch'));
 delete e.expectedReleaseSha;
 assert.ok(assessPublicReleaseEvidence(e).blockers.includes('immutable_expected_sha_absent'));
});

test('missing public author page or offer blocks customer-facing catalog completeness',()=>{
 const e=good(),p=by(e,'mirkarimi-public-author-and-digital-offer');
 p.pageHttpStatus=404;p.status='HOST_UNVERIFIED';
 assert.ok(assessPublicReleaseEvidence(e).blockers.includes('publishing_public_offer_not_verified'));
});

test('unavailable or malformed observations fail closed; never claim payment or OJS acceptance',()=>{
 for(const payload of [null,{}, {passed:true,operationalGates:[]}]){
  const r=assessPublicReleaseEvidence(payload);
  assert.equal(r.passed,false);
  assert.ok(r.blockers.length>0);
  assert.equal(r.commercialE2EVerified,false);
  assert.equal(r.fullMasterplanCertified,false);
 }
 const page=good();by(page,'jhela-native-subdomain-tls').trustedTlsHandshake=true;
 const r=assessPublicReleaseEvidence(page);
 assert.equal(r.checks.journalTlsPublicHandshakeObserved,true);
 assert.equal(r.nativeJournalEditorialE2EVerified,false);
});

test('the real observer writes publicReleaseAcceptance beside (not replacing) legacy checks',()=>{
 const source=fs.readFileSync('scripts/bertina-postrelease-check.mjs','utf8');
 assert.match(source,/passed:failures===0,checks,operationalGates/);
 assert.match(source,/evidence\.publicReleaseAcceptance=assessPublicReleaseEvidence\(evidence\)/);
 assert.doesNotMatch(source,/\/api\/commerce\/create/);
});

test('GitHub Actions summary discloses strict P0 blockers even if smoke passed',()=>{
 const workflow=fs.readFileSync('.github/workflows/bertina-postrelease-acceptance.yml','utf8');
 assert.match(workflow,/### Public P0 acceptance \(strict\)/);
 assert.match(workflow,/PUBLIC SURFACES VERIFIED/);
 assert.match(workflow,/Exact release SHA pinned/);
 assert.match(workflow,/One-hop \/home\/ redirect/);
 assert.match(workflow,/Service pages meeting public contract/);
 assert.match(workflow,/Strict public blockers/);
 assert.match(workflow,/does NOT certify bank settlement/);
 assert.match(workflow,/if: always\(\)/);
});
