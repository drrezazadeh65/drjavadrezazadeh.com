import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ENGINE_REGISTRY,getEngine,listEngineDomains,validateEngineRegistry} from './engine-registry.mjs';
test('registry has unique engine ownership and source files',()=>{
 assert.equal(validateEngineRegistry(),true);
 assert.equal(ENGINE_REGISTRY.length,13);
 for(const e of ENGINE_REGISTRY) assert.ok(existsSync(fileURLToPath(new URL(e.module,import.meta.url))),e.module);
});
test('engine lookups are deterministic',()=>{
 assert.equal(getEngine('commerce')?.domain,'commerce');
 assert.equal(getEngine('missing'),null);
 assert.ok(listEngineDomains().includes('assessment'));
});
test('duplicate source registration is rejected',()=>{
 assert.throws(()=>validateEngineRegistry([ENGINE_REGISTRY[0],ENGINE_REGISTRY[0]]),/Duplicate/);
});
