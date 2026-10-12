import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runCycle,variant} from './engine.mjs';

const newsUrl='https://drjavadrezazadeh.com/fa/rahnamaha/azmoon-khoob-vijegiha/';
const feed='<rss><channel><item><title>آزمون خوب</title><link>'+newsUrl+
 '</link><description>روایی و پایایی در آموزش</description></item></channel></rss>';
const page='<html><head><link rel="canonical" href="'+newsUrl+
 '"><meta name="robots" content="index,follow"></head></html>';
test('Eitaa uses documented private-token JSON endpoint and only real provider success',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'awose-eitaa-'));
 const originalFetch=globalThis.fetch;
 const originalToken=process.env.SOCIAL_EITAA_TOKEN;
 const originalDest=process.env.SOCIAL_EITAA_CHAT_ID;
 const recorded=[];
 process.env.SOCIAL_EITAA_TOKEN='synthetic-token-for-offline-test';
 process.env.SOCIAL_EITAA_CHAT_ID='123456789';
 globalThis.fetch=async (url,options)=>{
  recorded.push({url,options});
  return {ok:true,status:200,json:async()=>({ok:true,result:'success'})};
 };
 try{
  const draft=variant({title:'آزمون خوب',description:'روایی و پایایی در آموزش',url:newsUrl},'eitaa');
  await fs.writeFile(path.join(dir,'state.json'),JSON.stringify({version:2,sent:{},uncertain:{},days:{},approvals:{['eitaa|'+newsUrl]:draft.approvalDigest}}));
  const result=await runCycle({dryRun:false,now:new Date('2026-10-11T17:30:00Z'),
    feedXml:feed,config:{channels:['eitaa'],enabled:true,approved:true,
      statePath:path.join(dir,'state.json'),maxPostsPerDay:1},
    fetcher:async()=>({ok:true,url:newsUrl,text:async()=>page})});
  assert.equal(result.results[0].status,'published');
  assert.equal(result.results[0].providerId,null);
  assert.equal(result.results[0].confirmedBy,'eitaayar_success');
  assert.equal(recorded[0].url,'https://eitaayar.ir/api/app/sendMessage');
  const body=JSON.parse(recorded[0].options.body);
  assert.equal(body.token,process.env.SOCIAL_EITAA_TOKEN);
  assert.equal(body.chat_id,process.env.SOCIAL_EITAA_CHAT_ID);
  assert.match(body.text,/utm_source=eitaa/);
  const state=JSON.parse(await fs.readFile(path.join(dir,'state.json'),'utf8'));
  assert.equal(Object.keys(state.sent).length,1);
  assert.equal(Object.keys(state.uncertain).length,0);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalToken===undefined)delete process.env.SOCIAL_EITAA_TOKEN;
  else process.env.SOCIAL_EITAA_TOKEN=originalToken;
  if(originalDest===undefined)delete process.env.SOCIAL_EITAA_CHAT_ID;
  else process.env.SOCIAL_EITAA_CHAT_ID=originalDest;
  await fs.rm(dir,{recursive:true,force:true});
 }
});
