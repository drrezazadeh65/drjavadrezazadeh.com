import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const registry=JSON.parse(fs.readFileSync(new URL('./registry.json',import.meta.url),'utf8'));
test('registry includes priority channels',()=>{for(const id of ['instagram','threads','linkedin','aparat','youtube','x','facebook'])assert.ok(registry.channels.some(c=>c.id===id));});
test('all ids unique',()=>assert.equal(new Set(registry.channels.map(c=>c.id)).size,registry.channels.length));
test('no unverified channel is falsely enabled',()=>assert.ok(registry.channels.every(c=>c.autoPublish===false&&c.adapterStatus==='not_implemented')));
