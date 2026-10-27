#!/usr/bin/env node
/**
 * JREI owner-delegated unattended SEO image classification repair.
 * Edits only non-critical BELOW-H1 HTML images lacking BOTH loading and
 * fetchpriority. Never guesses content, rewrites routes, touches .php or SQL,
 * updates robots/sitemaps, changes hero images or deploys to Bertina.
 * The parent GitHub workflow owns CI, diff review, immutable commit and push.
 */
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';

const ROOT=resolve(process.cwd());
const REPOSITORY='drrezazadeh65/drjavadrezazadeh.com';
const BRANCH='migration/bertina-linux6';
const IGNORED=/(?:^|\/)(?:tests?|fixtures?|private|uploads|admin|app|vendor|node_modules|\.github)(?:\/|$)/i;
const PRIVATE=/(?:checkout|payment|login|register|dashboard|account|assessment|student|recover|bazyabi)/i;
const HERO=/(?:hero|banner|lead|masthead|header|first-fold|logo|brand|mark|primary|lcp|cover)/i;
const attr=(tag,name)=>new RegExp('\\b'+name+'\\s*=\\s*(["\x27])([^"\x27]*?)\\1','i').exec(tag)?.[2]??null;
const hash=value=>createHash('sha256').update(value).digest('hex');
const tracked=()=>execFileSync('git',['ls-files','-z','--','*.html'],{
 cwd:ROOT,encoding:'utf8',maxBuffer:5e6,timeout:20000
}).split('\0').filter(Boolean).sort();
const pathAllowed=p=>p.length<220&&p.endsWith('.html')&&
 !p.includes('\\')&&!p.startsWith('/')&&
 !p.split('/').some(x=>x==='.'||x==='..'||x==='')&&
 !IGNORED.test(p)&&!PRIVATE.test(p)&&
 (p==='index.html'||/^(?:fa|en|journal)\//.test(p));
const safeTarget=p=>{
 const full=resolve(ROOT,p);
 if(!full.startsWith(ROOT+sep))throw Error('JREI_SEO_SOURCE_ESCAPE');
 return full;
};
export function repairPageImages(html){
 if(typeof html!=='string'||html.length>1e6)return {html,changes:0};
 if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))
   return {html,changes:0};
 const h1=/<h1\b/i.exec(html), main=/<main\b/i.exec(html);
 if(!h1||!main)return {html,changes:0};
 let seenAfterHeading=0,changes=0;
 const fixed=html.replace(/<img\b[^>]*>/gi,(tag,offset)=>{
   if(offset<=h1.index||offset<=main.index)return tag;
   seenAfterHeading++;
   if(seenAfterHeading===1)return tag; // avoid the probable LCP image
   if(/\b(?:loading|fetchpriority)\s*=/i.test(tag))return tag;
   const src=attr(tag,'src')||'';
   const cls=attr(tag,'class')||'';
   if(!src||HERO.test(src)||HERO.test(cls)||/trustseal\.enamad\.ir/i.test(src))
     return tag;
   if(!/\balt\s*=/.test(tag)||!/\bwidth\s*=/.test(tag)||
      !/\bheight\s*=/.test(tag))return tag;
   changes++;
   return tag.replace(/\s*\/?>$/,ending=>' loading="lazy"'+ending);
 });
 return {html:fixed,changes};
}
export async function repairRepository({apply=false,maxFiles=6}={}){
 if(!Number.isInteger(maxFiles)||maxFiles<1||maxFiles>10)
   throw Error('JREI_SEO_BATCH_INVALID');
 const planned=[];
 for(const file of tracked()){
   if(!pathAllowed(file))continue;
   const full=safeTarget(file);
   const {size}=await import('node:fs/promises').then(m=>m.lstat(full));
   if(size>1e6)continue;
   const original=await readFile(full,'utf8');
   const outcome=repairPageImages(original);
   if(!outcome.changes)continue;
   planned.push({file,sourceSha256:hash(original),
     resultingSha256:hash(outcome.html),imagesClassified:outcome.changes});
   if(apply)await writeFile(full,outcome.html,'utf8');
   if(planned.length>=maxFiles)break;
 }
 const report={schema:'jr.jrei.autonomous-seo-repair.v1',branch:BRANCH,
  mode:apply?'APPLIED_TO_CI_CHECKOUT_PENDING_QA':'READ_ONLY_PREVIEW',
  changedFiles:planned.length,changes:planned,
  productionDeployed:false,newsPublished:false,
  generatedCodeExecuted:false,requiresPostChangeSeoRegression:true};
 const base=resolve(process.env.RUNNER_TEMP||tmpdir());
 const directory=join(base,'jrei-seo-repair');
 await mkdir(directory,{recursive:true,mode:0o700});
 await writeFile(join(directory,'repair-receipt.json'),
   JSON.stringify(report,null,2)+'\n',{mode:0o600});
 return report;
}
const main=process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname);
if(main){
 try{
   if(process.env.GITHUB_REPOSITORY!==REPOSITORY||
      process.env.GITHUB_REF_NAME!==BRANCH)
     throw Error('JREI_SEO_CANONICAL_ACTIONS_ONLY');
   const apply=process.argv.includes('--apply');
   const report=await repairRepository({apply});
   console.log('[JREI] AUTO_SEO_IMAGE_CLASSIFICATIONS='+report.changes.reduce((a,x)=>a+x.imagesClassified,0));
   console.log('[JREI] AUTO_SEO_FILES='+report.changedFiles);
   console.log('[JREI] CHANGE_STATE='+report.mode);
 }catch(e){
   console.error(/^[A-Z0-9_]{8,90}$/.test(String(e?.message))?e.message:'JREI_AUTO_SEO_REPAIR_FAILED');
   process.exitCode=1;
 }
}
