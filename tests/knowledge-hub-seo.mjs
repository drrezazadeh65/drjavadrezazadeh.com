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
  const photo='assets/images/knowledge/'+slug+'-featured.webp';
  const hasPhoto=fs.existsSync(path.join(root,photo));
  // The owner-approved WebP set is the active production baseline.
  // Retain SVGs as rollback assets, not an accepted silent publishing fallback.
  if(!hasPhoto)fail(slug+': required featured WebP missing — no SVG fallback for published guide');
  const img=photo;
  const og='assets/images/knowledge/'+slug+'-og.webp';
  const html=read(file),canonical=domain+'/fa/rahnamaha/'+slug+'/';
  const title=html.match(/<title>([^<]+)<\/title>/i)?.[1]||'';
  if(!title)fail(slug+': missing title');
  if(title.length>60)fail(slug+': long SEO title ('+title.length+')');
  if(seenTitles.has(title))fail(slug+': duplicate title'); seenTitles.add(title);
  if(!/<html[^>]*lang="fa"/i.test(html))fail(slug+': lang != fa');
  if((html.match(/<h1\b/gi)||[]).length!==1)fail(slug+': expected one H1');
  if((html.match(/<h2\b/gi)||[]).length<2)fail(slug+': too few H2');
  if(html.length<5000)fail(slug+': unusually short HTML');
  const metaDescription=html.match(/<meta name="description" content="([^"]*)"/)?.[1]||'';
  if(metaDescription.length<30)fail(slug+': missing meta description');
  if(metaDescription.replace(/&amp;/g,'&').length>160)fail(slug+': long meta description');
  if(!html.includes('rel="canonical" href="'+canonical+'"'))fail(slug+': canonical mismatch');
  if(!html.includes('property="og:image" content="'+domain+'/'+og+'"'))fail(slug+': OG image mismatch');
  if(!html.includes('/'+img))fail(slug+': absent featured image reference');
  if(!cards.has(slug))fail(slug+': missing index card');
  if(cards.get(slug)!=='../../'+img)fail(slug+': hub image path mismatch');
  if(!sitemap.includes('<image:loc>'+domain+'/'+img+'</image:loc>'))fail(slug+': absent image sitemap entry');
  if(!fs.existsSync(path.join(root,img)))fail(slug+': absent featured image file');
  else if(hasPhoto){
    const bytes=fs.readFileSync(path.join(root,img));
    if(bytes.length<2000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')
      fail(slug+': invalid WebP signature');
    const ogPath=path.join(root,og);
    if(!fs.existsSync(ogPath))fail(slug+': missing 1200x630 Open Graph image');
    else {
      const ogBytes=fs.readFileSync(ogPath);
      if(ogBytes.length<2000||ogBytes.toString('ascii',0,4)!=='RIFF'||ogBytes.toString('ascii',8,12)!=='WEBP')
        fail(slug+': invalid Open Graph WebP');
    }
    if(!html.includes('property="og:image:width" content="1200"') ||
       !html.includes('property="og:image:height" content="630"'))
      fail(slug+': missing OG dimensions');
  } else {
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
else console.log('Knowledge Hub QA PASSED: '+guideSlugs.length+' guides, '+cards.size+' image cards, all active featured image and Open Graph files, internal local targets, metadata and JSON-LD checked.');
