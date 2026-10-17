import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const sql=read('docs/migrations/20261017_service_buyer_receipt.sql');
const server=read('api/service-buyer-receipt.php');
const api=read('api/index.php');
const files=read('api/service-files.php');
const customer=read('assets/js/account-order-history.js');
const admin=read('assets/js/operations-commerce.js');
const fixture=read('tests/commerce-service-advance-mysql.php');

test('buyer receipt uses a separate additive file-bound table without touching checkout',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS commerce_service_buyer_receipts/);
 assert.match(sql,/PRIMARY KEY \(file_id\)/);
 assert.match(sql,/REFERENCES commerce_service_files\(id\)/);
 assert.match(sql,/REFERENCES commerce_service_cases\(order_id,sku\)/);
 assert.match(sql,/ENGINE=InnoDB/);
 assert.doesNotMatch(sql,/ALTER TABLE commerce_orders|UPDATE commerce_orders|provider_amount/);
 assert.doesNotMatch(read('assets/js/donation-payment.js'),/commerce_service_buyer_receipts/);
});

test('buyer receipt is an explicit authenticated same-origin action only for a real released document',()=>{
 assert.match(api,/require_once __DIR__\.'\/service-buyer-receipt.php'/);
 const section=api.slice(api.indexOf('// Explicit client acknowledgement'),api.indexOf('// Verified-account order history.'));
 assert.ok(section.length>700);
 assert.match(section,/HTTP_ORIGIN/);
 assert.match(section,/sessionAccount\(\$pdo\)/);
 assert.match(section,/email_verified_at/);
 assert.match(section,/rateAllowed/);
 assert.match(section,/jsonBody\(\)/);
 assert.match(section,/jrServiceBuyerReceiptConfirm/);
 assert.match(server,/array_keys\(\$input\)!==\['orderId','sku','fileId','received'\]/);
 assert.match(server,/\$input\['received'\]!==true/);
 assert.match(server,/jrServiceFilePaidCase\(\$pdo,\$order,\$sku,\$email,true\)/);
 assert.match(server,/service_state'\]!=='delivered'/);
 assert.match(server,/kind='professional_output' FOR UPDATE/);
 assert.match(server,/jrServiceFileReleasedDigest/);
 assert.match(server,/jrServiceFileMatchesRelease/);
 assert.ok(server.includes("receipt_artifact_missing"));
 assert.ok(server.includes("receipt_artifact_integrity_invalid"));
 assert.ok(server.includes("jrServiceFileDecrypt($sealed,$order,$sku)"));
 assert.ok(server.includes("hash_equals((string)$artifact['content_sha256']"));
 assert.ok(fixture.includes("self_receipt_denied_if_real_encrypted_output_is_missing"));

 assert.match(server,/ON DUPLICATE KEY UPDATE file_id=file_id/);
 assert.match(server,/actualDownloadIndependentlyProven'=>false/);
 assert.match(server,/buyerSatisfactionConfirmed'=>null/);
 assert.match(server,/providerBankSettlementVerified'=>null/);
});

test('client and owner views distinguish unapproved drafts, released files and client self-attested receipt',()=>{
 assert.match(files,/function jrServiceFileReleasedDigest/);
 assert.match(files,/buyerReceiptConfirmed/);
 assert.match(files,/buyerReceiptConfirmationAvailable/);
 assert.match(files,/releasedToBuyer/);
 assert.match(customer,/Acknowledge receipt of this output/);
 assert.match(customer,/customer-service-receipt-ack-v1/);
 assert.match(customer,/\/api\/commerce\/service-receipt/);
 assert.match(customer,/received:true/);
 assert.match(admin,/Buyer self-attested receipt/);
 assert.match(admin,/Internal output, not released to buyer/);
 assert.match(fixture,/independent_buyer_receipt_schema_ready/);
 assert.match(fixture,/nonowner_email_cannot_claim_document_receipt/);
 assert.match(fixture,/buyer_cannot_confirm_unreleased_internal_draft/);
 assert.match(fixture,/buyer_receipt_idempotent_and_not_attached_to_draft/);
});

test('release and receipt are separate from accounting and institutional decisions',()=>{
 assert.doesNotMatch(server,/UPDATE commerce_orders|UPDATE commerce_service_cases|finance_verified|settlement_confirmed/);
 assert.doesNotMatch(sql,/buyer_satisfied|bank_settled|payment_received/);
 assert.match(files,/hash_equals\(\$digest,\$candidate\)/);
});

test('owner can inspect buyer acknowledgments even after the case leaves the active worklist',()=>{
 const snapshot=read('api/operations-commerce.php');
 assert.ok(snapshot.includes('deliveredServiceActionQueue'));
 assert.ok(snapshot.includes('deliveredServiceQueueTruncated'));
 assert.ok(snapshot.includes('serviceActionQueue'));
 assert.ok(snapshot.includes("WHERE sc.status='delivered'"));
 assert.ok(snapshot.includes("ORDER BY sc.delivered_at DESC"));
 assert.ok(admin.includes('Completed services and buyer receipt declarations'));
 assert.ok(admin.includes('fulfilment.deliveredServiceActionQueue'));
 assert.ok(admin.includes('ownerServiceFileWorkspace(entry,item)'));
 assert.ok(admin.includes('Buyer self-attested receipt'));
});
