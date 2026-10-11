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
    if(entry.isDirectory()){walk(file);continue;}
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
 if(!html.includes('bookstore-hero-art')||!html.includes('talent-bookstore-hero-3d.svg'))errors.push(lang+' missing accessible cinematic hero');
}
if(!fs.existsSync(path.join(root,'assets/images/talent-bookstore-hero-3d.svg')))errors.push('Hero illustration omitted from release');
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('Public site free of removed textile shop; bilingual 3D bookstore artwork present.');
