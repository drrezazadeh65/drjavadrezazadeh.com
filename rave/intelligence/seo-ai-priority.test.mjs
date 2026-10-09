import test from 'node:test';
import assert from 'node:assert/strict';
import {runOfflineSeoRepair} from './seo-repair-orchestrator.mjs';
import {routeOfflineAiTask,reviewOfflineAiDraft} from './ai-governed-router.mjs';
test('SEO orchestrator proposes and verifies safe title change offline',()=>{
 const pages=[{path:'/fa/about/',locale:'fa',title:'',description:'درباره',canonical:'/fa/about/',indexable:true,hreflang:{fa:'/fa/about/'},inSitemap:true}];
 const r=runOfflineSeoRepair(pages,{titles:{'/fa/about/':'درباره ما'}});
 assert.equal(r.verification.accepted,true);assert.equal(r.verification.resultingPages[0].title,'درباره ما');
 assert.equal(pages[0].title,'');assert.equal(r.productionTouched,false);
});
test('AI router refuses execution without consent',()=>{
 const r=routeOfflineAiTask({requestId:'t1',capability:'seo-advice',input:'Audit metadata',consent:false});
 assert.equal(r.plan.status,'blocked');assert.equal(r.networkCalled,false);
});
test('AI draft cannot self-publish',()=>{
 const r=reviewOfflineAiDraft({capability:'seo-advice',output:'Check canonical tags'});
 assert.equal(r.publicationAllowed,false);assert.equal(r.verified,false);
});
