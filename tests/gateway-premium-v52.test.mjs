import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html');
const css=read('assets/css/gateway-premium-v52.css');
const old=read('assets/css/gateway.css');

test('premium gateway preserves frozen identity, canonical, bilingual and search verification contracts',()=>{
 for(const token of [
  'name="enamad"','name="google-site-verification"',
  'rel="canonical" href="https://drjavadrezazadeh.com/"',
  'hreflang="en"','hreflang="fa"','hreflang="x-default"',
  'application/ld+json','href="https://drjavadrezazadeh.com/llms.txt"',
  'class="gateway-monogram" aria-hidden="true"><img src="./favicon.svg"',
  'name="robots" content="index,follow,max-image-preview:large"',
  'rel="manifest"','enamad-footer-row',
  'trustseal.enamad.ir',
  'src="./assets/js/language-gateway.js',
  'ادراک ندانستن سرآغاز فهمیدن است.',
  'Recognizing what we do not know is the beginning of understanding.'
 ]) assert.ok(html.includes(token),'Missing SEO/PWA/brand invariant: '+token);
 assert.equal((html.match(/<h1\b/gi)||[]).length,1,'Exactly one academic identity heading');
 assert.equal((html.match(/<script\s+type="application\/ld\+json">/gi)||[]).length,1);
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]||'null');
 assert.equal(schema['@context'],'https://schema.org');
 assert.ok(schema['@graph']?.some(x=>x['@type']==='Person'));
 assert.ok(schema['@graph']?.some(x=>x['@type']==='WebSite'));
});

test('gateway is CSS-only progressive enhancement, not an inline-style takeover',()=>{
 assert.doesNotMatch(html,/<style\b/i);
 assert.doesNotMatch(html,/\sstyle="/i);
 const premium=html.match(/<link rel="stylesheet" href="([^"]*gateway-premium-v52\.css[^"]*)"/);
 assert.ok(premium,'Versioned new stylesheet missing');
 assert.ok(html.indexOf('gateway.css?')<premium.index,'Scoped style must load after shared legacy sheet');
 assert.ok(css.startsWith('/* JR bilingual language gateway'));
 assert.match(css,/body\.language-gateway\.public-gateway-page/);
 assert.ok(!css.includes('@import'),'No remote CSS imports');
 assert.ok(!css.includes('https://'),'No remote font or artwork dependence');
 assert.ok(css.length<22000,'CSS size budget exceeded');
 assert.ok(html.length<12000,'HTML document grew beyond performance budget');
 assert.ok(old.includes('@font-face'),'Existing self-hosted font retained');
});

test('two language choices and all premium navigation destinations resolve to committed pages',()=>{
 assert.equal((html.match(/data-language-choice="en"/g)||[]).length,1);
 assert.equal((html.match(/data-language-choice="fa"/g)||[]).length,1);
 assert.match(html,/class="gateway-actions"/);
 assert.match(html,/href="#language-entry"/);
 assert.match(html,/id="language-entry"/);
 assert.match(html,/href="#main"/);
 assert.match(html,/id="main"/);
 const destinations=['en/','fa/','en/research/','en/golden-talent/','en/services/','en/publications/','en/contact/'];
 for(const route of destinations){
  const target=path.join(root,route,'index.html');
  assert.ok(fs.existsSync(target),'Broken gateway destination: '+route);
  assert.ok(html.includes('href="./'+route+'"'),'Gateway is not linked to '+route);
 }
});

test('mobile, keyboard, visual contrast fallback and reduced-motion have deliberate contracts',()=>{
 assert.match(html,/aria-labelledby="brand-title"/);
 assert.match(html,/aria-label="Select website language"/);
 assert.match(html,/fetchpriority="high"/);
 assert.match(html,/width="320" height="400"/);
 const brandIcon=html.match(/<img\s+src="\.\/favicon\.svg"[^>]*>/)?.[0]||'';
 assert.ok(brandIcon,'Owner-approved Persian brand icon missing');
 assert.match(brandIcon,/width="42" height="42"/);
 assert.match(brandIcon,/fetchpriority="high"/);
 assert.match(brandIcon,/alt=""/);

 assert.match(css,/@media \(max-width:760px\)/);
 assert.match(css,/@media \(max-width:520px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/min-height:54px/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media \(forced-colors:active\)/);
 assert.match(css,/body\.language-gateway\.public-gateway-page \.portrait-shell/);
 assert.match(css,/order:1/);
 assert.doesNotMatch(html,/<button\b[^>]*onclick=/i);
});

test('Golden Talent introduction does not advertise unvalidated diagnostics or invented credentials',()=>{
 assert.match(html,/not a diagnostic ranking or validated prediction/);
 assert.doesNotMatch(html,/\b(?:99\.9% accurate|scientifically certified|guaranteed talent score)\b/i);
 assert.match(html,/Research & learning/);
 assert.match(html,/Academic guidance/);
 assert.match(html,/Golden Talent/);
 assert.match(html,/Research · Education · Academic Guidance/);
});
