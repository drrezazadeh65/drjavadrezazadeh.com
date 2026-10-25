import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyExamLink,extractExamCandidates,EXAM_TRACKS,OFFICIAL_SEEDS}
 from '../scripts/jrei-four-track-official-exam-scout.mjs';
const url=OFFICIAL_SEEDS[0].url;
test('all four Konkur fields use a single issuer source and stay discovery only',()=>{
 assert.deepEqual(Object.keys(EXAM_TRACKS),[
  'HUMANITIES','MATHEMATICS','FOREIGN_LANGUAGES','EXPERIMENTAL_SCIENCES']);
 assert.deepEqual(classifyExamLink('علوم انسانی',''),['HUMANITIES']);
 assert.deepEqual(classifyExamLink('علوم ریاضی',''),['MATHEMATICS']);
 assert.deepEqual(classifyExamLink('زبان‌های خارجی',''),['FOREIGN_LANGUAGES']);
 assert.deepEqual(classifyExamLink('علوم تجربی',''),['EXPERIMENTAL_SCIENCES']);
});
test('scouter preserves only official first-party metadata, not PDF bytes',()=>{
 const html='<a href="/fa-IR/sanjesh/papers/1.pdf">سوالات علوم انسانی</a>'+
 '<a href="https://attacker.example/1.pdf">علوم تجربی</a>'+
 '<a href="/fa-IR/sanjesh/papers/2.pdf">سوالات ریاضی و فنی</a>'+
 '<a href="/fa-IR/sanjesh/papers/3.pdf">زبان‌های خارجی</a>'+
 '<a href="/fa-IR/sanjesh/papers/4.pdf">علوم تجربی</a>';
 const arr=extractExamCandidates(html,url);
 assert.equal(arr.length,4);
 assert.ok(arr.every(x=>x.issuer==='SANJESH'&&x.downloadAuthorized===false&&
   x.commercialReuseAuthorized===false&&x.itemScientificReviewAccepted===false));
});
test('malicious foreign-domain links are never discovered',()=>{
 const html='<a href="https://evil.org/questions">ریاضی</a>'+
 '<a href="//127.0.0.1/questions">علوم انسانی</a>';
 assert.deepEqual(extractExamCandidates(html,url),[]);
});
