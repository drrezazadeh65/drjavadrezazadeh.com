import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('sanitized deploy artifact excludes every confidential-role source prototype',()=>{
 assert.ok(fs.existsSync('.public-site/journal/index.html'),'sanitized build must exist first');
 assert.ok(!fs.existsSync('.public-site/docs/journal/prototypes'),'no future role prototype deployed as a functioning OJS dashboard');
 assert.ok(!fs.existsSync('.public-site/platform/jhela-ojs-editorial-workflow-v1.json'),'native editorial permission mapping remains source-only');
});
