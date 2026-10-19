// Same engine file, same routeEvidence/classifyDomain API. Adversarial v1.1.0 tests.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
 ENGINE_VERSION,DOMAINS,routeEvidence,classifyDomain,canonicalize,sha256Hex,
 verifyResult,EvidenceInputError
} from './golden-talent-engine.mjs';
import {rcasToEvidence} from './rcas-evidence-bridge.mjs';
import {observerToEvidence} from './rcas-observer-evidence-bridge.mjs';
import {reviewedEvidence,goldenPathEligibility} from './golden-talent-review.mjs';
import {analyseEvidence} from './golden-talent-evidence-analytics.mjs';
const raw=(id,domain='D1',source='STUDENT_SELF')=>({
 id,domain_code:domain,source_type:source,source_reference_id:'source-'+id,
 quality_state:'UNREVIEWED',
 provenance:{direction:'CONTEXTUALISES',respondent_reference_id:'respondent-'+id,
  independence_group_id:'independent-'+id,independence_verified:true}
});
const reviewed=(id,domain='D1',source='STUDENT_SELF',direction='SUPPORTS',
 qualityState='USABLE',overrides={})=>reviewedEvidence({...raw(id,domain,source),...overrides},{
  id:'review-'+id,evidence_event_id:id,reviewer_user_id:'scientific-reviewer',
  quality_decision:qualityState,direction,rationale:'Synthetic human review fixture',
  review_status:'ACTIVE'
});
const noNorm=r=>{
 assert.equal(r.total_score,null);assert.equal(r.normative_label,null);
 assert.equal(r.scientific_status,'PREVALIDATION');
 assert.equal(r.integrity.hash_is_authentication,false);
 assert.equal(r.integrity.server_signature_present,false);
 assert.equal(r.integrity.accounting.balanced,true);
 assert.equal(r.integrity.accounting.routing+r.integrity.accounting.contextual+
  r.integrity.accounting.withdrawn+r.integrity.accounting.rejected,r.integrity.accounting.input_events);
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.routes)&&Object.isFrozen(r.routes[0]));
 assert.ok(verifyResult(r));
};
const check=(name,fn)=>{fn();console.log('PASS shared evidence 1.1.0: '+name);};

check('stable API and standardized SHA-256 published vectors',()=>{
 assert.equal(ENGINE_VERSION,'1.1.0');
 assert.deepEqual(DOMAINS,['D1','D2','D3','D4','D5','D6']);
 for(const msg of ['','abc','é','🌱','A'.repeat(80)]){
  assert.equal(sha256Hex(msg),createHash('sha256').update(msg,'utf8').digest('hex'));
 }
 assert.equal(sha256Hex('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(canonicalize({z:2,a:1}),'{"a":1,"z":2}');
 assert.equal(canonicalize({text:'e\u0301'}),canonicalize({text:'é'}));
 assert.throws(()=>canonicalize({'é':1,'e\u0301':2}),EvidenceInputError);
});
check('hostile inputs are rejected or fail loud without shared generic fallback',()=>{
 const circular={};circular.me=circular;
 for(const invalid of [circular,{x:undefined},{x:Infinity},{x:NaN},{x:-0},
  {x:1n},{x:()=>null},new Date(),new Map(),Array(2),{x:new Date()}]){
  assert.throws(()=>canonicalize(invalid),EvidenceInputError);
 }
 const getter={};Object.defineProperty(getter,'secret',{enumerable:true,get(){throw Error('executed getter')}});
 assert.throws(()=>canonicalize(getter),/Accessor evidence property/);
 const symbol={};symbol[Symbol('secret')]=1;
 assert.throws(()=>canonicalize(symbol),EvidenceInputError);
 assert.throws(()=>routeEvidence(Array.from({length:501},()=>({}))),EvidenceInputError);
 assert.throws(()=>routeEvidence([{text:'a'.repeat(9000)}]),EvidenceInputError);
 assert.throws(()=>routeEvidence([undefined]),EvidenceInputError);
 noNorm(routeEvidence([null,17,'text',{id:'bad-domain',domain_code:'D7',quality_state:'USABLE'}]));
});
check('RCAS and RCAS-O1 unreviewed evidence retained without affecting routes',()=>{
 const learner=rcasToEvidence({session_id:'session-55',instrument_version:'1.0',
  responses:[{item_code:'A1',value:3},{item_code:'D2',value:0},{item_code:'access1',value:'محدود'}]});
 const observer=observerToEvidence({session_id:'observer-session-33',instrument_version:'1.1',
  subject_user_id:'subject-1',respondent_role:'PARENT',relationship_verified:true,
  visibility_authorised:true,fields:{
   observed_behaviour_conditions:'Support varies across classrooms',
   environmental_barrier_support:'Access is uneven'
  }});
 const all=[...learner,...observer];
 const r=routeEvidence(all);
 noNorm(r);
 assert.equal(r.integrity.accounting.input_events,all.length);
 assert.equal(r.integrity.accounting.contextual,all.length);
 assert.equal(r.integrity.accounting.rejected,0);
 assert.equal(r.integrity.accounting.routing,0);
 assert.equal(r.integrity.unassigned_contextual_events.length,1);
 assert.equal(r.routes.find(x=>x.route_code==='D1').evidence_state,'INSUFFICIENT');
 assert.equal(r.human_review_required,true);
 const future=analyseEvidence(all,{now:new Date('2026-10-19T00:00:00Z')});
 assert.equal(future.automatic_career_prescription,false);
});
check('distinct source labels alone never establish independent agreement',()=>{
 const teacher=reviewed('t','D1','TEACHER');
 const self=reviewed('s','D1','STUDENT_SELF');
 const notVerified={...self,provenance:{...self.provenance,independence_verified:false}};
 const r=routeEvidence([teacher,notVerified]);
 noNorm(r);
 assert.equal(r.routes[0].evidence_state,'SINGLE_SOURCE');
 assert.ok(r.routes[0].rationale_codes.includes('INDEPENDENCE_NOT_VERIFIED'));
 const sharedRespondent={...self,provenance:{...self.provenance,
  respondent_reference_id:teacher.provenance.respondent_reference_id}};
 const copiedEvidence={...self,source_reference_id:teacher.source_reference_id};
 const sameGroup={...self,provenance:{...self.provenance,
  independence_group_id:teacher.provenance.independence_group_id}};
 for(const dependent of [sharedRespondent,copiedEvidence,sameGroup]){
  const x=routeEvidence([teacher,dependent]);
  assert.equal(x.routes[0].evidence_state,'SINGLE_SOURCE');
  assert.equal(x.routes[0].independent_source_count,1);
 }
});
check('reviewed independent agreement has explicit support/contradiction direction',()=>{
 const agree=routeEvidence([reviewed('x','D2','STUDENT_SELF'),
  reviewed('y','D2','TEACHER')]);
 noNorm(agree);
 assert.equal(agree.routes[1].evidence_state,'CONVERGENT');
 assert.equal(agree.routes[1].independent_source_count,2);
 assert.equal(agree.routes[1].agreement_direction,'SUPPORTS');
 const bothAgainst=routeEvidence([
  reviewed('a','D3','ASSESSMENT','CONTRADICTS'),
  reviewed('b','D3','TEACHER','CONTRADICTS')]);
 assert.equal(bothAgainst.routes[2].evidence_state,'CONVERGENT');
 assert.equal(bothAgainst.routes[2].agreement_direction,'CONTRADICTS');
 assert.equal(bothAgainst.total_score,null);
});
check('intra- and cross-source discrepancy plus explicit conflict require human review',()=>{
 for(const set of [
  [reviewed('a','D1','TEACHER'),reviewed('b','D1','TEACHER','CONTRADICTS')],
  [reviewed('a','D1','STUDENT_SELF'),reviewed('b','D1','TEACHER','CONTRADICTS')],
  [reviewed('c','D1','STUDENT_SELF','SUPPORTS','CONFLICTING')]
 ]){
  const r=routeEvidence(set);noNorm(r);
  assert.equal(r.routes[0].evidence_state,'DISCREPANT');
  assert.equal(r.routes[0].human_review_required,true);
  assert.equal(goldenPathEligibility(r,true).eligible_for_synthesis,false);
 }
});
check('withdrawal, limited and missing observations cannot be construed as learner deficit',()=>{
 const r=routeEvidence([
  reviewed('a','D1','TEACHER','SUPPORTS','WITHDRAWN'),
  reviewed('b','D1','PARENT','SUPPORTS','LIMITED'),
  raw('c','D1','STUDENT_SELF')
 ]);
 noNorm(r);
 assert.equal(r.routes[0].evidence_state,'INSUFFICIENT');
 assert.equal(r.integrity.accounting.withdrawn,1);
 assert.equal(r.integrity.accounting.contextual,2);
 assert.equal(r.routes[0].requires_more_evidence,true);
 assert.equal(r.normative_label,null);
});
check('all duplicate IDs are rejected, ordering never selects a winner',()=>{
 const a=reviewed('dup','D1','STUDENT_SELF'),b=reviewed('dup','D2','TEACHER');
 const x=routeEvidence([a,b]),y=routeEvidence([b,a]);
 assert.equal(x.integrity.accounting.rejected,2);
 assert.equal(x.integrity.accounting.routing,0);
 assert.equal(x.fingerprints.result,y.fingerprints.result);
 assert.ok(x.integrity.rejected_events.every(z=>z.reasons.includes('DUPLICATE_ID')));
});
check('deterministic permutation and mutation-resistant immutable outputs',()=>{
 const events=[
  reviewed('a','D1','STUDENT_SELF'),reviewed('b','D1','TEACHER'),
  reviewed('c','D2','ASSESSMENT','CONTRADICTS'),
  reviewed('d','D2','PARENT','SUPPORTS'),raw('e','D3','STUDENT_SELF'),
  reviewed('f','D4','CONTEXT','CONTEXTUALISES','LIMITED'),
  null,{id:'invalid',domain_code:'D9',quality_state:'UNREVIEWED'}
 ];
 const before=JSON.stringify(events),reference=routeEvidence(events);
 noNorm(reference);
 let seed=42;
 for(let i=0;i<50;i++){
  const shuffled=[...events];
  for(let j=shuffled.length-1;j>0;j--){
   seed=(seed*1664525+1013904223)>>>0;const k=seed%(j+1);
   [shuffled[j],shuffled[k]]=[shuffled[k],shuffled[j]];
  }
  assert.equal(routeEvidence(shuffled).fingerprints.result,reference.fingerprints.result);
 }
 assert.equal(JSON.stringify(events),before);
 assert.equal(verifyResult(reference,events),true);
 assert.equal(verifyResult(reference,[...events,raw('extra','D1','STUDENT_SELF')]),false);
 const changed=structuredClone(reference);
 changed.routes[0].source_count=500;
 assert.equal(verifyResult(changed),false);
 assert.throws(()=>{reference.routes[0].evidence_state='VALIDATED';},TypeError);
 assert.equal(classifyDomain('D1',events).route_code,'D1');
 assert.throws(()=>classifyDomain('D7',events));
});
console.log('Integrated Golden Talent/RCAS/BAHAR engine 1.1.0 scientific-source contracts passed.');
