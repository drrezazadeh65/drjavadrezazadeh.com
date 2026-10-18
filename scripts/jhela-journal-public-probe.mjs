/**
 * JHELA external transport diagnostic, read-only and credential-free.
 * Verifies public DNS + trusted HTTPS without altering DNS/cPanel/OJS.
 * Never bypasses TLS verification and never prints or persists response bodies.
 */
import dns from 'node:dns/promises';
import https from 'node:https';
import fs from 'node:fs';

const hosts=Object.freeze([
  {role:'canonical',hostname:'journal.drjavadrezazadeh.com',path:'/'},
  {role:'legacy_plural',hostname:'journals.drjavadrezazadeh.com',path:'/'},
  {role:'main_domain_nested_alias',hostname:'drjavadrezazadeh.com',path:'/journals/'}
]);
const errorTag=e=>{
  const value=String(e?.code||e?.name||'UNKNOWN');
  return /^[A-Z][A-Z0-9_]{0,40}$/.test(value)?value:'UNKNOWN';
};
function cleanRedirect(location,origin){
  if(!location)return null;
  try{
    const u=new URL(location,origin);
    return {scheme:u.protocol.replace(':',''),hostname:u.hostname,pathname:u.pathname};
  }catch{return {scheme:'invalid',hostname:null};}
}
async function resolve(host){
  const checks=await Promise.allSettled([dns.resolve4(host),dns.resolve6(host)]);
  const [v4,v6]=checks;
  return {
    ipv4:v4.status==='fulfilled'&&v4.value.length>0,
    ipv6:v6.status==='fulfilled'&&v6.value.length>0,
    errors:checks.map(x=>x.status==='rejected'?errorTag(x.reason):null).filter(Boolean)
  };
}
function fetchVerified({hostname,path}){
  return new Promise(resolveResult=>{
    let done=false;
    const finish=x=>{if(done)return;done=true;resolveResult(x);};
    let snippet='';
    const req=https.request({
      hostname,port:443,path,method:'GET',timeout:14000,agent:false,
      rejectUnauthorized:true,headers:{'User-Agent':'JHELA-ReadOnly-TLS-Gate/1.0','Accept':'text/html,application/xhtml+xml'}
    },res=>{
      const cert=res.socket?.getPeerCertificate?.()||{};
      const location=cleanRedirect(res.headers.location,`https://${hostname}${path}`);
      const status=Number(res.statusCode)||null;
      res.setEncoding('utf8');
      res.on('data',chunk=>{if(snippet.length<60000)snippet+=chunk.slice(0,60000-snippet.length);});
      res.on('end',()=>{
        const suspectedInstaller=/(?:name\s*=\s*["'](?:admin_username|adminUsername|admin_password)|\/index\.php\/index\/install|<title[^>]*>[^<]*(?:open journal systems.{0,90}install|install.{0,90}open journal systems)|<h[1-5][^>]*>\s*(?:install open journal systems|installation of open journal systems))/i.test(snippet);
        finish({trustedTls:true,httpStatus:status,certificateExpires:cert.valid_to||null,
          redirect:location,installerVisible:suspectedInstaller});
      });
      res.on('error',error=>finish({trustedTls:true,httpStatus:status,redirect:location,error:errorTag(error)}));
    });
    req.on('timeout',()=>req.destroy(Object.assign(new Error('timeout'),{code:'ETIMEDOUT'})));
    req.on('error',error=>finish({trustedTls:false,error:errorTag(error)}));
    req.end();
  });
}
function classify(result){
  const canonical=result.find(x=>x.role==='canonical');
  const alias=result.find(x=>x.role==='main_domain_nested_alias');
  const diagnostics=[];
  if(!canonical.dns.ipv4&&!canonical.dns.ipv6)diagnostics.push('CANONICAL_DNS_NOT_PROVED');
  if(!canonical.http?.trustedTls)diagnostics.push('CANONICAL_CA_TLS_NOT_PROVED');
  if(canonical.http?.redirect?.scheme==='http')diagnostics.push('CANONICAL_DOWNGRADE_REDIRECT');
  // Public restoration bridge is an intentional temporary HTTPS redirect.
  // Only the exact apex /journal/ destination is allowed for this root probe.
  // Any other cross-origin redirect remains a transport failure.
  const redir=canonical.http?.redirect;
  const recovery=redir?.scheme==='https'&&redir.hostname==='drjavadrezazadeh.com'&&redir.pathname==='/journal/';
  if(recovery)diagnostics.push('PUBLIC_RECOVERY_BRIDGE_ACTIVE');
  if(redir?.hostname&&redir.hostname!=='journal.drjavadrezazadeh.com'&&!recovery)
    diagnostics.push('CANONICAL_REDIRECTS_TO_OTHER_HOST');
  if(canonical.http?.installerVisible)diagnostics.push('UNPROTECTED_PUBLIC_INSTALLER_POSSIBLE');
  if(alias.http?.installerVisible)diagnostics.push('MAIN_DOMAIN_OJS_INSTALLER_EXPOSED_POSSIBLE');
  if(alias.http?.httpStatus===200)diagnostics.push('MAIN_DOMAIN_NESTED_OJS_ALIAS_NEEDS_ACCESS_REVIEW');
  if(alias.http?.redirect?.scheme==='http')diagnostics.push('MAIN_DOMAIN_ALIAS_DOWNGRADE_REDIRECT');
  return {transportVerified:diagnostics.filter(x=>x.startsWith('CANONICAL_')).length===0,
    sensitiveRouteCheck:'NON_AUTHORITATIVE_PUBLIC_OBSERVATION',
    publicLaunchAuthorized:false,diagnostics};
}
if(process.argv[2]==='--contract'){
  if(hosts.length!==3||hosts[0].hostname!=='journal.drjavadrezazadeh.com'||
    hosts[1].hostname!=='journals.drjavadrezazadeh.com'||hosts[2].path!=='/journals/')throw new Error('wrong scope');
  const sample=classify([{role:'canonical',dns:{ipv4:false,ipv6:false},http:null},
    {role:'legacy_plural',dns:{ipv4:false,ipv6:false},http:null},
    {role:'main_domain_nested_alias',dns:{ipv4:false,ipv6:false},http:null}]);
  if(sample.transportVerified!==false||sample.publicLaunchAuthorized!==false)throw new Error('fail-open contract');
  const tls={role:'canonical',dns:{ipv4:true,ipv6:false},http:{trustedTls:true,httpStatus:302,
    redirect:{scheme:'https',hostname:'drjavadrezazadeh.com',pathname:'/journal/'}}};
  const other={role:'legacy_plural',dns:{ipv4:false,ipv6:false},http:null};
  const alias={role:'main_domain_nested_alias',dns:{ipv4:false,ipv6:false},http:null};
  const bridge=classify([tls,other,alias]);
  if(!bridge.transportVerified||bridge.publicLaunchAuthorized!==false||
     !bridge.diagnostics.includes('PUBLIC_RECOVERY_BRIDGE_ACTIVE'))throw new Error('recovery bridge contract');
  const unsafe=classify([{...tls,http:{...tls.http,redirect:{scheme:'https',hostname:'example.com',pathname:'/'}}},other,alias]);
  if(unsafe.transportVerified)throw new Error('cross-origin redirect must fail closed');
  console.log('PASS: journal TLS/hostname probe is read-only, supports exact public recovery, and defaults to NO-GO');
}else if(process.argv[2]==='--probe'){
  const probes=[];
  for(const item of hosts){
    const name=item.hostname;
    const resolved=await resolve(name);
    const http=(resolved.ipv4||resolved.ipv6)?await fetchVerified(item):null;
    probes.push({role:item.role,hostname:name,dns:resolved,http});
  }
  const summary=classify(probes);
  const report={schema:'jhela-public-tls-probe-v1',checkedAt:new Date().toISOString(),
    observer:'github-hosted-external-runner',source:'READ_ONLY_PUBLIC_OBSERVATION',
    probes,summary};
  const outfile='/tmp/jhela-journal-transport-probe.json';
  fs.writeFileSync(outfile,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  const clean=probes.map(x=>({role:x.role,dns:(x.dns.ipv4||x.dns.ipv6)?'RESOLVES':'NOT_PROVED',
    tls:x.http?.trustedTls?'CA_TRUSTED':'NOT_PROVED',tlsError:x.http?.error??null,status:x.http?.httpStatus??null,
    redirect:x.http?.redirect||null,possibleInstaller:x.http?.installerVisible===true}));
  console.log(JSON.stringify({probes:clean,summary},null,2));
  if(process.env.GITHUB_STEP_SUMMARY){
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '### JHELA public read-only origin check\n\n'+
      'Public transport certified: **'+(summary.transportVerified?'YES':'NO')+'**. '+
      '**No OJS installation, confidential-file protection or editorial approval is certified.**\n\n'+
      '| Origin | DNS | CA-trusted HTTPS | HTTP | Possible installer |\n|---|---|---|---|---|\n'+
      clean.map(x=>`| ${x.role} | ${x.dns} | ${x.tls} | ${x.status??'—'} | ${x.possibleInstaller?'YES':'NO EVIDENCE'} |`).join('\n')+
      '\n\nSignals: '+(summary.diagnostics.join(', ')||'none from this probe')+'\n');
  }
  if(!summary.transportVerified||summary.diagnostics.some(x=>/INSTALLER/.test(x)))process.exitCode=1;
}else{
  console.error('Usage: node scripts/jhela-journal-public-probe.mjs --contract|--probe');
  process.exitCode=2;
}
