import test from 'node:test';
import assert from 'node:assert/strict';
import {createD1AdminRoleLookup} from './admin-d1-role-lookup.mjs';
test('fails closed without D1 binding',async()=>{
 await assert.rejects(()=>createD1AdminRoleLookup()({subject:'id',env:{}}),/unavailable/);
});
test('uses parameterized SQL and accepts only enabled admin roles',async()=>{
 let bound;
 const env={ADMIN_DB:{prepare:sql=>{assert.match(sql,/identity_subject = \?/);return {bind:value=>{bound=value;return {first:async()=>({admin_id:'a1',role:'ADMIN',enabled:1})}}}}}};
 assert.deepEqual(await createD1AdminRoleLookup()({subject:'subject-1',env}),{id:'a1',role:'ADMIN',enabled:true});
 assert.equal(bound,'subject-1');
});
test('rejects disabled or malformed role rows',async()=>{
 const env={ADMIN_DB:{prepare:()=>({bind:()=>({first:async()=>({admin_id:'a',role:'USER',enabled:1})})})}};
 assert.equal(await createD1AdminRoleLookup()({subject:'s',env}),null);
});
