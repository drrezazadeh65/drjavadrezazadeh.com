import test from 'node:test';
import assert from 'node:assert/strict';
import {assessServiceCopyForAi,makeServiceCopyReviewPrompt} from './ai-service-copy-preflight.mjs';
test('missing evidence is reported rather than invented',()=>{
 const a=assessServiceCopyForAi({id:'s1',titleFa:'استعداد'});
 assert.ok(a.input.issues.some(i=>i.code==='missing-academic-basis'));
 assert.ok(a.input.issues.some(i=>i.lang==='en'&&i.code==='missing-title'));
 assert.equal(a.mayPublish,false);
});
test('review prompt requires human oversight and prohibits fabrication',()=>{
 const prompt=makeServiceCopyReviewPrompt(assessServiceCopyForAi({id:'s1'}));
 assert.equal(prompt.requiresHumanReview,true);
 assert.match(prompt.task,/Never invent prices/);
 assert.equal(prompt.providerCalled,false);
});
