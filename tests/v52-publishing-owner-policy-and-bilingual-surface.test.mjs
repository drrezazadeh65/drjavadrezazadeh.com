import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectPublishingPublicPage,inspectPublishingPublicOffer} from '../scripts/lib/publishing-public-surface.mjs';

test('public Persian and English author pages meet verified disclosure contract',()=>{
 for(const lang of ['fa','en']){
  const html=fs.readFileSync(lang+'/shop/authors/mehrab-mirkarimi/index.html','utf8');
  const r=inspectPublishingPublicPage(html,lang);
  assert.equal(r.valid,true,lang+' '+JSON.stringify(r.checks));
  assert.equal(Object.values(r.checks).every(Boolean),true);
 }
});

test('author page acceptance fails closed on checkout or canonical manipulation',()=>{
 const src=fs.readFileSync('fa/shop/authors/mehrab-mirkarimi/index.html','utf8');
 for(const changed of [
  src.replace('id="jp-digital-checkout-form"','id="wrong-form"'),
  src.replace('action="/api/commerce/create"','action="https://somewhere.invalid/pay"'),
  src.replace('method="post"','method="get"'),
  src.replace('id="jp-checkout-state"','id="wrong-state"'),
  src.replace('تا زمان فعال‌سازی، پرداختی از شما دریافت نخواهد شد',''),
  src.replace('hidden aria-label','aria-label'),
  src.replace('https://drjavadrezazadeh.com/fa/shop/authors/mehrab-mirkarimi/','https://invalid.example/fa/')
 ]){
   assert.equal(inspectPublishingPublicPage(changed,'fa').valid,false);
 }
});

test('public unavailable offer is valid and does not masquerade as sale readiness',()=>{
 const safe=inspectPublishingPublicOffer({httpStatus:200,body:{
  ok:true,available:false,checkoutEnabled:false,
  sku:'digital:tefl-ma-exams-1370-1405',priceToman:1000000}});
 assert.equal(safe.valid,true);
 assert.equal(safe.checkoutReady,false);
 for(const body of [
  {ok:true,available:true,checkoutEnabled:false,sku:'digital:tefl-ma-exams-1370-1405',priceToman:1000000},
  {ok:true,available:true,checkoutEnabled:true,sku:'wrong-sku',priceToman:1000000},
  {ok:true,available:true,checkoutEnabled:true,sku:'digital:tefl-ma-exams-1370-1405',priceToman:950000}
 ])assert.equal(inspectPublishingPublicOffer({httpStatus:200,body}).valid,false);
});

test('publishing owner policy does not fabricate rights evidence or bypass finance and delivery',()=>{
 const offer=fs.readFileSync('api/internal/jr-publishing-digital.php','utf8');
 const activation=fs.readFileSync('api/internal/jr-publishing-activate-existing-cli.php','utf8');
 const provision=fs.readFileSync('api/internal/jr-publishing-provision-cli.php','utf8');
 const preflight=fs.readFileSync('api/internal/jr-publishing-preflight-cli.php','utf8');
 assert.doesNotMatch(offer,/WHERE l.work_id=\?|SELECT l.evidence_sha256/);
 assert.doesNotMatch(offer,/AND w\.rights_verified_at IS NOT NULL/);
 assert.doesNotMatch(activation,/rights_verified_at=COALESCE|INSERT INTO publishing_rights_licences/);
 assert.doesNotMatch(provision,/INSERT INTO publishing_rights_licences|JR_PUBLISHING_RIGHTS_EVIDENCE_SHA256/);
 assert.doesNotMatch(preflight,/jrPreflight\('author_digital_rights'/);
 for(const k of ['jrPubPrivateDir()','malware_scanned_at','hash_file(\'sha256\'','JR_PUB_ORIGINAL_ASSETS','jrPublishingSchemaReady']){
  assert.ok(offer.includes(k),'missing safe preflight: '+k);
 }
 assert.match(activation,/author_account_verified/);
 assert.match(offer,/unit_author_toman/);
 assert.match(offer,/unit_fund_toman/);
 assert.match(preflight,/'ready_for_public_sales'=>false/);
});
