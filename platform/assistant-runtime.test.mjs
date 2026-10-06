import assert from 'node:assert/strict';
import fs from 'node:fs';

const policy=JSON.parse(fs.readFileSync(new URL('./assistant-runtime-policy.json',import.meta.url),'utf8'));
const worker=fs.readFileSync(new URL('../edge/assistant/src/index.js',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../assets/js/assistant.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/assistant.css',import.meta.url),'utf8');
const wrangler=fs.readFileSync(new URL('../edge/assistant/wrangler.jsonc',import.meta.url),'utf8');

assert.equal(policy.storage.server_conversation_persistence,false);
assert.equal(policy.visibility.private_app,false);
assert.equal(policy.abuse_controls.max_user_message_chars,1600);
assert(worker.includes('ASSISTANT_RATE_LIMITER'));
assert(worker.includes('No matching approved site context was found.'));
assert(worker.includes('total talent score'));
assert(worker.includes('X-Robots-Tag'));
assert(!worker.includes('OPENAI_API_KEY'));
assert(client.includes('assistant.drjavadrezazadeh.com/v1/chat'));
assert(client.includes('PRIVATE_PREFIXES'));
assert(css.includes('@media(max-width:900px)'));
assert(wrangler.includes('@cf/openai/gpt-oss-120b'));
assert(wrangler.includes('"custom_domain": true'));
console.log('Public AI assistant runtime contract passed');
