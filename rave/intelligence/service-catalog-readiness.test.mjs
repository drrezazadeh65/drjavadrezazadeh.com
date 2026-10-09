import test from 'node:test';
import assert from 'node:assert/strict';
import {auditServiceCatalog} from './service-catalog-readiness.mjs';
test('flags missing services rather than inventing them',()=>{
 const r=auditServiceCatalog([]);
 assert.equal(r.valid,false);assert.equal(r.expectedCount,27);
 assert.ok(r.issues.some(x=>x.code==='service-count-mismatch'));
 assert.equal(r.readyForCheckout,false);
});
test('requires bilingual content and dedicated image',()=>{
 const r=auditServiceCatalog([{id:'s1',titleFa:'مشاوره',priceMinor:100,currency:'IRR'}],{expectedCount:1});
 assert.ok(r.issues.some(x=>x.code==='missing-titleEn'));
 assert.ok(r.issues.some(x=>x.code==='missing-imageId'));
});
test('blocks unreviewed published service',()=>{
 const service={id:'s1',titleFa:'الف',titleEn:'A',descriptionFa:'شرح',descriptionEn:'Description',deliverablesFa:'خروجی',deliverablesEn:'Output',imageId:'img1',priceMinor:100,currency:'IRR',published:true};
 const r=auditServiceCatalog([service],{expectedCount:1});
 assert.ok(r.issues.some(x=>x.code==='publication-without-review'));
});
