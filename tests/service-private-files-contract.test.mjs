import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const api=read('api/index.php');
const owner=read('api/operations.php');
const handler=read('api/service-files.php');
const sql=read('docs/migrations/20261017_private_service_files.sql');
const serviceDelivery=read('api/operations-service-delivery.php');
const dashboard=read('assets/js/account-order-history.js');
const admin=read('assets/js/operations-commerce.js');

test('private files are an additive paid-case table, not a replacement checkout or donation mechanism',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS commerce_service_files/);
 assert.match(sql,/FOREIGN KEY \(order_id,sku\)/);
 assert.match(sql,/REFERENCES commerce_service_cases\(order_id,sku\)/);
 assert.match(sql,/ENGINE=InnoDB/);
 assert.doesNotMatch(sql,/ALTER TABLE commerce_orders|UPDATE commerce_orders/);
 assert.match(handler,/JR_SERVICE_PRIVATE_STORAGE/);
 assert.match(handler,/JR_SERVICE_FILES_ENABLED/);
 assert.match(handler,/public_tls_confirmed/);
 assert.match(handler,/realpath\(\$raw\)/);
 assert.match(handler,/public_html/);
 assert.match(handler,/\$perms&0077/);
 assert.match(handler,/JR_SERVICE_AV_BINARY/);
 assert.match(handler,/proc_open/);
 assert.match(handler,/aes-256-gcm/);
 assert.match(handler,/jr-service-file-v1\|/);
 assert.match(handler,/hash_hkdf/);
 assert.match(handler,/content_sha256/);
 assert.match(handler,/hash_equals/);
 assert.doesNotMatch(read('assets/js/donation-payment.js'),/JR_SERVICE_PRIVATE_STORAGE|service-file/);
});

test('uploads require actual uploaded PDF or DOCX, ClamAV scanning and no plaintext database record',()=>{
 assert.match(handler,/is_uploaded_file/);
 assert.match(handler,/12582912/);
 assert.match(handler,/ZipArchive/);
 assert.match(handler,/vbaProject\|activeX\|embeddings\|oleObject/);
 assert.match(handler,/%PDF-/);
 assert.match(handler,/jrServiceFileScan\(\$tmp/);
 assert.match(sql,/consent_version/);
 assert.match(sql,/subject_is_minor/);
 assert.match(sql,/guardian_acknowledged/);
 assert.match(handler,/private_file_consent_or_guardian_required/);
 assert.match(handler,/SERVICE_FILE_HANDLING_V1/);
 assert.match(api,/privacyAcknowledged/);
 assert.match(api,/guardianAcknowledged/);
 assert.match(dashboard,/privacyCheck\.required=true/);
 assert.match(dashboard,/guardianCheck\.required=minorCheck\.checked/);
 assert.match(dashboard,/payload\.append\('privacyAcknowledged','1'\)/);
 assert.match(dashboard,/payload\.append\('guardianAcknowledged'/);

 assert.match(handler,/jrServiceFileEncrypt\(\$plain/);
 assert.match(handler,/fopen\(\$target,'xb'\)/);
 assert.match(handler,/chmod\(\$target,0600\)/);
 assert.match(handler,/client_source/);
 assert.match(handler,/professional_output/);
 assert.doesNotMatch(sql,/payload_plaintext|original_filename|storage_full_path/);
 assert.match(handler,/COUNT\(\*\) FROM commerce_service_files/);
 assert.match(handler,/FOR UPDATE/);
 assert.match(handler,/\$preflight=jrServiceFilePaidCase\(\$pdo,\$order,\$sku,\$buyerEmail\)/);
 assert.match(handler,/service_file_idempotent_commit_failed/);
 assert.match(handler,/content_sha256=\? LIMIT 1/);
 assert.match(handler,/alreadyRecorded'=>true/);

});

test('private buyer routes require verified account, claim-matched order and origin protection',()=>{
 assert.match(api,/require_once __DIR__\.'\/service-files.php'/);
 assert.match(api,/if\(in_array\(\$path,\['\/commerce\/service-files','\/commerce\/service-file'\]/);
 const section=api.slice(api.indexOf('// Encrypted academic-service files:'),api.indexOf('// Verified-account order history.'));
 assert.ok(section.length>2500);
 assert.match(section,/email_verified_at/);
 assert.match(section,/sessionAccount\(\$pdo\)/);
 assert.match(section,/HTTP_ORIGIN/);
 assert.match(section,/multipart\/form-data/);
 assert.match(section,/rateAllowed/);
 assert.match(section,/private_service_files_unavailable/);
 assert.match(handler,/jrServiceFilePaidCase\(\$pdo,\$order,\$sku,\$buyerEmail/);
 assert.match(handler,/hash_equals\(\(string\)\$record\['provider_trans_id'\]/);
 assert.match(handler,/jrServiceFileReleasedDigest/);
 assert.match(handler,/jrServiceFileMatchesRelease/);
 assert.match(handler,/Content-Disposition: attachment/);
 assert.match(handler,/function jrServiceFileReleasedDigest/);
 assert.match(handler,/function jrServiceFileMatchesRelease/);
 assert.match(handler,/evidence_kind.*document_handed_over/);
 assert.match(handler,/evidence_reference_hmac/);
 assert.ok(handler.includes('return hash_equals($digest,$candidate);'));
 assert.ok(handler.includes('if($buyerEmail===null||!$isOutput||$isReleased)$files[]=$file;'));
 assert.match(handler,/professional_output_not_released/);
 assert.match(read('tests/commerce-service-advance-mysql.php'),
   /unapproved_draft_in_same_delivered_case_remains_private/);

 assert.match(handler,/Cache-Control: private, no-store/);
 assert.match(handler,/Content-Security-Policy: sandbox/);
 assert.doesNotMatch(handler,/header\('Location:/);
});

test('owner routes are available only behind original operations MFA, SUPER_ADMIN, CSRF and rate gates',()=>{
 assert.match(owner,/if \(!\$fresh\) fail\('admin_mfa_required',403\)/);
 const chunk=owner.slice(owner.indexOf('// Owner\'s private file custody:'),owner.indexOf("if ($path === '/admin/operations/commerce/availability'"));
 assert.match(chunk,/SUPER_ADMIN/);
 assert.match(chunk,/operationsMutationAllowed/);
 assert.match(chunk,/HTTP_X_CSRF_TOKEN/);
 assert.match(chunk,/jrServiceFileUpload/);
 assert.match(chunk,/jrServiceFileDownload/);
 assert.match(chunk,/jrServiceFilesList/);
 assert.match(chunk,/rateAllowed/);
 assert.match(serviceDelivery,/document_evidence_not_in_this_case/);
 assert.match(serviceDelivery,/jrServiceFileDecrypt/);
 assert.match(serviceDelivery,/document_delivery_integrity_invalid/);
});

test('bilingual buyer and admin worklists use only private per-case file routes',()=>{
 assert.match(dashboard,/function serviceFileWorkspace/);
 assert.match(dashboard,/\/api\/commerce\/service-files/);
 assert.match(dashboard,/\/api\/commerce\/service-file\?id=/);
 assert.match(dashboard,/FormData/);
 assert.match(dashboard,/serviceFileWorkspace\(order,c\)/);
 assert.match(admin,/function ownerServiceFileWorkspace/);
 assert.match(admin,/\/api\/admin\/operations\/commerce\/service-files/);
 assert.match(admin,/\/api\/admin\/operations\/commerce\/service-file\?id=/);
 assert.match(admin,/jr:deliverable-selected/);
 const parcel=admin.indexOf('for(const entry of fulfilment.parcelActionQueue)');
 const service=admin.indexOf('for(const entry of fulfilment.serviceActionQueue)');
 assert.ok(parcel>=0&&service>parcel);
 assert.ok(!admin.slice(parcel,service).includes('ops-delivery-attestation'),
   'service delivery attestation must not render in parcel queue');
 assert.ok(admin.slice(service).includes('ops-delivery-attestation'));
 assert.match(admin,/ownerServiceFileWorkspace\(entry,item\)/);
 for(const path of ['sitemap-en.xml','sitemap-services.xml','sitemap-fa.xml']){
  assert.doesNotMatch(read(path),/\/commerce\/service-file(?:s)?/);
 }
});

test('owner readiness never advertises private file custody until the required secure gates are available',()=>{
 const snapshot=read('api/operations-commerce.php');
 assert.match(snapshot,/privateServiceFilesReady/);
 assert.ok(snapshot.includes('jrServiceFilesReady($pdo)'));
 assert.ok(admin.includes('fulfilment.privateServiceFilesReady===true'));
 const version='operations-commerce.js?v=20261017-private-document-workflow-v4';
 for(const page of ['fa/app/admin/index.html','en/account/admin/index.html']){
  assert.ok(read(page).includes(version),'stale operations script '+page);
 }
 assert.ok(read('scripts/donation-cycle-audit.cjs').includes(version),
   'Donation regression test must track the actual shared admin script');
});
