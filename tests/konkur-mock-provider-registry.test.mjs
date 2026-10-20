import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const providers=require('../assets/js/jr-konkur-mock-providers-v1.js');
const UI=readFileSync('assets/js/jr-konkur-mock-practice-v1.js','utf8');
test('ten provider categories are stable, traceable and extensible',()=>{
 assert.equal(providers.length,10);
 assert.equal(new Set(providers.map(x=>x.code)).size,providers.length);
 for(const row of providers){
  assert.match(row.code,/^[A-Z][A-Z0-9_]*$/);
  assert.ok(row.fa&&row.en&&row.evidence);
  if(row.evidence==='RESEARCH_CANDIDATE')assert.match(row.fa,/بررسی نشده/);
  if(row.source)assert.match(row.source,/^https:\/\//);
 }
 assert.ok(providers.some(p=>p.code==='SANJESH_MOCK'));
 assert.ok(providers.some(p=>p.code==='MAZ'));
 assert.ok(providers.some(p=>p.code==='GOZINE2'));
 assert.ok(providers.some(p=>p.code==='OTHER'));
});
test('mock interface renders provider registry without network writes or national score conversion',()=>{
 assert.match(UI,/JRKonkurMockProviders/);
 assert.match(UI,/rankScope/);
 assert.match(UI,/UNSPECIFIED/);
 assert.match(UI,/SCHOOL/);
 assert.match(UI,/NATIONAL/);
 for(const forbidden of ['fetch(','sessionStorage','localStorage','indexedDB','XMLHttpRequest'])
  assert.equal(UI.includes(forbidden),false,forbidden);
});
