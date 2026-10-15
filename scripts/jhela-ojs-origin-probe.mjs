/**
 * JHELA public OJS-origin safety probe v1 — read-only, CLI-only.
 * --self-test: deterministic local fixture checks, no network access.
 * --live: four HTTPS GET probes with strict CA validation. No login, write, files or secrets.
 * NEVER interprets a 200 as successful OJS installation / permission certification.
 */
import https from 'node:https';
const allowedHosts=new Set(['drjavadrezazadeh.com','journal.drjavadrezazadeh.com','journals.drjavadrezazadeh.com']);
const canonical='journal.drjavadrezazadeh.com';
const locations=[
  {id:'public_journal',url:'https://drjavadrezazadeh.com/journal/'},
  {id:'submission_prelaunch',url:'https://drjavadrezazadeh.com/journal/submission/'},
  {id:'nested_webroot',url:'https://drjavadrezazadeh.com/journals/'},
  {id:'singular_ojs_host',url:'https://journal.drjavadrezazadeh.com/'},
  {id:'plural_legacy_ojs_host',url:'https://journals.drjavadrezazadeh.com/'}
];
function redirectToSingular(target,base) {
  try {
    const u=new URL(target,base);
    return u.protocol==='https:'&&u.hostname===canonical&&!u.username&&!u.password&&!u.port;
  } catch {return false;}
}
function classify(id,{status=0,html='',location='',networkError=''}={}) {
  if(networkError)return {state:'UNVERIFIED',pass:false,detail:'HTTPS_OR_NETWORK_FAILURE'};
  const redirect=status>=300&&status<400;
  const redirected=redirect&&redirectToSingular(location,locations.find(p=>p.id===id)?.url||'https://drjavadrezazadeh.com/');
  if(id==='public_journal')return {state:status===200?'PUBLIC_REACHABLE':'PUBLIC_UNVERIFIED',pass:status===200,detail:'PUBLIC_INFORMATION_ONLY'};
  if(id==='submission_prelaunch'){
    const noindex=/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(html);
    return {state:status===200&&noindex?'PRELAUNCH_NOINDEX':'SUBMISSION_SAFETY_NOT_PROVEN',pass:status===200&&noindex,detail:'CHECK_PAGE_MARKUP'};
  }
  if(id==='nested_webroot')return {
    state:([403,404,410].includes(status)||redirected)?'NESTED_PATH_NOT_PUBLIC':'PUBLIC_PATH_REQUIRES_REVIEW',
    pass:[403,404,410].includes(status)||redirected,detail:'MAIN_ORIGIN_NESTED_OJS_GATE'
  };
  if(id==='plural_legacy_ojs_host')return {
    state:(redirected||[403,404,410].includes(status))?'NO_PARALLEL_PUBLIC_HOST':'DUPLICATE_HOST_REQUIRES_REVIEW',
    pass:redirected||[403,404,410].includes(status),detail:'LEGACY_HOST_REDIRECT_OR_DENY'
  };
  if(id==='singular_ojs_host'){
    const installer=/\b(?:install OJS|Open Journal Systems Installation|installation wizard)\b/i.test(html);
    const recognized=/<meta\b[^>]*name=["']generator["'][^>]*Open Journal Systems/i.test(html)||
      /(?:pkp_structure_page|ojs\/lib\/pkp|pkp\.sfu\.ca)/i.test(html);
    return {
      state:status!==200?'JOURNAL_ORIGIN_UNAVAILABLE':installer?'INSTALLER_EXPOSURE_POSSIBLE':recognized?'OJS_SURFACE_CANDIDATE':'OJS_INSTALL_UNVERIFIED',
      pass:status===200&&!installer&&recognized,
      detail:'HTTP_SURFACE_ONLY_NOT_OJS_E2E'
    };
  }
  return {state:'UNKNOWN_TARGET',pass:false,detail:'UNKNOWN'};
}
function requestPage(target) {
  return new Promise(resolve=>{
    const u=new URL(target.url);
    if(u.protocol!=='https:'||!allowedHosts.has(u.hostname)){resolve({id:target.id,status:0,networkError:'BAD_TARGET'});return;}
    let complete=false;
    const finish=result=>{if(complete)return;complete=true;resolve({id:target.id,...result});};
    const req=https.get(u,{timeout:11000,headers:{'User-Agent':'JHELA-ReadOnly-Origin-Probe/1.0','Accept':'text/html'}},res=>{
      let html='',size=0;
      res.on('data',chunk=>{
        size+=chunk.length;
        if(size>90000){req.destroy(Object.assign(new Error('Response too large'),{code:'MAX_BYTES'}));return;}
        html+=chunk.toString('utf8');
      });
      res.on('end',()=>finish({status:res.statusCode||0,location:res.headers.location||'',html}));
      res.on('error',()=>finish({status:0,networkError:'RESPONSE_STREAM'}));
    });
    req.on('timeout',()=>req.destroy(Object.assign(new Error('Timed out'),{code:'TIMEOUT'})));
    req.on('error',err=>finish({status:0,networkError:String(err.code||'NETWORK')}));
  });
}
function selfTest(){
  const checks=[
    classify('nested_webroot',{status:403}).pass,
    !classify('nested_webroot',{status:200,html:'<h1>Install OJS</h1>'}).pass,
    classify('nested_webroot',{status:301,location:'https://journal.drjavadrezazadeh.com/'}).pass,
    !classify('nested_webroot',{status:302,location:'http://journal.drjavadrezazadeh.com/'}).pass,
    !classify('plural_legacy_ojs_host',{status:200}).pass,
    classify('plural_legacy_ojs_host',{status:301,location:'https://journal.drjavadrezazadeh.com/'}).pass,
    classify('submission_prelaunch',{status:200,html:'<meta name="robots" content="noindex,follow">'}).pass,
    !classify('submission_prelaunch',{status:200,html:'<meta name="robots" content="index,follow">'}).pass,
    !classify('singular_ojs_host',{status:200,html:'<h1>Open Journal Systems Installation</h1>'}).pass,
    classify('singular_ojs_host',{status:200,html:'<main class="pkp_structure_page">OJS</main>'}).pass,
    !classify('singular_ojs_host',{status:200,html:'<h1>Hello World</h1>'}).pass,
    !classify('singular_ojs_host',{networkError:'SELF_SIGNED_CERT_IN_CHAIN'}).pass
  ];
  const passed=checks.every(Boolean);
  console.log(JSON.stringify({schema:'jhela-ojs-origin-probe-test-v1',passed,assertions:checks.length},null,2));
  if(!passed)process.exitCode=1;
}
if(process.argv.length!==3||!['--self-test','--live'].includes(process.argv[2])){
  console.error('Usage: node scripts/jhela-ojs-origin-probe.mjs --self-test|--live');
  process.exitCode=2;
}else if(process.argv[2]==='--self-test'){
  selfTest();
}else{
  const raw=await Promise.all(locations.map(requestPage));
  const observations=raw.map(result=>{
    const classified=classify(result.id,result);
    return {id:result.id,httpStatus:result.status||null,...classified};
  });
  const pass=observations.every(x=>x.pass);
  console.log(JSON.stringify({schema:'jhela-ojs-public-origin-observation-v1',checkedAt:new Date().toISOString(),strictTrustedTLS:true,readOnly:true,source:'EXTERNAL_HTTP_SURFACE_ONLY',publicOriginSurfacePass:pass,notCertified:['OJS installation','manuscript privacy','SMTP','auth and RBAC','peer review','backup restoration','payment'],observations},null,2));
  if(!pass)process.exitCode=1;
}
