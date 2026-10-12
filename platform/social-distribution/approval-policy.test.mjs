import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runCycle,variant,approvalDigest} from './engine.mjs';

const url='https://drjavadrezazadeh.com/fa/rahnamaha/azmoon-khoob-vijegiha/';
const article={title:'آزمون خوب',description:'روایی و پایایی در آموزش',url};
const feed='<rss><channel><item><title>'+article.title+'</title><link>'+url+'</link><description>'+article.description+'</description></item></channel></rss>';
const page='<html><head><meta name="robots" content="index,follow"><link rel="canonical" href="'+url+'"></head></html>';
test('private per-post approval is required; edited drafts invalidate consent; ambiguous sends are not retried',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'awose-policy-'));
 const statePath=path.join(dir,'queue.json');
 const originalFetch=globalThis.fetch,token=process.env.SOCIAL_EITAA_TOKEN,dest=process.env.SOCIAL_EITAA_CHAT_ID;
 process.env.SOCIAL_EITAA_TOKEN='offline-only-token';
 process.env.SOCIAL_EITAA_CHAT_ID='not-a-real-channel';
 let sends=0;
 globalThis.fetch=async()=>{sends++;throw Error('ambiguous transport timeout');};
 const opts={dryRun:false,now:new Date('2026-10-11T17:30:00Z'),feedXml:feed,
  config:{enabled:true,approved:true,channels:['eitaa'],statePath,maxPostsPerDay:1},
  fetcher:async()=>({ok:true,url,text:async()=>page})};
 try{
  const missing=await runCycle(opts);
  assert.equal(missing.status,'no_approved_deliveries');
  assert.equal(sends,0);
  const draft=variant(article,'eitaa');
  assert.equal(draft.approvalDigest,approvalDigest(draft));
  await fs.writeFile(statePath,JSON.stringify({version:2,sent:{},uncertain:{},days:{},
   approvals:{['eitaa|'+url]:'0'.repeat(64)}}));
  assert.equal((await runCycle(opts)).status,'no_approved_deliveries');
  assert.equal(sends,0);
  await fs.writeFile(statePath,JSON.stringify({version:2,sent:{},uncertain:{},days:{},
   approvals:{['eitaa|'+url]:draft.approvalDigest}}));
  const first=await runCycle(opts);
  assert.equal(first.results[0].status,'manual_review_required');
  assert.equal(sends,1);
  const retry=await runCycle(opts);
  assert.equal(retry.status,'no_approved_deliveries');
  assert.equal(sends,1);
  const stored=JSON.parse(await fs.readFile(statePath,'utf8'));
  assert.ok(stored.uncertain['eitaa|'+url]);
  assert.equal(Object.keys(stored.sent).length,0);
 }finally{
  globalThis.fetch=originalFetch;
  if(token===undefined)delete process.env.SOCIAL_EITAA_TOKEN;else process.env.SOCIAL_EITAA_TOKEN=token;
  if(dest===undefined)delete process.env.SOCIAL_EITAA_CHAT_ID;else process.env.SOCIAL_EITAA_CHAT_ID=dest;
  await fs.rm(dir,{recursive:true,force:true});
 }
});
