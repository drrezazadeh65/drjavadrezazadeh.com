import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../assets/js/assistant.js',import.meta.url),'utf8');
const first=source.indexOf('  function fallback(query){');
const last=source.indexOf('\n  const cancelLocalJob=',first);
if(first<0||last<0)throw Error('FALLBACK_FUNCTION_NOT_EXTRACTABLE');
const functionSource=source.slice(first,last).trim();
function call(locale,query){
 const quick=Array.from({length:9},(_,i)=>({label:'link-'+i,url:'/fa/link-'+i+'/'}));
 const fn=vm.runInNewContext('('+functionSource+')',{
  isFa:locale==='fa',quickLinks:()=>quick,
  labels:{error:'transport failure'},rootPath:p=>'/'+p
 },{timeout:2000});
 return fn(query);
}
test('offline JREI introduces itself accurately in Persian',()=>{
 const a=call('fa','میشه بگی کی هستی');
 assert.match(a.answer,/من JREI/);
 assert.match(a.answer,/گفت‌وگوی زنده/);
 assert.doesNotMatch(a.answer,/transport failure/);
 assert.equal(a.links.length,2);
});
test('offline JREI introduces itself in English',()=>{
 const a=call('en','Who are you?');
 assert.match(a.answer,/I am JREI/);
 assert.match(a.answer,/not yet/);
 assert.doesNotMatch(a.answer,/transport failure/);
});
test('unmatched free-form prompts get a truthful offline status, not a fake network error',()=>{
 for(const lang of ['fa','en']){
  const a=call(lang,'synthetic unrelated test xyz');
  assert.doesNotMatch(a.answer,/transport failure/);
  assert.equal(a.links.length,9);
 }
});
test('offline scope never claims live Qwen or private-user knowledge',()=>{
 const fa=call('fa','خودت رو معرفی کن');
 assert.match(fa.answer,/راهنما|گفت‌وگوی زنده/);
 assert.doesNotMatch(fa.answer,/متصل شده|مطمئنم|پرونده شما/);
});
