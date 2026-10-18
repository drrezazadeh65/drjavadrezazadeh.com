/* JHELA future target architecture: source-level policy contract only.
 * All tests intentionally distinguish target designs from deployed systems.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const target=JSON.parse(read('platform/jhela-target-architecture-v1.json'));
const live=JSON.parse(read('platform/jhela-ojs-activation.json'));
const editorial=JSON.parse(read('platform/jhela-ojs-editorial-workflow-v1.json'));

test('hosting increase remains unverified transitional capacity, not architectural cap',()=>{
 assert.equal(target.schema,'jhela-target-architecture-v1');
 assert.equal(target.status,'OWNER_DIRECTED_FUTURE_TARGET_NOT_DEPLOYED');
 assert.equal(target.plannedUpgrade.date,'2026-10-17');
 assert.equal(target.plannedUpgrade.diskAdditionalGB,5);
 assert.equal(target.plannedUpgrade.confirmedInstalled,false);
 assert.equal(target.plannedUpgrade.architecturalCap,false);
 assert.equal(target.scaleStages.length,4);
 assert.deepEqual(target.scaleStages.map(s=>s.id),['T0_TRANSITION','T1_DEDICATED','T2_HIGH_AVAILABILITY','T3_PUBLISHING_NETWORK']);
 assert.ok(target.scaleStages.every(s=>s.gate.length>30&&s.state!=='OPERATIVE'));
});

test('first-party editorial module remains the canonical scholarly record',()=>{
 assert.equal(target.platformStrategy.singleCanonicalEditorialDatabase,true);
 assert.equal(target.platformStrategy.avoidParallelPeerReviewApp,true);
 assert.equal(target.platformStrategy.noParallelIdentityOrCommerceLedger,true);
 assert.equal(target.platformStrategy.onlyAuditedFirstPartyAPIIntegrations,true);
 assert.equal(target.objectStorageCompatibility.directS3PrivateUploadsSupported,'NOT_ASSUMED');
 assert.match(target.objectStorageCompatibility.privateUploadStorage,/POSIX/);
 assert.match(target.platformStrategy.editorialCore,/JHELA_FIRST_PARTY/);
 assert.equal(target.identity.journalRolesIsolatedFromCommerce,true);
 assert.equal(target.identity.siteIdentityReuse,true);
 assert.equal(editorial.separation.sharedCustomerPasswordHashes,false);
});

test('private scholarly, finance and audit domains are separately protected',()=>{
 const zones=target.logicalZones;
 assert.equal(zones.length,9);
 assert.equal(new Set(zones.map(x=>x.id)).size,9);
 for(const id of ['edge','web','database','manuscripts','jobs','publishing','finance','audit','backup']){
   assert.ok(zones.some(x=>x.id===id),'missing isolated zone '+id);
 }
 const privateFiles=zones.find(x=>x.id==='manuscripts');
 assert.match(privateFiles.technologies,/outside every web root/);
 assert.ok(privateFiles.never.some(x=>x.includes('private files')));
 assert.ok(zones.find(x=>x.id==='finance').never.some(x=>x.includes('reviewer reports')));
 assert.ok(zones.find(x=>x.id==='audit').never.some(x=>x.includes('manuscript bodies')));
 assert.equal(target.integrationBoundary.noLivePersonalDataInPublicWebsite,true);
 assert.equal(target.identity.reviewerAccess,'assigned_accepted_blinded_manuscripts_only');
});

test('disaster recovery, migration and future uptime are unverified proposals only',()=>{
 assert.equal(target.reliabilityTargets.notGuarantees,true);
 assert.equal(target.reliabilityTargets.prelaunch,'No public SLO claims');
 assert.equal(target.migrationGates.length,8);
 assert.ok(target.migrationGates.some(x=>x.includes('writes on one origin only')));
 assert.ok(target.migrationGates.some(x=>x.includes('snapshot consistent DB and private files')));
 assert.ok(target.logicalZones.find(x=>x.id==='backup').never.some(x=>x.includes('only backup')));
 assert.equal(target.evidencePolicy.nativeEditorialE2eVerified,false);
 assert.equal(target.evidencePolicy.currentPreliminaryIntakeVerified,false);
 assert.equal(target.evidencePolicy.currentFinancialTransactionsActive,false);
 assert.equal(live.ojsInstalled,false);
 assert.equal(live.publicSubmissionsEnabled,false);
 assert.equal(live.realReviewEndToEndConfirmed,false);
});

test('ADR records historical topology and independent cutover',()=>{
 const adr=read('docs/journal/JHELA_FUTURE_SCALE_ARCHITECTURE_ADR_20261016.md');
 for(const phrase of ['JHELA-ADR-001','T0: Transition','T1: Dedicated academic production','T2: High availability','T3: Scholarly publishing network','files_dir','POSIX','Crossref','one-hour recovery point','no automatic change']){
  assert.ok(adr.toLowerCase().includes(phrase.toLowerCase()),'ADR must explain '+phrase);
 }
 assert.ok(adr.includes('2026-10-17')===false || adr.includes('17 October 2026'));
 assert.ok(!adr.includes('already certified for publication'));
});


test('four future target tiers are displayed inside existing bilingual MFA-scoped JHELA dashboard',()=>{
 for(const file of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(file),root=html.indexOf('<div id="ops-workspace" hidden>'),start=html.indexOf('id="ops-jhela-architecture"');
  assert.ok(root>0&&start>root,'JHELA target architecture must live within protected administrative workspace');
  const part=html.slice(start,html.indexOf('</ol>',start));
  assert.equal((part.match(/data-jhela-target-tier=/g)||[]).length,4);
  for(const tier of target.scaleStages)assert.ok(part.includes('data-jhela-target-tier="'+tier.id+'"'));
  assert.ok(part.includes('not commissioned')||part.includes('راه‌اندازی نشده'));
  assert.ok(html.includes('JHELA_FUTURE_SCALE_ARCHITECTURE_ADR_20261016.md'));
 }
 const css=read('assets/css/operations-jhela-workstream.css');
 assert.ok(css.includes('.ops-jhela-architecture'));
 assert.ok(css.includes('@media(max-width:700px)'));
});
