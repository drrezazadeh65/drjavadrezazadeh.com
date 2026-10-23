/**
 * JREI: manually invoked, source-approved acquisition.
 * NOT an automatic crawler or a public API endpoint.
 * Rejects redirects, proxy, local/private IPs, unauthorised MIME, huge files
 * and requests forbidden by robots.txt; never retains a fulltext document.
 */
import https from 'node:https';
import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
import {stageSourceVersion,normalizeApprovedSource} from './jrei-governed-source-intake.mjs';

const LIMITS=Object.freeze({
  HTML:['text/html',2097152],PDF:['application/pdf',8388608],
  TEXT:['text/plain',1048576],JSON:['application/json',1048576]
});
const AGENT='JREI-ReviewedSourceIntake/1.0';
function isPublicIpv4(ip) {
  if(isIP(ip)!==4)return false;
  const [a,b,c]=ip.split('.').map(Number);
  if(a===0||a===10||a===127||a>=224||
    a===100&&b>=64&&b<=127||
    a===169&&b===254||a===172&&b>=16&&b<=31||
    a===192&&(b===168||b===0||b===88&&c===99||b===31||b===52)||
    a===198&&(b===18||b===19||b===51&&c===100)||
    a===203&&b===0&&c===113)return false;
  return true;
}
async function pinnedPublicAddress(host) {
  let records;
  try{records=await dns.resolve4(host);}
  catch{throw Error('SOURCE_DNS_UNAVAILABLE');}
  if(!Array.isArray(records)||!records.length||records.length>20||
     records.some(x=>!isPublicIpv4(x)))
    throw Error('SOURCE_HOST_NOT_PUBLIC');
  return records[0];
}
async function getPinned(url,ip,maxBytes) {
  const target=new URL(url);
  return await new Promise((resolve,reject)=>{
    let done=false;
    const finish=(error,value)=>{
      if(done)return;
      done=true;
      if(error)request.destroy();
      if(error)reject(error);else resolve(value);
    };
    const request=https.request({
      protocol:'https:',hostname:target.hostname,
      port:443,path:target.pathname+target.search,method:'GET',
      rejectUnauthorized:true,servername:target.hostname,
      agent:false,timeout:15000,
      lookup:(host,options,cb)=>{
        if(host!==target.hostname||!isPublicIpv4(ip))
          return cb(Error('DNS_PIN_REJECTED'));
        cb(null,ip,4);
      },
      headers:{'User-Agent':AGENT,'Accept-Encoding':'identity',
        'Accept':'application/pdf,text/html,application/json,text/plain'}
    },response=>{
      const status=response.statusCode;
      if(status!==200)return finish(Error(status>=300&&status<400?
        'SOURCE_REDIRECT_FORBIDDEN':'SOURCE_HTTP_NOT_AVAILABLE'));
      if(String(response.headers['content-encoding']||'identity')!=='identity')
        return finish(Error('CONTENT_ENCODING_NOT_ALLOWED'));
      const length=Number(response.headers['content-length']??0);
      if(!Number.isSafeInteger(length)||length>maxBytes)
        return finish(Error('SOURCE_LENGTH_NOT_ALLOWED'));
      let size=0;const chunks=[];
      response.on('data',chunk=>{
        size+=chunk.length;
        if(size>maxBytes)return finish(Error('SOURCE_SIZE_EXCEEDED'));
        chunks.push(chunk);
      });
      response.on('error',err=>finish(err));
      response.on('end',()=>{
        if(!size||length&&length!==size)
          return finish(Error('SOURCE_BODY_LENGTH_INVALID'));
        finish(null,{
          bytes:Buffer.concat(chunks,size),
          mime:String(response.headers['content-type']||'')
            .split(';')[0].trim().toLowerCase()
        });
      });
    });
    request.on('timeout',()=>finish(Error('SOURCE_REQUEST_TIMEOUT')));
    request.on('error',err=>finish(err));
    request.end();
  });
}
function robotsPermission(raw,path) {
  if(raw.length>131072)throw Error('ROBOTS_TOO_LARGE');
  const source=raw.toString('utf8');
  if(source.includes('\uFFFD'))throw Error('ROBOTS_INVALID_ENCODING');
  const groups=[];
  let agents=[],rules=[],hadRule=false;
  const flush=()=>{
    if(agents.length)groups.push({agents:[...agents],rules:[...rules]});
    agents=[];rules=[];hadRule=false;
  };
  for(const line of source.split(/\r?\n/)){
    const rule=line.split('#')[0].trim();
    if(!rule){if(hadRule)flush();continue;}
    const index=rule.indexOf(':');if(index<1)continue;
    const key=rule.slice(0,index).trim().toLowerCase();
    const value=rule.slice(index+1).trim();
    if(key==='user-agent'){
      if(hadRule)flush();
      if(value)agents.push(value.toLowerCase());
    }else if((key==='allow'||key==='disallow')&&agents.length){
      hadRule=true;
      if(value.length>1000)throw Error('ROBOTS_RULE_TOO_LONG');
      if(value)rules.push({allow:key==='allow',value});
    }else if(key==='crawl-delay'&&agents.length){
      hadRule=true;
      const seconds=Number(value);
      if(!Number.isFinite(seconds)||seconds<0||seconds>3600)
        throw Error('ROBOTS_DELAY_INVALID');
      rules.push({delay:seconds});
    }
  }
  flush();
  const named=groups.filter(g=>g.agents.some(x=>x!=='*'&&
    AGENT.toLowerCase().startsWith(x)));
  const group=named.length?named:groups.filter(g=>g.agents.includes('*'));
  if(!group.length)return {allowed:true,delay:0};
  const all=group.flatMap(g=>g.rules);
  let best=null;
  for(const r of all){
    if(r.delay!==undefined)continue;
    const expression=r.value.split('*').map(part=>
      part.replace(/[^a-zA-Z0-9/_.~-]/g,x=>'\\'+x)).join('.*');
    if(!new RegExp('^'+expression).test(path))continue;
    const rank=r.value.replace(/\*/g,'').length;
    if(!best||rank>best.rank||rank===best.rank&&r.allow)
      best={rank,allowed:r.allow};
  }
  return {allowed:best?best.allowed:true,
    delay:Math.max(0,...all.filter(x=>x.delay!==undefined).map(x=>x.delay))};
}
/**
 * Network invocation requires explicit owner-confirmed source permissions.
 * Caller must separately validate publisher, terms, copyright and data rights.
 * All returned metadata requires another administrative review before use.
 */
export async function acquireApprovedPublicSource({
  approvedSource,ownerConfirmedRights=false,preceding=null,
  publicationDate=null,originSection=null
}={}){
  if(ownerConfirmedRights!==true)
    throw Error('OWNER_RIGHTS_CONFIRMATION_REQUIRED');
  const source=normalizeApprovedSource(approvedSource);
  if(source.acquisitionMethod!=='PUBLIC_HTTPS'||
     source.usageRights!=='PUBLIC_REUSE_APPROVED')
    throw Error('SOURCE_AUTOMATED_ACQUISITION_NOT_ALLOWED');
  const url=new URL(source.canonicalUrl);
  const ip=await pinnedPublicAddress(url.hostname);
  // Do not auto-follow robots redirects, even to the same host.
  const robots=await getPinned('https://'+url.hostname+'/robots.txt',ip,131072);
  if(robots.mime!=='text/plain')throw Error('ROBOTS_MIME_INVALID');
  const policy=robotsPermission(robots.bytes,url.pathname+url.search);
  if(!policy.allowed)throw Error('ROBOTS_DISALLOWED');
  await pause(Math.max(12000,policy.delay*1000));
  const [allowedMime,limit]=LIMITS[source.contentType];
  const response=await getPinned(source.canonicalUrl,ip,limit);
  if(response.mime!==allowedMime)throw Error('SOURCE_MIME_NOT_ALLOWED');
  const proposal=stageSourceVersion({approvedSource:source,
    bytes:response.bytes,declaredMime:response.mime,
    observedAt:new Date().toISOString(),publicationDate,
    originSection,preceding});
  return Object.freeze({...proposal,
    acquisition:'OWNER_INVOKED_PINNED_PUBLIC_HTTPS',
    robotsPermissionChecked:true,contentSaved:false,
    sourceHttpStatus:200});
}
