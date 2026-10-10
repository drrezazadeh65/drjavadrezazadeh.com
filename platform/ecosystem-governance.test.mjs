import assert from 'node:assert/strict';
import {registry,classifyRoute,validateFeatureRegistration,privatePrefixes} from './ecosystem-governance.mjs';

assert.equal(registry.origins.production_target,'https://drjavadrezazadeh.com');
assert.deepEqual(registry.locales.supported,['fa','en']);
assert.equal(registry.locales.automatic_ip_language_redirect,false);
assert.equal(classifyRoute('/fa/app/student/').policy,'PRIVATE_APP');
assert.equal(classifyRoute('/en/account/reports/').cache,'NO_STORE');
assert.equal(classifyRoute('/en/golden-talent/checkout/').policy,'TRANSACTIONAL');
assert.equal(classifyRoute('/fa/golden-talent/').policy,'PUBLIC_CANDIDATE');
assert.equal(classifyRoute('/fa/shop/').policy,'PUBLIC_CANDIDATE');
assert.equal(classifyRoute('/en/shop/').policy,'PUBLIC_CANDIDATE');
assert.equal(classifyRoute('/fa/shop/checkout/').policy,'TRANSACTIONAL');
assert.equal(classifyRoute('/en/shop/checkout/').policy,'TRANSACTIONAL');
assert.equal(classifyRoute('/future-module/').indexing,'EXPLICIT_RELEASE_ONLY');
assert.equal(classifyRoute('/about/').indexing,'NOINDEX');
assert.equal(classifyRoute('/privacy/').policy,'PUBLIC_NO_INDEX');
assert.equal(classifyRoute('/journal/submission/').indexing,'NOINDEX');
assert.equal(classifyRoute('/journal/call-for-reviewers/').indexing,'EXPLICIT_RELEASE_ONLY');
assert(privatePrefixes().includes('/fa/app/'));
assert.throws(()=>validateFeatureRegistration({feature_id:'x'}));
assert.throws(()=>validateFeatureRegistration({
 feature_id:'x',owner_surface:'API',lifecycle_state:'DRAFT',data_class:'PRIVATE',
 auth_policy:'REQUIRED',index_policy:'INDEX',cache_policy:'NO_STORE',locale_strategy:'BILINGUAL',
 api_contract_or_none:'v1',observability_class:'PRIVATE_SAFE',rollback_plan:'documented'
}));
assert.equal(validateFeatureRegistration({
 feature_id:'future-public-module',owner_surface:'PUBLIC_WEB',lifecycle_state:'DRAFT',data_class:'PUBLIC',
 auth_policy:'NONE',index_policy:'NOINDEX',cache_policy:'PUBLIC_REVALIDATE',locale_strategy:'BILINGUAL',
 api_contract_or_none:'NONE',observability_class:'PUBLIC_AGGREGATE',rollback_plan:'remove-route-before-index'
}).valid,true);

console.log('Ecosystem governance contract passed');
