import assert from 'node:assert/strict';
import fs from 'node:fs';

const policy=JSON.parse(fs.readFileSync(new URL('./assistant-runtime-policy.json',import.meta.url),'utf8'));
const client=fs.readFileSync(new URL('../assets/js/assistant.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/assistant.css',import.meta.url),'utf8');

assert.equal(policy.status,'STATIC_GUIDE_ACTIVE_RUNTIME_DEFERRED');
assert.equal(policy.runtime,'STATIC_BROWSER_FALLBACK');
assert.equal(policy.public_endpoint,null);
assert.equal(policy.default_model,null);
assert.equal(policy.storage.server_conversation_persistence,false);
assert.equal(policy.storage.browser_message_persistence,false);
assert.equal(policy.storage.lead_bank,'NONE');
assert.equal(policy.storage.conversation_text_written_to_lead_bank,false);
assert.equal(policy.lead_capture.enabled,false);
assert.equal(policy.visibility.private_app,false);
assert.equal(policy.visibility.checkout_routes,false);
assert.equal(policy.abuse_controls.max_user_message_chars,1600);

assert(client.includes("const endpoint=document.querySelector('meta[name=\"jr-assistant-endpoint\"]')?.content?.trim()||'';"));
assert(client.includes('if(!endpoint){'));
assert(client.includes('const local=fallback(message.trim())'));
assert(client.includes('if(!endpoint) leadBox.hidden=true'));
assert(client.includes('PRIVATE_PREFIXES'));
assert(!client.includes('assistant.drjavadrezazadeh.com/v1/chat'));
assert(css.includes('@media(max-width:900px)'));

console.log('Static public site-guide contract passed');
