#!/usr/bin/env node
/**
 * Bounded, zero-fee Crossref metadata observation for the canonical public publications page.
 * --self-test validates contracts offline. --collect reads public Crossref metadata only.
 * This does not attest authorship or replace publication/editorial peer review.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const publicationPath=path.join(root,'en/publications/index.html');
const output=path.join(root,'api/internal/free-scholar-observation.json');
const sourceOrigin='https://drjavadrezazadeh.com/en/publications/';
const MAX_ITEMS=10;
const doiPattern=/^10\.\d{4,9}\/[\w.()/:;+-]{1,180}$/i;

export function articleDeclarations(html) {
  const articles=[];
  for(const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    let json;try{json=JSON.parse(match[1]);}catch{continue;}
    const nodes=Array.isArray(json)?json:(Array.isArray(json?.['@graph'])?json['@graph']:[json]);
    for(const node of nodes){
      if(node?.['@type']!=='ScholarlyArticle')continue;
      const identifier=String(node.identifier||'');
      const doi=identifier.match(/^https:\/\/doi\.org\/(10\..+)$/i)?.[1]?.toLowerCase();
      if(doi&&doiPattern.test(doi))articles.push({doi,declaredTitle:String(node.name||'').trim().slice(0,300),sourceUrl:sourceOrigin});
    }
  }
  return [...new Map(articles.map(a=>[a.doi,a])).values()].slice(0,MAX_ITEMS);
}
export function normalizeCrossref(message,item,observedAt) {
  if(!message||typeof message!=='object'||String(message.DOI||'').toLowerCase()!==item.doi)return {doi:item.doi,sourceUrl:item.sourceUrl,sourceTitle:item.declaredTitle,status:'mismatch',provider:'Crossref',checkedAt:observedAt,providerUrl:'https://api.crossref.org/works/'+encodeURIComponent(item.doi)};
  const publisher=typeof message.publisher==='string'?message.publisher.slice(0,240):null;
  const providerTitle=Array.isArray(message.title)&&typeof message.title[0]==='string'?message.title[0].slice(0,400):null;
  return {doi:item.doi,sourceUrl:item.sourceUrl,sourceTitle:item.declaredTitle,status:'metadata_found',provider:'Crossref',checkedAt:observedAt,providerUrl:'https://api.crossref.org/works/'+encodeURIComponent(item.doi),providerTitle,publisher,sourceClaimIndependentlyValidated:false};
}
function requireSafeReport(x) {
  assert.equal(x.schema,'free-scholar-observation-v1');
  assert.equal(x.provider,'Crossref');
  assert.match(x.observedAt,/^\d{4}-\d\d-\d\dT/);
  assert(x.records.length>0&&x.records.length<=MAX_ITEMS);
  for(const r of x.records){
    assert(doiPattern.test(r.doi));
    assert(['metadata_found','not_found','unavailable','mismatch'].includes(r.status));
    assert.equal(r.provider,'Crossref');
    assert(r.sourceUrl===sourceOrigin);
    assert(r.providerUrl.startsWith('https://api.crossref.org/works/'));
    assert(!Object.hasOwn(r,'citationCount'));
  }
  assert.equal(x.summary.attempted,x.records.length);
  assert.equal(x.summary.metadataFound,x.records.filter(r=>r.status==='metadata_found').length);
  return x;
}
async function readBoundedJson(url) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
    const res=await fetch(url,{redirect:'error',signal:controller.signal,headers:{Accept:'application/json','User-Agent':'RezazadehAcademicMetadataObserver/1.0 (+https://drjavadrezazadeh.com)'}});
    if(res.status===404)return {status:'not_found'};
    if(!res.ok)return {status:'unavailable',httpStatus:res.status};
    if(Number(res.headers.get('content-length'))>450000)return {status:'unavailable',reason:'oversize'};
    const reader=res.body?.getReader();if(!reader)return {status:'unavailable',reason:'empty'};
    let total=0;const chunks=[];
    try{
      while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>450000){await reader.cancel();return {status:'unavailable',reason:'oversize'};}chunks.push(value);}
    }finally{reader.releaseLock();}
    const joined=Buffer.concat(chunks.map(v=>Buffer.from(v)));
    const decoded=JSON.parse(joined.toString('utf8'));
    return decoded.status==='ok'&&decoded.message?{status:'metadata_found',message:decoded.message}:{status:'unavailable',reason:'invalid-response'};
  }catch(e){return {status:'unavailable',reason:e.name==='AbortError'?'timeout':'request-failed'};}
  finally{clearTimeout(timer);}
}
async function collect(){
  const pages=articleDeclarations(fs.readFileSync(publicationPath,'utf8'));
  if(pages.length===0)throw Error('No publication DOI declarations: refusing empty report');
  const at=new Date().toISOString(),records=[];
  for(const item of pages){
    const url='https://api.crossref.org/works/'+encodeURIComponent(item.doi);
    const fetched=await readBoundedJson(url);
    const base={doi:item.doi,sourceUrl:item.sourceUrl,sourceTitle:item.declaredTitle,checkedAt:at,provider:'Crossref',providerUrl:url};
    if(fetched.status==='metadata_found')records.push(normalizeCrossref(fetched.message,item,at));
    else records.push({...base,status:fetched.status,reason:fetched.reason??(fetched.httpStatus?'http-'+fetched.httpStatus:undefined)});
  }
  const result=requireSafeReport({schema:'free-scholar-observation-v1',observedAt:at,provider:'Crossref',
    sourceFile:'en/publications/index.html',sourceBranch:'migration/bertina-linux6',sourceCommit:process.env.GITHUB_SHA||null,
    scope:'Public DOI metadata; no verified authorship, ranking, indexing, traffic or revenue',
    records,summary:{attempted:records.length,metadataFound:records.filter(x=>x.status==='metadata_found').length,
      unavailable:records.filter(x=>x.status==='unavailable').length,notFound:records.filter(x=>x.status==='not_found').length,
      mismatch:records.filter(x=>x.status==='mismatch').length},
    caveat:'Provider metadata found means a DOI record is retrievable, not that site publication metadata, authorship, citations or ranking are independently verified.'});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({schema:result.schema,observedAt:result.observedAt,summary:result.summary,status:result.summary.metadataFound?'partial_or_full_metadata_available':'no_metadata_verified'}));
}
function selfTest(){
 const sample='<script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'ScholarlyArticle',name:'Test',identifier:'https://doi.org/10.1234/example-1'},{'@type':'WebPage',identifier:'https://doi.org/10.1234/example-2'}]})+'</script>';
 const declarations=articleDeclarations(sample);
 assert.equal(declarations.length,1);assert.equal(declarations[0].doi,'10.1234/example-1');
 const at='2026-10-12T00:00:00.000Z';
 const found=normalizeCrossref({DOI:'10.1234/example-1',title:['Provider title'],publisher:'Publisher'},declarations[0],at);
 assert.equal(found.status,'metadata_found');assert.equal(found.sourceClaimIndependentlyValidated,false);
 const mismatch=normalizeCrossref({DOI:'10.9999/wrong'},declarations[0],at);assert.equal(mismatch.status,'mismatch');
 requireSafeReport({schema:'free-scholar-observation-v1',provider:'Crossref',observedAt:at,records:[found,mismatch],summary:{attempted:2,metadataFound:1}});
 console.log('PASS free scholarly observer: DOI allowlist, metadata mismatch protection and no asserted citation counts');
}
const args=process.argv.slice(2);
if(args.includes('--self-test'))selfTest();
else if(args.includes('--check')){
 const observation=JSON.parse(fs.readFileSync(output,'utf8'));
 requireSafeReport(observation);
 console.log('PASS existing Crossref observation schema: '+observation.records.length+' DOI items; '+observation.summary.metadataFound+' retrieved');
}
else if(args.includes('--collect'))await collect();
else{console.error('Use --collect, --check or --self-test');process.exitCode=2;}
