#!/usr/bin/env node
/**
 * Bilingual Schema.org inventory and semantic audit.
 * Reads committed public HTML only. Never crawls private accounts/API, never
 * fetches a site, sends user data, overwrites pages or deploys anything.
 * The evidence file generated under .artifacts is source-only, NOT a live
 * Schema Markup Validator / Google Rich Results certificate.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const BASE='https://drjavadrezazadeh.com';
const skip=new Set(['.git','node_modules','.public-site','dist','work','proposals','test-results',
  '.artifacts','coverage','.next','tmp','.cache','vendor']);
const htmlRoute=rel=>rel==='index.html'?'/':rel.endsWith('/index.html')?'/'+rel.slice(0,-'index.html'.length):'/'+rel;
export function discoverHtml(root){
 const paths=[];
 const scan=dir=>{
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
   if(skip.has(ent.name)||ent.isSymbolicLink())continue;
   const location=path.join(dir,ent.name);
   if(ent.isDirectory())scan(location);
   else if(ent.isFile()&&ent.name.endsWith('.html'))paths.push(location);
  }
 };
 scan(root);return paths.sort();
}
const attr=(tag,name)=>{
 const found=tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(["\\x27])([\\s\\S]*?)\\1','i'));
 return found?.[2]??null;
};
const tag=(html,tagName,relevantAttr,matchValue)=>{
 const tags=html.match(new RegExp('<'+tagName+'\\b[^>]*>','gi'))||[];
 return tags.find(item=>{
   const value=attr(item,relevantAttr);
   return typeof value==='string'&&value.toLowerCase()===matchValue.toLowerCase();
 })||null;
};
export function collectJsonLd(html){
 const scripts=html.match(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)||[];
 const blocks=[];
 for(const raw of scripts){
  const opening=raw.match(/^<script\b[^>]*>/i)?.[0]||'';
  if(attr(opening,'type')?.toLowerCase()!=='application/ld+json')continue;
  const source=raw.slice(opening.length).replace(/<\/script\s*>$/i,'').trim();
  try{blocks.push({json:JSON.parse(source),error:null});}
  catch(e){blocks.push({json:null,error:String(e.message).slice(0,180)});}
 }
 return blocks;
}
const graphNodes=doc=>{
 if(!doc||typeof doc!=='object')return [];
 return Array.isArray(doc)?doc.flatMap(graphNodes):
   Array.isArray(doc['@graph'])?doc['@graph'].flatMap(graphNodes):[doc];
};
const typeList=type=>typeof type==='string'?[type]:Array.isArray(type)?type.filter(x=>typeof x==='string'):[];
export function inspectHtml(route,html){
 const issues=[],report=(severity,code,details)=>issues.push({severity,code,details});
 const lang=attr(html.match(/<html\b[^>]*>/i)?.[0]||'','lang')||'und';
 const canonicalTag=tag(html,'link','rel','canonical');
 const canonical=canonicalTag?attr(canonicalTag,'href'):null;
 const meta=tag(html,'meta','name','robots');
 const robots=meta?attr(meta,'content')||'':'';
 const noindex=/\bnoindex\b/i.test(robots);
 const hreflang=[...(html.match(/<link\b[^>]*>/gi)||[])]
   .filter(t=>attr(t,'rel')?.toLowerCase()==='alternate'&&attr(t,'hreflang'))
   .map(t=>({lang:attr(t,'hreflang'),url:attr(t,'href')}));
 const blocks=collectJsonLd(html);
 const nodes=blocks.flatMap(x=>x.json===null?[]:graphNodes(x.json));
 const observedTypes=[...new Set(nodes.flatMap(x=>typeList(x?.['@type'])))].sort();
 for(const [i,block] of blocks.entries())
  if(block.error)report('error','malformed_json_ld','JSON-LD block '+(i+1)+': '+block.error);
 for(const node of nodes){
  if(!node||typeof node!=='object')continue;
  const types=typeList(node['@type']);
  if(types.includes('ScholarlyArticle')){
   if(Object.hasOwn(node,'volumeNumber'))report('error','article_direct_volume_number',node.name||'unnamed article');
   if(Object.hasOwn(node,'issueNumber'))report('error','article_direct_issue_number',node.name||'unnamed article');
  }
  if(node['@id']&&typeof node['@id']!=='string')
   report('error','invalid_entity_id','@id must be a string');
 }
 const entities=new Map();
 for(const node of nodes){
  const id=node?.['@id'];if(typeof id!=='string'||!id)continue;
  if(entities.has(id)){
   const previous=entities.get(id);
   const a=JSON.stringify(typeList(previous['@type']).sort()),b=JSON.stringify(typeList(node['@type']).sort());
   if(a!==b||(previous.name&&node.name&&previous.name!==node.name))
    report('error','conflicting_entity_id',id);
  }else entities.set(id,node);
 }
 for(const raw of blocks){
  if(raw.json===null)continue;
  const str=JSON.stringify(raw.json);
  if(/"(?:password_hash|password_plaintext|api[_-]?key|access_token|refresh_token|payment_card_number|student_full_name|customer_email_normalized)"\s*:/i.test(str))
   report('error','structured_data_private_field','A private-field key appeared in public JSON-LD');
 }
 if(!noindex){
  const expected=BASE+route;
  if(!canonical)report('warning','public_missing_canonical','No canonical link on indexable page');
  else if(canonical!==expected)report('warning','canonical_differs_from_route',canonical+' != '+expected);
  if(!blocks.length)report('warning','public_missing_jsonld','No JSON-LD on indexable page');
 }
 if(route.startsWith('/fa/')&&lang!=='fa')report('warning','language_path_mismatch',lang);
 if(route.startsWith('/en/')&&lang!=='en')report('warning','language_path_mismatch',lang);
 return {url:BASE+route,route,language:lang,indexability:noindex?'noindex':'indexable-or-unspecified',
  canonical,hreflang,schemaTypes:observedTypes,structuredDataBlocks:blocks.length,
  entityIds:[...entities.keys()],errors:issues.filter(i=>i.severity==='error'),
  warnings:issues.filter(i=>i.severity==='warning'),issues};
}
export function auditRepository(root){
 const inventory=[],types=new Map();
 for(const filename of discoverHtml(root)){
  const route=htmlRoute(path.relative(root,filename).split(path.sep).join('/'));
  const page=inspectHtml(route,fs.readFileSync(filename,'utf8'));
  inventory.push(page);
  for(const type of page.schemaTypes)types.set(type,(types.get(type)||0)+1);
 }
 return {generatedAt:new Date().toISOString(),source:'REPOSITORY_STATIC_SOURCE_NOT_LIVE',
   scope:'committed HTML pages; server PHP/OJS rendered output not inspected',
   count:inventory.length,types:Object.fromEntries([...types.entries()].sort()),
   summary:{errors:inventory.reduce((x,y)=>x+y.errors.length,0),
     warnings:inventory.reduce((x,y)=>x+y.warnings.length,0),
     indexable:inventory.filter(p=>p.indexability!=='noindex').length,
     noindex:inventory.filter(p=>p.indexability==='noindex').length},
   pages:inventory};
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const root=path.resolve(process.argv[process.argv.indexOf('--root')+1]||'.');
 const report=auditRepository(root);
 const out=path.join(root,'.artifacts','schema-entity-inventory.json');
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log('Schema entity source inventory: '+report.count+' HTML; '+
   report.summary.errors+' errors; '+report.summary.warnings+' warnings; saved '+out);
 // Production deployment remains protected by the existing 100% release gate.
 // --strict targets the verified publication-specific defects first; the full
 // inventory reports legacy findings without misrepresenting cleanup as done.
 if(process.argv.includes('--strict-publications')){
  const targets=['/en/publications/','/fa/entesharat-elmi/'];
  const cases=report.pages.filter(x=>targets.includes(x.route));
  if(cases.length!==2||cases.some(x=>x.errors.length)){
    console.error('Publications schema baseline failed');
    process.exitCode=1;
  }
 }
}
