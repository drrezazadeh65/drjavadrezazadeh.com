import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../../..');
const read=rel=>readFileSync(resolve(root,rel),'utf8');

test('Owner activation is only in the original MFA/CSRF operations route',()=>{
 const auth=read('api/operations.php');
 const cron=read('api/operations-cron-dispatcher.php');
 const front=read('assets/js/jrei-news-owner-panel-v1.mjs');
 assert.match(auth,/require_once __DIR__.'\/operations-cron-dispatcher.php'/);
 assert.match(auth,/SUPER_ADMIN/);
 assert.match(auth,/operationsMutationAllowed/);
 assert.match(cron,/activate_news_pipeline/);
 assert.match(cron,/ACTIVATE_ORIGINAL_VERIFIED_NEWS_PIPELINE/);
 assert.match(front,/originalCronRequest\('POST'/);
 assert.match(front,/action:'activate_news_pipeline'/);
 assert.match(front,/window\.confirm\(authorization\)/);
 assert.match(cron,/sourcePolicyAndStandingAuthorityChecked/);
 assert.match(cron,/publicationExecutedByActivation'\]=false/);
 assert.doesNotMatch(front,/\b(?:window\.)?localStorage\s*[.\[]|\binnerHTML\s*=/);
});
test('Original publisher remains source and receipt gated; no alternate CMS',()=>{
 const worker=read('api/internal/jrei-news-private-publisher-worker.php');
 const cron=read('api/operations-cron-dispatcher.php');
 const required=[
 'operations_cron_master_enabled','jrei_news_integrated_release_accepted',
 'jrei_news_feed_discovery_enabled','jrei_news_article_intake_enabled',
 'jrei_news_independent_evidence_enabled','jrei_news_source_activation_accepted',
 'jrei_ka_schedule_enabled','jrei_ka_autofetch_enabled',
 'jrei_news_model_drafting_enabled','jrei_live_ai_enabled',
 'jrei_news_original_cms_writer_enabled',
 'jrei_news_standing_official_publishing_enabled',
 'jrei_news_verified_restore_accepted','jrei_news_publisher_receipts_accepted',
 'jrei_news_search_enabled',
 ];
 for(const name of required) assert.ok(cron.includes("'"+name+"'"),name);
 assert.match(cron,/jrOperationsNewsReadiness\(\$pdo,\$config\)/);
 assert.match(cron,/standingOfficialPolicySchemaAvailable/);
 assert.match(cron,/news_pipeline_owner_authority_digest_invalid/);
 assert.match(cron,/UPDATE operations_cron_jobs SET enabled=1/);
 assert.match(cron,/WHERE job_id=\? AND row_revision=\? AND enabled=0/);
 assert.match(cron,/if\(\$pdo->inTransaction\(\)\)\$pdo->rollBack\(\)/);
 assert.match(worker,/jrNewsOriginalPrivateCmsPublishBatch/);
 assert.doesNotMatch(cron,/UPDATE jrei_news_publications SET publisher_state='PUBLISHED'/);
});
test('Core original newspaper agents are in one exact allowlist and independent QA is visible',()=>{
 const cron=read('api/operations-cron-dispatcher.php');
 const ui=read('assets/js/jrei-news-owner-panel-v1.mjs');
 for(const name of [
  'jrei_ka_schedule','jrei_ka_private_acquisition',
  'jrei_news_original_feed_projection',
  'jrei_news_independent_primary_evidence',
  'jrei_news_original_article_intake',
  'jrei_news_original_private_draft',
  'jrei_news_original_private_publisher',
  'jrei_news_original_public_index'
 ]) assert.ok(cron.includes("'"+name+"'"), name);
 assert.match(cron,/str_starts_with\(\$id,'jrei_news_'\)/);
 assert.match(ui,/job\.jobId\.startsWith\('jrei_news_'\)/);
 assert.match(ui,/newsPipelineScheduledWorkers!==8/);
});
test('Publishing worker recovers authentic, pending search archive from earlier runs',()=>{
 const publisher=read('api/internal/jrei-news-private-publisher-worker.php');
 const indexer=read('platform/news-intelligence/php/original-public-index-runner.php');
 const pos=publisher.indexOf('jrNewsOriginalIndexVerifiedPublishedPages(');
 const after=publisher.slice(pos-600,pos+900);
 assert.ok(pos>0);
 assert.match(after,/EVERY authorized tick/);
 assert.doesNotMatch(after,/if\s*\(\s*\(int\)\(\$result\['published'\]/);
 assert.match(after,/invalidOriginalCmsProofs/);
 assert.match(indexer,/publisher_state='PUBLISHED'/);
 assert.match(indexer,/publisher_receipt_reference LIKE 'jrei-original-bilingual:%'/);
 assert.match(indexer,/hash_file\('sha256'/);
});
