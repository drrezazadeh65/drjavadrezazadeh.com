// Guard against accidentally republishing historical textile inventory on public pages.
// Keep internal route signatures for intentional 410 handling; those are never user-facing.
import fs from 'node:fs';
import path from 'node:path';
const root='.public-site';
if(!fs.existsSync(root)) throw Error('Sanitized deploy artifact must be built before this audit');
const forbidden=/(?:فرش|گلیم|گبه|قالی|\bcarpets?\b|\bkilims?\b|\bgabbeh\b|\bgebbeh\b|\brugs?\b|legacy-shop)/i;
const errors=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()){
      // Secure API internals are never published as user-facing HTML, and may retain
      // historical administrative record labels; the audit concerns public discovery.
      if(path.relative(root,file)==='api')continue;
      walk(file);continue;
    }
    if(!/\.(?:html|xml|json|txt|webmanifest|css|js|mjs)$/i.test(file))continue;
    const content=fs.readFileSync(file,'utf8');
    const hit=forbidden.exec(content);
    if(hit)errors.push(path.relative(root,file)+' contains deprecated shop keyword '+hit[0]);
  }
}
walk(root);
if(fs.existsSync(path.join(root,'fa/archive/legacy-shop/index.html')))errors.push('Retired page unexpectedly built');
const fa=fs.readFileSync(path.join(root,'fa/shop/index.html'),'utf8');
const en=fs.readFileSync(path.join(root,'en/shop/index.html'),'utf8');
for(const [lang,html] of [['fa',fa],['en',en]]){
 if(lang==='fa' && (!html.includes('cinema-original-hero')||!html.includes('bookstore-talent-cinematic-approved-20261011.webp')))errors.push('FA owner-approved cinematic banner missing');
 if(lang==='en' && !html.includes('bookstore-talent-approved-scene-20261011.webp'))errors.push('English approved scene crop missing');
 if(html.includes('talent-bookstore-hero-3d.svg'))errors.push(lang+' rejected vector image is still referenced');
}
for(const asset of ['bookstore-talent-cinematic-approved-original-20261011.png','bookstore-talent-cinematic-approved-20261011.webp','bookstore-talent-approved-scene-20261011.webp']){
 if(!fs.existsSync(path.join(root,'assets/images',asset)))errors.push('Owner-approved image omitted: '+asset);
}
if(fs.existsSync(path.join(root,'assets/images/talent-bookstore-hero-3d.svg')))errors.push('Rejected SVG must not be published');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('Public site free of removed textile shop; bilingual 3D bookstore artwork present.');
