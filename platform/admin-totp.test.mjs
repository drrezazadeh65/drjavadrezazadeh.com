import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyAdminTotp} from './admin-totp.mjs';
const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
test('RFC 6238 SHA1 vector at 59 seconds, six digits',async()=>assert.equal(await verifyAdminTotp({secret,code:'287082',now:59000}),true));
test('rejects incorrect code',async()=>assert.equal(await verifyAdminTotp({secret,code:'000000',now:59000}),false));
test('rejects short secret and malformed code',async()=>{assert.equal(await verifyAdminTotp({secret:'AAAA',code:'123456'}),false);assert.equal(await verifyAdminTotp({secret,code:'12345'}),false)});
