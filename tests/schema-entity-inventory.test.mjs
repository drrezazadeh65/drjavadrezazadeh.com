import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectJsonLd,inspectHtml} from '../scripts/schema-entity-inventory.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('parse every JSON-LD block from verified bilingual publications',()=>{
 for(const route of [
   ['en/publications/index.html','/en/publications/'],
   ['fa/entesharat-elmi/index.html','/fa/entesharat-elmi/']]){
  const html=read(route[0]);
  const blocks=collectJsonLd(html);
  assert.ok(blocks.length>=2);
  assert.ok(blocks.every(v=>v.json!==null),route[1]+' malformed source JSON-LD');
  const result=inspectHtml(route[1],html);
  assert.equal(result.errors.length,0,JSON.stringify(result.errors));
  assert.equal(result.canonical,'https://drjavadrezazadeh.com'+route[1]);
  assert.ok(result.schemaTypes.includes('ScholarlyArticle'));
  assert.ok(result.schemaTypes.includes('PublicationIssue'));
  assert.ok(result.schemaTypes.includes('PublicationVolume'));
  assert.ok(result.schemaTypes.includes('Periodical'));
 }
});
test('detect unsupported ScholarlyArticle properties without reinterpreting unrelated works',()=>{
 const html=`<html lang="en"><head><link rel="canonical" href="https://drjavadrezazadeh.com/en/test/"><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"ScholarlyArticle","name":"Demonstration","volumeNumber":"2","issueNumber":"3"},{"@type":"PublicationVolume","volumeNumber":"2"},{"@type":"PublicationIssue","issueNumber":"3"}]}</script></head></html>`;
 const v=inspectHtml('/en/test/',html);
 assert.deepEqual(v.errors.map(x=>x.code),[
   'article_direct_volume_number','article_direct_issue_number'
 ]);
});
test('reject malformed JSON-LD, conflicting entity identities and sensitive keys',()=>{
 const html=`<html lang="en"><head><script type="application/ld+json">NOT JSON</script><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Person","@id":"https://site.test/#person","name":"Alpha"},{"@type":"Organization","@id":"https://site.test/#person","name":"Beta"},{"@type":"Thing","password_hash":"never in public JSON"}]}</script></head></html>`;
 const a=inspectHtml('/en/safety/',html);
 for(const code of ['malformed_json_ld','conflicting_entity_id','structured_data_private_field'])
  assert.ok(a.errors.some(e=>e.code===code),code+' was not detected');
});
test('indexability and language are recorded without inventing hreflang equivalence',()=>{
 const a=inspectHtml('/fa/private/',`<html lang="fa"><head><meta name="robots" content="noindex,nofollow"></head></html>`);
 assert.equal(a.indexability,'noindex');
 assert.equal(a.warnings.length,0);
 assert.deepEqual(a.hreflang,[]);
 const b=inspectHtml('/en/public/',`<html lang="fa"><head><meta name="robots" content="index,follow"></head></html>`);
 assert.ok(b.warnings.some(x=>x.code==='language_path_mismatch'));
 assert.ok(b.warnings.some(x=>x.code==='public_missing_canonical'));
});
