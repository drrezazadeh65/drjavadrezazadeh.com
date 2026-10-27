/** Autonomous JREI source/public-health triage, with no production mutation.
 * Input values are observations, not model attestations. The public probe
 * worker is separate and checks only allowlisted URLs of the original site.
 */
import {createHash} from 'node:crypto';

export const GOV_SCHEMA='jr.jrei.autonomous-site-governor.v1';
export const GOV_REPOSITORY='drrezazadeh65/drjavadrezazadeh.com';
export const GOV_BRANCH='migration/bertina-linux6';
export const GOV_ORIGIN='https://drjavadrezazadeh.com';
export const GOV_DOMAINS=Object.freeze({
 SEO_GEO:['robots.txt','sitemap.xml','sitemap-fa.xml','sitemap-en.xml',
  'sitemap-news.xml','sitemap-services.xml'],
 NEWS:['platform/news-intelligence/master-21-ui-release.json',
  'platform/news-intelligence/official-publication-policy.mjs',
  'api/operations-jrei-news.php','api/jrei-news-private-article-bridge.php'],
 CODE:['.github/workflows/deploy-bertina.yml',
  'platform/jrei-python/jrei_orchestrator/continuous_autocode.py',
  'platform/jrei-python/jrei_orchestrator/sandbox_patch.py'],
 DATABASE:['api/operations-database-health.php',
  'docs/migrations/20261026_jrei_apex_owner_missions_mother_mysql.sql'],
 SELF_LEARNING:['platform/jrei-python/jrei_learning/metacognitive_cycle.py',
  'platform/jrei-python/jrei_learning/native_language_growth.py',
  'platform/jrei-v5/jrei-learning-loop.mjs'],
 DESIGN:['assets/css','fa','en'],
 OPERATIONS:['api/operations.php','api/operations-cron-dispatcher.php',
  'platform/jrei-v5/windows-worker/jrei-gpu-private-activate.ps1'],
 EXAMS:['api/jrei-exam-attempt-runtime.php',
  'platform/jrei-v5/jrei-examination-contracts.mjs']
});
export const GOV_PUBLIC_PATHS=Object.freeze([
 '/','/fa/','/en/','/robots.txt','/sitemap.xml','/journal/'
]);
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const canonical=o=>JSON.stringify(o);
const hash=o=>createHash('sha256').update(canonical(o)).digest('hex');
const fileState=new Set(['PRESENT','MISSING','ERROR']);
const webState=new Set(['RESPONDING','UNAVAILABLE','UNKNOWN']);
const safeSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const safeStatus=n=>Number.isInteger(n)&&n>=100&&n<=599;
const safeLatency=n=>Number.isInteger(n)&&n>=0&&n<=30000;

/** Pure reconciler. Never interpret a commit/HTTP 200 as a live skill receipt. */
export function reconcileSiteGovernor({
 repository,branch,sha,observedAt,files,publicProbes
}={}){
 if(repository!==GOV_REPOSITORY||branch!==GOV_BRANCH||
    !/^[a-f0-9]{40}$/.test(sha??'')||
    !Number.isInteger(observedAt)||observedAt<=0||
    !plain(files)||!plain(publicProbes)){
   throw Error('JREI_SITE_GOVERNOR_SCOPE_INVALID');
 }
 const all=[...new Set(Object.values(GOV_DOMAINS).flat())];
 if(Object.keys(files).some(x=>!all.includes(x))||
    Object.keys(publicProbes).some(x=>!GOV_PUBLIC_PATHS.includes(x))){
   throw Error('JREI_SITE_GOVERNOR_UNTRUSTED_PATH');
 }
 const areas={};const proposals=[];
 for(const [domain,paths] of Object.entries(GOV_DOMAINS)){
   const current=[];
   for(const path of paths){
     const item=files[path];
     if(!plain(item)||!fileState.has(item.state)||
        (item.state==='PRESENT'&&!safeSha(item.sha256))||
        (item.state!=='PRESENT'&&item.sha256!==null)){
       throw Error('JREI_SITE_GOVERNOR_FILE_PROBE_INVALID');
     }
     current.push({path,state:item.state,sha256:item.sha256});
     if(item.state!=='PRESENT'){
       proposals.push({
         domain,kind:'SOURCE_INTEGRITY_REVIEW',scope:path,
         urgency:'REVIEW',permission:'READ_ONLY',
         verifiedRuntimeFault:false
       });
     }
   }
   areas[domain]={
     sourceEntries:current.length,
     availableSourceEntries:current.filter(x=>x.state==='PRESENT').length,
     sourceIntegrity:current.every(x=>x.state==='PRESENT')?'PRESENT':'REVIEW',
     runtimeState:'UNKNOWN',
     autonomousProductionWriteExecuted:false
   };
 }
 const http={};
 for(const path of GOV_PUBLIC_PATHS){
   const item=publicProbes[path];
   if(!plain(item)||!webState.has(item.state)||
      !(item.status===null||safeStatus(item.status))||
      !(item.latencyMs===null||safeLatency(item.latencyMs))||
      !Number.isInteger(item.attempts)||item.attempts<0||item.attempts>2||
      typeof item.consistentlyFailed!=='boolean'||
      (item.consistentlyFailed&&item.attempts!==2)||
      (item.state==='RESPONDING'&&(item.status===null||item.status<200||item.status>=400))||
      (item.consistentlyFailed&&item.state!=='UNAVAILABLE')){
     throw Error('JREI_SITE_GOVERNOR_WEB_PROBE_INVALID');
   }
   http[path]={
     state:item.state,status:item.status,latencyMs:item.latencyMs,
     attempts:item.attempts,consistentlyFailed:item.consistentlyFailed
   };
   if(item.consistentlyFailed){
     proposals.push({
       domain:path.includes('sitemap')||path==='/robots.txt'?'SEO_GEO':'OPERATIONS',
       kind:'CONFIRMED_PUBLIC_ROUTE_INVESTIGATION',scope:path,
       urgency:'HIGH',permission:'CREATE_GITHUB_ISSUE_ONLY',
       verifiedRuntimeFault:true
     });
   }
 }
 const observation={
   schema:GOV_SCHEMA,repository,branch,sha,observedAt,
   areas,publicProbes:http,
   independentRuntimeSystems:{
     mysql:'NOT_CHECKED_FROM_PUBLIC_GITHUB_RUNNER',
     privateWorker:'NOT_CHECKED_FROM_PUBLIC_GITHUB_RUNNER',
     privateNewsPublisher:'NOT_CHECKED_FROM_PUBLIC_GITHUB_RUNNER',
     publicUserChatQuality:'NOT_CHECKED_FROM_PUBLIC_GITHUB_RUNNER'
   },
   suggestedActions:proposals.slice(0,100),
   verifiedModelImprovement:false,productionChanged:false,
   ownerPermissionsModified:false,scientificPublicationApproved:false,
   cmsArticlesPublished:0,databaseMigrationsExecuted:0,
 };
 return Object.freeze({...observation,receiptSha256:hash(observation)});
}
