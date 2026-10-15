import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyRcasBrowserPreview as classify} from '../platform/rcas-preview-edition-contract.mjs';

const registry=JSON.parse(fs.readFileSync(
  new URL('../platform/golden-talent-instrument-registry.v1.json',import.meta.url),'utf8'));
const faSrc=fs.readFileSync(new URL('../assets/js/rcas-start.js',import.meta.url),'utf8');
const enSrc=fs.readFileSync(new URL('../assets/js/rcas-start-en.js',import.meta.url),'utf8');
const base={
 completed:true,completedItemCount:28,
 p0Validated:true,routingEvidenceCompleted:true,meaningfulCoreEvidence:true,
 route:'D3',routeBasis:'SELF_SELECTED_UNVALIDATED'
};
const fa={...base,rcasRevision:'start-1.2'};
const en={...base,rcasRevision:'start-en-pilot-1'};
test('actual Persian and English browser code matches separately registered revisions',()=>{
  for(const [source,snapshot,locale] of [[faSrc,fa,'fa'],[enSrc,en,'en']]){
    assert.match(source,new RegExp("rcasRevision:[\\s]*['\\\"]"+snapshot.rcasRevision.replace('.','\\.')+"['\\\"]"));
    const decision=classify(snapshot,locale,registry);
    assert.equal(decision.accepted,true);
    assert.equal(decision.canAggregateWithOtherEdition,false);
    assert.equal(decision.canPublishProfessionalReport,false);
    assert.equal(decision.canProduceNormativeScores,false);
  }
});
test('cross-locale and old registry revision cannot be interpreted as current',()=>{
 for(const [snapshot,locale] of [[fa,'en'],[en,'fa'],
   [{...fa,rcasRevision:'start-1.1-browser-preview'},'fa']]){
  const result=classify(snapshot,locale,registry);
  assert.equal(result.accepted,false);
  assert.equal(result.canPublishProfessionalReport,false);
 }
});
test('unversioned/incomplete reports and attempts at inference fail closed',()=>{
 for(const bad of [
   {},{...fa,completedItemCount:27},{...fa,completed:false},
   {...fa,routeBasis:'INFERRED_BY_AI'},{...fa,route:'D8'},
   {...fa,p0Validated:false},{...fa,routingEvidenceCompleted:false},
   {...fa,meaningfulCoreEvidence:false}
 ])assert.equal(classify(bad,'fa',registry).accepted,false);
});
test('registries cannot invent translation equivalence or scientific validation',()=>{
 const copy=structuredClone(registry);
 const core=copy.instruments.find(i=>i.id==='RCAS-CORE');
 core.browser_preview_editions[0].cross_locale_equivalence_established=true;
 assert.equal(classify(fa,'fa',copy).accepted,false);
 core.browser_preview_editions[0].cross_locale_equivalence_established=false;
 core.scientific_status='VALIDATED';
 assert.equal(classify(fa,'fa',copy).accepted,false);
 core.scientific_status='PREVALIDATION';
 core.browser_preview_editions[0].content_sha256='invented-hash';
 assert.equal(classify(fa,'fa',copy).accepted,false);
});
test('registry respects browser-only privacy and forbids scored versions',()=>{
 const core=registry.instruments.find(i=>i.id==='RCAS-CORE');
 assert.equal(core.expected_item_count,28);
 assert.equal(core.content_sha256,null);
 assert.equal(core.human_approval,false);
 assert.equal(core.release_state,'PREVIEW_ONLY');
 assert.equal(core.browser_preview_editions.length,2);
 for(const edition of core.browser_preview_editions)
  assert.equal(edition.scoring_enabled,false);
});
