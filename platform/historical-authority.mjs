import fs from 'node:fs';

export function loadHistoricalAuthorityRegistry(file='platform/historical-authority-registry.json'){
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

export function normalizeHistoricalPath(input, origin='https://drjavadrezazadeh.com'){
  let value=String(input||'').trim();
  if(!value) return '/';
  try{
    const u=new URL(value,origin);
    value=u.pathname||'/';
  }catch{}
  try{value=decodeURIComponent(value)}catch{}
  value=value.replace(/\/{2,}/g,'/');
  if(!value.startsWith('/')) value='/'+value;
  if(value!=='/'&&!value.endsWith('/')&&!/\.[a-z0-9]{1,8}$/i.test(value)) value+='/';
  return value;
}

// Preserve URL identity during historical evidence intake. Runtime redirects
// continue to use path-only normalization; this does not authorize any new route.
const historicalTrackingKeys=new Set([
  'gclid','dclid','gbraid','wbraid','fbclid','msclkid','yclid',
  'mc_cid','mc_eid','igshid','ref_src','utm'
]);
export function identifyHistoricalUrl(input,origin='https://drjavadrezazadeh.com'){
  const u=new URL(input,origin);
  const path=normalizeHistoricalPath(u.pathname,origin);
  const meaningful=[...u.searchParams.entries()].filter(([name])=>{
    const key=name.toLowerCase();
    return !key.startsWith('utm_')&&!historicalTrackingKeys.has(key);
  });
  meaningful.sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
  const query=new URLSearchParams(meaningful).toString();
  return {
    path,
    identity:query?path+'?'+query:path,
    queryIdentityReview:Boolean(query),
    queryDisposition:query?'QUERY_IDENTITY_REVIEW':'PATH_ONLY'
  };
}

export function historicalAuthorityMaps(registry){
  const redirects=new Map((registry.authority_redirects||[]).map(r=>[
    normalizeHistoricalPath(r.source,registry.production_origin),
    {...r,source:normalizeHistoricalPath(r.source,registry.production_origin),target:normalizeHistoricalPath(r.target,registry.production_origin)}
  ]));
  const candidates=new Map((registry.historical_candidates||[]).map(r=>[
    normalizeHistoricalPath(r.path,registry.production_origin),
    {...r,path:normalizeHistoricalPath(r.path,registry.production_origin)}
  ]));
  return {redirects,candidates};
}

export function classifyHistoricalTarget(input, registry){
  const identity=identifyHistoricalUrl(input,registry.production_origin);
  if(identity.queryIdentityReview) return {
    path:identity.identity,
    action:'QUERY_IDENTITY_REVIEW',
    reason:'Content-defining or unclassified query must be verified against historical source evidence.'
  };
  const path=identity.path;
  const {redirects,candidates}=historicalAuthorityMaps(registry);
  if(path==='/') return {path,action:'PRESERVE_HOME',target:'/'};
  if(path==='/shop/') return {path,action:'PRESERVE_SHOP',target:'/fa/shop/'};
  if(redirects.has(path)){
    const rec=redirects.get(path);
    return {path,action:'ALREADY_MAPPED',target:rec.target,status:rec.status};
  }
  if(candidates.has(path)){
    const rec=candidates.get(path);
    if(rec.decision==='GONE') return {path,action:'QUARANTINE_GONE',status:410,reason:rec.reason};
    return {path,action:'REVIEW',reason:rec.reason};
  }
  return {path,action:'REVIEW'};
}

export function authorityScore({referringDomains=0,dofollowDomains=0,maxDomainRating=0,clicks=0,impressions=0}={}){
  const rd=Math.max(0,Number(referringDomains)||0);
  const df=Math.max(0,Number(dofollowDomains)||0);
  const dr=Math.max(0,Math.min(100,Number(maxDomainRating)||0));
  const c=Math.max(0,Number(clicks)||0);
  const i=Math.max(0,Number(impressions)||0);
  return Math.round(
    Math.log2(rd+1)*30+
    Math.log2(df+1)*20+
    dr*0.35+
    Math.log2(c+1)*10+
    Math.log2(i+1)*3
  );
}

export function priorityFromScore(score){
  if(score>=130) return 'P0';
  if(score>=80) return 'P1';
  if(score>=35) return 'P2';
  return 'P3';
}
