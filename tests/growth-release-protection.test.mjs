import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
test('the permanent owner deployment workflow is retained byte for byte',()=>{
 const sha=execFileSync('git',['hash-object','.github/workflows/deploy-bertina.yml'],{encoding:'utf8'}).trim();
 assert.equal(sha,'280c6ac95d534ef6db9b292ddbe7467053f0ba76');
});
test('manual source stamp blocks any news delta before publishing a package',()=>{
 const s=read('scripts/stamp-bertina-release.mjs');
 assert.match(s,/GITHUB_EVENT_NAME==='workflow_dispatch'/);
 assert.match(s,/NEWS_FREEZE_LIVE_REVISION_UNAVAILABLE/);
 assert.match(s,/NEWS_FREEZE_LIVE_REVISION_UNVERIFIED/);
 assert.match(s,/execFileSync\(process\.execPath,\['scripts\/news-freeze-release-guard\.mjs',live,sha\]/);
 assert.ok(s.indexOf("news-freeze-release-guard.mjs")<s.indexOf("const root=path.resolve('.public-site');"));
});
test('news source-diff guard cannot be silently bypassed on malformed SHAs or git errors',()=>{
 const g=read('scripts/news-freeze-release-guard.mjs');
 assert.match(g,/NEWS_FREEZE_GUARD_MISSING_IMMUTABLE_SHA/);
 assert.match(g,/NEWS_FREEZE_GUARD_UNABLE_TO_VERIFY_LIVE_DELTA/);
 assert.match(g,/NEWS_FREEZE_GUARD_BLOCKED/);
 assert.match(g,/sitemap-news/);
 assert.match(g,/feed\.xml/);
});
