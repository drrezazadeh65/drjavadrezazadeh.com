// Historical comparison: original v0.2 is a test-only archival source, not live router.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {routeEvidence,ENGINE_VERSION} from './golden-talent-engine.mjs';
import {rcasToEvidence} from './rcas-evidence-bridge.mjs';
const doc=readFileSync('docs/reference/golden-talent-engine-0.2-prevalidation-source.md','utf8');
const match=/\x60\x60\x60javascript\n([\s\S]*?)\x60\x60\x60/.exec(doc);
assert.ok(match,'archived historical source missing');
const original=match[1];
const sha=createHash('sha1').update('blob '+Buffer.byteLength(original,'utf8')+'\0').update(original,'utf8').digest('hex');
assert.equal(sha,'afb5f1d15e51a599af243f0edd64b9675e9cb4d1','source must match historic Git blob');
const old=runInNewContext(original.replace(/\bexport (?=(?:const|function) )/g,'')+'\n({routeEvidence,classifyDomain,ENGINE_VERSION})');
const event=(id,source,direction='SUPPORTS',quality='USABLE')=>({
 id,domain_code:'D1',source_type:source,source_reference_id:'source-'+id,quality_state:quality,
 provenance:{review_id:'review-'+id,direction,respondent_reference_id:'respondent-'+id,
  independence_group_id:'group-'+id,independence_verified:false,
  claim_reference_id:'same-material-claim',material_compatibility_verified:true},
 review_projection:{active:true}
});
test('no old or new engine returns scores, labels or unsupported empty interpretations',()=>{
 const before=old.routeEvidence([]),after=routeEvidence([]);
 assert.equal(old.ENGINE_VERSION,'0.2-prevalidation');assert.equal(ENGINE_VERSION,'1.1.0');
 assert.equal(before.total_score,null);assert.equal(after.total_score,null);
 assert.equal(before.normative_label,null);assert.equal(after.normative_label,null);
 assert.equal(before.routes[0].evidence_state,'INSUFFICIENT');
 assert.equal(after.routes[0].evidence_state,'INSUFFICIENT');
});
test('old labels alone permitted convergence; 1.1 requires independently verified origins',()=>{
 const events=[event('a','STUDENT_SELF'),event('b','TEACHER')];
 assert.equal(old.routeEvidence(events).routes[0].evidence_state,'CONVERGENT');
 const next=routeEvidence(events);
 assert.equal(next.routes[0].evidence_state,'SINGLE_SOURCE');
 assert.equal(next.routes[0].independent_source_count,0);
 assert.ok(next.routes[0].rationale_codes.includes('INDEPENDENCE_NOT_VERIFIED'));
});
test('one-source material contradiction is no longer silently classified as single source',()=>{
 const events=[event('a','TEACHER'),event('b','TEACHER','CONTRADICTS')];
 assert.equal(old.routeEvidence(events).routes[0].evidence_state,'SINGLE_SOURCE');
 const next=routeEvidence(events);
 assert.equal(next.routes[0].evidence_state,'DISCREPANT');
 assert.equal(next.routes[0].human_review_required,true);
 assert.ok(next.routes[0].rationale_codes.includes('INTRA_SOURCE_CONTRADICTION'));
});
test('different claims with opposite directions require human comparison, not false contradiction',()=>{
 const events=[event('a','TEACHER'),event('b','TEACHER','CONTRADICTS')];
 events[1].provenance.claim_reference_id='different-material-claim';
 const next=routeEvidence(events);
 assert.equal(next.routes[0].evidence_state,'SINGLE_SOURCE');
 assert.equal(next.routes[0].human_review_required,true);
 assert.ok(next.routes[0].rationale_codes.includes('OPPOSING_DIRECTIONS_REQUIRE_CLAIM_REVIEW'));
});
test('duplicate IDs and withdrawals are completely accounted only in 1.1',()=>{
 const duplicate=[event('same','STUDENT_SELF'),event('same','TEACHER')];
 assert.equal(old.routeEvidence(duplicate).routes[0].usable_event_count,2);
 const next=routeEvidence(duplicate);
 assert.equal(next.routes[0].usable_event_count,0);
 assert.equal(next.integrity.accounting.rejected,2);
 const withdrawn=[event('x','TEACHER','SUPPORTS','WITHDRAWN')];
 assert.equal(old.routeEvidence(withdrawn).routes[0].usable_event_count,0);
 assert.equal(routeEvidence(withdrawn).integrity.accounting.withdrawn,1);
});
test('RCAS UNREVIEWED data are contextual and never become scores',()=>{
 const raw=rcasToEvidence({session_id:'session-18',instrument_version:'v1',
  responses:[{item_code:'A1',value:1},{item_code:'access0',value:'محدود'}]});
 const next=routeEvidence(raw);
 assert.equal(next.integrity.accounting.input_events,raw.length);
 assert.equal(next.integrity.accounting.contextual,raw.length);
 assert.equal(next.integrity.accounting.routing,0);
 assert.equal(next.normative_label,null);assert.equal(next.total_score,null);
});
