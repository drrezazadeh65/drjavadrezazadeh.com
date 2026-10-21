import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLabScorecard,analyseLabScorecard} from '../assets/js/jr-konkur-ai-lab-public-v1.mjs';
const base={provider:'KANOON',year:'۱۴۰۵',examinationGroup:'HUMANITIES',subjects:[{subjectCode:'SELF_REPORTED',percent:80}]};
test('mobile worksheet supports multiple self-reported subjects but never verifies rank',()=>{
 const s={...base,rank:100,subjects:[{subjectCode:'SELF_REPORTED',percent:50},{subjectCode:'SELF_REPORTED',percent:-20}]};
 const n=normalizeLabScorecard(s),a=analyseLabScorecard(s);
 assert.equal(n.valid,true);assert.equal(n.rankSourceVerified,false);
 assert.equal(a.admissionProbability,null);assert.equal(a.publicReady,false);
 assert.equal(a.status,'AWAITING_VERIFIED_CATALOGUE');
});
test('hostile or oversized scorecards fail closed',()=>{
 for(const s of [null,[],{...base,subjects:Array.from({length:7},()=>({subjectCode:'SELF_REPORTED',percent:50}))},
  {...base,rank:Infinity},{...base,rank:2000001},{...base,subjects:[{subjectCode:'x',percent:Infinity}]},
  {...base,subjects:[{subjectCode:'math',percent:10},{subjectCode:'math',percent:20}]}]){
  const n=normalizeLabScorecard(s);
  assert.equal(n.valid,false);
  assert.equal(analyseLabScorecard(s).admissionProbability,null);
 }
});
test('provider cannot self-attest official admission',()=>{
 const n=normalizeLabScorecard({...base,provider:'SANJESH',rank:42,rankVerified:true,officialVerificationEvidence:true});
 assert.equal(n.rankSourceVerified,false);
 assert.equal(analyseLabScorecard({...base,provider:'SANJESH',rank:42}).officialEligibilityEstablished,false);
});

test('MAZ laboratory intake is manual-only and cannot produce admission odds',()=>{
 const s={...base,provider:'MAZ',rank:730};
 const normalized=normalizeLabScorecard(s),analysis=analyseLabScorecard(s);
 assert.equal(normalized.valid,true);
 assert.equal(normalized.rankSourceVerified,false);
 assert.equal(analysis.status,'AWAITING_VERIFIED_CATALOGUE');
 assert.equal(analysis.admissionProbability,null);
 assert.equal(analysis.officialEligibilityEstablished,false);
 assert.equal(analysis.publicReady,false);
});

test('public and private intake agree on practice directory aliases without estimating odds',()=>{
 for(const [provider,canonical] of [['GHALAMCHI','KANOON'],['GOZINE2','GOZINEH_DO'],['SANJESH_MOCK','SANJESH_MOCK'],['SCHOOL_LOCAL','SCHOOL_LOCAL']]){
  const n=normalizeLabScorecard({...base,provider,examinationGroup:'EXPERIMENTAL_SCIENCES'});
  assert.equal(n.valid,true,provider);
  assert.equal(n.provider,canonical);
  assert.equal(n.examinationGroup,'EXPERIMENTAL');
  assert.equal(n.rankSourceVerified,false);
  const analysis=analyseLabScorecard({...base,provider,examinationGroup:'EXPERIMENTAL_SCIENCES'});
  assert.equal(analysis.admissionProbability,null);
  assert.equal(analysis.officialEligibilityEstablished,false);
 }
 const x=normalizeLabScorecard({...base,provider:'MAZ',examinationGroup:'FOREIGN_LANGUAGES'});
 assert.equal(x.valid,true);
 assert.equal(x.examinationGroup,'LANGUAGES');
});
