import assert from 'node:assert/strict';
import {rcasToEvidence} from './rcas-evidence-bridge.mjs';

const session={session_id:'rcas-session-42',instrument_version:'rcas-core-1.0'};
const process=(responses)=>rcasToEvidence({...session,responses});
const test=(name,fn)=>{fn();console.log('PASS RCAS evidence: '+name);};

// The private evidence bridge must never create talent scores or diagnoses.
test('only descriptive, review-pending records for valid observed answers',()=>{
 const events=process([
   {item_code:'A1',value:4},{item_code:'B2',value:'0'},
   {item_code:'D4',value:2},{item_code:'access0',value:'محدود'}
 ]);
 assert.equal(events.length,5);
 assert.deepEqual(events.map(e=>e.domain_code),['D5','D1','D1','D6','D4']);
 assert.equal(events.find(e=>e.evidence_key==='B2').evidence_value.response,0);
 for(const e of events){
   assert.equal(e.source_reference_id,session.session_id);
   assert.equal(e.instrument_version,session.instrument_version);
   assert.equal(e.quality_state,'UNREVIEWED');
   assert.equal(e.provenance.direction,'CONTEXTUALISES');
   assert.equal('total_score' in e,false);
   assert.equal('diagnosis' in e,false);
 }
});
test('UNKNOWN, NA and unneeded access are omitted, never converted into weakness',()=>{
 assert.deepEqual(process([
   {item_code:'A1',value:'UNKNOWN'},{item_code:'A2',value:'NA'},
   {item_code:'A3',value:''},{item_code:'B1',value:null},
   {item_code:'access1',value:'نیاز ندارم'},
   {item_code:'access2',value:'UNKNOWN'}
 ]),[]);
 assert.equal(process([{item_code:'A1',value:0}]).length,1);
});
test('context access evidence is separated from aptitude evidence',()=>{
 const [event]=process([{item_code:'access7',value:'فعلاً در دسترس نیست'}]);
 assert.equal(event.source_type,'CONTEXT');
 assert.equal(event.instrument_code,'RCAS-P0');
 assert.equal(event.domain_code,'D4');
 assert.equal(event.evidence_value.access_state,'فعلاً در دسترس نیست');
});
test('invalid scales, unsupported domains and forged item codes fail closed',()=>{
 for(const r of [
  {item_code:'A1',value:5},{item_code:'A1',value:-1},
  {item_code:'A1',value:2.5},{item_code:'A1',value:'3.0'},
  {item_code:'A1',value:true},{item_code:'H1',value:1},
  {item_code:'A5',value:1},{item_code:'access8',value:'محدود'},
  {item_code:'access0',value:'unverified'},
  {item_code:'A1',value:2,score:100},
 ])assert.throws(()=>process([r]));
});
test('duplicate answers, malformed session and excessive payload fail closed',()=>{
 assert.throws(()=>process([{item_code:'A1',value:1},{item_code:'A1',value:2}]));
 assert.throws(()=>rcasToEvidence({...session,session_id:'invalid space',responses:[]}));
 assert.throws(()=>rcasToEvidence({...session,instrument_version:'',responses:[]}));
 assert.throws(()=>rcasToEvidence({...session,responses:Array(37).fill({item_code:'A1',value:1})}));
 assert.throws(()=>process([{item_code:'A1',value:1},null]));
});
console.log('RCAS evidence bridge scientific boundary checks passed (synthetic only).');
