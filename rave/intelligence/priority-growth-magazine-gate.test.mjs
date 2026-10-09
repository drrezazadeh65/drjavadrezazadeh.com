import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPriorityLaunch} from './priority-growth-release-gates.mjs';
test('draft magazine article cannot pass release gate',()=>{
 const result=assessPriorityLaunch({articles:[{id:'article-1',locale:'en',title:'Research',body:'Evidence-based article',status:'draft'}]});
 assert.equal(result.gates.magazine,false);
 assert.equal(result.details.magazine[0].valid,false);
 assert.equal(result.readyForLiveRelease,false);
});
test('approved magazine article passes only its own editorial gate',()=>{
 const result=assessPriorityLaunch({articles:[{id:'article-1',locale:'en',title:'Research',body:'Evidence-based article',status:'approved'}]});
 assert.equal(result.gates.magazine,true);
 assert.equal(result.readyForLiveRelease,false);
});
