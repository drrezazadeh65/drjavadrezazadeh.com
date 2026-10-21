import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('fa/konkur-ai-lab/index.html','utf8');
test('isolated experimental AI lab cannot be indexed or represented as official',()=>{
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/نسخه پژوهشی و آزمایشی/);
 assert.match(html,/هیچ درصد قبولی محاسبه نشده است/);
});
test('lab uses local scorecard and reasoning modules with no network or persistence',()=>{
 assert.match(html,/konkur-scorecard-normalizer\.mjs/);
 assert.match(html,/konkur-analysis-pipeline\.mjs/);
 assert.match(html,/offerings:\[\],rules:\[\]/);
 for(const forbidden of ['fetch(', 'XMLHttpRequest','sendBeacon','localStorage','sessionStorage','indexedDB','document.cookie','<form action='])
  assert.equal(html.includes(forbidden),false,forbidden);
});
