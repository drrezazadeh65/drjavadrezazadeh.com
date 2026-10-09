import test from 'node:test';
import assert from 'node:assert/strict';
import {auditServiceJourney} from './service-seo-checkout-journey.mjs';
const service={id:'s1',paths:{fa:'/fa/services/talent/',en:'/en/services/talent/'},canonical:{fa:'/fa/services/talent/',en:'/en/services/talent/'},hreflang:{fa:'/fa/services/talent/',en:'/en/services/talent/'},seo:{fa:{title:'استعداد',description:'سنجش استعداد'},en:{title:'Talent',description:'Talent assessment'}},checkout:{enabled:true,productId:'p1',emailRequired:true,phoneVerification:false}};
test('accepts complete bilingual journey metadata',()=>{const r=auditServiceJourney([service]);assert.equal(r.valid,true);assert.equal(r.productionTouched,false)});
test('flags phone verification against email-only policy',()=>{const r=auditServiceJourney([{...service,checkout:{...service.checkout,phoneVerification:true}}]);assert.ok(r.findings.some(f=>f.code==='email-only-identity-policy-violation'))});
test('flags missing English SEO metadata',()=>{const r=auditServiceJourney([{...service,seo:{...service.seo,en:{title:'',description:''}}}]);assert.ok(r.findings.some(f=>f.locale==='en'&&f.code==='missing-seo-title'))});
