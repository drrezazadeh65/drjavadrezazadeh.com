import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reconcile} from '../scripts/masterplan-evidence-reuse-audit.mjs';
const acceptancePath='docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json';
test('reuse all existing 41/21 requirements without fabricating acceptance',()=>{
 const before=fs.readFileSync(acceptancePath,'utf8');
 const original=JSON.parse(before);
 const r=reconcile(process.cwd(),{sha:'bb22b9588b394cba9df499fe31baaece7925a5bb',runId:'39033867925'});
 assert.equal(r.gates.count,41);
 assert.equal(r.services.count,21);
 assert.equal(r.gates.records.length,41);
 assert.equal(r.services.records.length,21);
 assert.equal(r.gates.formallyVerified,original.verifiedGates.filter(x=>x.status==='VERIFIED').length);
 assert.equal(r.services.formallyVerified,original.verifiedServices.filter(x=>x.status==='VERIFIED').length);
 assert.equal(r.officiallyAcceptedDestinations,original.verifiedInternalDestinations.length);
 assert.equal(r.services.bilingualSourcePagesExisting,42);
 assert.equal(r.releaseState,original.releaseState);
 assert.equal(r.ownerFinalAuthorization,original.ownerFinalAuthorization);
 assert.equal(fs.readFileSync(acceptancePath,'utf8'),before,'read-only reconciliation must not alter acceptance state');
});
test('source code and prior tests are never represented as real payment or review acceptance',()=>{
 const r=reconcile();
 assert.ok(r.gates.records.every(x=>x.sourcePointersAreAcceptanceEvidence===false));
 assert.ok(r.services.records.every(x=>x.thisAuditVerifiedPaymentOrFulfilment===false));
 assert.ok(r.gates.records.every(x=>Array.isArray(x.existingSourcePointers)&&x.existingSourcePointers.length>0));
 assert.ok(r.gates.records.some(x=>x.independentReviewRequired));
 assert.ok(r.gates.records.some(x=>x.liveProofRequired));
 assert.match(r.conclusion,/No previous tests repeated/);
 assert.match(r.conclusion,/No.*41\/21 acceptance status advanced/);
});


test('mother database reference preserves one active Bertina backend and defers PDF/DDL',()=>{
 const source=JSON.parse(fs.readFileSync('docs/governance/SOURCE_OF_TRUTH.json','utf8'));
 const db=source.modularMotherDatabase;
 assert.equal(db.operationalDatabaseCount,1);
 assert.equal(db.operationalProvider,'Bertina PHP + MySQL/MariaDB');
 assert.equal(db.releaseEvidenceAuthority,'docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json');
 assert.equal(db.ownerLastStepRule,'DEFER_ALL_PRIVATE_PDF_UPLOADS_AND_MYSQL_MIGRATIONS_UNTIL_JOINT_FINAL_PREFLIGHT');
 assert.deepEqual(db.canonicalCore,[
  'customer_accounts','commerce_orders','commerce_payment_claims','commerce_outbox'
 ]);
 const doc=fs.readFileSync(db.masterplan,'utf8');
 const agents=fs.readFileSync('AGENTS.md','utf8');
 assert.match(agents,/MOTHER_DATABASE_MODULAR_MASTERPLAN_20261017\.md/);
 for(const name of db.canonicalCore)assert.match(doc,new RegExp(name));
 for(const p of db.productionSqlAuthorities)assert.ok(fs.existsSync(p),'canonical SQL source missing: '+p);
 assert.ok(fs.existsSync(db.deprecatedParallelPublishingDraft));
 assert.match(doc,/jr_pub_\*/);
 assert.match(doc,/PostgreSQL/);
 assert.match(doc,/information_schema/);
 assert.match(doc,/مرحله مشترک/);
 assert.match(doc,/JR_Publishing_PDF_Private_Server_Staging_v2\.zip/);
 assert.match(doc,/a0fb784d92f0b3b40fc03f370444bfda41af40a1dc72d6b90568c4c9ffcdbbcf/);
 const installer=fs.readFileSync('api/internal/jr-publishing-private-install-cli.php','utf8');
 assert.match(installer,/JR_Publishing_PDF_Private_Server_Staging_v2\.zip/);
 assert.match(installer,/private-asset-manifest\.json/);
 assert.match(installer,/READ_ME_PRIVATE_DEPLOYMENT\.txt/);
 const canonical=fs.readFileSync('docs/migrations/20261017_jr_future_publishing.sql','utf8');
 const alternative=fs.readFileSync(db.deprecatedParallelPublishingDraft,'utf8');
 assert.match(canonical,/CREATE TABLE IF NOT EXISTS publishing_authors/);
 assert.match(alternative,/CREATE TABLE IF NOT EXISTS jr_pub_authors/);
 assert.doesNotMatch(canonical,/CREATE TABLE IF NOT EXISTS jr_pub_authors/);
 const pg=fs.readFileSync('platform/db/migrations/001_identity_consultation.sql','utf8');
 assert.match(pg,/PostgreSQL/);
 assert.match(pg,/CREATE TABLE IF NOT EXISTS app_user/);
 const actual=JSON.parse(fs.readFileSync(db.releaseEvidenceAuthority,'utf8'));
 assert.equal(actual.ownerFinalAuthorization,false);
 assert.notEqual(actual.releaseState,'FULLY_VERIFIED_FOR_SINGLE_OWNER_RELEASE');
});

test('revenue v3 extends the existing audit to all 27 service SKUs and four book products',()=>{
 const r=reconcile(process.cwd(),{sha:'93eeb7e15ffd8b582e1ee9b19d25e82f8bb34303'});
 assert.deepEqual(r.commercialInventory.counts,{standard:21,vip:6,printBooks:3,digitalBundles:1,total:31});
 assert.equal(r.commercialInventory.records.length,31);
 assert.equal(r.commercialInventory.records.filter(x=>x.kind==='STANDARD_SERVICE').length,21);
 assert.equal(r.commercialInventory.records.filter(x=>x.kind==='VIP_SERVICE').length,6);
 assert.equal(r.commercialInventory.records.filter(x=>x.kind==='PRINT_BOOK').length,3);
 assert.ok(r.commercialInventory.records.every(x=>x.currency==='IRT'&&Number.isSafeInteger(x.priceToman)&&x.priceToman>0));
 assert.ok(r.commercialInventory.records.every(x=>x.liveHttpStatus===null&&!x.checkoutVerified&&!x.paymentVerified&&!x.fulfilmentVerified&&!x.settlementReconciled));
 assert.ok(r.commercialInventory.records.every(x=>['SOURCE_ONLY','NOT_IMPLEMENTED','BLOCKED_WITH_REASON'].includes(x.status)));
 const digital=r.commercialInventory.records.find(x=>x.kind==='DIGITAL_BUNDLE');
 assert.equal(digital.priceToman,1000000);
 assert.equal(digital.status,'BLOCKED_WITH_REASON');
 assert.equal(digital.faUrl,'/fa/shop/authors/mehrab-mirkarimi/');
 assert.equal(r.commercialInventory.statusesDoNotImplyLiveAcceptance,true);
});
test('payment registry versus market policy mismatch is disclosed without switching production providers',()=>{
 const registryBefore=fs.readFileSync('platform/payment-provider-registry.json','utf8');
 const policyBefore=fs.readFileSync('platform/payment-provider-policy.json','utf8');
 const r=reconcile();
 const bitpay=r.paymentProviderReconciliation.records.find(x=>x.key==='ir_primary');
 assert.ok(bitpay);
 assert.equal(bitpay.registryEnabled,false);
 assert.equal(bitpay.policyEnabled,true);
 assert.equal(bitpay.metadataMismatch,true);
 assert.equal(r.paymentProviderReconciliation.registryPolicyDiscrepancies,1);
 assert.equal(r.paymentProviderReconciliation.requiresPrivateBertinaVerification,true);
 assert.ok(r.paymentProviderReconciliation.records.every(x=>!x.liveCredentialsVerified&&!x.realSkuPaymentVerified));
 assert.equal(fs.readFileSync('platform/payment-provider-registry.json','utf8'),registryBefore);
 assert.equal(fs.readFileSync('platform/payment-provider-policy.json','utf8'),policyBefore);
});
