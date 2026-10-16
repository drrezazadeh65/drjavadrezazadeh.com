/* JHELA bilingual public design non-regression: original journal wordmark family. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=p=>fs.readFileSync(p,'utf8');
const list=base=>{
 const entries=[base+'/index.html'];
 for(const d of fs.readdirSync(base,{withFileTypes:true})){
  if(!d.isDirectory()||(base==='journal'&&d.name==='fa'))continue;
  const p=path.posix.join(base,d.name,'index.html');
  if(fs.existsSync(p))entries.push(p);
 }
 return entries;
};
const en=list('journal'),fa=list('journal/fa');
test('all bilingual journal routes participate in one versioned luxury design, including private noindex intake',()=>{
 assert.ok(en.length>=17,'missing English journal pages');
 assert.ok(fa.length>=16,'missing Persian journal pages');
 for(const p of [...en,...fa]){
  const html=read(p);
  const header=html.match(/<header class="journal-header">[\s\S]*?<\/header>/)?.[0];
  assert.ok(header,'missing journal masthead: '+p);
  assert.ok(html.includes('journal-v2.css'),'JHELA shared design system missing: '+p);
  assert.ok(!header.includes('/jhela/identity.svg'),'legacy independent logo in current journal header: '+p);
  if(p.includes('/fa/')) assert.match(html,/<html lang="fa" dir="rtl">/);
  else assert.match(html,/<html lang="en"/);
  const expected=p.endsWith('/roadmap/index.html')?'wordmark-en-reverse.svg':'mark-en-reverse.svg';
  assert.ok(header.includes('/jhela/'+expected),'wrong JHELA approved mark family: '+p);
  assert.ok(header.includes('<strong>'),'journal heading must accompany emblem: '+p);
  const image=header.match(/<img\b[^>]*\/jhela\/[^>]+>/)?.[0]||'';
  assert.match(image,/\bwidth="\d+"/);
  assert.match(image,/\bheight="\d+"/);
  assert.ok(!/\bloading="lazy"/.test(image),'above-the-fold brand must not load lazily: '+p);
  assert.ok(/fetchpriority="high"/.test(image),'missing image loading priority: '+p);
 }
});
test('compact SVG contains EXACT same original emblem group as approved reverse wordmark',()=>{
 const wide=read('assets/images/jhela/wordmark-en-reverse.svg'),mark=read('assets/images/jhela/mark-en-reverse.svg');
 const group=wide.match(/<g transform="translate\(16 20\)">[\s\S]*?<\/g>/);
 assert.ok(group,'canonical emblem not found');
 assert.ok(mark.includes(group[0]),'independent unapproved emblem redesign prohibited');
 assert.ok(mark.startsWith('<svg ')&&mark.includes('viewBox="0 0 300 300"'));
 assert.ok(mark.includes('<title')&&mark.includes('<desc'));
 for(const hazard of ['<script','<foreignObject','onload=','xlink:href=','http://','data:'])assert.ok(!mark.includes(hazard),'unsafe external SVG feature');
 const reg=JSON.parse(read('assets/media-registry.json'));
 assert.equal(reg.assets.filter(x=>x.path==='assets/images/jhela/mark-en-reverse.svg').length,1);
 const brand=JSON.parse(read('platform/jhela-unified-brand-v3.json'));
 assert.equal(brand.identity.compactMarkDark,'assets/images/jhela/mark-en-reverse.svg');
});
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const luminance=h=>rgb(h).map(v=>v<=0.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
test('critical high-contrast body text pairings meet WCAG AA even before real browser QA',()=>{
 const p=JSON.parse(read('platform/jhela-unified-brand-v3.json')).identity.corePalette;
 assert.ok(contrast(p.journalIvory,p.journalNavy)>=4.5,'dark scholarly text pairing');
 assert.ok(contrast(p.journalInk,p.journalPaper)>=4.5,'light article reading text pairing');
 assert.ok(contrast(p.darkText,p.royalBlack)>=4.5,'parent-brand dark canvas');
});
test('all seven restrained JHELA stationery specimens remain unsigned and nonindexable',()=>{
 const templates=[
  'jhela-reviewer-invitation-preview-en.html',
  'jhela-editorial-decision-preview-en.html',
  'jhela-finance-waiver-preview-en.html',
  'jhela-article-galley-preview-en.html',
  'jhela-reviewer-report-preview-en.html',
  'jhela-issue-cover-preview-en.html',
  'jhela-reviewer-certificate-preview-en.html'
 ];
 for(const file of templates){
  const html=read('identity/templates/'+file);
  assert.ok(html.includes('DRAFT TEMPLATE — NOT ISSUED'));
  assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.ok(html.includes('../jhela-document.css'));
  assert.ok(html.includes('../../assets/images/jhela/wordmark-en.svg'));
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.ok(!/<script\b|<form\b|onload=|onerror=/.test(html));
 }
 const css=read('identity/jhela-document.css');
 assert.ok(css.includes('@page{size:A4'));
 assert.ok(css.includes('jhela-document__certificate-body'));
 assert.ok(css.includes('jhela-document__cover-art'));
 assert.ok(css.includes('focus-visible'));
});
test('shared journal masthead upgrade cannot open manuscript submission or make indexing claims',()=>{
 const live=JSON.parse(read('platform/jhela-ojs-activation.json'));
 assert.equal(live.ojsInstalled,false);
 assert.equal(live.publicSubmissionsEnabled,false);
 assert.equal(live.doiAssigned,false);
 assert.equal(live.issnAssigned,false);
 for(const p of ['journal/submission/index.html','journal/fa/submission/index.html'])assert.match(read(p),/name="robots" content="noindex/);
 const docs=read('docs/journal/JHELA_UNIFIED_DESIGN_MASTER_V3_20261016.md');
 assert.ok(docs.includes('WCAG 2.2 AA'));
 assert.ok(docs.includes('JHELA'));
});
