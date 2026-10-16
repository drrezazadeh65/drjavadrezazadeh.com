import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const api=read('api/index.php');
const handler=read('api/service-intake.php');
const owner=read('api/operations.php');
const adminQueue=read('api/operations-commerce.php');
const buyer=read('assets/js/account-order-history.js');
const admin=read('assets/js/operations-commerce.js');
const migration=read('docs/migrations/20261016_private_service_intake.sql');
const english=read('en/app/account/orders/index.html');

test('private service brief is a distinct additive encrypted table, never plaintext or payment mutation',()=>{
 assert.match(migration,/CREATE TABLE IF NOT EXISTS commerce_service_intakes/);
 assert.match(migration,/payload_ciphertext MEDIUMTEXT NOT NULL/);
 assert.match(migration,/FOREIGN KEY \(order_id,sku\)/);
 assert.match(migration,/ENGINE=InnoDB/);
 assert.doesNotMatch(migration,/ALTER TABLE commerce_orders|UPDATE commerce_orders|INSERT INTO commerce_orders/);
 assert.match(handler,/aes-256-gcm/);
 assert.match(handler,/hash_hkdf\('sha256'/);
 assert.match(handler,/OPENSSL_RAW_DATA/);
 assert.match(handler,/random_bytes\(12\)/);
 assert.match(handler,/service_intake_integrity_failed/);
 assert.match(handler,/base64_encode\(\$iv\.\$tag\.\$cipher\)/);
});

test('write access needs exact buyer email, verified payment claim, open service case and revision guard',()=>{
 assert.match(handler,/o\.customer_email=\? FOR UPDATE/);
 assert.match(handler,/commerce_payment_claims/);
 assert.match(handler,/hash_equals/);
 assert.match(handler,/\$paid\['state'\]!=='paid'/);
 assert.match(handler,/\$paid\['claim_transaction'\]===null/);
 assert.match(handler,/\['awaiting_contact','scheduling','booked','in_progress'\]/);
 assert.match(handler,/intake_revision_conflict/);
 assert.match(handler,/privacyAcknowledged/);
 assert.match(handler,/guardian_acknowledgment_required/);
 assert.match(handler,/array_keys\(\$body\)!==/);
 assert.match(api,/if\(\$path==='\/commerce\/service-intake'/);
 assert.match(api,/sessionAccount\(\$pdo\)/);
 assert.match(api,/email_verified_at/);
 assert.match(api,/\(\$_SERVER\['HTTP_ORIGIN'\]\?\?'\)\!==SITE_ORIGIN/);
 assert.match(api,/service_intake_private_write/);
 assert.match(api,/no-store, private, max-age=0/);
});

test('decrypted client details are readable only through the MFA-gated owner route, not the commerce snapshot',()=>{
 const begin=owner.indexOf("if ($path === '/admin/operations/commerce/service-intake'");
 const end=owner.indexOf("if ($path === '/admin/operations/commerce/availability'",begin);
 assert.ok(begin>0&&end>begin);
 const snippet=owner.slice(begin,end);
 assert.match(snippet,/SUPER_ADMIN/);
 assert.match(snippet,/jrServiceIntakeRead/);
 assert.match(snippet,/service_intake_owner_read/);
 assert.match(owner,/if \(!\$fresh\) fail\('admin_mfa_required',403\)/);
 assert.match(adminQueue,/intakeSubmitted/);
 assert.match(adminQueue,/serviceIntakeSchemaReady/);
 assert.doesNotMatch(adminQueue,/payload_ciphertext|background|objectives/);
 assert.match(admin,/ownerServiceIntakeViewer/);
 assert.match(admin,/api\/admin\/operations\/commerce\/service-intake/);
 assert.match(admin,/content\.replaceChildren\(\)/);
});

test('buyer order timeline can save consented brief, read revisions and render private content safely',()=>{
 assert.match(buyer,/function serviceIntakeEditor/);
 assert.match(buyer,/\/api\/commerce\/service-intake/);
 assert.match(buyer,/expectedRevision:revision/);
 assert.match(buyer,/privacyAcknowledged:consentCheck\.checked/);
 assert.match(buyer,/guardianAcknowledged:guardianCheck\.checked/);
 assert.match(buyer,/data\.intake\.background/);
 assert.match(buyer,/\.textContent/);
 assert.doesNotMatch(buyer,/localStorage\.setItem|sessionStorage\.setItem|innerHTML=/);
 assert.match(english,/account-order-history\.js/);
 assert.match(english,/noindex,nofollow,noarchive/);
});
