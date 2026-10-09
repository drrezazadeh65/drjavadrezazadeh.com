import test from 'node:test';
import assert from 'node:assert/strict';
import {assessIndexationEvidence} from './ai-indexation-evidence.mjs';
const pages=[{path:'/fa/services/',indexable:true},{path:'/en/services/',indexable:true}];
test('does not assume indexing when no provider evidence exists',()=>{
 const result=assessIndexationEvidence({pages});
 assert.equal(result.findings.filter(f=>f.code==='indexation-unverified').length,4);
 assert.equal(result.liveIndexationChecked,false);
});
test('uses explicit provider evidence without extrapolating to others',()=>{
 const result=assessIndexationEvidence({pages,observations:[{path:'/fa/services/',source:'google',status:'indexed',checkedAt:'2026-10-09T12:00:00Z'}]});
 assert.equal(result.findings.filter(f=>f.code==='indexation-unverified').length,3);
});
test('flags nonindexed evidence and malformed observations',()=>{
 const result=assessIndexationEvidence({pages,observations:[{path:'/en/services/',source:'bing',status:'not-indexed',checkedAt:'2026-10-09T12:00:00Z'},{path:'/fa/services/',source:'google',status:'indexed',checkedAt:'bad-date'}]});
 assert.ok(result.findings.some(f=>f.code==='not-indexed'&&f.source==='bing'));
 assert.ok(result.findings.some(f=>f.code==='invalid-observation'));
});
