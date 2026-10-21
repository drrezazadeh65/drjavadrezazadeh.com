import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const html=fs.readFileSync('fa/konkur-ai-lab/index.html','utf8');
test('research-only lab is noindex and cannot imply an official admission decision',()=>{
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/نسخه پژوهشی و آزمایشی/);
 assert.match(html,/هیچ درصد قبولی محاسبه نشده است/);
});
test('lab relies only on deployed public adapter and never imports private research modules',()=>{
 assert.match(html,/jr-konkur-ai-lab-public-v1\.mjs/);
 assert.doesNotMatch(html,/from '\/platform\//);
 assert.doesNotMatch(html,/import\('\/platform\//);
 for(const f of ['fetch(', 'XMLHttpRequest','sendBeacon','localStorage','sessionStorage','indexedDB','document.cookie','<form action='])
  assert.equal(html.includes(f),false,'unsafe API in research lab: '+f);
});
test('CSP SHA-256 hashes are exact after mobile layout changes',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
 const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 for(const content of [css,js]){
  assert.ok(content);
  assert.ok(html.includes("'sha256-"+crypto.createHash('sha256').update(content).digest('base64')+"'"));
 }
 assert.match(html,/@media\(max-width:560px\)/);
});

test('MAZ is selectable in the public lab without third-party login or vendor network calls',()=>{
 assert.match(html,/<option value="MAZ">ماز<\/option>/);
 assert.doesNotMatch(html,/biomaze\.ir|konkoorone\.ir|heyvagroup\.com/);
});
