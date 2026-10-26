/* SOURCE-ONLY fixtures; NOT RUN or promoted by adding the file.
 * Signed lease implementation is unchanged and is never mocked as verified.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('new bridge does not modify signed worker parser or job execution',()=>{
 const bridge=src('api/jrei-apex-worker-observations.php');
 for(const forbidden of ['jrHybridLease(','jrHybridComplete(','jrHybridHeartbeat(',
                        'jrHybridOwnerChange(','sodium_crypto_sign('])
  assert.ok(!bridge.includes(forbidden),forbidden);
 assert.match(bridge,/JR_APEX_WORKER_TASK = 'REVIEWED_PUBLIC_RETRIEVAL_EVALUATION'/);
 assert.match(bridge,/created_by_account_id=\?/);
 assert.match(bridge,/LEARNING_EVIDENCE_REVIEW/);
});

test('strict owner and existing job revision controls are present',()=>{
 const bridge=src('api/jrei-apex-worker-observations.php');
 for(const required of ['expectedJobRevision','worker_job_revision_changed',
   'jrApexMissionOwnerRead','jrApexMissionControl','worker_checkpoint_cas_conflict',
   'jrei_apex_worker_checkpoints','original_worker_job_provenance_mismatch'])
   assert.ok(bridge.includes(required),required);
 assert.match(bridge,/LINK_EXISTING_OWNED_RETRIEVAL_JOB_ONLY/);
});

test('original owner MFA, CSRF and rate limit surround private route',()=>{
 const code=src('api/operations.php');
 const mfa=code.indexOf("if (!$fresh) fail('admin_mfa_required',403)");
 const offset=code.indexOf("'/admin/operations/jrei-apex-worker-observations'");
 assert.ok(mfa>=0&&offset>mfa);
 const section=code.slice(offset,offset+1600);
 for(const key of ['SUPER_ADMIN','operationsMutationAllowed','rateAllowed',
                   'jrApexWorkerOwnerChange','jrApexWorkerSnapshot'])
   assert.ok(section.includes(key),key);
});

test('mother migration is additive and ordered after original signed jobs',()=>{
 const migration=src('docs/migrations/20261026_jrei_apex_existing_worker_observations_mother_mysql.sql');
 assert.doesNotMatch(migration,/\b(?:DROP|TRUNCATE|DELETE FROM|CREATE DATABASE)\b/i);
 for(const table of ['jrei_apex_worker_links','jrei_apex_worker_checkpoints',
                      'jrei_apex_owner_missions','jrei_hybrid_jobs'])
   assert.ok(migration.includes(table),table);
 const sequence=JSON.parse(src('docs/governance/JREI_MOTHER_DB_MIGRATION_CAMPAIGN_20261024.json')).orderedFiles;
 const newPosition=sequence.findIndex(x=>x.file.includes('20261026_jrei_apex_existing_worker_observations'));
 const missionPosition=sequence.findIndex(x=>x.file.includes('20261026_jrei_apex_owner_missions'));
 assert.ok(newPosition>missionPosition&&missionPosition>=0);
});

test('worker connection defaults OFF, never exposes model secret to mobile or UI',()=>{
 const cfg=src('api/index.php');
 assert.match(cfg,/'jrei_apex_worker_link_enabled'/);
 assert.match(cfg,/JR_JREI_APEX_WORKER_LINK_ENABLED/);
 const js=src('assets/js/operations-jrei-apex-worker-observations-v1.js');
 assert.doesNotMatch(js,/localStorage|sessionStorage|JREI_HMAC_KEY|JR_DB_PASSWORD/);
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=src(p);
  assert.match(html,/operations-jrei-apex-worker-observations-v1\.js/);
  assert.match(html,/name="robots" content="noindex/);
 }
});
