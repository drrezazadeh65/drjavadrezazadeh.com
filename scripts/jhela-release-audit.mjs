import fs from 'node:fs';
import path from 'node:path';

// Dedicated JHELA founding-stage discovery and editorial-integrity gate.
// This is a source QA contract, not proof of a Bertina deployment or Google indexing.
const root=process.cwd(), origin='https://drjavadrezazadeh.com';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const failures=[];
const published=['','dashboard/','aims-scope/','author-guidelines/','contact/','editorial-board/','ethics/','fees/','peer-review/','reviewer-registration/','call-for-reviewers/','founding-collaborators/'];
const withheld=['submission/','current/','archive/','founding-checklist/','fa/submission/','fa/current/','fa/archive/'];
const xml=read('journal/sitemap.xml');
const journalUrls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const faPublished=['fa/','fa/dashboard/','fa/aims-scope/','fa/call-for-reviewers/','fa/founding-collaborators/','fa/reviewer-registration/','fa/editorial-board/','fa/peer-review/','fa/ethics/','fa/author-guidelines/','fa/fees/','fa/contact/'];
const expected=[...published,...faPublished].map(slug=>origin+'/journal/'+slug);
if(new Set(journalUrls).size!==journalUrls.length) failures.push('JHELA sitemap contains duplicated loc');
if(JSON.stringify([...journalUrls].sort())!==JSON.stringify([...expected].sort())) failures.push('JHELA sitemap does not match explicitly released English-language pages');
if(journalUrls.some(url=>url.includes('journal.drjavadrezazadeh.com'))) failures.push('Reserved subdomain exposed before independent cutover');
const index=read('sitemap.xml'),core=read('sitemap-core.xml'),robots=read('robots.txt'),llms=read('llms.txt');
if(!index.includes('<loc>'+origin+'/journal/sitemap.xml</loc>')) failures.push('Main sitemap must reference independent JHELA sitemap');
if(core.includes('/journal/')) failures.push('JHELA URLs duplicated in core sitemap');
if(!robots.includes('Sitemap: '+origin+'/journal/sitemap.xml')) failures.push('Missing explicit journal sitemap robots discovery');
if(!llms.includes('('+origin+'/journal/)')) failures.push('Journal main page missing in AI discovery');
for(const slug of [...published,...faPublished]){
  const route='/journal/'+slug,html=read('journal/'+slug+'index.html');
  if(/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) failures.push(route+': released route noindexed');
  if(!html.includes('<link rel="canonical" href="'+origin+route+'"')) failures.push(route+': self canonical missing');
  if(!html.includes('type="application/ld+json"')) failures.push(route+': structured metadata missing');
  if(!html.includes('class="jhela-logo"')) failures.push(route+': canonical JHELA identity missing');
  if(/<a[^>]*href=["'](?:javascript:|#["'])/i.test(html)) failures.push(route+': placeholder or script URL link');
}
for(const slug of withheld){
  const route='/journal/'+slug,html=read('journal/'+slug+'index.html');
  if(!/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) failures.push(route+': stage-only route unexpectedly indexable');
  if(journalUrls.includes(origin+route)) failures.push(route+': stage-only route present in sitemap');
}
const home=read('journal/index.html'),dashboardJs=read('assets/js/jhela-public-dashboard.js');
if(!home.includes('jhela-public-dashboard.js')||!home.includes('class="jhela-hub-grid"')) failures.push('JHELA public dashboard is missing');
if(!dashboardJs.includes("role','tablist")&&!dashboardJs.includes("role\",\"tablist")) failures.push('Dashboard tablist semantics missing');
if(/(?:localStorage|sessionStorage|fetch\(|XMLHttpRequest|document\.cookie)/.test(dashboardJs)) failures.push('Public dashboard must not capture private applicant data');
if(!home.includes('Not yet open')||!read('journal/current/index.html').includes('0 published')) failures.push('Founding-stage publication status misrepresented');
if(failures.length){
 console.error('JHELA release gate FAILED ('+failures.length+')');
 failures.forEach(item=>console.error('✗ '+item));
 process.exit(1);
}
console.log('JHELA release gate PASS: '+expected.length+' unique released URLs, '+withheld.length+' protected founding routes, independent sitemap, academic identity and accessible public role dashboard.');
