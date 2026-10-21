import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const f=require('../assets/js/jr-konkur-foundation-v1.js');
const source={documentId:'verified-fixture',version:'v1',page:4,year:1405,reviewStatus:'VERIFIED'};
const candidate={year:1405,group:'math'};
const programme={year:1405,code:'01234',source};
const coverage={status:'VERIFIED_COMPLETE',year:1405,programmeCode:'01234',source,serverReviewed:true};
const rules=[{id:'r1',year:1405,field:'group',operator:'equals',value:'math',source,reviewStatus:'VERIFIED'}];
test('four-state eligibility is deterministic and fails closed',()=>{
 assert.equal(f.evaluate(candidate,programme,rules,coverage).status,f.STATUSES.ELIGIBLE);
 assert.equal(f.evaluate({...candidate,group:'arts'},programme,rules).status,f.STATUSES.INELIGIBLE);
 assert.equal(f.evaluate(candidate,programme,rules).status,f.STATUSES.REVIEW);
 assert.equal(f.evaluate(candidate,programme,rules,{...coverage,programmeCode:'12345'}).status,f.STATUSES.REVIEW);
 assert.equal(f.evaluate(candidate,programme,rules,{...coverage,serverReviewed:false}).status,f.STATUSES.REVIEW);
 assert.equal(f.evaluate(candidate,{...programme,code:'invalid'},rules,coverage).status,f.STATUSES.INSUFFICIENT);
 assert.equal(f.evaluate({year:1405},programme,rules).status,f.STATUSES.INSUFFICIENT);
 assert.equal(f.evaluate(candidate,programme,[]).status,f.STATUSES.INSUFFICIENT);
 assert.equal(f.evaluate(candidate,{...programme,source:{...source,reviewStatus:'DRAFT'}},rules).status,f.STATUSES.REVIEW);
 assert.equal(f.evaluate({...candidate,year:1406},programme,rules).status,f.STATUSES.INSUFFICIENT);
 assert.equal(f.evaluate(candidate,programme,[{...rules[0],reviewStatus:'DRAFT'}]).status,f.STATUSES.REVIEW);
});
test('list validation and preference order',()=>{
 const list=[programme,{...programme}];
 const result=f.inspectList(list,{year:1405,maxChoices:1,source});
 assert.equal(result.valid,false);
 assert.ok(result.warnings.some(x=>x.code==='DUPLICATE_CODE'));
 assert.ok(result.warnings.some(x=>x.code==='MAXIMUM_EXCEEDED'));
 assert.equal(f.inspectList([programme],{year:1405,maxChoices:150,source:{...source,reviewStatus:'DRAFT'}}).maximum,null);
 assert.deepEqual(f.reorder(['A','B','C'],0,2),['B','C','A']);
 assert.equal(f.reorder(['A'],0,9),null);
});
test('Evidence Passport separates verified facts, preferences and interpretation',()=>{
 const p=f.evidencePassport([{claim:'Fixture',year:1405,source},{claim:'Unverified',year:1405,source:{...source,reviewStatus:'DRAFT'}}],['Location preference'],['Possible pathway']);
 assert.equal(p.evidence.length,3);
 assert.deepEqual(p.evidence.map(x=>x.type),Object.values(f.TYPES));
 assert.equal(p.evidence[2].humanReview,'NOT_VERIFIED');
 assert.equal(p.admissionPredictionEnabled,false);
});
test('search filters user choices without changing their original preference order',()=>{
 const draft=[
  {year:1405,code:'00123',note:'زیست شناسی',group:'EXPERIMENTAL_SCIENCES'},
  {year:1405,code:'54321',note:'رياضیات',group:'MATHEMATICS'},
  {year:1405,code:'12345',note:'Biology',group:'EXPERIMENTAL_SCIENCES'}
 ];
 const byPersian=f.filterDraftChoices(draft,'۰۰۱۲۳');
 assert.deepEqual(byPersian.map(x=>x.index),[0]);
 assert.equal(byPersian[0].choice.code,'00123');
 assert.deepEqual(f.filterDraftChoices(draft,'ریاضیات').map(x=>x.index),[1]);
 assert.deepEqual(f.filterDraftChoices(draft,'BIOLOGY').map(x=>x.index),[2]);
 assert.deepEqual(f.filterDraftChoices(draft,'EXPERIMENTAL_SCIENCES').map(x=>x.index),[0,2]);
 assert.deepEqual(f.filterDraftChoices(draft,'  ').map(x=>x.index),[0,1,2]);
 assert.deepEqual(draft.map(x=>x.code),['00123','54321','12345']);
 assert.equal(Object.isFrozen(byPersian),true);
 assert.deepEqual(f.filterDraftChoices(draft,'unmatched'),[]);
 assert.deepEqual(f.filterDraftChoices(draft,'z'.repeat(81)),[]);
 assert.deepEqual(f.filterDraftChoices(null,'Biology'),[]);
});

test('pre-submission readiness provides actionable warnings without official admission claims',()=>{
 const entries=[
  {year:1405,code:'00123',group:'MATHEMATICS'},
  {year:1405,code:'12345',group:''},
  {year:1405,code:'12345',group:'HUMANITIES'},
  {year:1406,code:'notcode',group:''}
 ];
 const audit=f.reviewPreliminaryDraft(entries);
 assert.equal(audit.status,'MANUAL_OFFICIAL_REVIEW_REQUIRED');
 assert.equal(audit.choiceCount,4);
 assert.equal(audit.missingGroupCount,2);
 assert.equal(audit.duplicateCodeCount,1);
 assert.equal(audit.invalidCodeCount,1);
 assert.equal(audit.cycleMismatchCount,1);
 assert.equal(audit.officialSelectionLimit,null);
 assert.equal(audit.officialEligibilityEstablished,false);
 assert.equal(audit.admissionProbability,null);
 assert.equal(audit.officialApplicationSubmitted,false);
 assert.equal(audit.verifiedProgrammeRows,0);
 assert.ok(audit.issues.includes('PERMITTED_SELECTION_COUNT_NOT_VERIFIED'));
 assert.ok(Object.isFrozen(audit.issues));
 assert.equal(f.reviewPreliminaryDraft([]).status,'MANUAL_OFFICIAL_REVIEW_REQUIRED');
 assert.ok(f.reviewPreliminaryDraft([]).issues.includes('NO_CHOICES_RECORDED'));
 assert.ok(f.reviewPreliminaryDraft(Array(151).fill(entries[0])).issues.includes('INVALID_OR_OVERSIZED_LOCAL_DRAFT'));
});
