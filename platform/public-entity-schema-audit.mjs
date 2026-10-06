import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const registry=JSON.parse(fs.readFileSync(path.join(root,'platform','public-entity-registry.json'),'utf8'));
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const first=(sitemap.match(/<loc>([^<]+)<\/loc>/i)||[])[1]||'';
const origin=first.replace(/\/sitemap-(?:core|fa|en|news)\.xml$/,'');
if(!origin) throw new Error('Could not derive canonical origin');
const entityId=origin+registry.entity_id_path;
const requiredSameAs=new Set((registry.scholarly_identifiers||[]).map(x=>x.url));
const failures=[];

function jsonLd(html){
 const out=[];
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{out.push(JSON.parse(m[1]));}catch(e){failures.push('Invalid JSON-LD: '+e.message);}
 }
 return out;
}
function nodes(blocks){
 const out=[];
 for(const b of blocks){
  if(Array.isArray(b?.['@graph'])) out.push(...b['@graph']);
  else out.push(b);
 }
 return out;
}

for(const surface of registry.schema_surfaces||[]){
 const p=path.join(root,surface.path);
 if(!fs.existsSync(p)){failures.push(surface.path+': missing entity surface');continue;}
 const html=fs.readFileSync(p,'utf8');
 const ns=nodes(jsonLd(html));
 const person=ns.find(x=>x?.['@type']==='Person'&&x?.['@id']===entityId);
 const reference=ns.some(x=>x?.mainEntity?.['@id']===entityId);
 if(surface.requires_person_object&&!person) failures.push(surface.path+': canonical Person object missing');
 if(surface.requires_person_reference&&!reference&&!person) failures.push(surface.path+': canonical Person reference missing');
 if(person){
  if(person.name!==registry.public_names.schema_name) failures.push(surface.path+': Person name drift');
  if(person.alternateName!==registry.public_names.fa_alternate) failures.push(surface.path+': Persian alternateName drift');
  const same=new Set(person.sameAs||[]);
  for(const url of requiredSameAs) if(!same.has(url)) failures.push(surface.path+': scholarly identifier missing '+url);
 }
}

const aboutEn=fs.readFileSync(path.join(root,'en','about','index.html'),'utf8');
const aboutFa=fs.readFileSync(path.join(root,'fa','darbare-man','index.html'),'utf8');
for(const [file,html] of [['en/about/index.html',aboutEn],['fa/darbare-man/index.html',aboutFa]]){
 if(/PhD in English Language Education/i.test(html)||/دکتری آموزش زبان انگلیسی/.test(html)) failures.push(file+': research focus incorrectly presented as degree title');
}

if(failures.length){console.error('Entity schema audit failures ('+failures.length+')');for(const f of failures) console.error('✗ '+f);process.exit(1);}
console.log('Public entity schema audit passed for '+registry.schema_surfaces.length+' surfaces.');
