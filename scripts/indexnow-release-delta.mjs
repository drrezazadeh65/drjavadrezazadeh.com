#!/usr/bin/env node
/* Release-delta adapter for the EXISTING scripts/indexnow-submit.mjs system.
 * Does not send requests to IndexNow or rotate its stable verification key.
 * PRECONDITIONS: owner-run Deploy to Bertina succeeded and exact production
 * SHA was independently verified by performance-release-verify.mjs.
 */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {ORIGIN,validatedPublicUrl,classifyPublicResponse,publicGate} from './lib/performance-production.mjs';

const REPO='drrezazadeh65/drjavadrezazadeh.com';
const TARGET=process.env.PSI_RELEASE_SHA||'';
const DEPLOY_RUN=process.env.DEPLOY_WORKFLOW_RUN_ID||'';
const STATE='/tmp/indexnow-changed-eligible.txt';
// A rerun cannot become a second unattended submission attempt.
if(String(process.env.GITHUB_RUN_ATTEMPT||'1')!=='1')
 throw Error('indexnow_replay_attempt_blocked');
if(!/^[a-f0-9]{40}$/.test(TARGET)||!/^[0-9]{1,18}$/.test(DEPLOY_RUN)
  ||process.env.PSI_RELEASE_VERIFIED!=='1')throw Error('indexnow_requires_verified_owner_deployment');
fs.writeFileSync(STATE,'');
const token=process.env.GITHUB_TOKEN||'';
if(!token)throw Error('github_actions_read_token_missing');
const githubJson=async(route)=>{
 const response=await fetch('https://api.github.com/repos/'+REPO+route,{
  headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
   'X-GitHub-Api-Version':'2022-11-28','User-Agent':'JR-IndexNow-ReleaseDelta/1.0'},
  redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('github_release_metadata_unavailable_http_'+response.status);
 if(Number(response.headers.get('content-length'))>800000)throw Error('github_metadata_oversize');
 const text=await response.text();
 if(text.length>800000)throw Error('github_metadata_oversize');
 return JSON.parse(text);
};
const receiptName='indexnow-release-'+TARGET;
const receipts=await githubJson('/actions/artifacts?name='+encodeURIComponent(receiptName)+'&per_page=20');
if(!Array.isArray(receipts.artifacts))throw Error('github_receipt_shape_invalid');
if(receipts.artifacts.some(x=>x.name===receiptName&&!x.expired)){
 console.log('INDEXNOW_DELTA=SKIPPED category=already_completed_release sha='+TARGET);
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'should_send=false\n');
 process.exit(0);
}
const records=await githubJson('/actions/workflows/deploy-bertina.yml/runs?branch=migration%2Fbertina-linux6&status=success&per_page=100');
if(!Array.isArray(records.workflow_runs))throw Error('release_history_shape_invalid');
const current=records.workflow_runs.find(r=>String(r.id)===DEPLOY_RUN);
// GitHub artifacts are retained only for 90 days, so old release replays
// must fail closed rather than assume the original receipt still exists.
const ageMs=Date.now()-Date.parse(current?.created_at||'');
if(!Number.isFinite(ageMs)||ageMs<0||ageMs>30*86400*1000)
 throw Error('indexnow_release_too_old_or_unknown_to_replay');
if(!current||current.conclusion!=='success'||current.head_sha!==TARGET
 ||current.event!=='workflow_dispatch'||current.actor?.login!=='drrezazadeh65')
 throw Error('release_owner_run_not_confirmed');
const earlier=records.workflow_runs.filter(r=>r.id!==current.id&&r.conclusion==='success'
 &&r.head_branch==='migration/bertina-linux6'
 &&r.event==='workflow_dispatch'&&r.actor?.login==='drrezazadeh65'
 &&new Date(r.created_at)<new Date(current.created_at)
 &&/^[a-f0-9]{40}$/.test(r.head_sha||''));
earlier.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
// Two owner deployments of the same SHA do not represent new URLs;
// suppress even when the original API receipt could not be retained.
if(earlier.some(r=>r.head_sha===TARGET)){
 console.log('INDEXNOW_DELTA=SKIPPED category=previously_deployed_same_sha');
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'should_send=false\\n'.replace('\\n','\n'));
 process.exit(0);
}

if(!earlier.length){
 console.log('INDEXNOW_DELTA=SKIPPED category=unknown_previous_successful_release');
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'should_send=false\n');
 process.exit(0);
}
const BASE=earlier[0].head_sha;
try{
 execFileSync('git',['merge-base','--is-ancestor',BASE,TARGET],{stdio:'ignore',timeout:10000});
}catch{throw Error('previous_deployment_not_ancestor_of_release');}
const source=execFileSync('git',['diff','--name-only','--diff-filter=AM',BASE,TARGET,'--'],{
 encoding:'utf8',maxBuffer:1024*1024,timeout:15000});
const files=[...new Set(source.split(/\r?\n/).filter(Boolean))];
if(files.length>10000)throw Error('release_diff_exceeds_safe_limit');
const candidates=[];
for(const file of files){
 if(!/^(?:index\.html|(?:fa|en|journal)\/(?:[\p{L}a-z0-9_-]+\/){0,8}index\.html)$/u.test(file))continue;
 if(!fs.existsSync(file)||fs.statSync(file).size>400000)continue;
 const url=validatedPublicUrl(ORIGIN+'/'+file.replace(/index\.html$/,''));
 const html=fs.readFileSync(file,'utf8');
 if(classifyPublicResponse(html,url,200)!=='eligible')continue;
 candidates.push({file,url});
}
if(candidates.length>60)throw Error('too_many_changed_public_urls_for_safe_batch');
const verified=[];
for(const candidate of candidates){
 const gate=await publicGate(candidate.url);
 if(gate.ok)verified.push(candidate);
}
fs.writeFileSync(STATE,verified.map(x=>x.file).join('\n')+(verified.length?'\n':''));
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,
 'should_send='+(verified.length?'true':'false')+'\n'
 +'changed_count='+verified.length+'\n'
 +'baseline_sha='+BASE+'\n');
console.log('INDEXNOW_DELTA=READY changedPublicUrls='+verified.length+' candidateFiles='+candidates.length
 +' changedFiles='+files.length+' baseline='+BASE+' target='+TARGET);
if(process.env.GITHUB_STEP_SUMMARY)
 fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '### Changed-URL IndexNow eligibility\n- Source delta: '+BASE.slice(0,12)+' → '+TARGET.slice(0,12)
  +'\n- Public, self-canonical, live-verified changed URLs: '+verified.length
  +'\n- No full-sitemap submission, no private/noindex routes and no key rotation.\n');
