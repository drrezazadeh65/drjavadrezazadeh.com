import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const js = readFileSync(new URL('../assets/js/assistant.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/assistant.css', import.meta.url), 'utf8');
const policy = JSON.parse(readFileSync(new URL('../platform/assistant-runtime-policy.json', import.meta.url), 'utf8'));
const standard = readFileSync(new URL('../docs/governance/JREI_CHATGPT_CLASS_FUTURE_EXPERIENCE_STANDARD_20261024.md', import.meta.url), 'utf8');

test('public assistant JavaScript parses in an offline environment', () => {
  assert.doesNotThrow(() => new vm.Script(js, {filename:'assets/js/assistant.js'}));
});
test('bilingual, keyboard-operable copy and reset are present', () => {
  for (const text of ['گفت‌وگوی جدید', 'New chat', 'کپی پاسخ', 'Copy answer', 'jr-assistant-reset', 'jr-assistant-copy']) {
    assert.ok(js.includes(text), 'missing interface contract: '+text);
  }
  assert.match(js, /\.addEventListener\('click',\s*\(\)=>clearEphemeralAssistant\(true\)\)/);
  assert.match(js, /e\.key==='Enter'\s*&&\s*!e\.shiftKey/);
});
test('new chat and page background reset all ephemeral dialogue state', () => {
  assert.match(js, /clearEphemeralAssistant=\(keepOpen=false\)/);
  assert.match(js, /requestGeneration\+\+/);
  assert.match(js, /activeRequest\?\.abort\(\)/);
  assert.match(js, /history=\[\];lastQuery='';busy=false;ephemeralVisitorId=null/);
  assert.match(js, /providerConsent\.checked=false/);
  assert.match(js, /thread\.replaceChildren\(\)/);
  assert.match(js, /visibilitychange/);
});
test('mobile layout and accessible focus affordances exist', () => {
  assert.match(css, /jr-assistant-panel:not\(\[hidden\]\)/);
  assert.match(css, /height:100dvh!important/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /jr-assistant-reset:focus-visible/);
  assert.match(css, /jr-assistant-copy:focus-visible/);
});
test('vision standard does not claim nonexistent live abilities', () => {
  for (const required of ['ChatGPT-class', 'mother database', 'consent', 'rights', 'migration', 'PROVEN_LIVE']) {
    assert.ok(standard.toLowerCase().includes(required.toLowerCase()), 'missing documented acceptance: '+required);
  }
  assert.equal(policy.runtime, 'STATIC_BROWSER_FALLBACK');
  assert.equal(policy.hosting.runtime_backend_verified, false);
  assert.equal(policy.storage.server_conversation_persistence, false);
});
