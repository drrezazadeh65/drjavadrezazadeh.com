// Google ProfilePage eligibility gate: mainEntity must explicitly identify its type.
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=[
 'fa/index.html','en/index.html','en/about/index.html',
 'en/academic-profile/index.html','fa/darbare-man/index.html'
];
const canonicalId='https://drjavadrezazadeh.com/#person';
const canonicalName='Javad Rezazadeh Yazdeli';
const files=[];
function walk(rel=''){
 const folder=path.join(root,rel);
 for(const item of fs.readdirSync(folder,{withFileTypes:true})){
  if(['.git','node_modules','.public-site','test-results'].includes(item.name))continue;
  const next=path.join(rel,item.name);
  if(item.isDirectory())walk(next);
  else if(item.isFile()&&item.name==='index.html')files.push(next.replaceAll(path.sep,'/'));
 }
}
walk();
const found=new Set(),errors=[];
for(const file of files){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(html))continue;
 for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let obj;try{obj=JSON.parse(match[1]);}catch{errors.push(file+': invalid JSON-LD');continue;}
  const nodes=obj['@graph']||[obj];
  for(const node of nodes){
   if(node['@type']!=='ProfilePage'&&!Array.isArray(node['@type'])?.includes?.('ProfilePage'))continue;
   found.add(file);
   const entity=node.mainEntity;
   const types=Array.isArray(entity?.['@type'])?entity['@type']:[entity?.['@type']];
   if(!entity||!types.includes('Person')){
    errors.push(file+': ProfilePage mainEntity must include @type Person directly');
   }
   if(entity?.['@id']!==canonicalId)errors.push(file+': ProfilePage mainEntity canonical identity drift');
   if(entity?.name!==canonicalName)errors.push(file+': ProfilePage mainEntity missing canonical name');
   const people=nodes.filter(x=>x['@type']==='Person'&&x['@id']===canonicalId);
   if(!people.length&&!file.startsWith('fa/darbare-man/'))
    errors.push(file+': canonical Person graph node missing');
  }
 }
}
for(const p of required)if(!found.has(p))errors.push(p+': expected public ProfilePage JSON-LD missing');
if(errors.length){console.error('ProfilePage contract FAILED:\n'+errors.map(x=>'- '+x).join('\n'));process.exit(1)}
console.log('ProfilePage contract PASSED: '+found.size+' public ProfilePages use typed, named, canonical Person mainEntity.');
