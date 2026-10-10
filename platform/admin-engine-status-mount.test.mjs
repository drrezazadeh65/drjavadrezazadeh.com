import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAdminEngineStatus} from './admin-engine-status-mount.mjs';
test('does not silently attach to unrelated public pages',()=>{
 assert.throws(()=>mountAdminEngineStatus({document:{getElementById:()=>null},fetcher:async()=>{},origin:'https://drjavadrezazadeh.com'}),/mount point missing/);
});
test('requires explicit admin document',()=>{
 assert.throws(()=>mountAdminEngineStatus(),/Admin document required/);
});
