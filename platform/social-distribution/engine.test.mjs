import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed,isSafeUrl,shorten,variant,iranClock,isScheduledWindow,runCycle,CHANNELS} from './engine.mjs';

const sample='<rss><channel><item><title>آموزش و پژوهش</title>'+
  '<link>https://drjavadrezazadeh.com/fa/rahnamaha/example/</link>'+
  '<description>رویکرد علمی و مبتنی بر شواهد</description>'+
  '<pubDate>Thu, 08 Oct 2026 00:00:00 +0000</pubDate></item>'+
  '<item><title>private</title><link>https://other.example/private</link></item></channel></rss>';

test('RSS parser keeps only same-origin, qualified public paths',()=>{
 const items=parseFeed(sample);
 assert.equal(items.length,1);
 assert.equal(items[0].title,'آموزش و پژوهش');
});
test('scheme, host, and namespace cannot be injected',()=>{
 for(const value of ['https://evil.example/fa/news/','http://drjavadrezazadeh.com/fa/news/',
 'https://drjavadrezazadeh.com.evil.example/en/','javascript:alert(1)',
 'https://drjavadrezazadeh.com/fa/akhbar/sample/?q=tracking',
 'https://drjavadrezazadeh.com/en/account/',
 'https://drjavadrezazadeh.com/fa/app/admin/']){
   assert.equal(isSafeUrl(value),false,value);
 }
 assert.equal(isSafeUrl('https://drjavadrezazadeh.com/en/research/'),true);
});
test('Iran timezone has no DST and 21:00 time window is correct',()=>{
 const when=new Date('2026-10-11T17:30:00Z');
 assert.deepEqual(iranClock(when),{day:'2026-10-11',hour:21,minute:0});
 assert.equal(isScheduledWindow(when),true);
 assert.equal(isScheduledWindow(new Date('2026-10-11T18:00:00Z')),false);
});
test('X copy respects character budget including tracking URL',()=>{
 const item=parseFeed(sample)[0];const out=variant(item,'x');
 assert.equal(Array.from(out.text).length<=CHANNELS.x.limit,true);
 assert.match(out.text,/utm_source=x/);
 assert.equal(out.url,item.url);
});
test('safe preview requires no credentials or external posting',async()=>{
 const result=await runCycle({dryRun:true,forcePreview:true,feedXml:sample,
   config:{channels:['telegram','eitaa'],maxPostsPerDay:1}});
 assert.equal(result.status,'preview');
 assert.equal(result.preview.length,2);
 assert.equal(result.results.length,0);
 assert.equal(result.preview[0].status,'draft');
});
test('never publish without explicit deployment flags',async()=>{
 const result=await runCycle({dryRun:false,forcePreview:true,feedXml:sample,
   config:{channels:['telegram'],enabled:false,approved:false}});
 assert.equal(result.status,'publishing_disabled');
});
test('never publish outside configured local time',async()=>{
 const result=await runCycle({dryRun:false,now:new Date('2026-10-11T14:30:00Z'),
   config:{channels:['telegram'],enabled:true,approved:true,statePath:'/tmp/should-not-be-written.json'}});
 assert.equal(result.status,'outside_schedule');
});
test('text truncation uses Unicode code points',()=>{
 assert.equal(Array.from(shorten('🙂🙂🙂🙂🙂',4)).length,4);
});
