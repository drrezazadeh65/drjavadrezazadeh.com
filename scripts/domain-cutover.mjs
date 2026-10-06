import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const current='https://drrezazadeh65.github.io/drjavadrezazadeh.com';
const targetArg=process.argv.find(x=>x.startsWith('http'));
const dryRun=process.argv.includes('--dry-run');
const httpsReady=process.argv.includes('--confirm-https-ready');
if(!targetArg){
  console.error('Usage: node scripts/domain-cutover.mjs https://drjavadrezazadeh.com [--dry-run | --confirm-https-ready]');
  process.exit(1);
}
const target=targetArg.replace(/\/+$/,'');
if(!/^https:\/\/[a-z0-9.-]+$/i.test(target)){
  console.error('Target must be a clean HTTPS origin, e.g. https://drjavadrezazadeh.com');
  process.exit(1);
}
if(!dryRun&&!httpsReady){
  console.error('Write-mode cutover requires --confirm-https-ready after external DNS and TLS verification.');
  process.exit(3);
}
const eligible=(name)=>name.endsWith('.html')||name.endsWith('.xml')||name==='robots.txt'||name==='security.txt'||name==='site.webmanifest';
const files=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(ent.isFile()&&eligible(ent.name)) files.push(p);
  }
}
walk(root);
let changed=0,replacements=0;
for(const file of files){
  const before=fs.readFileSync(file,'utf8');
  const hits=before.split(current).length-1;
  if(!hits) continue;
  replacements+=hits; changed++;
  if(!dryRun) fs.writeFileSync(file,before.split(current).join(target),'utf8');
  console.log((dryRun?'WOULD UPDATE ':'UPDATED ')+path.relative(root,file)+' ('+hits+')');
}
const ecosystemRegistryPath=path.join(root,'platform','ecosystem-registry.json');
if(fs.existsSync(ecosystemRegistryPath)){
  const registry=JSON.parse(fs.readFileSync(ecosystemRegistryPath,'utf8'));
  if(registry?.origins?.production_target!==target){
    console.error('Target origin does not match platform/ecosystem-registry.json production_target.');
    process.exit(4);
  }
  if(dryRun){
    console.log('WOULD UPDATE platform/ecosystem-registry.json origin state');
  }else{
    registry.origins.current_public_origin=target;
    registry.origin_states=registry.origin_states||{};
    registry.origin_states.github_pages_repo_origin='LEGACY_REDIRECT_SOURCE';
    registry.origin_states.main_custom_domain='LIVE';
    fs.writeFileSync(ecosystemRegistryPath,JSON.stringify(registry,null,2)+'\n','utf8');
  }
}
console.log('\nFiles: '+changed+'; URL replacements: '+replacements+'; mode: '+(dryRun?'dry-run':'write'));
if(replacements===0){
  console.error('No current-origin URLs were found. Refusing to treat this as a successful cutover.');
  process.exit(2);
}
console.log('Next: run node scripts/seo-regression.mjs, inspect git diff, deploy, then submit the new sitemap in Search Console/Bing.');
