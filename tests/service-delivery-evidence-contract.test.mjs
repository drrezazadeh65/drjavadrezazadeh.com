import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const api=read('api/operations.php');
const implementation=read('api/operations-service-delivery.php');
const snapshot=read('api/operations-commerce.php');
const panel=read('assets/js/operations-commerce.js');
const customer=read('assets/js/account-order-history.js');
const sql=read('docs/migrations/20261016_owner_attested_service_delivery.sql');
const earlier=read('api/operations-fulfilment.php');

test('an isolated evidence migration cannot disable established checkout or Donation',()=>{
  assert.match(sql,/CREATE TABLE IF NOT EXISTS commerce_service_delivery_evidence/);
  assert.match(sql,/FOREIGN KEY \(order_id,sku\)/);
  assert.match(sql,/ENGINE=InnoDB/);
  assert.doesNotMatch(read('api/index.php'),/operationsServiceDeliveryEvidenceReady\(db\(\)\)/);
  assert.doesNotMatch(read('assets/js/donation-payment.js'),/commerce_service_delivery_evidence/);
  assert.match(earlier,/booked'=>'in_progress/);
});

test('only a privileged MFA-backed mutation route can attest delivery',()=>{
  assert.match(api,/require_once __DIR__\.'\/operations-service-delivery.php'/);
  const section=api.slice(api.indexOf("if ($path === '/admin/operations/commerce/service-delivery'"),api.indexOf("if ($path === '/admin/operations/commerce/availability'"));
  assert.ok(section.length>300);
  assert.match(section,/SUPER_ADMIN/);
  assert.match(section,/operationsMutationAllowed/);
  assert.match(section,/rateAllowed/);
  assert.match(section,/operationsCommerceRecordDelivery/);
  assert.match(section,/commerce-service-delivery-attestation-v1/);
});

test('server requires claim-matched paid order, in-progress state and owner evidence',()=>{
  assert.match(implementation,/array_keys\(\$request\)!==\['orderId','sku','expectedState','evidenceKind','evidenceReference','ownerConfirmed'\]/);
  assert.match(implementation,/\$request\['ownerConfirmed'\]!==true/);
  assert.match(implementation,/\$request\['expectedState'\]!=='in_progress'/);
  assert.match(implementation,/state'\]!=='paid'/);
  assert.match(implementation,/hash_equals/);
  assert.match(implementation,/claim_amount/);
  assert.match(implementation,/booking_elapsed/);
  assert.match(implementation,/throw new DomainException\('booked_service_not_completed'\)/);
  assert.match(implementation,/evidence_reference_hmac/);
  assert.match(implementation,/hash_hmac\('sha256'/);
  assert.match(implementation,/document_evidence_not_in_this_case/);
  assert.match(implementation,/jrServiceFilesSchemaReady/);
  assert.match(implementation,/jrServiceFileDecrypt/);
  assert.match(implementation,/document_delivery_integrity_invalid/);
  assert.match(read('tests/commerce-service-advance-mysql.php'),/document_delivery_without_registered_file_denied/);
  assert.match(read('tests/commerce-service-advance-mysql.php'),/private_service_file_aead_roundtrip/);

  assert.match(implementation,/WHERE order_id=\? AND sku=\? AND status='in_progress'/);
  assert.match(implementation,/\$pdo->rollBack\(\)/);
  assert.match(implementation,/customerNotified'=>false/);
  assert.match(implementation,/providerBankSettlementVerified'=>null/);
});

test('admin UI remains fail closed and customer disclosure is not mistaken for settlement',()=>{
  assert.match(snapshot,/serviceDeliveryEvidenceSchemaReady/);
  assert.match(panel,/serviceDeliveryEvidenceSchemaReady===true/);
  assert.match(panel,/ownerConfirmed:true/);
  assert.match(panel,/service-delivery/);
  assert.match(panel,/evidenceReference:reference/);
  assert.match(customer,/independent buyer receipt is not confirmed/);
  assert.doesNotMatch(panel,/localStorage\.setItem/);
});
