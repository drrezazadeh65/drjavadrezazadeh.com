// Google ProfilePage eligibility gate: mainEntity must explicitly identify its type.
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=[
 'fa/index.html','en/index.html','en/about/index.html',
 'en/academic-profile/index.html','fa/darbare-man/index.html',
 'en/teaching/index.html','fa/tadris/index.html'
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
   if(node['@type']!=='ProfilePage'&&!(Array.isArray(node['@type'])&&node['@type'].includes('ProfilePage')))continue;
   found.add(file);
   const entity=node.mainEntity;
   const types=Array.isArray(entity?.['@type'])?entity['@type']:[entity?.['@type']];
   if(!entity||!types.includes('Person')){
    errors.push(file+': ProfilePage mainEntity must include @type Person directly');
   }
   if(entity?.['@id']!==canonicalId)errors.push(file+': ProfilePage mainEntity canonical identity drift');
   if(entity?.name!==canonicalName)errors.push(file+': ProfilePage mainEntity missing canonical name');
  }
 }
}
for(const p of required)if(!found.has(p))errors.push(p+': expected public ProfilePage JSON-LD missing');

const identityPages=['index.html','fa/index.html','en/index.html','fa/darbare-man/index.html','en/about/index.html'];
const requiredProfiles=[
 'https://orcid.org/0009-0008-1198-8866',
 'https://independent.academia.edu/JavadRezazadeh3',
 'https://www.semanticscholar.org/author/Javad-Rezazadeh-Yazdeli/116313005',
 'https://github.com/drrezazadeh65',
 'https://www.instagram.com/dr.rezazadeh/',
 'https://x.com/J_Rezazadeh',
 'https://m.facebook.com/DrJavadRezazadeh/'
];
for(const filename of identityPages){
 const html=fs.readFileSync(path.join(root,filename),'utf8');
 const nodes=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  .flatMap(m=>{try{const x=JSON.parse(m[1]);return x['@graph']||[x]}catch{errors.push(filename+': invalid identity JSON-LD');return []}});
 const person=nodes.find(x=>x['@type']==='Person'&&x['@id']===canonicalId);
 if(!person){errors.push(filename+': missing canonical Person identity');continue}
 if(!Array.isArray(person.sameAs)){errors.push(filename+': Person.sameAs absent');continue}
 for(const uri of requiredProfiles)if(!person.sameAs.includes(uri))errors.push(filename+': canonical social profile missing: '+uri);
 if(new Set(person.sameAs).size!==person.sameAs.length)errors.push(filename+': duplicate Person.sameAs');
 if(person.sameAs.some(uri=>uri.includes('scholar.google.com/scholar?q=')))
  errors.push(filename+': unverified Scholar name search cannot be a Person.sameAs identity');
 if(!html.includes('<meta name="twitter:creator" content="@J_Rezazadeh">'))
  errors.push(filename+': missing canonical X creator meta tag');
 if(filename!=='index.html'){
  for(const uri of ['https://x.com/J_Rezazadeh','https://m.facebook.com/DrJavadRezazadeh/'])
   if(!html.includes('href="'+uri+'"'))errors.push(filename+': visible verified profile link missing: '+uri);
 }
}

if(errors.length){console.error('ProfilePage contract FAILED:\n'+errors.map(x=>'- '+x).join('\n'));process.exit(1)}
console.log('ProfilePage contract PASSED: '+found.size+' public ProfilePages use typed, named, canonical Person mainEntity.');
