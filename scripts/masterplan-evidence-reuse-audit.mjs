#!/usr/bin/env node
/** Reuse the last 20+ hours of existing source; NEVER certify production. */
import fs from 'node:fs';
import path from 'node:path';
const GATES={
 governance_source:['AGENTS.md','docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md'],
 approved_visual_identity:['foundation/DESIGN-SYSTEM.md','docs/governance/SUPER_MASTER_ALL_SERVICES_VISUAL_IDENTITY_100_PERCENT_20261016.md'],
 homepage:['fa/index.html','en/index.html'],
 original_media_licensed:['identity/brand-governance.md','scripts/media-library-audit.mjs'],
 academic_content_integrity:['scripts/jhela-article-metadata-audit.mjs','scripts/jhela-evidence-ledger-audit.mjs'],
 service_internal_links_40:['scripts/internal-link-graph-audit.mjs','tests/bertina-live-service-route-contract.test.mjs'],
 service_price_benchmark:['assets/data/service-catalog.json','docs/governance/SUPER_MASTER_ALL_SERVICES_VISUAL_IDENTITY_100_PERCENT_20261016.md'],
 service_checkout_claims:['tests/paid-service-gateway-contract.test.mjs','tests/service-bilingual-commerce-contract.test.mjs'],
 service_user_dashboard:['tests/service-delivery-evidence-contract.test.mjs','tests/customer-dashboard-browser.spec.js'],
 service_owner_dashboard:['tests/operations-browser.spec.js','tests/operations-mysql.php'],
 service_file_custody:['tests/service-private-files-contract.test.mjs','scripts/service-private-custody-preflight.php'],
 service_receipt_custody:['tests/service-buyer-receipt-contract.test.mjs','tests/bertina-receipt-contract.php'],
 donation_regression:['tests/bertina-donations-mysql-contract.php','tests/donation-payment-browser.spec.js'],
 auth_email_oauth:['scripts/auth-live-readiness-audit.mjs','tests/operations-security.php'],
 client_account_dashboard:['scripts/customer-dashboard-audit.mjs','tests/customer-dashboard-browser.spec.js'],
 owner_operations_dashboard:['scripts/operations-registry-audit.mjs','tests/operations-browser.spec.js'],
 golden_talent:['platform/golden-talent-book-crosswalk.test.mjs','platform/ecosystem-journey-orchestrator.test.mjs'],
 rcas:['platform/rcas-evidence-bridge.test.mjs','tests/rcas-english-browser.spec.js'],
 bahar:['platform/bahar-engine.test.mjs','tests/bahar-readiness-browser.spec.js'],
 golden_path:['platform/ecosystem-journey-orchestrator.test.mjs','docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md'],
 assessment_psychometrics:['platform/module-governance.test.mjs','tests/golden-talent-guardian.php'],
 consultation_booking:['tests/consultation-preference-mysql.php','tests/service-request-summary.spec.js'],
 bookstore_and_receipts:['scripts/bookstore-release-audit.mjs','tests/bookstore-checkout-browser.spec.js'],
 scientific_journal_ojs:['scripts/jhela-ojs-source-audit.mjs','tests/journal-ojs-preflight.php'],
 books_publications:['scripts/bookstore-release-audit.mjs','scripts/jhela-article-metadata-audit.mjs'],
 operational_ai_assistant:['docs/governance/OWNER_WEBSITE_IMPLEMENTATION_LEDGER_20261016.md'],
 bilingual_architecture:['tests/bertina-live-service-route-contract.test.mjs','scripts/seo-regression.mjs'],
 seo_eeat_geo:['scripts/seo-regression.mjs','scripts/schema-entity-inventory.mjs'],
 mobile_pwa:['scripts/pwa-private-cache-audit.mjs','scripts/responsive-resilience-audit.mjs'],
 accessibility:['scripts/accessibility-source-audit.mjs','tests/public-browser-qa.spec.js'],
 performance_core_web_vitals:['scripts/performance-source-audit.mjs','scripts/production-health-audit.mjs'],
 privacy_security:['scripts/public-secret-audit.mjs','scripts/private-route-http-audit.mjs'],
 notification_email:['tests/bertina-smtp-body-contract.php','api/internal/jr-publishing-mailer.php'],
 analytics_observability:['scripts/analytics-contract-audit.mjs','scripts/operations-release-evidence.mjs'],
 database_migrations:['tests/operations-mysql.php','tests/jr-publishing-mysql-fixture.php'],
 hosting_staging_parity:['tests/bertina-release-assembly.py','scripts/bertina-postrelease-check.mjs'],
 e2e_payment_service_journey:['tests/bertina-commerce-mysql-contract.php','tests/paid-service-gateway-contract.test.mjs'],
 load_recovery_backups:['tests/bertina-hosting-managed-release.php','tests/bertina-private-recovery-gate.php'],
 independent_academic_peer_review:['docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md'],
 independent_design_ux_review:['docs/governance/SUPER_MASTER_ALL_SERVICES_VISUAL_IDENTITY_100_PERCENT_20261016.md'],
 production_release_preflight:['scripts/masterplan-100-release-gate.mjs','scripts/bertina-postrelease-check.mjs']
};
const MANUAL=new Set(['original_media_licensed','academic_content_integrity','service_price_benchmark',
'assessment_psychometrics','scientific_journal_ojs','books_publications','operational_ai_assistant',
'load_recovery_backups','independent_academic_peer_review','independent_design_ux_review','production_release_preflight']);
const LIVE=new Set(['service_checkout_claims','service_user_dashboard','service_owner_dashboard','service_file_custody',
'service_receipt_custody','donation_regression','consultation_booking','bookstore_and_receipts',
'notification_email','database_migrations','hosting_staging_parity','e2e_payment_service_journey',
'bilingual_architecture','mobile_pwa','accessibility','performance_core_web_vitals','privacy_security']);
export function reconcile(root=process.cwd(),ctx={}){
 const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const acceptance=load('docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json');
 const catalog=load('assets/data/service-catalog.json');
 const listed=acceptance.verifiedGates.map(x=>x.id);
 if(listed.length!==41||Object.keys(GATES).length!==41||new Set(listed).size!==41||
   listed.some(x=>!Object.hasOwn(GATES,x)))throw Error('Masterplan identifiers do not match required 41 categories');
 const gates=acceptance.verifiedGates.map(row=>{
   const refs=GATES[row.id],present=refs.filter(p=>fs.existsSync(path.join(root,p)));
   return {id:row.id,formalStatus:row.status,existingSourcePointers:present,
     absentSourcePointers:refs.filter(p=>!present.includes(p)),
     sourcePointersAreAcceptanceEvidence:false,
     independentReviewRequired:MANUAL.has(row.id),liveProofRequired:LIVE.has(row.id)};
 });
 const services=catalog.services.filter(s=>s.sellable===true);
 if(services.length!==21||acceptance.verifiedServices.length!==21||
   services.some(s=>!acceptance.verifiedServices.some(row=>row.id===s.id)))
   throw Error('Service catalogue and the 21 approval cases disagree');
 const serviceRows=services.map(s=>{
   const paths=['fa','en'].map(lang=>lang+'/services/'+s.id+'/index.html');
   return {id:s.id,formalStatus:acceptance.verifiedServices.find(row=>row.id===s.id).status,
     existingBilingualPages:paths.filter(p=>fs.existsSync(path.join(root,p))),
     missingBilingualPages:paths.filter(p=>!fs.existsSync(path.join(root,p))),
     thisAuditVerifiedPaymentOrFulfilment:false};
 });
 const verified=rows=>rows.filter(x=>x.status==='VERIFIED').length;
 return {schema:'masterplan-source-evidence-reuse-v1',generatedAt:new Date().toISOString(),
  githubSha:/^[a-f0-9]{40}$/.test(ctx.sha||'')?ctx.sha:null,
  githubRunId:/^\d+$/.test(ctx.runId||'')?ctx.runId:null,
  releaseState:acceptance.releaseState,ownerFinalAuthorization:acceptance.ownerFinalAuthorization,
  gates:{count:41,formallyVerified:verified(acceptance.verifiedGates),records:gates},
  services:{count:21,formallyVerified:verified(acceptance.verifiedServices),
    bilingualSourcePagesExisting:serviceRows.reduce((n,s)=>n+s.existingBilingualPages.length,0),records:serviceRows},
  officiallyAcceptedDestinations:acceptance.verifiedInternalDestinations.length,
  existingIndependentSnapshots:[
   {name:'source contract and browser candidate',url:'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39031565681',note:'Older SHA, not production'},
   {name:'bilingual HTTP 404 and missing hreflang',url:'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39030826424',note:'Earlier live SHA'},
   {name:'latest failed manual deploy before server transfer',url:'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39033867925',note:'Blocked by acceptance gate'}],
  conclusion:'Read-only source inventory. No previous tests repeated, no 41/21 acceptance status advanced, no author copyright consent, real payment, account login, email, backup recovery, academic review or live deploy certified.'
 };
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const report=reconcile(process.cwd(),{sha:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID});
 const at=process.argv.indexOf('--output'),body=JSON.stringify(report,null,2)+'\n';
 if(at>=0){
   const out=process.argv[at+1];
   if(!out||out.startsWith('/')||out.includes('..'))throw Error('Require safe relative report path');
   fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,body,{mode:0o600});
 }else process.stdout.write(body);
 console.log('41 gates and 21 services reconciled to existing source. No release approvals altered.');
}
