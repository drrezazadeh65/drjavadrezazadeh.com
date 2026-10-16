import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const adapter=readFileSync('api/ramzinex-readonly.php','utf8');
const api=readFileSync('api/manual-usdt.php','utf8');
const router=readFileSync('api/operations.php','utf8');
const policy=JSON.parse(readFileSync('platform/manual-usdt-bsc.json','utf8'));

test('read-only exchange adapter has no write or money movement endpoints',()=>{
 assert.match(adapter,/JR_RAMZINEX_READONLY_ENABLED/);
 assert.match(adapter,/JR_RAMZINEX_RO_BEARER/);
 assert.match(adapter,/JR_RAMZINEX_RO_API_KEY/);
 assert.match(adapter,/CURLOPT_HTTPGET=>true/);
 assert.match(adapter,/CURLOPT_FOLLOWLOCATION=>false/);
 assert.match(adapter,/CURLOPT_SSL_VERIFYPEER=>true/);
 assert.match(adapter,/CURLOPT_SSL_VERIFYHOST=>2/);
 assert.doesNotMatch(adapter,/\/withdraws\/|\/orders\/market|\/orders\/limit|\/auth\/api_key\/editPrivateAccess/);
});
test('never trust a read-only deposit match as completed payment',()=>{
 assert.match(adapter,/candidate_found/);
 assert.match(adapter,/not_found_in_recent_sample/);
 assert.match(adapter,/unrecognized_provider_schema/);
 assert.match(adapter,/hash_equals\(\$needle,strtolower\(\$candidate\)\)/);
 assert.match(api,/automaticApproval'=>false/);
 assert.match(api,/manualOwnerVerificationRequired'=>true/);
 assert.match(api,/commerceOrderChanged'=>false/);
 assert.match(api,/serviceAccessAutomatic'=>false/);
});
test('only owner with fresh MFA can query exchange receipt evidence',()=>{
 assert.match(router,/if \(!\$fresh\) fail\('admin_mfa_required',403\)/);
 assert.match(router,/jrUsdtAdminRoute\(\$pdo,\$accountId,\$path,\$verb,\$csrf\)/);
 assert.match(api,/\/admin\/operations\/crypto\/usdt\/exchange-evidence/);
 assert.match(api,/rateAllowed\(\$pdo,'usdt_ramzinex_read',\$accountId,6,300\)/);
 assert.match(api,/SELECT tx_hash FROM manual_usdt_claims WHERE id=\? LIMIT 1/);
});
test('USDT wallet configuration is public address only; never stores API token',()=>{
 assert.equal(policy.chainId,56);
 assert.equal(policy.audiences.includes('fa'),true);
 assert.equal(policy.audiences.includes('en'),true);
 assert.equal(policy.status,'FEATURE_DISABLED_PENDING_SECURITY_AND_RELEASE_GATES');
 assert.doesNotMatch(JSON.stringify(policy),/api[_-]?key|api[_-]?secret|bearer|password/i);
 assert.doesNotMatch(adapter,/getenv\([^)]*\)\s*\?\?\s*['"][a-f0-9]{24,}['"]/i);
});
