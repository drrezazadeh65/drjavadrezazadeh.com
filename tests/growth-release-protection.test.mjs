import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
test('proposed one-line runner maintenance is the only change to frozen owner workflow',()=>{
 const sha=execFileSync('git',['hash-object','.github/workflows/deploy-bertina.yml'],{encoding:'utf8'}).trim();
 assert.equal(sha,'8278e2e95af453fa3c5ce905db1b8e4d3964cfb5');
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

test('immutable news freeze permits only exact CI runner pins and rejects real news changes',()=>{
 const guard=path.resolve('scripts/news-freeze-release-guard.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jr-news-freeze-'));
 const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const put=(file,value)=>{const dest=path.join(dir,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,value);};
 const commit=()=>{git('add','-A');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');return git('rev-parse','HEAD');};
 const run=(base,target)=>spawnSync(process.execPath,[guard,base,target],{cwd:dir,encoding:'utf8'});
 const news='.github/workflows/jrei-news-isolated-acceptance.yml';
 const letter='.github/workflows/newsletter-preferences-qa.yml';
 const original='jobs:\n  source:\n    runs-on: ubuntu-latest\n    steps: []\n';
 const newsletter='jobs:\n  schema-and-consent:\n    runs-on: ubuntu-latest\n  dashboard-browser:\n    runs-on: ubuntu-latest\n    steps: []\n';
 try{
  git('init','-q');git('config','core.autocrlf','false');
  put(news,original);put(letter,newsletter);put('api/news-public-feed.php','<?php // frozen\n');
  const base=commit();
  const pinned=original.replace('ubuntu-latest','ubuntu-24.04');
  const pinnedLetter=newsletter.replace('dashboard-browser:\n    runs-on: ubuntu-latest','dashboard-browser:\n    runs-on: ubuntu-24.04');
  put(news,pinned);put(letter,pinnedLetter);const good=commit();
  assert.equal(run(base,good).status,0);
  put(news,pinned.replace('steps: []','steps: [{run: echo changed}]'));let bad=commit();
  assert.equal(run(base,bad).status,1);assert.match(run(base,bad).stderr,/NEWS_FREEZE_GUARD_BLOCKED/);
  put(news,pinned);put(letter,pinnedLetter.replace('ubuntu-latest','ubuntu-24.04'));bad=commit();
  assert.equal(run(base,bad).status,1);
  put(letter,pinnedLetter);put('api/news-public-feed.php','<?php // changed\n');bad=commit();
  assert.equal(run(base,bad).status,1);assert.match(run(base,bad).stderr,/api\/news-public-feed.php/);
  fs.renameSync(path.join(dir,'api/news-public-feed.php'),path.join(dir,'api/ordinary.php'));bad=commit();
  assert.equal(run(base,bad).status,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
