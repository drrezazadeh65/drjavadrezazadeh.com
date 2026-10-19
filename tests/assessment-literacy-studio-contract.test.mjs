import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const source=read('assets/js/jr-assessment-literacy-studio-v1.js');
const style=read('assets/css/jr-assessment-literacy-studio-v1.css');

test('interactive assessment literacy appears on original indexed Persian and English teaching pages',()=>{
 for(const [locale,path,url] of [
  ['fa','fa/tadris/index.html','https://drjavadrezazadeh.com/fa/tadris/'],
  ['en','en/teacher-education/index.html','https://drjavadrezazadeh.com/en/teacher-education/']
 ]){
  const html=read(path);
  assert.ok(html.includes('rel="canonical" href="'+url+'"'),'preserve existing canonical '+locale);
  assert.ok(html.includes('data-evidence-studio data-locale="'+locale+'"'),'studio mounted '+locale);
  assert.ok(html.includes('/assets/css/jr-assessment-literacy-studio-v1.css?v=20261019-assessment-literacy-v1'));
  assert.ok(html.includes('/assets/js/jr-assessment-literacy-studio-v1.js?v=20261019-assessment-literacy-v1'));
  assert.match(html,/<noscript>/);
  assert.match(html,/<main id="main-content"/);
  assert.match(html,/name="robots" content="index,follow/);
  assert.match(html,/application\/ld\+json/);
 }
});

test('five native controls update five interpretations including high-stakes caution and fairness',()=>{
 for(const key of ['purpose','source','stakes','breadth','access'])
  assert.ok(source.includes("'"+key+"'"),'missing control '+key);
 for(const name of ['observation','task','portfolio','selfreport'])
  assert.ok(source.includes(name),'missing evidence source '+name);
 for(const pair of ['highSingle','highMultiple','lowSingle','lowMultiple'])
  assert.ok(source.includes(pair),'missing purpose/impact guidance '+pair);
 for(const field of ['reading','limits','action','fairness','warning'])
  assert.ok(source.includes("'"+field+"'"),'missing visible interpretation '+field);
 assert.match(source,/form\.addEventListener\('input',\(\)=>draw\(\)\)/);
 assert.match(source,/form\.addEventListener\('change',\(\)=>draw\(\)\)/);
 assert.match(source,/form\.addEventListener\('reset'/);
 assert.match(source,/result\.dataset\.risk=/);
 assert.match(source,/setAttribute\('aria-live','polite'\)/);
 assert.match(source,/setAttribute\('aria-atomic','true'\)/);
});

test('educational limits, no data collection, no scoring or accounts',()=>{
 for(const pattern of [
  /\blocalStorage\b/,/\bsessionStorage\b/,/\bindexedDB\b/,
  /\bXMLHttpRequest\b/,/\bfetch\s*\(/,/\bsendBeacon\b/,
  /\bdocument\.cookie\b/,/\bpostMessage\b/,/new WebSocket/,
  /<input[^>]+name=["'](?:email|phone|pupil)/,
  /Math\.random\s*\(/
 ])assert.doesNotMatch(source,pattern);
 assert.match(source,/not a psychometric test, diagnosis/);
 assert.match(source,/نمره، تشخیص یا مجوز تصمیم‌گیری خودکار/);
 assert.match(source,/Do not enter pupil information/);
 assert.match(source,/نام یا اطلاعات دانش‌آموز را وارد نکنید/);
 assert.match(source,/not automatically establish decision validity/);
 const check=spawnSync(process.execPath,['--check','assets/js/jr-assessment-literacy-studio-v1.js'],{encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
});

test('premium accessibility does not override main navigation or introduce horizontal overflow',()=>{
 assert.match(style,/\.jr-assessment-studio/);
 assert.match(style,/max-width:100%/);
 assert.match(style,/@media\(max-width:430px\)/);
 assert.match(style,/@media\(max-width:700px\)/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(style,/:focus-visible/);
 assert.match(style,/min-height:48px/);
 assert.match(style,/@media print/);
 assert.doesNotMatch(style,/@import|font-face|https?:\/\//);
});
