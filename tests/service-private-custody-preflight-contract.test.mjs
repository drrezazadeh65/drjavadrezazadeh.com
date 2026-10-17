import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const php=readFileSync('scripts/service-private-custody-preflight.php','utf8');
const workflow=readFileSync('.github/workflows/v5-release-candidate.yml','utf8');

test('host preflight is CLI only, fail-closed and discloses boolean readiness without secret values',()=>{
  assert.match(php,/PHP_SAPI !== 'cli'/);
  assert.match(php,/SOURCE_HOST_PREREQUISITES_MET/);
  assert.match(php,/BLOCKED_PREREQUISITES_MISSING/);
  assert.match(php,/exit\(\$ready\?0:2\)/);
  assert.match(php,/productionCertified'=>false/);
  assert.match(php,/paymentTested'=>false/);
  assert.match(php,/customerDataAccessed'=>false/);
  assert.match(php,/databaseMutated'=>false/);
  assert.doesNotMatch(php,/file_put_contents\(|mkdir\(|UPDATE commerce_|DELETE FROM commerce_|INSERT INTO commerce_|ALTER TABLE |CREATE TABLE /);
  assert.match(php,/json_encode\(\[/);
  assert.match(php,/config\.local\.php/);
  assert.match(php,/array_replace\(\$configuration,\$loaded\)/);
});
test('required host prerequisites include private path, ClamAV, 12MB upload headroom and real encrypted custody schema',()=>{
  for (const gate of [
    'approvedAntiMalwareBinary','privateStorageOutsideWebRoot','privateStoragePrivatePermissions',
    'privateStorageUsable','privateStorageSpaceForOneJob','safePHPUploadLimit','safePHPMemoryLimit',
    'featureExplicitlyEnabled','tlsOwnerSwitchAsserted','strongExistingPepper',
    'phpOpenSSL','phpHKDF','docxArchive','readOnlyDatabaseSchema'
  ]) assert.ok(php.includes(gate),gate);
  for (const name of [
    'commerce_service_files','commerce_service_cases','commerce_payment_claims',
    'commerce_service_delivery_evidence','commerce_service_buyer_receipts',
    'consent_version','guardian_acknowledged'
  ]) assert.ok(php.includes(name),name);
  assert.match(php,/INFORMATION_SCHEMA|information_schema/);
  assert.match(php,/--check-db/);
  assert.match(php,/50331648/);
});
test('existing stage-5 release candidate syntax checks include read-only preflight file',()=>{
  assert.ok(workflow.includes('php -l scripts/service-private-custody-preflight.php'));
});
