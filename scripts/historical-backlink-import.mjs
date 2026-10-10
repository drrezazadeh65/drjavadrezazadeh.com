import fs from 'node:fs';
import path from 'node:path';
import {loadHistoricalAuthorityRegistry, normalizeHistoricalPath, classifyHistoricalTarget, authorityScore, priorityFromScore} from '../platform/historical-authority.mjs';

const input=process.argv[2];
if(!input){
  console.error('Usage: node scripts/historical-backlink-import.mjs <ahrefs-or-backlink-export.csv> [output.json]');
  process.exit(2);
}
const out=process.argv[3]||'';
const text=fs.readFileSync(input,'utf8').replace(/^\uFEFF/,'');
const first=(text.split(/\r?\n/,1)[0]||'');
const candidates=[',','\t',';'];
const delimiter=candidates.map(d=>[d,(first.split(d).length-1)]).sort((a,b)=>b[1]-a[1])[0][0];

function parseLine(line,sep){
  const cells=[];let cur='';let quoted=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(quoted&&line[i+1]==='"'){cur+='"';i++;continue}
      quoted=!quoted;continue;
    }
    if(ch===sep&&!quoted){cells.push(cur);cur='';continue}
    cur+=ch;
  }
  cells.push(cur);
  return cells.map(x=>x.trim());
}
const lines=text.split(/\r?\n/).filter(Boolean);
const headers=parseLine(lines.shift()||'',delimiter);
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
for(const raw of lines){
  const row=parseLine(raw,delimiter);
  const target=row[targetIdx]||'';
  let u;
  try{u=new URL(target)}catch{ignored++;continue}
  if(!allowedHosts.has(u.hostname.toLowerCase())){ignored++;continue}
  const key=normalizeHistoricalPath(u.pathname,registry.production_origin);
  if(!groups.has(key)) groups.set(key,{path:key,rows:0,referringDomains:new Set(),referringPages:new Set(),dofollowDomains:new Set(),maxDomainRating:0,backlinks:0});
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

const targets=[...groups.values()].map(g=>{
  const classification=classifyHistoricalTarget(g.path,registry);
  const metrics={
    referringDomains:g.referringDomains.size,
    dofollowDomains:g.dofollowDomains.size,
    maxDomainRating:g.maxDomainRating,
    backlinks:Math.round(g.backlinks)
  };
  const score=authorityScore(metrics);
  return {
    path:g.path,
    ...metrics,
    referringPages:g.referringPages.size,
    score,
    priority:priorityFromScore(score),
    action:classification.action,
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
  summary:{
    preserve_home:targets.filter(x=>x.action==='PRESERVE_HOME').length,
    preserve_shop:targets.filter(x=>x.action==='PRESERVE_SHOP').length,
    already_mapped:targets.filter(x=>x.action==='ALREADY_MAPPED').length,
    quarantine_gone:targets.filter(x=>x.action==='QUARANTINE_GONE').length,
    review:targets.filter(x=>x.action==='REVIEW').length
  },
  targets
};
const rendered=JSON.stringify(result,null,2)+'\n';
if(out){fs.writeFileSync(out,rendered);console.log('Historical backlink analysis written to '+out)}
else process.stdout.write(rendered);
