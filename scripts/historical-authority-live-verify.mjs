import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {loadHistoricalAuthorityRegistry} from '../platform/historical-authority.mjs';

const run=promisify(execFile);

export function parseCurlHeaders(raw){
  const blocks=raw.trim().split(/\r?\n\r?\n/).filter(x=>/^HTTP\//.test(x)&&!/^HTTP\/\S+ 1\d\d\b/.test(x));
  const last=blocks.at(-1);
  if(!last||!/^HTTP\/\S+ [2-5]\d\d\b/.test(last)) throw new Error('Missing origin response headers');
  const headers={};
  for(const line of last.split(/\r?\n/).slice(1)){
    const colon=line.indexOf(':');
    if(colon<0) continue;
    const key=line.slice(0,colon).toLowerCase();
    headers[key]=[headers[key],line.slice(colon+1).trim()].filter(Boolean).join(', ');
  }
  return headers;
}

// GET without redirect following, certificate bypass, DNS overrides or cookies.
// curl uses the runner's ordinary CA store and networking configuration.
export async function trustedPublicRequest(url){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'historical-authority-'));
  try{
    const {stdout}=await run('curl',[
      '--disable','--silent','--show-error','--connect-timeout','10','--max-time','25',
      '--proto','=http,https','--max-filesize','4194304',
      '--dump-header',path.join(dir,'headers'),'--output',path.join(dir,'body'),
      '--write-out','%{http_code}\n%{ssl_verify_result}',url
    ],{timeout:30000,maxBuffer:65536});
    const [status,verification]=stdout.trim().split('\n').map(Number);
    if(url.startsWith('https:')&&verification!==0) throw new Error('TLS verification failed');
    const raw=await fs.readFile(path.join(dir,'headers'),'utf8');
    // Ignore proxy CONNECT and informational response blocks.
    const headers=parseCurlHeaders(raw);
    return {status,headers,body:await fs.readFile(path.join(dir,'body'),'utf8')};
  }finally{
    await fs.rm(dir,{recursive:true,force:true});
  }
}

function attributes(tag){
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),m[3]]));
}

function assertPublicDestination(response,url){
  if(response.status!==200) throw new Error('destination must return 200 without another redirect');
  const tags=[...response.body.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(m=>attributes(m[0]));
  const robots=[response.headers['x-robots-tag']||'',...tags.filter(t=>/^(?:robots|googlebot|bingbot)$/i.test(t.name||'')).map(t=>t.content||'')].join(',');
  if(/\b(?:noindex|none)\b/i.test(robots)) throw new Error('destination is noindex');
  if(/\b(?:private|no-store)\b/i.test(response.headers['cache-control']||'')) throw new Error('destination has private cache policy');
  const canonical=tags.filter(t=>(t.rel||'').toLowerCase().split(/\s+/).includes('canonical'));
  if(canonical.length!==1||canonical[0].href!==url) throw new Error('destination must have exactly one matching self-canonical');
}

export async function verifyHistoricalAuthority(registry,{request=trustedPublicRequest,concurrency=4}={}){
  const canonical=new URL(registry.production_origin);
  if(canonical.protocol!=='https:'||canonical.origin!=='https://drjavadrezazadeh.com') throw new Error('Unexpected production origin');
  const hosts=[canonical.hostname,...registry.host_consolidation.aliases];
  const origins=hosts.flatMap(host=>['http','https'].map(scheme=>`${scheme}://${host}`));
  const cases=[];
  const add=(label,url,check)=>cases.push({label,url,check});
  const targets=new Set();
  for(const mapping of registry.authority_redirects){
    const target=new URL(mapping.target,canonical).href;
    if(new URL(target).origin!==canonical.origin||mapping.status!==301) throw new Error('Invalid authority mapping');
    targets.add(target);
    const sources=[mapping.source,mapping.source.replace(/\/$/,'')];
    for(const origin of origins) for(const source of new Set(sources)){
      const url=new URL(source,origin).href;
      add(`301 ${url}`,url,response=>{
        if(response.status!==301||response.headers.location!==target) throw new Error(`expected one 301 directly to ${target}`);
      });
    }
  }
  for(const target of targets) add(`public target ${target}`,target,response=>assertPublicDestination(response,target));
  for(const origin of origins){
    const url=origin+'/';
    add(`homepage ${url}`,url,response=>{
      if(origin===canonical.origin) assertPublicDestination(response,canonical.href);
      else if(response.status!==301||response.headers.location!==canonical.href) throw new Error('homepage must consolidate directly to canonical root');
    });
  }
  // Preserve existing tracking-query behavior without inventing WordPress ID mappings.
  const trackedTarget=canonical.origin+'/fa/shop/?utm_source=historical-authority-check';
  add('shop tracking query','http://www.'+canonical.hostname+'/shop/?utm_source=historical-authority-check',response=>{
    if(response.status!==301||response.headers.location!==trackedTarget) throw new Error('shop query must survive the direct canonical 301');
  });
  const unmapped=['/product/__historical-authority-unverified__/'];
  for(const candidate of registry.historical_candidates||[]){
    if(candidate.decision==='REVIEW') unmapped.push(candidate.path);
  }
  for(const source of unmapped){
    const url=new URL(source,canonical).href;
    add(`unmapped ${url}`,url,response=>{
      if(response.status!==404||response.headers.location) throw new Error('unverified historical URL must remain a genuine 404');
    });
  }

  let cursor=0;
  const failures=[];
  await Promise.all(Array.from({length:Math.min(Math.max(1,concurrency),cases.length)},async()=>{
    while(cursor<cases.length){
      const item=cases[cursor++];
      try{item.check(await request(item.url));}
      catch(error){failures.push({check:item.label,error:error.message});}
    }
  }));
  return {
    generated_at:new Date().toISOString(),
    source_sha:process.env.GITHUB_SHA||null,
    production_origin:canonical.origin,
    tls_policy:'ORDINARY_CA_AND_HOSTNAME_VERIFICATION_NO_BYPASS',
    network_context:process.env.HTTPS_PROXY||process.env.https_proxy?'CONFIGURED_PROXY':'DEFAULT_RUNNER_NETWORK',
    authority_redirects:registry.authority_redirects.length,
    origins,
    redirect_forms:['slash','slashless'],
    checks:cases.length,
    passed:cases.length-failures.length,
    failed:failures.length,
    failures
  };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const report=await verifyHistoricalAuthority(loadHistoricalAuthorityRegistry());
  if(process.argv[2]) await fs.writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
  console.log(`Historical authority strict live verification: ${report.passed}/${report.checks} checks; ${report.authority_redirects} mappings; ${report.network_context}.`);
  for(const failure of report.failures) console.error(`${failure.check}: ${failure.error}`);
  if(report.failed) process.exitCode=1;
}
