import fs from 'node:fs';
import path from 'node:path';
import {loadHistoricalAuthorityRegistry, normalizeHistoricalPath, identifyHistoricalUrl, classifyHistoricalTarget, authorityScore, priorityFromScore} from '../platform/historical-authority.mjs';

const input=process.argv[2];
if(!input){
  console.error('Usage: node scripts/historical-backlink-import.mjs <ahrefs-or-backlink-export.csv> [output.json]');
  process.exit(2);
}
const out=process.argv[3]||'';
const text=fs.readFileSync(input,'utf8').replace(/^\uFEFF/,'');
// RFC 4180 reader: quoted fields may include separators, escaped quotes,
// CRLF and embedded newlines. Never split physical lines into logical records.
function parseCsvRecords(csv,separator){
  const records=[];let row=[],field='',quoted=false;
  for(let i=0;i<csv.length;i++){
    const ch=csv[i];
    if(quoted){
      if(ch==='"'){
        if(csv[i+1]==='"'){field+='"';i++}
        else quoted=false;
      }else field+=ch;
      continue;
    }
    if(ch==='"'){
      if(field.trim()!=='')throw new Error('Invalid CSV quote at character '+i);
      quoted=true;
    }else if(ch===separator){
      row.push(field.trim());field='';
    }else if(ch==='\r'||ch==='\n'){
      if(ch==='\r'&&csv[i+1]==='\n')i++;
      row.push(field.trim());field='';
      if(row.some(value=>value!==''))records.push(row);
      row=[];
    }else field+=ch;
  }
  if(quoted)throw new Error('Unterminated quoted CSV field');
  row.push(field.trim());
  if(row.some(value=>value!==''))records.push(row);
  return records;
}
function detectDelimiter(csv){
  const counts=new Map([[',',0],['\t',0],[';',0]]);
  let quoted=false;
  for(let i=0;i<csv.length;i++){
    const ch=csv[i];
    if(ch==='"'){
      if(quoted&&csv[i+1]==='"'){i++;continue}
      quoted=!quoted;
    }else if(!quoted){
      if(ch==='\r'||ch==='\n')break;
      if(counts.has(ch))counts.set(ch,counts.get(ch)+1);
    }
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0][0];
}
const lines=parseCsvRecords(text,detectDelimiter(text));
const headers=lines.shift()||[];
const normalized=headers.map(x=>x.toLowerCase().replace(/[^a-z0-9]+/g,''));
function idx(...names){
  for(const name of names){
    const n=name.toLowerCase().replace(/[^a-z0-9]+/g,'');
    const i=normalized.indexOf(n);
    if(i>=0) return i;
  }
  return -1;
}
const targetIdx=idx('Target URL','Target','TargetURL','Destination URL','URL');
if(targetIdx<0){
  console.error('Could not find a Target URL column. Headers: '+headers.join(' | '));
  process.exit(2);
}
const domainIdx=idx('Referring domain','ReferringDomain','Domain');
const pageIdx=idx('Referring page URL','ReferringPageURL','Referring page');
const drIdx=idx('Domain Rating','DR');
const dofollowIdx=idx('Dofollow','Link type','Type');
const backlinksIdx=idx('Backlinks','Backlink count','Links');

const registry=loadHistoricalAuthorityRegistry();
const allowedHosts=new Set(['drjavadrezazadeh.com','www.drjavadrezazadeh.com']);
const groups=new Map();
let accepted=0,ignored=0;
for(const row of lines){
  const target=row[targetIdx]||'';
  let u;
  try{u=new URL(target)}catch{ignored++;continue}
  if(!allowedHosts.has(u.hostname.toLowerCase())){ignored++;continue}
  const identity=identifyHistoricalUrl(u.href,registry.production_origin);
  const key=identity.identity;
  if(!groups.has(key)) groups.set(key,{path:identity.path,identity:key,queryIdentityReview:identity.queryIdentityReview,queryDisposition:identity.queryDisposition,rows:0,referringDomains:new Set(),referringPages:new Set(),dofollowDomains:new Set(),maxDomainRating:0,backlinks:0});
  const g=groups.get(key);g.rows++;accepted++;
  const domain=(domainIdx>=0?row[domainIdx]:'').toLowerCase();
  const page=pageIdx>=0?row[pageIdx]:'';
  if(domain) g.referringDomains.add(domain);
  else if(page){try{g.referringDomains.add(new URL(page).hostname.toLowerCase())}catch{}}
  if(page) g.referringPages.add(page);
  const dr=drIdx>=0?Number(String(row[drIdx]||'').replace(',','.')):0;
  if(Number.isFinite(dr)) g.maxDomainRating=Math.max(g.maxDomainRating,dr);
  const follow=dofollowIdx>=0?String(row[dofollowIdx]||'').toLowerCase():'';
  if(domain&&(/dofollow|follow|true|yes|1/.test(follow)&&!/nofollow/.test(follow))) g.dofollowDomains.add(domain);
  const bc=backlinksIdx>=0?Number(String(row[backlinksIdx]||'').replace(/[^0-9.]/g,'')):1;
  g.backlinks+=Number.isFinite(bc)&&bc>0?bc:1;
}

// Aggregate referral data by verified source domain before assigning URL-level actions.
const uniqueDomains=new Set([...groups.values()].flatMap(g=>[...g.referringDomains]));
const overallBacklinks=[...groups.values()].reduce((sum,g)=>sum+g.backlinks,0);
const targets=[...groups.values()].map(g=>{
  const classification=g.queryIdentityReview
    ?{action:'QUERY_IDENTITY_REVIEW',reason:'Meaningful or unclassified query parameters require original-content verification before any mapping.'}
    :classifyHistoricalTarget(g.path,registry);
  const metrics={
    referringDomains:g.referringDomains.size,
    dofollowDomains:g.dofollowDomains.size,
    maxDomainRating:g.maxDomainRating,
    backlinks:Math.round(g.backlinks)
  };
  const score=authorityScore(metrics);
  return {
    path:g.identity,
    base_path:g.path,
    query_identity_review:g.queryIdentityReview,
    query_disposition:g.queryDisposition,
    ...metrics,
    referringPages:g.referringPages.size,
    score,
    priority:priorityFromScore(score),
    action:classification.action,
    // Source authority never grants permission for a semantically unrelated redirect.
    redirect_allowed:classification.action==='ALREADY_MAPPED'||classification.action==='PRESERVE_SHOP',
    intent_verification_required:classification.action==='REVIEW'||classification.action==='QUERY_IDENTITY_REVIEW',
    permanently_retired:classification.action==='QUARANTINE_GONE',
    target:classification.target||null,
    status:classification.status||null,
    reason:classification.reason||null
  };
}).sort((a,b)=>b.score-a.score||b.referringDomains-a.referringDomains||a.path.localeCompare(b.path));

const result={
  schema_version:'1.0',
  generated_at:new Date().toISOString(),
  source:path.basename(input),
  accepted_rows:accepted,
  ignored_rows:ignored,
  target_count:targets.length,
  unique_referring_domains:uniqueDomains.size,
  total_reported_backlinks:Math.round(overallBacklinks),
  priority_target_urls:targets.filter(t=>t.priority==='P0'&&!t.permanently_retired).slice(0,20).map(t=>t.path),
  summary:{
    preserve_home:targets.filter(x=>x.action==='PRESERVE_HOME').length,
    preserve_shop:targets.filter(x=>x.action==='PRESERVE_SHOP').length,
    already_mapped:targets.filter(x=>x.action==='ALREADY_MAPPED').length,
    quarantine_gone:targets.filter(x=>x.action==='QUARANTINE_GONE').length,
    review:targets.filter(x=>x.action==='REVIEW'||x.action==='QUERY_IDENTITY_REVIEW').length,
    query_identity_review:targets.filter(x=>x.action==='QUERY_IDENTITY_REVIEW').length
  },
  targets
};
const rendered=JSON.stringify(result,null,2)+'\n';
if(out){fs.writeFileSync(out,rendered);console.log('Historical backlink analysis written to '+out)}
else process.stdout.write(rendered);
