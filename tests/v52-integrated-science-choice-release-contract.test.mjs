import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const engine=read('platform/golden-talent-engine.mjs');
const policy=JSON.parse(read('platform/golden-talent-engine-policy.json'));
const registry=JSON.parse(read('platform/golden-talent-instrument-registry.v1.json'));
test('one existing Golden Talent router remains authoritative; instrument status remains prevalidated',()=>{
 assert.equal(policy.engine_version,'1.1.0');
 assert.equal(registry.engine_version,'1.1.0');
 assert.equal(registry.previous_engine_version,'0.2-prevalidation');
 assert.equal(registry.scientific_policy.validation_status,'PREVALIDATION');
 assert.ok(registry.instruments.every(i=>i.release_state!=='PUBLISHED'));
 assert.match(engine,/export function routeEvidence\(events=\[\]\)/);
 assert.match(engine,/export function classifyDomain\(domain,events=\[\]\)/);
 assert.doesNotMatch(engine,/routeEvidenceV11|classifyDomainV11/);
 assert.match(engine,/export const ENGINE_VERSION='1.1.0'/);
 assert.match(engine,/total_score:null,normative_label:null/);
 assert.match(engine,/hash_is_authentication:false,server_signature_present:false/);
 assert.match(engine,/CLAIM_COMPATIBILITY_NOT_VERIFIED/);
 assert.match(engine,/PENDING_PROFESSIONAL_REVIEW/);
 assert.match(read('docs/reference/golden-talent-engine-0.2-prevalidation-source.md'),/reference only/);
});
test('RCAS, observer, BAHAR and Golden Path share audit provenance without automatic interpretation',()=>{
 const rcas=read('platform/rcas-evidence-bridge.mjs');
 const observer=read('platform/rcas-observer-evidence-bridge.mjs');
 const bahar=read('platform/bahar-engine.mjs');
 const synthesis=read('platform/golden-path-synthesis.mjs');
 assert.match(rcas,/independence_group_id:input.session_id/);
 assert.match(rcas,/quality_state:'UNREVIEWED'/);
 assert.match(observer,/review_required:true/);
 assert.match(observer,/visibility_authorised!==true/);
 assert.match(bahar,/source_references_repeated_across_weeks/);
 assert.match(bahar,/independent_source_corroboration_established:false/);
 assert.match(bahar,/causal_intervention_effect:null/);
 assert.match(synthesis,/verifyResult\(route_result,evidence_events\)/);
 assert.match(synthesis,/requires_professional_release:true/);
 assert.match(synthesis,/requires_human_goal_setting:true/);
 assert.match(read('api/golden-talent.php'),/readOnly/);
});
test('Choice Studio integrates in existing bilingual public URLs with stable five-factor feedback',()=>{
 const choice=read('assets/js/jr-choice-studio-v1.js');
 const report=read('assets/js/jr-choice-feedback-v1.js');
 const css=read('assets/css/jr-choice-studio-v1.css');
 for(const [locale,path] of [['fa','fa/entekhab-reshteh/index.html'],['en','en/student-guidance/index.html']]){
  const html=read(path);
  assert.ok(html.includes('data-choice-studio data-locale="'+locale+'"'));
  assert.match(html,/jr-choice-studio-v1\.js\?v=20261022-canonical-path-identities-v6/);
  assert.match(html,/jr-choice-studio-v1\.css\?v=20261020-choice-sensitive-v5/);
  assert.match(html,/jr-choice-feedback-v1\.js\?v=20261022-no-overwrite-suggestions-v2/);
 }
 assert.match(choice,/persistInput\.checked=false/);
 assert.match(choice,/sessionStorage\.setItem\(storageKey,JSON\.stringify\(data\)\)/);
 assert.match(choice,/weights:weights\.map\(w=>Number\(w\.input\.value\)\),order:\[\.\.\.order\]/);
 assert.doesNotMatch(choice,/localStorage\s*[.(]/);
 assert.doesNotMatch(choice,/fetch\s*\(/);
 assert.match(choice,/weightGrid\.append\(elements\.get\(id\)\)/);
 assert.match(report,/\.dataset\.factorIndex/);
 assert.match(css,/\.jr-cs-order-controls button/);
 assert.match(css,/min-width:44px;min-height:44px/);
});
test('scientific and browser QA are included in existing non-deploy workflows',()=>{
 const scientific=read('.github/workflows/golden-talent-phase12.yml');
 const browser=read('.github/workflows/browser-qa.yml');
 const candidate=read('.github/workflows/v5-release-candidate.yml');
 for(const file of [
  'golden-talent-engine-v11.test.mjs',
  'golden-talent-engine-compatibility.test.mjs',
  'golden-path-synthesis.test.mjs'
 ])assert.ok(scientific.includes(file),'missing scientific gate '+file);
 for(const file of ['choice-studio-browser.spec.js','choice-feedback.browser.spec.js'])
  assert.ok(browser.includes(file),'missing responsive browser gate '+file);
 assert.match(candidate,/choice-studio-contract\.test\.mjs/);
 assert.match(candidate,/choice-feedback-contract\.test\.mjs/);
 assert.match(candidate,/v52-integrated-science-choice-release-contract\.test\.mjs/);
});
