import test from 'node:test';
import assert from 'node:assert/strict';
import {auditEngineDependencies} from './engine-dependency-audit.mjs';
test('current domain sources and module governance are internally consistent',()=>{
 const result=auditEngineDependencies();
 assert.deepEqual(result.failures,[]);
 assert.equal(result.valid,true);
 assert.equal(result.engine_count,13);
 assert.equal(result.module_count,21);
});
