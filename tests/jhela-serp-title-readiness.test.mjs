import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const expected=[
  [
    "journal/aims-scope/index.html",
    "Aims and Scope: Human-Centred Education | JHELA"
  ],
  [
    "journal/author-guidelines/index.html",
    "Author Guidelines for Scholarly Research | JHELA"
  ],
  [
    "journal/call-for-reviewers/index.html",
    "International Call for Peer Reviewers | JHELA"
  ],
  [
    "journal/contact/index.html",
    "Contact JHELA Founding Editorial Office"
  ],
  [
    "journal/editorial-board/index.html",
    "Editorial Leadership and Safeguards | JHELA"
  ],
  [
    "journal/ethics/index.html",
    "Publication Ethics and Research Integrity | JHELA"
  ],
  [
    "journal/fa/peer-review/index.html",
    "سیاست داوری علمی و استقلال تحریریه | JHELA"
  ],
  [
    "journal/fees/index.html",
    "Publication Fees and Waivers: Founding Policy | JHELA"
  ],
  [
    "journal/peer-review/index.html",
    "Peer Review and Editorial Independence | JHELA"
  ],
  [
    "journal/reviewer-registration/index.html",
    "Reviewer Registration and Selection Criteria | JHELA"
  ]
];
const ORIGIN='https://drjavadrezazadeh.com';
const extract=(html,rx)=>html.match(rx)?.[1]||null;

test('JHELA page-specific search titles are concise, unique and consistent with social and scholarly metadata',()=>{
 const titles=new Set();
 for(const [path,title] of expected){
  const html=readFileSync(path,'utf8');
  const route='/'+path.replace(/index\.html$/,'');
  assert.equal(extract(html,/<title>([^<]+)<\/title>/i),title,route+' title');
  assert.equal(extract(html,/<meta property="og:title" content="([^"]+)"/i),title,route+' social title');
  assert.ok(title.length>=36&&title.length<=68,route+' informative title length');
  assert.ok(!titles.has(title),route+' duplicate title');
  titles.add(title);
  assert.equal(extract(html,/<link rel="canonical" href="([^"]+)"/i),ORIGIN+route,route+' self canonical');
  assert.match(html,/<link rel="alternate" hreflang="fa" href="https:\/\/drjavadrezazadeh\.com\/journal\//i);
  assert.match(html,/<link rel="alternate" hreflang="en" href="https:\/\/drjavadrezazadeh\.com\/journal\//i);
  assert.doesNotMatch(html,/<meta\s+name="robots"\s+content="[^"]*noindex/i);
  for(const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    const document=JSON.parse(block[1]);
    if(document['@type']==='WebPage'&&typeof document.name==='string')
      assert.equal(document.name,title,route+' schema name');
  }
 }
});
test('JHELA founding contact page gives meaningful intake/privacy guidance without implying publishing is live',()=>{
 const html=readFileSync('journal/contact/index.html','utf8');
 assert.match(html,/<h2>Which enquiry belongs here\?<\/h2>/);
 assert.match(html,/<h2>Privacy and current service boundaries<\/h2>/);
 for(const route of ['../aims-scope/','../author-guidelines/','../peer-review/','../call-for-reviewers/'])
  assert.ok(html.includes('href="'+route+'"'),'missing author/reviewer route '+route);
 assert.match(html,/no manuscript review or acceptance can be initiated by an informal email/);
 assert.match(html,/do not send unpublished manuscript files/);
 assert.match(html,/mailto:dr\.rezazadeh65@gmail\.com/);
 assert.equal((html.match(/<h1\b/gi)||[]).length,1);
});
