import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=p=>fs.readFileSync(p,'utf8');
const api=get('api/publishing-onboarding.php');
const pub=get('api/publishing.php');
const ops=get('api/operations.php');
const files=get('api/service-files.php');
const doc=get('docs/migrations/20261017_jr_publishing_author_onboarding.sql');
const author=get('fa/app/author/index.html');
const owner=get('fa/app/admin/index.html');
const authorJs=get('assets/js/jr-author-onboarding-v1.js');
const ownerJs=get('assets/js/operations-publishing-authors-v1.js');
const mother=get('docs/governance/MOTHER_DATABASE_MODULAR_MASTERPLAN_20261017.md');

test('extend existing mother schema with exactly three additive publishing tables, not new auth/payment',()=>{
 const tables=[...doc.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z0-9_]+)/gi)].map(m=>m[1]);
 assert.deepEqual(tables,['publishing_author_profiles','publishing_author_bank_accounts','publishing_author_documents']);
 assert.equal((doc.match(/ENGINE=InnoDB/g)||[]).length,3);
 assert.match(doc,/FOREIGN KEY\(author_id\) REFERENCES publishing_authors\(id\)/);
 assert.match(doc,/publishing_author_bank_accounts/);
 assert.match(doc,/card_sealed TEXT NOT NULL/);
 assert.match(doc,/iban_sealed TEXT NOT NULL/);
 assert.match(doc,/encrypted_storage_name/);
 // Block mutating SQL statements, without rejecting legitimate DDL ON UPDATE column attributes.
 assert.doesNotMatch(doc.replace(/^\s*--[^\n]*$/gm,''),/^\s*(?:DROP\b|TRUNCATE\b|DELETE\s+FROM\b|UPDATE\s+[a-z_]|CREATE\s+DATABASE\b|INSERT\s+INTO\b)/gmi);
 assert.match(doc,/ON UPDATE CURRENT_TIMESTAMP/);
 assert.doesNotMatch(doc,/CREATE TABLE IF NOT EXISTS (?:author_users|customer_accounts|commerce_orders)/);
});
test('author profile, bank and document submissions are scoped to an email-verified account with mandatory POST Origin',()=>{
 assert.match(pub,/jrPubAuthorOnboardingRoute\(\$path,\$verb\)/);
 assert.match(api,/sessionAccount\(\$pdo\)/);
 assert.match(api,/email_verified_at/);
 assert.match(api,/jrPubAuthorOwned\(\$pdo,\$id,\$author\)/);
 assert.match(api,/\$_SERVER\['HTTP_ORIGIN'\]/);
 assert.match(api,/SITE_ORIGIN\)fail\('origin_forbidden',403\)/);
 assert.match(api,/rateAllowed\(\$pdo,'publishing_kyc_write'/);
 assert.match(api,/review_state='submitted'/);
});
test('bank card/IBAN encrypted, masked on both dashboards, no self-approval or payout mutation',()=>{
 assert.match(api,/function jrPubCardValid/);
 assert.match(api,/function jrPubIbanValid/);
 assert.match(api,/jrPubSeal\(\$card,'author-card\|'/);
 assert.match(api,/jrPubSeal\(\$iban,'author-iban\|'/);
 assert.match(api,/card_last4/);
 assert.match(api,/iban_last4/);
 assert.match(api,/card_sealed/);
 assert.match(api,/verified_at=NULL/);
 assert.match(api,/owner_cannot_approve_own_author_identity/);
 assert.match(api,/manualPayoutAuthorized'=>false/);
 assert.doesNotMatch(authorJs,/localStorage|sessionStorage/);
 assert.doesNotMatch(ownerJs,/localStorage|sessionStorage/);
 assert.doesNotMatch(ownerJs,/card_sealed|iban_sealed|identity_reference_sealed/);
});
test('documents are bounded, scanned, authenticated-encrypted and never written under public_html',()=>{
 assert.match(api,/is_uploaded_file\(\$tmp\)/);
 assert.match(api,/5242880/);
 assert.match(api,/jrServiceFileScan\(\$tmp/);
 assert.match(files,/function jrServiceFilesPrivateRoot/);
 assert.match(api,/jrPubKycDocumentDir/);
 assert.match(api,/JRAK1/);
 assert.match(api,/aes-256-gcm/);
 assert.match(api,/hash\('sha256',\$bytes\)/);
 assert.match(api,/fopen\(\$dest,'xb'\)/);
 assert.match(api,/chmod\(\$dest,0600\)/);
 assert.match(api,/hash_equals\(\(string\)\$row\['content_sha256'\]/);
 assert.match(api,/Content-Disposition: attachment/);
 assert.match(api,/Content-Security-Policy: sandbox/);
 assert.doesNotMatch(api,/move_uploaded_file\([^)]*public_html/);
});
test('owner review is routed beneath existing verified account, fresh MFA and CSRF',()=>{
 const fresh=ops.indexOf("if (!$fresh) fail('admin_mfa_required',403);");
 const routed=ops.indexOf("jrPubKycAdminRoute($pdo,$path,$verb,$accountId,$csrf,$configuration);");
 assert.ok(fresh>=0&&routed>fresh,'MFA must gate every owner KYC review route');
 assert.match(api,/SUPER_ADMIN/);
 assert.match(api,/operationsMutationAllowed\(\$_SERVER/);
 assert.match(api,/review_dependency_or_state_conflict/);
 assert.match(api,/identity_front','academic_cv/);
 assert.match(api,/document_kind='bank_ownership' AND review_state='approved'/);
 assert.match(api,/jrPubKycAudit\(\$pdo,\$author,\$admin/);
});
test('both forms preserve noindex and do not claim active checkout or completed verification',()=>{
 assert.match(author,/id="jr-author-onboarding"/);
 assert.match(owner,/id="ops-publishing-author-review"/);
 assert.match(author,/noindex/);
 assert.match(owner,/noindex/);
 assert.match(author,/jr-author-onboarding-v1\.js/);
 assert.match(owner,/operations-publishing-authors-v1\.js/);
 assert.match(authorJs,/privacyConsent='AUTHOR_PRIVATE_ONBOARDING_V1'/);
 assert.match(authorJs,/fetch\(api\+'\/document'/);
 assert.match(ownerJs,/\/api\/admin\/operations\/session/);
 assert.match(ownerJs,/'X-CSRF-Token':s\.csrfToken/);
 assert.ok(fs.existsSync('assets/css/jr-publishing-onboarding-v1.css'));
});
test('reference masterplan explicitly preserves last-step migration and evidence stage',()=>{
 assert.match(mother,/20261017_jr_future_publishing\.sql/);
 assert.match(mother,/یک مادر، چند ماژول/);
 assert.match(mother,/مرحله/);
});
