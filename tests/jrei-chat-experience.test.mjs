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

test('live answer can be stopped and old responses are discarded', () => {
  for (const message of ['توقف', 'Stop', 'jr-assistant-stop', 'stopButton.hidden=false', 'stopButton.hidden=true']) {
    assert.ok(js.includes(message), 'missing cancellation contract: '+message);
  }
  assert.match(js, /stopButton\.addEventListener\('click'/);
  assert.match(js, /requestGeneration\+\+;\s*activeRequest\?\.abort\(\)/);
  assert.match(js, /if\(requestToken!==requestGeneration\|\|document\.hidden\)return/);
  assert.match(css, /jr-assistant-stop\[hidden\]\{display:none!important\}/);
});

test('off-site citations cannot access opener or referrer', () => {
  assert.match(js, /a\.target='_blank';a\.rel='noopener noreferrer'/);
});

test('assistant differentiates real API readiness from the static guide', () => {
  assert.match(js, /async function discoverLiveAssistant\(\)/);
  assert.match(js, /policy\.live!==true/);
  assert.match(js, /providerConsent\.checked/);
  assert.match(js, /const liveGreeting=isFa/);
  assert.match(js, /const staticGreeting=isFa/);
  assert.match(js, /\.slice\(0,800\)/);
});
test('published bilingual service pages are reachable from local guide', () => {
  for(const link of [
    'fa/services/reviewer_response/','en/services/reviewer_response/',
    'fa/services/academic_editing/','en/services/academic_editing/',
    'fa/services/','en/services/'
  ]) assert.ok(js.includes(link), 'missing public service route: '+link);
  assert.match(js, /service/);
});

test('JREI bilingual chatbot is correctly branded without false live or learning claims', () => {
  assert.ok(js.includes("open:'چت‌بات JREI'"));
  assert.ok(js.includes("open:'JREI Chat'"));
  assert.match(js, /const staticGreeting=isFa/);
  assert.match(js, /const liveGreeting=isFa/);
  assert.match(js, /policy\.live!==true/);
  assert.ok(js.includes("providerMode==='JREI_LM_LOCAL_WINDOWS'?"));
  assert.ok(js.includes('خودکار به مدل آموزش داده نمی‌شوند.'));
  assert.ok(js.includes('Chats do not automatically train JREI'));
});
