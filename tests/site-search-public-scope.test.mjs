import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const source=fs.readFileSync('assets/js/site-search.js','utf8');
const index=JSON.parse(fs.readFileSync('assets/search-index.json','utf8'));
function extract(name) {
 const match=source.match(new RegExp('^const '+name+'=(.+);$','m'));
 assert.ok(match,'Search path guard must remain explicit: '+name);
 return match[1];
}
function scope(lang,{journalOnly=false}={}){
 const script='(()=>{const safePublicPath='+extract('safePublicPath')+
   ';const eligible='+extract('eligible')+';return {safePublicPath,eligible};})()';
 return vm.runInNewContext(script,{
   document:{documentElement:{lang}},journalOnly
 },{timeout:1000});
}
test('standalone public publisher is discoverable in English whole-site search, not Persian or journal-only results',()=>{
 const en=scope('en'),fa=scope('fa'),journal=scope('en',{journalOnly:true});
 const pub=index.find(x=>x.path==='publisher/');
 assert.ok(pub&&pub.lang==='en');
 assert.equal(en.eligible(pub),true);
 assert.equal(fa.eligible(pub),false);
 assert.equal(journal.eligible(pub),false);
 assert.ok(fs.existsSync(path.join('publisher','index.html')));
 const html=fs.readFileSync('publisher/index.html','utf8');
 assert.match(html,/<meta name="robots" content="index,follow/);
 assert.match(html,/<link rel="canonical" href="https:\/\/drjavadrezazadeh\.com\/publisher\/">/);
});
test('private, offsite, file and tricky paths cannot enter public search',()=>{
 for(const x of [
  'api/admin/','fa/app/admin/','en/account/','fa/customer-dashboard/',
  'journal/reviewer-private/../../secrets/','../../etc/passwd','javascript:alert(1)',
  'https://evil.example/','fa/safe/?secret=abc','en/checkout/../../account/',
  'publisher/private/','publisher/../../api/','publisher//','en/app/account/orders/','fa/services/checkout/',
  'en/services/checkout/','journal/fa/manuscripts/','journal/fa/submission/'
 ])assert.equal(scope('en').safePublicPath(x),false,x);
 assert.equal(scope('en').safePublicPath('en/books/'),true);
 assert.equal(scope('fa').safePublicPath('fa/rahnamaha/'),true);
 assert.equal(scope('en',{journalOnly:true}).eligible({
  path:'en/books/',lang:'en'
 }),false);
});
test('public search index exposes no registered sensitive route families',()=>{
 assert.ok(index.length>100,'Public discovery index was unexpectedly emptied');
 const forbidden=/^(?:api\/|fa\/(?:app|customer-dashboard|login|register|bazyabi-hesab|assessments|shop\/(?:checkout|cart|payment-result))\/|en\/(?:account|login|register|recover)\/|journal\/(?:private|submission|manuscripts)\/)/;
 const leaks=index.filter(x=>typeof x.path!=='string'||forbidden.test(x.path));
 assert.deepEqual(leaks,[]);
 assert.equal(new Set(index.map(x=>x.lang+':'+x.path)).size,index.length);
});
