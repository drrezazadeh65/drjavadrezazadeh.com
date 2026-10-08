// Automated source-level integrity audit for the 45 public Persian knowledge guides.
// This does not claim to verify CDN delivery, crawlability, or Google indexation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const domain = 'https://drjavadrezazadeh.com';
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const errors = [];
const fail = (msg) => errors.push(msg);
const index = read('fa/rahnamaha/index.html');
const sitemap = read('sitemap-fa.xml');
const guideSlugs = [...sitemap.matchAll(/<loc>https:\/\/drjavadrezazadeh\.com\/fa\/rahnamaha\/([a-z0-9-]+)\/<\/loc>/g)].map(m=>m[1]);
const unique = new Set(guideSlugs);
if (unique.size !== guideSlugs.length) fail('Duplicate guide URL in Persian sitemap');
if (guideSlugs.length !== 45) fail('Expected 45 guide URLs, got '+guideSlugs.length);
const cardRefs = [...index.matchAll(/<a href="\.\/([a-z0-9-]+)\/"[^>]*><img class="knowledge-card-thumbnail" src="([^"]+)"/g)];
if (cardRefs.length !== 45) fail('Expected 45 guide image cards; found '+cardRefs.length);
const cards = new Map(cardRefs.map(m=>[m[1],m[2]]));
if (cards.size !== cardRefs.length) fail('Duplicate guide cards in hub');
if ((index.match(/راهنمای تحلیلی، منبع‌محور و قابل پیوند به خدمت یا ابزار مرتبط\./g)||[]).length) fail('Generic placeholder card descriptions remain');
function checkLocalRefs(html,base,slug){
  // Browser-equivalent URL resolution for static files under the canonical domain.
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const ref=match[1];
    if (!ref || ref[0]==='#' || /^(?:mailto:|tel:|data:|javascript:)/i.test(ref)) continue;
    let resolved;
    try { resolved = new URL(ref,base); } catch { fail(slug+': invalid reference '+ref); continue; }
    if (resolved.origin !== domain) continue;
    let decoded;
    try { decoded=decodeURIComponent(resolved.pathname); } catch { fail(slug+': invalid encoding '+ref); continue; }
    if (decoded.includes('\\')) { fail(slug+': suspicious reference '+ref); continue; }
    const target=path.resolve(root,'.'+decoded);
    if (!target.startsWith(root+path.sep) && target!==root) {fail(slug+': reference outside repository '+ref);continue;}
    if (!(fs.existsSync(target) && fs.statSync(target).isFile()) && !fs.existsSync(path.join(target,'index.html'))) fail(slug+': missing local target '+decoded);
  }
}
checkLocalRefs(index,domain+'/fa/rahnamaha/','hub');
const seenTitles = new Set();
for(const slug of guideSlugs){
  const file='fa/rahnamaha/'+slug+'/index.html';
  if(!fs.existsSync(path.join(root,file))){fail(slug+': missing HTML');continue;}
  const html=read(file),canonical=domain+'/fa/rahnamaha/'+slug+'/',img='assets/images/knowledge/'+slug+'-featured.svg';
  const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]||'';
  if(!title)fail(slug+': missing title');
  if(seenTitles.has(title))fail(slug+': duplicate title'); seenTitles.add(title);
  if(!/<html[^>]*lang="fa"/i.test(html))fail(slug+': lang != fa');
  if((html.match(/<h1\b/gi)||[]).length!==1)fail(slug+': expected one H1');
  if((html.match(/<h2\b/gi)||[]).length<2)fail(slug+': too few H2');
  if(html.length<5000)fail(slug+': unusually short HTML');
  if(!/<meta name="description" content="[^"]{30,}"/.test(html))fail(slug+': missing meta description');
  if(!html.includes('rel="canonical" href="'+canonical+'"'))fail(slug+': canonical mismatch');
  if(!html.includes('property="og:image" content="'+domain+'/'+img+'"'))fail(slug+': OG image mismatch');
  if(!html.includes('/assets/images/knowledge/'+slug+'-featured.svg'))fail(slug+': absent featured image');
  if(!cards.has(slug))fail(slug+': missing index card');
  if(cards.get(slug)!=='../../'+img)fail(slug+': hub image path mismatch');
  if(!fs.existsSync(path.join(root,img)))fail(slug+': absent SVG file');
  else {
    const svg=read(img);
    if(!/<svg\b/.test(svg)||!/viewBox="0 0 1600 900"/.test(svg))fail(slug+': invalid SVG geometry');
    if(/<script\b/i.test(svg))fail(slug+': script tag in SVG');
  }
  const ld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if(!ld.length)fail(slug+': missing JSON-LD');
  for(const [,json] of ld)try{JSON.parse(json);}catch{fail(slug+': invalid JSON-LD');}
  checkLocalRefs(html,canonical,slug);
}
if (errors.length){console.error('Knowledge Hub QA FAILED ('+errors.length+' issues)');for(const e of errors)console.error(' - '+e);process.exitCode=1;}
else console.log('Knowledge Hub QA PASSED: '+guideSlugs.length+' guides, '+cards.size+' image cards, all linked SVG files, internal local targets, metadata and JSON-LD checked.');
