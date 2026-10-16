import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=p=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const fa='ادراک ندانستن سرآغاز فهمیدن است.';
const en='Recognizing what we do not know is the beginning of understanding.';

test('canonical motto is owner approved and exact in both languages',()=>{
 const m=JSON.parse(read('platform/brand-motto.json'));
 assert.equal(m.status,'OWNER_APPROVED');
 assert.equal(m.fa,fa);
 assert.equal(m.en,en);
 assert.equal(m.canonicalLanguage,'fa');
});
test('language gateway has paired language-labelled mottos',()=>{
 const html=read('index.html');
 assert.match(html,/<p class="gateway-note" lang="fa" dir="rtl">ادراک ندانستن سرآغاز فهمیدن است\.<\/p>/);
 assert.match(html,/<p class="gateway-note" lang="en">Recognizing what we do not know is the beginning of understanding\.<\/p>/);
 assert.match(html,/data-language-choice="fa"/);
 assert.match(html,/data-language-choice="en"/);
});
test('public bilingual homepages and four auth screens use the same meaning',()=>{
 for(const page of ['fa/index.html','fa/login/index.html','fa/register/index.html'])assert.ok(read(page).includes(fa),page);
 for(const page of ['en/index.html','en/login/index.html','en/register/index.html'])assert.ok(read(page).includes(en),page);
});
test('approved homepage slogans preserve one H1 and indexation settings',()=>{
 for(const path of ['fa/index.html','en/index.html']){
  const h=read(path);
  assert.equal((h.match(/<h1\b/gi)||[]).length,1,path);
  assert.ok(!/<meta\b[^>]*content=["'][^"']*\bnoindex\b/i.test(h));
  assert.match(h,/class="hero-line"/);
 }
});
test('Persian homepage professional profile now uses editorial third person',()=>{
 const html=read('fa/index.html');
 assert.match(html,/فعالیت علمی و حرفه‌ای دکتر رضازاده آموزش عالی/);
 assert.doesNotMatch(html,/فعالیت من آموزش عالی/);
});
