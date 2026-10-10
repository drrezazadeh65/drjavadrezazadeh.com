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
  const path=normalizeHistoricalPath(input,registry.production_origin);
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
