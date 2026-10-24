import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../platform/jrei-v5/windows-worker/jrei-worker.mjs',import.meta.url),'utf8');

test('existing independent Windows identity can disclose only its derived public key',()=>{
  const start=source.indexOf('async function showPublic()');
  const end=source.indexOf('function validateConfig(config)');
  assert.ok(start>=0&&end>start);
  const body=source.slice(start,end);
  assert.match(body,/const file=keyPath\(\);/);
  assert.match(body,/st\.isSymbolicLink\(\)/);
  assert.match(body,/protectKey\('unprotect',file\)/);
  assert.match(body,/createPrivateKey\(pem\)/);
  assert.match(body,/createPublicKey\(key\)/);
  assert.match(body,/asymmetricKeyType!=='ed25519'/);
  assert.match(body,/process\.stdout\.write\('PUBLIC_KEY_B64='/);
  assert.doesNotMatch(body,/generateKeyPairSync|unlink|rmSync|writeFile|privatePem|PRIVATE_KEY_B64/);
  assert.match(source,/else if\(cmd==='show-public'&&process\.argv\.length===3\)await showPublic\(\);/);
});

test('first-time init still refuses to overwrite preexisting protected identity',()=>{
  const start=source.indexOf('async function init()');
  const end=source.indexOf('async function showPublic()');
  assert.ok(start>=0&&end>start);
  assert.match(source.slice(start,end),/KEY_ALREADY_PRESENT_NEVER_OVERWRITE/);
});
