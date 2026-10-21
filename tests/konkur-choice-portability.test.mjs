import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const api=require('../assets/js/jr-konkur-choice-portability-v1.js');
const first={year:1405,code:'00123',group:'MATHEMATICS',note:'Sample programme',source:null};
const second={year:1405,code:'12345',group:'HUMANITIES',note:'=HYPERLINK("https://example.invalid")',source:null};
test('export and import retain ordered five-character programme codes without source verification',()=>{
 const out=api.exportDraft([first,second]);
 assert.equal(out.filename,'jr-konkur-1405-preliminary-draft.json');
 const parsed=JSON.parse(out.json);
 assert.equal(parsed.admissionYear,1405);
 assert.equal(parsed.evidenceStatus,'SELF_REPORTED_UNVERIFIED');
 assert.equal(parsed.maximumChoiceRuleStatus,'NOT_VERIFIED');
 assert.deepEqual(parsed.entries.map(x=>x.position),[1,2]);
 assert.deepEqual(parsed.entries.map(x=>x.code),['00123','12345']);
 assert.equal(parsed.officiallyVerified,undefined);
 const restored=api.importDraft(out.json);
 assert.equal(restored.count,2);
 assert.equal(restored.officiallyVerified,false);
 assert.equal(restored.admissionProbability,null);
 assert.deepEqual(restored.choices,[first,second]);
 assert.ok(Object.isFrozen(restored.choices));
 assert.ok(Object.isFrozen(restored.choices[0]));
});
test('unsupported, malicious, mislabelled and oversized files fail closed',()=>{
 const good=JSON.parse(api.exportDraft([first]).json);
 for(const mutation of [
  {schema:'new-unsupported'}, {admissionYear:1406}, {evidenceStatus:'VERIFIED'},
  {maximumChoiceRuleStatus:'APPROVED'}, {version:2},{entries:[]},
  {entries:[{...good.entries[0],position:2}]},
  {entries:[{...good.entries[0],code:'1234'}]},
  {entries:[{...good.entries[0],group:'UNKNOWN'}]},
  {entries:[{...good.entries[0],note:'ok',trusted:true}]},
  {entries:[{...good.entries[0],note:'test\u0000value'}]},
  {entries:Array(151).fill(good.entries[0])},
  {extraTrusted:true}
 ]){
  assert.throws(()=>api.importDraft(JSON.stringify({...good,...mutation})),TypeError);
 }
 assert.throws(()=>api.importDraft('a'.repeat(api.maximumFileBytes+1)),TypeError);
 assert.throws(()=>api.importDraft('{broken'),TypeError);
 assert.throws(()=>api.importDraft(null),TypeError);
});
test('duplicate codes, noncanonical source attestations and unknown original properties are not exported',()=>{
 assert.throws(()=>api.exportDraft([first,{...first,note:'duplicate'}]),TypeError);
 assert.throws(()=>api.exportDraft([{...first,source:{reviewStatus:'VERIFIED'}}]),TypeError);
 assert.throws(()=>api.exportDraft([{...first,nationalId:'1234'}]),TypeError);
 assert.throws(()=>api.exportDraft([]),TypeError);
 assert.throws(()=>api.exportDraft(Array(151).fill(first)),TypeError);
});
test('untrusted note content is data only and cannot change the output schema',()=>{
 const out=api.exportDraft([{...first,note:'<script>alert(1)</script>'}]);
 const loaded=api.importDraft(out.json);
 assert.equal(loaded.choices[0].note,'<script>alert(1)</script>');
 assert.deepEqual(Object.keys(JSON.parse(out.json)).sort(),[
  'schema','version','admissionYear','evidenceStatus','maximumChoiceRuleStatus','entries'
 ].sort());
});
