import test from 'node:test';
import assert from 'node:assert/strict';
import {verifySeoRemediation} from './seo-remediation-verifier.mjs';
const page=()=>({path:'/en/about/',locale:'en',title:'',description:'About',indexable:true,canonical:'/en/about/',hreflang:{en:'/en/about/'},inSitemap:true});
test('accepts verified title repair',()=>{
 const pages=[page()];
 const plan=[{id:1,path:'/en/about/',mode:'candidate',proposal:{operation:'set-title',value:'About us'}}];
 const r=verifySeoRemediation(pages,plan);
 assert.equal(r.accepted,true);assert.ok(r.resolved.some(f=>f.code==='missing_title'));
 assert.equal(r.resultingPages[0].title,'About us');assert.equal(pages[0].title,'');
 assert.equal(r.productionTouched,false);
});
test('rejects ineffective fix and restores snapshot',()=>{
 const pages=[page()];
 const plan=[{id:1,path:'/en/about/',mode:'candidate',proposal:{operation:'delete-page'}}];
 const r=verifySeoRemediation(pages,plan);
 assert.equal(r.accepted,false);assert.deepEqual(r.resultingPages,pages);
});
