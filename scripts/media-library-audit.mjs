import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const registryPath=path.join(root,'assets','media-registry.json');
const policyPath=path.join(root,'platform','media-library-policy.json');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
const imageExt=/\.(?:svg|webp|avif|png|jpe?g|gif|ico)$/i;
const files=[];

function walk(dir){
  if(!fs.existsSync(dir)) return;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(ent.isFile()&&imageExt.test(ent.name)) files.push(path.relative(root,p).replaceAll(path.sep,'/'));
  }
}
walk(path.join(root,'assets','images'));
for(const p of ['favicon.svg','favicon.png','favicon.ico']) if(fs.existsSync(path.join(root,p))) files.push(p);
files.sort();

const required=policy.record_required||['path','kind','role','provenance','rights','alt_en','alt_fa'];
const records=registry.assets||[];
const failures=[];
const seen=new Set();

for(const record of records){
  if(!record.path){failures.push('Registry record missing path');continue;}
  if(seen.has(record.path)) failures.push('Duplicate registry record: '+record.path);
  seen.add(record.path);
  for(const key of required){
    if(record[key]===undefined||record[key]===null||String(record[key]).trim()==='') failures.push(record.path+': missing '+key);
  }
  if(/\b(?:UNKNOWN|RESTRICTED)\b/i.test(String(record.rights||''))) failures.push(record.path+': prohibited public rights state '+record.rights);
  if(record.kind==='book-cover' && record.composition_locked!==true) failures.push(record.path+': book cover must be composition_locked');
  if(!fs.existsSync(path.join(root,record.path))) failures.push('Stale registry path: '+record.path);
}

for(const file of files) if(!seen.has(file)) failures.push('Unregistered production image: '+file);

const bookCatalog=JSON.parse(fs.readFileSync(path.join(root,'platform','book-catalog.json'),'utf8'));
for(const book of bookCatalog.books||[]){
  const cover=String(book.bibliography?.cover_image||'').replace(/^\//,'');
  if(!cover) failures.push(book.id+': missing book cover path');
  else if(!seen.has(cover)) failures.push(book.id+': catalogue cover is absent from media registry: '+cover);
}

if(failures.length){
  console.error('\nMedia library audit failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Media library audit passed: '+files.length+' managed production images, '+records.length+' registry records, '+(bookCatalog.books||[]).length+' published book covers governed.');
