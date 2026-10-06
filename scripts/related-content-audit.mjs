import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const origin='https://drjavadrezazadeh.com';
const failures=[];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'platform/related-content-map.json'),'utf8'));
const guides=manifest.guides||{};

const routeFile=route=>path.join(root,route.replace(/^\/+/,'').replace(/\/$/,'')+'/index.html');
const isNoindex=html=>/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
const hrefs=(html,route)=>[...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map(m=>{
  try{return new URL(m[1],origin+route).pathname.replace(/\/index\.html$/,'/');}catch{return null;}
}).filter(Boolean);

const guideDir=path.join(root,'fa/rahnamaha');
const leafRoutes=fs.readdirSync(guideDir,{withFileTypes:true})
  .filter(x=>x.isDirectory()&&fs.existsSync(path.join(guideDir,x.name,'index.html')))
  .map(x=>'/fa/rahnamaha/'+x.name+'/')
  .filter(route=>!isNoindex(fs.readFileSync(routeFile(route),'utf8')))
  .sort();

for(const route of leafRoutes){
  if(!guides[route]) failures.push(route+': missing from related-content manifest');
}

for(const [route,cfg] of Object.entries(guides)){
  const file=routeFile(route);
  if(!fs.existsSync(file)){failures.push(route+': source page missing');continue;}
  const html=fs.readFileSync(file,'utf8');
  if(isNoindex(html)) failures.push(route+': mapped guide unexpectedly noindex');
  if(!html.includes('class="related-cluster"')) failures.push(route+': related cluster missing from source');

  const links=new Set(hrefs(html,route));
  if(!Array.isArray(cfg.siblings)||cfg.siblings.length<2) failures.push(route+': fewer than two sibling guide mappings');
  if(!Array.isArray(cfg.services)||cfg.services.length<1) failures.push(route+': missing service mapping');

  for(const target of [...(cfg.siblings||[]),...(cfg.services||[])]){
    if(target===route) failures.push(route+': self-link in related-content manifest');
    const targetFile=routeFile(target);
    if(!fs.existsSync(targetFile)) failures.push(route+': mapped target missing '+target);
    else if(isNoindex(fs.readFileSync(targetFile,'utf8'))) failures.push(route+': mapped target is noindex '+target);
    if(!links.has(target)) failures.push(route+': source related links do not include '+target);
  }

  const primary=cfg.primaryService;
  if(!primary||!(cfg.services||[]).includes(primary)){
    failures.push(route+': invalid primaryService');
  }else{
    const serviceFile=routeFile(primary);
    if(fs.existsSync(serviceFile)){
      const serviceHtml=fs.readFileSync(serviceFile,'utf8');
      const serviceLinks=new Set(hrefs(serviceHtml,primary));
      if(!serviceLinks.has(route)) failures.push(primary+': missing reciprocal editorial link to '+route);
    }
  }
}

console.log('Related-content audit: '+leafRoutes.length+' indexable evergreen guides checked against '+Object.keys(guides).length+' manifest mappings.');
if(failures.length){
  console.error('Related-content failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Knowledge-to-service internal linking graph is source-visible and reciprocal.');
