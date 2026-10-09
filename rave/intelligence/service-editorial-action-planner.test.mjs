import test from 'node:test';
import assert from 'node:assert/strict';
import {planServiceEditorialImprovements} from './service-editorial-action-planner.mjs';
test('produces actionable but unpublished tasks from missing academic facts',()=>{
 const r=planServiceEditorialImprovements({id:'s1',titleFa:'خدمت'});
 assert.ok(r.actions.some(a=>a.code==='missing-academic-basis'));
 assert.ok(r.actions.some(a=>a.locale==='en'&&a.code==='missing-title'));
 assert.ok(r.actions.every(a=>a.owner==='human-editor'&&a.autoPublish===false));
 assert.equal(r.readyForPublication,false);
 assert.equal(r.productionTouched,false);
});
test('complete service creates no invented editorial tasks',()=>{
 const r=planServiceEditorialImprovements({id:'s1',titleFa:'خدمت',titleEn:'Service',descriptionFa:'ت'.repeat(121),descriptionEn:'D'.repeat(121),deliverablesFa:'گزارش',deliverablesEn:'Report',academicBasis:'Peer-reviewed evidence supplied by editor',audience:'Adult learners',limitations:'Not diagnostic',imageId:'img1'});
 assert.equal(r.actions.length,0);
 assert.equal(r.readyForPublication,false);
});
