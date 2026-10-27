import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
 GOV_REPOSITORY,GOV_BRANCH,GOV_DOMAINS,GOV_PUBLIC_PATHS,
 reconcileSiteGovernor
} from '../platform/jrei-v5/jrei-autonomous-site-governor.mjs';

const sha=createHash('sha256').update('source').digest('hex');
function valid(){
 const files=Object.fromEntries([...new Set(Object.values(GOV_DOMAINS).flat())]
   .map(path=>[path,{state:'PRESENT',sha256:sha}]));
 const publicProbes=Object.fromEntries(GOV_PUBLIC_PATHS.map(path=>[
   path,{state:'RESPONDING',status:200,latencyMs:120,attempts:1,
     consistentlyFailed:false}
 ]));
 return {repository:GOV_REPOSITORY,branch:GOV_BRANCH,sha:'a'.repeat(40),
   observedAt:1793030400,files,publicProbes};
}
test('all 8 distinct disciplines are observed but cannot self-attest deployment',()=>{
 const report=reconcileSiteGovernor(valid());
 assert.equal(Object.keys(report.areas).length,8);
 assert.equal(report.areas.NEWS.sourceIntegrity,'PRESENT');
 assert.equal(report.areas.DATABASE.runtimeState,'UNKNOWN');
 assert.equal(report.areas.SEO_GEO.runtimeState,'UNKNOWN');
 assert.equal(report.verifiedModelImprovement,false);
 assert.equal(report.productionChanged,false);
 assert.equal(report.databaseMigrationsExecuted,0);
 assert.equal(report.cmsArticlesPublished,0);
 assert.match(report.receiptSha256,/^[a-f0-9]{64}$/);
});
test('repeated public outage becomes GH issue only, not shell/deployment',()=>{
 const v=valid();
 v.publicProbes['/sitemap.xml']={state:'UNAVAILABLE',status:503,
   latencyMs:320,attempts:2,consistentlyFailed:true};
 const r=reconcileSiteGovernor(v);
 assert.deepEqual(r.suggestedActions.filter(x=>x.verifiedRuntimeFault).map(
   x=>[x.domain,x.permission,x.scope]),[
     ['SEO_GEO','CREATE_GITHUB_ISSUE_ONLY','/sitemap.xml']]);
 assert.equal(r.productionChanged,false);
});
test('cannot claim success from missing source files',()=>{
 const v=valid();
 v.files['api/operations-database-health.php']={
   state:'MISSING',sha256:null};
 const r=reconcileSiteGovernor(v);
 assert.equal(r.areas.DATABASE.sourceIntegrity,'REVIEW');
 assert.equal(r.areas.DATABASE.runtimeState,'UNKNOWN');
 assert.equal(r.suggestedActions[0].permission,'READ_ONLY');
});
test('external probes, paths, wrong branch and fabricated incident are denied',()=>{
 const bad=valid();
 bad.publicProbes['https://evil.example/']={state:'RESPONDING',status:200,
   latencyMs:0,attempts:1,consistentlyFailed:false};
 assert.throws(()=>reconcileSiteGovernor(bad),/UNTRUSTED_PATH/);
 const wrong=valid();wrong.branch='main';
 assert.throws(()=>reconcileSiteGovernor(wrong),/SCOPE_INVALID/);
 const fake=valid();fake.publicProbes['/']={state:'RESPONDING',status:200,
   latencyMs:0,attempts:1,consistentlyFailed:true};
 assert.throws(()=>reconcileSiteGovernor(fake),/WEB_PROBE_INVALID/);
});
test('source error cannot smuggle an invented SHA',()=>{
 const v=valid();v.files['robots.txt']={state:'ERROR',sha256:'f'.repeat(64)};
 assert.throws(()=>reconcileSiteGovernor(v),/FILE_PROBE_INVALID/);
});
test('identical evidence yields identical replay digest',()=>{
 const a=reconcileSiteGovernor(valid());
 const b=reconcileSiteGovernor(valid());
 assert.equal(a.receiptSha256,b.receiptSha256);
});
