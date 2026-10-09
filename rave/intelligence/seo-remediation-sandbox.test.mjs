import test from 'node:test';
import assert from 'node:assert/strict';
import {applySeoPlanInSandbox,rollbackSeoSandbox} from './seo-remediation-sandbox.mjs';
test('simulates title change without mutating original and can rollback',()=>{
 const pages=[{path:'/fa/about/',locale:'fa',title:''}];
 const plan=[{id:1,path:'/fa/about/',mode:'candidate',proposal:{operation:'set-title',value:'درباره'}}];
 const result=applySeoPlanInSandbox(pages,plan);
 assert.equal(result.after[0].title,'درباره');
 assert.equal(pages[0].title,'');
 assert.deepEqual(rollbackSeoSandbox(result),pages);
 assert.equal(result.productionTouched,false);
});
test('rejects dangerous operations and ambiguous paths',()=>{
 const pages=[{path:'/en/a/'},{path:'/en/a/'}];
 const plan=[{id:1,path:'/en/a/',mode:'candidate',proposal:{operation:'delete-page'}}];
 assert.equal(applySeoPlanInSandbox(pages,plan).log[0].status,'skipped');
});
test('does not remove indexable pages from sitemap',()=>{
 const pages=[{path:'/en/a/',indexable:true,inSitemap:true}];
 const plan=[{id:1,path:'/en/a/',mode:'candidate',proposal:{operation:'remove-from-sitemap'}}];
 assert.equal(applySeoPlanInSandbox(pages,plan).after[0].inSitemap,true);
});
