import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMagazineArticle,transitionMagazineArticle} from './magazine-editorial-engine.mjs';
import {validateCommerceCatalog} from './commerce-catalog-quality.mjs';
const article={id:'a1',locale:'fa',title:'پژوهش',body:'متن علمی',status:'draft'};
test('magazine cannot skip editorial checks',()=>assert.throws(()=>transitionMagazineArticle(article,'published',{reviewerApproved:true}),Error));
test('magazine progresses through fact-check offline',()=>{
 const result=transitionMagazineArticle(article,'fact-check');
 assert.equal(result.status,'fact-check');assert.equal(result.publicationExecuted,false);
 assert.equal(validateMagazineArticle(result).productionTouched,false);
});
test('commerce blocks incomplete product listings',()=>{
 const r=validateCommerceCatalog([{sku:'p1',titleFa:'کتاب',priceMinor:1000,currency:'IRR'}]);
 assert.equal(r.valid,false);assert.ok(r.issues.some(x=>x.code==='missing-en-title'));
 assert.equal(r.checkoutEnabled,false);
});
