import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAiDiscoverability} from './ai-discoverability-audit.mjs';
const page={path:'/en/services/consultation/',locale:'en',indexable:true,canonical:'/en/services/consultation/',title:'Consultation',description:'Evidence-based guidance',primaryEntityId:'https://example.org/#organization',authoritySource:'https://example.org/research/',structuredDataTypes:['Service'],hreflang:{en:'/en/services/consultation/'},claimsVerified:true};
test('accepts fully evidenced localized public service page',()=>{
 const result=auditAiDiscoverability([page]);
 assert.equal(result.readyForPublication,true);
 assert.equal(result.aiCitationsGuaranteed,false);
});
test('flags missing evidence, schema and gated content',()=>{
 const result=auditAiDiscoverability([{...page,primaryEntityId:'',authoritySource:'',structuredDataTypes:[],requiresLogin:true,claimsVerified:false}]);
 for(const code of ['missing-stable-entity-id','missing-verifiable-source','missing-relevant-schema-type','public-content-login-gated','claims-need-editorial-verification'])assert.ok(result.findings.some(f=>f.code===code));
});
test('detects duplicate paths and does not claim production activity',()=>{
 const result=auditAiDiscoverability([page,page]);
 assert.ok(result.findings.some(f=>f.code==='duplicate-path'));
 assert.equal(result.productionTouched,false);
});
