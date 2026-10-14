/**
 * DrJavad Ecosystem 5.0: source integrity across the nine approved workstreams.
 * Safe to run without passwords/network. Never treats CI/source as live acceptance.
 * Usage: node scripts/v5-ecosystem-integrity-audit.mjs [private-output-path]
 */
import assert from 'node:assert/strict';
// Author-manuscript crosswalk remains a mandatory scientific source acceptance gate.
import '../platform/golden-talent-book-crosswalk.test.mjs';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const json=(name)=>JSON.parse(read(name));
const checks=[];
const fail=[];
function verify(name,condition,details=''){
  checks.push({name,pass:!!condition,details});
  if(!condition) fail.push(name+(details?' — '+details:''));
}
function distinct(items){return new Set(items).size===items.length}

const truth=json('docs/governance/SOURCE_OF_TRUTH.json');
const v5=read('docs/governance/V5_ECOSYSTEM_RELEASE_IDENTITY_20261012.md');
const dep=json('docs/governance/STAGE09_PRIVATE_DEPENDENCIES.json');
const registry=json('api/internal/operations-registry.json');
const books=json('assets/data/book-catalog.json');
const services=json('assets/data/service-catalog.json');
const vip=json('assets/data/vip-catalog.json');
const growth=json('platform/organic-growth-stage14.json');
const journal=json('platform/jhela-ojs-activation.json');
const journalMap=read('journal/sitemap.xml');
const index=read('api/index.php');
const stage9=read('api/commerce-stage9.php');
const admin=read('api/operations.php');
const ownerCommerce=read('api/operations-commerce.php');
const commerceClient=read('assets/js/operations-commerce.js');
const ownerFa=read('fa/app/admin/index.html');
const ownerEn=read('en/account/admin/index.html');
const social=read('api/social-queue.php');
const deploy=read('.github/workflows/deploy-bertina.yml');
const migrate=read('.github/workflows/bertina-commerce-schema-migrate.yml');
const commerceRuntime=read('.github/workflows/commerce-live-readiness.yml');
const stagedSql=read('docs/migrations/20261012_stage09_commerce.sql');
const goldenShop=read('fa/shop/golden-talent/index.html');
const goldenDigitalCheckout=read('fa/shop/golden-talent/checkout/index.html');
const goldenProducts=json('platform/golden-talent-products.json');
const goldenBook=json('platform/golden-talent-book-crosswalk.v1.json');
const goldenInstrumentRegistry=json('platform/golden-talent-instrument-registry.v1.json');
const goldenDeep=json('platform/golden-talent-deep-modules.json');

const goldenApi=read('api/golden-talent.php');
const guardianClient=read('assets/js/golden-talent-guardian.js');
const baharGuardianClient=read('assets/js/bahar-guardian-overview.js');
const baharGuardianFixture=read('tests/bahar-guardian-mysql.php');
const guardianFa=read('fa/golden-talent/roles/parent/index.html');
const guardianEn=read('en/golden-talent/roles/parent/index.html');
const guardianTests=read('tests/golden-talent-guardian.php');

const rcasClient=read('assets/js/rcas-start.js');
const rcasCss=read('assets/css/portal-v2.css');
const rcasPage=read('fa/assessments/golden-talent/start/index.html');
const studentDashboard=read('assets/js/student-dashboard.js');
const studentDashboardPage=read('fa/app/student/index.html');


verify('source: one canonical Bertina branch',truth.repository==='drrezazadeh65/drjavadrezazadeh.com' &&
  truth.canonicalBranch==='migration/bertina-linux6' && truth.developmentSourceCount===1 &&
  truth.allowAdditionalDevelopmentBranches===false && truth.productionHosting.includes('Bertina'));
verify('v5: explicit target and not-yet-published distinction',v5.includes('DrJavad Ecosystem 5.0') &&
  v5.includes('v5.0.0') && v5.includes('DEVELOPMENT') &&
  (v5.includes('NOT PUBLISHED') || v5.includes('**NOT** a published')));
verify('production: release and schema mutation serialized without cancellation',
  [deploy,migrate].every(x=>x.includes('  group: bertina-production-deploy') &&
    x.includes('  cancel-in-progress: false')));
verify('production: FULL hosting-managed release keeps optional historical recovery paths and exact pre-extraction SHA',
  deploy.includes('default: hosting_managed') &&
  deploy.includes('BERTINA_AUTO_DEPLOY_SCOPE: full') &&
  deploy.includes("BACKUP_REQUEST_B64=''") &&
  deploy.indexOf('drjrHostingManagedReleaseCheck(__DIR__')>=0 &&
  deploy.indexOf('drjrHostingManagedReleaseCheck(__DIR__')<deploy.indexOf('->extractTo(__DIR__)') &&
  deploy.indexOf('drjrRecoveryCheck(__DIR__')>=0 &&
  deploy.indexOf('drjrCpanelBackupCheck(__DIR__')>=0 &&
  deploy.indexOf('drjrRecoveryCheck(__DIR__')<deploy.indexOf('->extractTo(__DIR__)') &&
  deploy.indexOf('drjrCpanelBackupCheck(__DIR__')<deploy.indexOf('->extractTo(__DIR__)') &&
  deploy.includes('owner_cpanel_custody') &&
  deploy.includes('test "$GITHUB_ACTOR" = drrezazadeh65') &&
  deploy.includes('test "$APPROVED_COMMIT_SHA_INPUT" = "$GITHUB_SHA"') &&
  deploy.includes('test "$GITHUB_EVENT_NAME" = workflow_dispatch') &&
  deploy.includes('ACCEPT_UNTESTED_RESTORE_RISK_V5') &&
  deploy.indexOf("stage09_schema_preflight_required")>0 &&
  deploy.indexOf("stage09_schema_preflight_required")<deploy.indexOf('->extractTo(__DIR__)'));
verify('production: no unattended database migration',
  migrate.includes('  workflow_dispatch:')&&!/^\s{2}(?:push|schedule|pull_request):/m.test(migrate) &&
  migrate.includes("drjrRecoveryCheck(dirname(__DIR__)") && !migrate.includes('curl -k'));
verify('production: live commerce probe validates public certificate',
  commerceRuntime.includes('curl -fsS --max-time 30 --resolve') &&
  !/curl\s+-[^\n]*k(?:[fsS]|\s)/.test(commerceRuntime));

const ids=registry.engines.map(x=>x.id);
const reportIds=registry.reports.map(x=>x.id);
const actions=registry.actions.map(x=>x.id);
verify('admin: 13 unique operational engines',registry.engines.length===13 && distinct(ids));
verify('admin: 36 unique scoped reports',registry.reports.length===36 && distinct(reportIds));
verify('admin: 52 unique classified actions',registry.actions.length===52 && distinct(actions) &&
  registry.actions.every(x=>ids.includes(x.responsibleEngine)));
verify('admin: MFA data separation',admin.includes('operations_session_mfa') &&
  admin.includes('operations_admin_memberships'));
verify('admin: Stage09 real exception view requires MFA, avoids PII and preserves unknown',
  admin.indexOf("if (!$fresh) fail('admin_mfa_required'") <
    admin.indexOf("'/admin/operations/commerce'") &&
  ownerCommerce.includes('stage9SchemaReady($pdo)') &&
  ownerCommerce.includes("'providerBankSettlementVerified'=>null") &&
  ownerCommerce.includes("'customerDetailsExposed'=>false") &&
  ownerCommerce.includes('paidRowsRequiringIndependentProviderReconciliation') &&
  ownerCommerce.includes('ledgerDiscrepancies') &&
  !ownerCommerce.includes("SELECT * FROM commerce_orders") &&
  ownerFa.includes('id="ops-commerce"') && ownerEn.includes('id="ops-commerce"') &&
  [ownerFa,ownerEn].every(html=>html.includes('/assets/js/operations-commerce.js')) &&
  commerceClient.includes("credentials:'same-origin'") &&
  commerceClient.includes("cache:'no-store'") &&
  !/(?:localStorage|sessionStorage|\.innerHTML\s*=)/.test(commerceClient));
verify('commerce: MFA service-case worklist is bounded, redacted and flags mismatched claims',
  ownerCommerce.includes('FROM commerce_service_cases sc') &&
  ownerCommerce.includes('LIMIT 50') &&
  ownerCommerce.includes("'providerClaimMatchesOrder'") &&
  ownerCommerce.includes("'activeServiceCaseCount'") &&
  ownerCommerce.includes("'queueTruncated'") &&
  !ownerCommerce.includes('SELECT sc.*,o.*') &&
  commerceClient.includes('serviceActionQueue') &&
  commerceClient.includes("const detail=node('details')"));
verify('commerce: owner can triage delayed book parcels without customer PII or false delivery claims',
  ownerCommerce.includes('FROM commerce_parcels p') &&
  ownerCommerce.includes("p.state IN (") &&
  ownerCommerce.includes('LIMIT 50') &&
  ownerCommerce.includes("'parcelActionQueue'") &&
  ownerCommerce.includes("'parcelQueueTruncated'") &&
  ownerCommerce.includes("'preparingOlderThan48Hours'") &&
  ownerCommerce.includes("'inShippingOlderThan7Days'") &&
  ownerCommerce.includes("'providerClaimMatchesOrder'") &&
  !ownerCommerce.includes('p.tracking_code') &&
  !ownerCommerce.includes('o.customer_json') &&
  !ownerCommerce.includes('o.customer_email') &&
  commerceClient.includes('fulfilment.parcelActionQueue') &&
  commerceClient.includes('fulfilment.parcelQueueTruncated') &&
  commerceClient.includes('fulfilment.preparingOlderThan48Hours') &&
  commerceClient.includes('fulfilment.inShippingOlderThan7Days') &&
  !commerceClient.includes('fetch(\'/api/commerce/create\''));
verify('commerce: owner dashboard diagnoses checkout blockers without money movement',
  index.includes("'/commerce/health'") &&
  index.includes("'paymentClaimSchemaReady'") &&
  index.includes("'serviceBookingConfirmed'") &&
  commerceClient.includes("fetch('/api/commerce/health'") &&
  commerceClient.includes("loadReadiness(stamp)") &&
  commerceClient.includes("void loadReadiness(stamp)") &&
  commerceClient.includes('workspace.hidden||!panel.open||document.hidden') &&
  commerceClient.includes('readiness.replaceChildren()') &&
  !commerceClient.includes("fetch('/api/commerce/prepare'") &&
  !commerceClient.includes('bitpay_api_key'));
verify('golden talent: author manuscript grounded scientific inventory remains non-diagnostic',(()=>{
 const core=goldenInstrumentRegistry.instruments.find(x=>x.id==='RCAS-CORE');
 const count={D1:24,D2:24,D3:24,D4:22,D5:28,D6:20};
 const modules=goldenBook.deep_modules.bank_inventory||[];
 const chapters=goldenBook.chapter_anchors||[];
 return goldenBook.authority.working_edition==='one_volume_15_chapters' &&
   goldenBook.authority.scientific_status==='PREVALIDATION' &&
   goldenBook.rcas.C1.core_item_count===28 &&
   goldenBook.rcas.C1.group_count===7 &&
   goldenBook.rcas.C1.unknown_evidence==='UNKNOWN_IS_NOT_ZERO_AND_DISTINCT_FROM_NA' &&
   goldenBook.rcas.C1.not_applicable==='NA_IS_NOT_ZERO' &&
   /^[a-f0-9]{64}$/.test(goldenBook.rcas.C1.book_wording_sha256||'') &&
   chapters.length===15 && chapters.every((c,i)=>c.chapter===i+1) &&
   goldenBook.rcas.source_channels.map(x=>x.code).join(',')==='S,P,R,O,C,T' &&
   goldenBook.rcas.R1.automated_talent_ranking===false &&
   modules.length===6 &&
   modules.every(m=>m.bank_count===count[m.code] &&
     m.instrument_approved===false &&
     /^[a-f0-9]{64}$/.test(m.working_manuscript_bank_sha256||'') &&
     goldenDeep.modules[m.code]?.tasks?.join(',')===m.activities.join(',') &&
     goldenInstrumentRegistry.instruments.find(x=>x.id===m.code)?.book_bank_count===m.bank_count) &&
   modules.reduce((sum,m)=>sum+m.bank_count,0)===142 &&
   goldenBook.activities.length===10 &&
   goldenBook.bahar.study_method.length===4 &&
   goldenBook.bahar.action_cycle.length===7 &&
   goldenBook.bahar.portfolio.length===6 &&
   goldenInstrumentRegistry.book_alignment.crosswalk==='platform/golden-talent-book-crosswalk.v1.json' &&
   core?.version==='start-1.1-browser-preview' &&
   core?.scoring_enabled===false &&
   goldenInstrumentRegistry.scientific_policy.validation_status==='PREVALIDATION' &&
   goldenBook.deep_modules.publishable_question_bank===false &&
   goldenBook.authority.manuscript_inventory.raw_item_text_uploaded_to_repository===false &&
   rcasClient.includes('n===6?"UNKNOWN":n') &&
   rcasClient.includes('["NA","UNKNOWN"].includes(x.value)');
})());
verify('golden talent: capability API is non-diagnostic and only mutates the append-only access audit',
  index.includes("if(str_starts_with($path,'/golden-talent/'))") &&
  index.includes("goldenTalentRoute($path,$verb)") &&
  goldenApi.includes("'/golden-talent/health' && $verb==='GET'") &&
  goldenApi.includes("'privateAssessmentApiActive'=>false") &&
  goldenApi.includes("'profilePersistenceActive'=>false") &&
  goldenApi.includes("'automaticDigitalEntitlement'=>false") &&
  goldenApi.includes("'normativeScoring'=>false") &&
  goldenApi.includes("'serverResponseStorage'=>false") &&
  goldenApi.includes("SELECT 1 FROM '.$table.' LIMIT 0") &&
  goldenApi.includes("INSERT INTO eco_audit_events") &&
  !goldenApi.includes('INSERT INTO eco_talent_') &&
  !goldenApi.includes('UPDATE eco_') &&
  !goldenApi.includes('DELETE FROM eco_'));
verify('golden talent: guardian access is authenticated, consent-bound and audited before response',
  goldenApi.includes("'/golden-talent/my-subjects' && $verb==='GET'") &&
  goldenApi.includes('sessionAccount($pdo)') &&
  goldenApi.includes("!validUuid($accountId)") &&
  goldenApi.includes("r.relationship_code='GUARDIAN' AND r.verification_status='VERIFIED'") &&
  goldenApi.includes("s.guardian_account_id=?") &&
  goldenApi.includes("s.status='ACTIVE'") &&
  goldenApi.includes("n.purpose_code='ASSESSMENT'") &&
  goldenApi.includes("goldenTalentAssessmentConsentCurrent") &&
  goldenApi.includes("rateAllowed($pdo,'gt_my_subjects'") &&
  goldenApi.includes("if(!$pdo->beginTransaction())") &&
  goldenApi.includes("INSERT INTO eco_audit_events") &&
  goldenApi.includes("if(!$pdo->commit())") &&
  goldenApi.includes("'availableActions'=>[]") &&
  guardianClient.includes("fetch('/api/golden-talent/my-subjects'") &&
  guardianClient.includes("document.addEventListener('visibilitychange'") &&
  !guardianClient.includes('innerHTML') &&
  guardianFa.includes('data-gt-guardian="fa"') &&
  guardianEn.includes('data-gt-guardian="en"') &&
  guardianTests.includes('goldenTalentAssessmentConsentCurrent'));
verify('bahar: guardian overview requires independent consent, audit and private UI',
  goldenApi.includes("'/golden-talent/my-bahar-overview' && $verb==='GET'") &&
  goldenApi.includes("n.purpose_code='PARENT_VISIBILITY'") &&
  goldenApi.includes("goldenTalentPurposeConsentCurrent") &&
  goldenApi.includes("goldenTalentAuditGuardianBaharOverview($pdo,$accountId,count($items))") &&
  goldenApi.includes("'rawEvidenceExposed'=>false") &&
  goldenApi.includes("'interpretationsExposed'=>false") &&
  goldenApi.includes("'longitudinalTrendValidated'=>false") &&
  baharGuardianClient.includes("fetch('/api/golden-talent/my-bahar-overview'") &&
  baharGuardianClient.includes("cache:'no-store'") &&
  baharGuardianClient.includes("document.addEventListener('visibilitychange'") &&
  !baharGuardianClient.includes('innerHTML') &&
  !baharGuardianClient.includes('localStorage') &&
  guardianFa.includes('data-bahar-guardian') &&
  guardianEn.includes('data-bahar-guardian') &&
  baharGuardianFixture.includes('operations_fixture'));
verify('rcas: 3-stage evidence gates, Core 28, privacy and accessible choices',
  rcasClient.includes('CORE_ITEM_IDS.length!==28') &&
  rcasClient.includes('if(activeStep!==1||!p0Complete())return;') &&
  rcasClient.includes('if(activeStep!==2||!p0Complete()||!coreComplete())return;') &&
  rcasClient.includes('if(activeStep!==3||!p0Complete()||!coreComplete()||!routingComplete())return;') &&
  rcasClient.includes('invalidateSummary();') &&
  rcasClient.includes('sessionStorage.removeItem("gt_rcas_state")') &&
  rcasClient.includes('rcasRevision:"start-1.2"') &&
  rcasClient.includes('p0Validated:true,routingEvidenceCompleted:true,meaningfulCoreEvidence:true') &&
  rcasClient.includes('routeBasis:"SELF_SELECTED_UNVALIDATED"') &&
  rcasClient.includes('completedItemCount:28') &&
  rcasClient.includes('explanation.textContent=why') &&
  !rcasClient.includes('why.replace(') &&
  !rcasClient.includes('/api/rcas/submit') &&
  rcasPage.includes('id="rcasCoreStatus"') &&
  rcasPage.includes('id="rcasP0Status"') &&
  rcasPage.includes('id="rcasRouteStatus"') &&
  rcasPage.includes('rcas-start.js?v=20261014-evidence-gates-v4') &&
  rcasPage.includes('portal-v2.css?v=20261014-rcas-readable-v1') &&
  rcasCss.includes('RCAS readable response controls v20261014') &&
  rcasCss.includes('font-size:clamp(16px,1.05vw,18px)') &&
  rcasCss.includes('input:focus-visible + span') &&
  studentDashboard.includes('s.rcasRevision!=="start-1.2"') &&
  studentDashboard.includes('s.p0Validated!==true') &&
  studentDashboard.includes('s.routingEvidenceCompleted!==true') &&
  studentDashboard.includes('s.meaningfulCoreEvidence!==true') &&
  studentDashboardPage.includes('student-dashboard.js?v=20261014-rcas-evidence-v3'));
verify('golden talent: professional services reuse the live commerce engine, not digital entitlements',(()=>{
 const required=['talent_initial','golden_talent_comprehensive','golden_talent_premium'];
 return required.every(id=>
   services.services.some(x=>x.id===id&&x.sellable===true&&Number.isSafeInteger(x.price)&&x.price>0) &&
   goldenShop.includes('/fa/services/checkout/?service='+id) &&
   goldenShop.includes('/fa/services/'+id+'/')
 ) &&
 vip.services.some(x=>x.id==='golden-talent-signature'&&x.sellable===true&&x.checkout_enabled===true) &&
 goldenShop.includes('/fa/vip/?vip=golden-talent-signature#vip-checkout-heading') &&
 goldenShop.includes('/fa/assessments/golden-talent/start/') &&
 goldenShop.includes('ماژول‌های دیجیتال Golden Talent (هنوز قابل خرید نیستند)') &&
 goldenDigitalCheckout.includes('خرید خودکار ماژول دیجیتال هنوز ارائه نمی‌شود') &&
 goldenDigitalCheckout.includes('href="/fa/shop/golden-talent/#professional-services"') &&
 goldenProducts.pricing_status==='not_published' &&
 goldenProducts.premium.every(x=>x.price===null) &&
 !goldenShop.includes('هیچ درگاه زنده‌ای در این پیش‌نمایش فعال نیست') &&
 !goldenShop.includes('href="/api/commerce/create"');
})());
verify('commerce: canonical 3/21/6 saleable catalogues',
  books.books.length===3 && services.services.length===21 && vip.services.length===6 &&
  distinct(books.books.map(x=>x.id)) && distinct(services.services.map(x=>x.id)) &&
  distinct(vip.services.map(x=>x.id)));
verify('commerce: payment callback uses atomic provider-claim finalizer',
  index.includes('stage9FinalizePayment($pdo,') && stage9.includes('INSERT INTO commerce_payment_claims') &&
  stage9.includes("WHERE id=? AND state='pending'"));
verify('commerce: verified paid books create one preparation-only parcel in atomic callback',
  stage9.includes('stage9CommitBooks($pdo,$orderId,$items);') &&
  stage9.includes("INSERT INTO commerce_parcels(order_id,state) VALUES(?,'preparing')") &&
  stage9.indexOf("INSERT INTO commerce_parcels(order_id,state)") <
    stage9.indexOf("UPDATE commerce_orders SET state='paid'") &&
  !stage9.includes("INSERT INTO commerce_parcels(order_id,state) VALUES(?,'delivered')"));
verify('commerce: independent reservation ledger parity is required',
  stage9.includes("r.state='reserved'") && stage9.includes('AS held_units') &&
  stage9.includes("(int)$row['reserved'] !== (int)$row['held_units']"));
const stage9Tables=['commerce_book_stock','commerce_book_reservations','commerce_stock_movements',
  'commerce_payment_claims','commerce_outbox','commerce_service_cases',
  'commerce_parcels','commerce_refund_requests'];
verify('commerce: eight additive InnoDB tables exist in migration SOURCE',
  stage9Tables.every(t=>stagedSql.includes('CREATE TABLE IF NOT EXISTS '+t)) &&
  (stagedSql.match(/ENGINE=InnoDB/g)||[]).length===8);
verify('commerce: no automatic stock reseed or past-payment fabrication',
  !/^\s*(INSERT|UPDATE|DELETE|REPLACE|TRUNCATE)\s/i.test(stagedSql) &&
  !/^\s*(INSERT|UPDATE|DELETE|REPLACE|TRUNCATE)\s/mi.test(stagedSql));
verify('commerce: private financial facts remain explicitly unknown',
  ['bertina_full_backup_isolated_restore','three_book_remaining_stock',
    'bitpay_bank_settlement_reconciliation'].every(k=>dep.facts?.[k]?.status==='unknown') &&
  dep.production?.monetaryReleaseAuthorized===false &&
  dep.production?.schemaMigrationAuthorized===false);
verify('journal: isolated bilingual sitemap includes only real public URLs',(()=>{
  const locs=[...journalMap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
  return locs.length===24 && distinct(locs) &&
    locs.every(x=>x.startsWith('https://drjavadrezazadeh.com/journal/')) &&
    !locs.some(x=>/\/(?:submission|login|register|account|payment)\//.test(x));
})());
verify('journal: no false live OJS / submission / publishing claims',
  journal.ojsInstalled===false && journal.publicSubmissionsEnabled===false &&
  journal.realReviewEndToEndConfirmed===false && journal.doiAssigned===false &&
  journal.issnAssigned===false && journal.originState==='RESERVED_NOT_LIVE');
verify('social: private worker authorization remains required',
  social.includes('No HTTP route to claim or deliver is published') &&
  social.includes("status='dispatching'") &&
  social.includes("approval_digest"));
verify('social: unsupported official providers retain approved drafts',
  social.includes("d.provider IN ('telegram','eitaa')") &&
  social.includes("in_array($row['provider'],['telegram','eitaa'],true)") &&
  !social.includes("!in_array($row['provider'],['instagram','youtube','aparat','whatsapp'],true)"));
verify('growth: 30 source opportunities, 13 article bridges, 5 free tools',
  growth.opportunities.length===30 && growth.article_bridges.length===13 &&
  growth.free_tools.length===5 && growth.release_status==='SOURCE_ONLY_UNVERIFIED');

const workstreams=[
 ['01','Recoverability and safe promotion','private_signed_restore_and_source_live_sha','blocked_external'],
 ['02','Commerce and reconciled revenue','verified_stock_and_bank_settlement','blocked_external'],
 ['03','MFA-governed owner control and 13 engines','live_authorized_executor_receipts','partial_source'],
 ['04','Private customer cases and service fulfilment','live_account_and_delivery_acceptance','partial_source'],
 ['05','Scientific SEO and bilingual authority','indexation_coverage_editorial_evidence','partial_live'],
 ['06','Golden Talent and safeguarding','guardian_consent_case_validation','partial_source'],
 ['07','JHELA bilingual publishing and peer review','ojs_real_manuscript_review','blocked_external'],
 ['08','Official social distribution and organic growth','provider_receipts_and_consent_leads','partial_source'],
 ['09','Full release acceptance and mobile QA','matching_live_sha_36_accepted_sections','blocked_external']
].map(([id,name,requiredEvidence,readiness])=>({id,name,requiredEvidence,readiness,certifiedComplete:false}));

const result={
  schema:'drjavad-ecosystem-v5-source-integrity-v1',
  versionTarget:'v5.0.0',
  currentLifecycle:'DEVELOPMENT_NOT_PUBLISHED',
  sourceBranch:'migration/bertina-linux6',
  proofScope:'SOURCE CONTRACTS ONLY; NO PRIVATE RESTORE, MONEY, OWNER MFA OR LIVE DEPLOY ACCEPTANCE',
  sourceChecksPassed:fail.length===0,
  requiredGates:9,
  sourceChecks:checks,
  workstreams
};
if(process.argv[2]){
  const output=path.resolve(process.argv[2]);
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{mode:0o600});
}
for(const c of checks) console.log((c.pass?'PASS ':'FAIL ')+c.name+(c.details?' — '+c.details:''));
console.log('DrJavad Ecosystem 5.0: '+checks.filter(x=>x.pass).length+'/'+checks.length+
  ' source integrity gates; '+workstreams.length+' live acceptance workstreams OPEN.');
console.log('No live release, financial settlement, inventory reconciliation, MFA or DOI/indexation is certified by this audit.');
if(fail.length){console.error('Regression(s): '+fail.join('; '));process.exit(1);}
