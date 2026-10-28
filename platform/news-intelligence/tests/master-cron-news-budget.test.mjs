import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dispatcher = readFileSync(
  new URL('../../../api/internal/operations-master-dispatcher.php', import.meta.url),
  'utf8'
);
const publisher = readFileSync(
  new URL('../../../api/internal/jrei-news-private-publisher-worker.php', import.meta.url),
  'utf8'
);

test('private original newsroom has bounded model/CMS worker execution slots', () => {
  assert.match(dispatcher, /'jrei_news_original_private_draft'=>75/);
  assert.match(dispatcher, /'jrei_news_original_private_publisher'=>45/);
  assert.match(dispatcher, /'jrei_news_independent_primary_evidence'=>35/);
  assert.match(dispatcher, /'jrei_news_original_article_intake'=>35/);
  assert.match(dispatcher, /'jrei_news_original_feed_projection'=>30/);
  assert.match(dispatcher, /'jrei_news_original_public_index'=>30/);
  assert.match(dispatcher, /default=>12/);
  assert.match(dispatcher, /max\(1,min\(90,\$limitSeconds\)\)/);
  assert.match(dispatcher, /microtime\(true\)-\$started>135/);
  assert.match(dispatcher, /floor\(150-\(microtime\(true\)-\$started\)\)/);
  assert.match(dispatcher, /jrMasterWorkerTimeLimit\(\(string\)\$id\)/);
});

test('longer news budget never substitutes for signed policy and CMS receipts', () => {
  assert.match(dispatcher, /operationsCronMasterEnabled\(\$config\)/);
  assert.match(dispatcher, /GET_LOCK/);
  assert.match(dispatcher, /jrMasterClaim/);
  assert.match(dispatcher, /jrMasterFinish/);
  for (const guard of [
    'jrei_news_integrated_release_accepted',
    'jrei_news_original_cms_writer_enabled',
    'jrei_news_standing_official_publishing_enabled',
    'jrei_news_verified_restore_accepted',
    'jrei_news_publisher_receipts_accepted',
  ]) {
    assert.ok(publisher.includes(guard), guard);
  }
});
