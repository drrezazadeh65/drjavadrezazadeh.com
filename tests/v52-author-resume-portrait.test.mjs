import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const fa=read('fa/shop/authors/mehrab-mirkarimi/index.html');
const en=read('en/shop/authors/mehrab-mirkarimi/index.html');
const css=read('assets/css/jr-author-resume-portrait-v52.css');
const js=read('assets/js/jr-author-portrait-v52.js');
test('both stable bilingual author pages include an accessible CV and a non-breaking author image fallback',()=>{
 for(const [language,html] of [['fa',fa],['en',en]]){
  assert.match(html,/jr-author-resume-portrait-v52\.css/);
  assert.match(html,/jr-author-portrait-v52\.js/);
  assert.match(html,/class="jr-resume-portrait"/);
  assert.match(html,/data-author-photo/);
  assert.match(html,/assets\/images\/mehrab-mirkarimi-portrait-v52\.webp/);
  assert.match(html,/jr-resume-columns/);
  assert.match(html,/jr-resume-education|jr-en-resume-education/);
  assert.match(html,/jr-resume-mini/);
  assert.match(html,/id="(?:author|compiler)"/);
  assert.match(html,/name="robots" content="index,follow,max-image-preview:large"/);
  assert.ok(html.indexOf('jr-author-resume-portrait-v52.css')>html.indexOf('jr-author-premium-v52.css'));
 }
 assert.match(fa,/تأیید مدیر نشر سایت/);
 assert.match(en,/publisher's approval/);
 assert.doesNotMatch(fa,/نیازمند احراز مستند|در انتظار راستی‌آزمایی/);
 assert.doesNotMatch(en,/documentary verification pending|unverified/);
});
test('real portrait, first-place CV distinction and biography precede long editorial content',()=>{
 for(const [locale,html] of [['fa',fa],['en',en]]){
  const hero=html.indexOf(locale==='fa'?'<section class="jp-hero">':'<section class="jp-en-hero"');
  const intro=html.indexOf('class="jr-author-spotlight"',hero);
  const resume=html.indexOf('jr-author-resume-section',hero);
  const next=html.indexOf(locale==='fa'?'<section class="jp-band"':'<section class="jp-en-section">',resume+20);
  assert.ok(hero>=0&&intro>hero&&resume>intro&&next>resume,locale+' author CV appears after hero and before collection');
  assert.match(html,/loading="eager" fetchpriority="high"/);
  assert.match(html,/src="\/assets\/images\/mehrab-mirkarimi-portrait-v52\.webp"/);
  assert.match(html,/jr-author-spotlight-rank/);
 }
 assert.match(fa,/رتبه ۱ کنکور کارشناسی ارشد آموزش زبان انگلیسی ۱۴۰۵/);
 assert.match(en,/First-place rank · 2026 ELT MA entrance examination/);
 assert.match(css,/\.jr-author-spotlight/);
});
test('image loader does not allow third-party remote pictures, sensitive browser persistence or broken-image replacement',()=>{
 assert.match(js,/const target='\/assets\/images\/mehrab-mirkarimi-portrait-v52\.webp'/);
 assert.match(js,/new Image\(\)/);
 assert.match(js,/probe\.onload=/);
 assert.match(js,/probe\.onerror=/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|innerHTML|fetch\(/);
});
test('author portrait changes are visual only and preserve payments, disclaimers and private role boundaries',()=>{
 assert.match(fa,/id="jp-digital-checkout-form"[^>]*hidden/);
 assert.match(fa,/jr-publishing-checkout-v1\.js/);
 assert.match(fa,/id="jp-checkout-state"/);
 assert.doesNotMatch(fa+en,/href="\/fa\/app\/author\/"/);
 assert.match(fa,/۷۰۰٬۰۰۰/);
 assert.match(fa,/۳۰۰٬۰۰۰/);
 assert.match(en,/300,000 tomans/);
 assert.doesNotMatch(fa+en+css+js,/JR_PUBLISHING_DIGITAL_ENABLED\s*=\s*true/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(read('scripts/build-public-site.mjs'),/assets\/js\/jr-author-portrait-v52\.js/);
});
