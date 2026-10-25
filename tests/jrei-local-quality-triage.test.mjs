import test from 'node:test';
import assert from 'node:assert/strict';
import {triageLocalQualityEvidence}
  from '../platform/jrei-v5/windows-worker/jrei-local-quality-triage.mjs';
const fake=(answers={})=>({
  schema:'jr.jrei.owner-local-evidence.v1',
  modelArtifactSha256:'f'.repeat(64),
  requestedSampleCount:16,sampleCount:16,allFixturesCompleted:true,
  failures:[],
  fixtures:Array.from({length:16},(_,i)=>{
    const lang=i<8?'fa':'en';
    const fixtureId=(lang==='fa'?'fa-':'en-')+String(i%8+1).padStart(2,'0');
    return {fixtureId,lang,answer:answers[fixtureId]??(
      fixtureId==='fa-02'?'۸۴':fixtureId==='en-02'?'6':'A brief complete explanation.'
    ),finishReason:'stop'};
  })
});
test('negative screening never means scientific model acceptance',()=>{
 const r=triageLocalQualityEvidence(fake());
 assert.equal(r.result,'INDEPENDENT_REVIEW_REQUIRED');
 assert.equal(r.publicActivationAuthorized,false);
 assert.equal(r.scientificQualityAccepted,false);
});
test('observed 12 times 7 error blocks independently of technical speed',()=>{
 const r=triageLocalQualityEvidence(fake({'fa-02':'48'}));
 assert.equal(r.result,'BLOCKED_REMEDIATION_REQUIRED');
 assert.ok(r.negativeFindings.some(x=>x.fixtureId==='fa-02'&&
     x.kind==='FIXED_ARITHMETIC_MISMATCH'));
});
test('truncation and Chinese characters in Persian flag failed observations',()=>{
 const evidence=fake({'fa-03':'پاسخ دارای م可靠性'});
 evidence.fixtures[6].finishReason='length';
 const r=triageLocalQualityEvidence(evidence);
 assert.ok(r.negativeFindings.some(x=>x.kind==='CJK_SCRIPT_INTRUSION_IN_PERSIAN'));
 assert.ok(r.negativeFindings.some(x=>x.kind==='INCOMPLETE_GENERATION'));
});
test('missing arithmetic sample or duplicate fixture cannot pass',()=>{
 const evidence=fake();evidence.fixtures[1].fixtureId='other';
 assert.equal(triageLocalQualityEvidence(evidence).result,'BLOCKED_REMEDIATION_REQUIRED');
 const duplicate=fake();duplicate.fixtures[1].fixtureId=duplicate.fixtures[0].fixtureId;
 assert.throws(()=>triageLocalQualityEvidence(duplicate),/LOCAL_EVIDENCE_INVALID/);
});
