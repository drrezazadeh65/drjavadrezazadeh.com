#!/usr/bin/env node
/**
 * OWNER MASTERPLAN 100% — NON-BYPASSABLE DEFAULT DENIAL.
 * Evidence validator for ONE owner-authorized manual Bertina release.
 * This script never tests production by itself and never deploys anything.
 * Source CI / professional review / live-like staging evidence must be real.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const APPROVAL_PHRASE='I_APPROVE_THE_VERIFIED_100_PERCENT_MASTERPLAN_RELEASE';
const dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(dirname,'..');
const MANIFEST='docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json';
const FULL_COMMIT=/^[a-f0-9]{40}$/;
const ISO_DATE=/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/;
const ID=/^[a-z][a-z0-9_]*$/;
const validEvidence=(root,value)=>{
  if(typeof value!=='string'||!/^docs\/governance\/release-evidence\/[a-z0-9_-]+\.md$/.test(value))return false;
  const destination=path.resolve(root,value), base=path.resolve(root,'docs/governance/release-evidence');
  if(!destination.startsWith(base+path.sep))return false;
  try {
    if(!fs.statSync(destination).isFile()||fs.lstatSync(destination).isSymbolicLink()
       ||fs.statSync(destination).size<160)return false;
    const canonical=fs.realpathSync(destination);
    return canonical.startsWith(fs.realpathSync(base)+path.sep);
  } catch {return false;}
};
const run=(root,args)=>{
  const r=spawnSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:6_000_000});
  if(r.error||r.status!==0)throw Error('Git review ancestry or content verification failed.');
  return r.stdout;
};
export function assessMasterplanRelease(manifest,{
    root=ROOT,targetSha='',ownerConfirmation='',requireGit=true
  }={}){
  const errors=[];
  const fail=(condition,message)=>{if(!condition)errors.push(message);};
  if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))
    return {allowed:false,errors:['Full masterplan manifest is unavailable.']};
  fail(manifest.schema==='owner-masterplan-100-acceptance-v1','Unrecognized acceptance schema.');
  fail(manifest.canonicalRepository==='drrezazadeh65/drjavadrezazadeh.com'
    &&manifest.canonicalBranch==='migration/bertina-linux6','Incorrect canonical source.');
  fail(manifest.releaseState==='FULLY_VERIFIED_FOR_SINGLE_OWNER_RELEASE'
    &&manifest.ownerFinalAuthorization===true,'Final masterplan has not been owner-approved as 100% complete.');
  fail(ownerConfirmation===APPROVAL_PHRASE,'Explicit owner release confirmation is required.');
  const sha=manifest.reviewedSourceCommit;
  fail(typeof sha==='string'&&FULL_COMMIT.test(sha),'Missing immutable reviewed source commit.');
  fail(typeof targetSha==='string'&&FULL_COMMIT.test(targetSha),'Missing exact target commit.');
  for(const k of ['sourceCiEvidence','stagingEvidence','operationalReadinessEvidence',
      'independentReviewEvidence','finalOwnerApprovalEvidence']){
    fail(validEvidence(root,manifest[k]),'Missing independently reviewable '+k+'.');
  }
  const reviewItems=(key,count,idSet)=>{
    const rows=manifest[key];
    if(!Array.isArray(rows)||rows.length!==count){
      errors.push('Incomplete '+key+' coverage; expected '+count+' validated records.');return;
    }
    const seen=new Set();
    for(const item of rows){
      if(!item||typeof item!=='object'||!ID.test(item.id||'')||
         !idSet.has(item.id)||seen.has(item.id)){
        errors.push(key+' contains unapproved/duplicate identifiers.');continue;
      }
      seen.add(item.id);
      if(item.status!=='VERIFIED'||typeof item.reviewer!=='string'
         ||item.reviewer.trim().length<4||typeof item.reviewedAt!=='string'
         ||!ISO_DATE.test(item.reviewedAt)
         ||!validEvidence(root,item.sourceEvidence)
         ||!validEvidence(root,item.acceptanceEvidence)){
        errors.push(key+' '+item.id+' lacks confirmed source+acceptance evidence.');
      }
    }
    if(seen.size!==count)errors.push(key+' does not cover all required IDs.');
  };
  const sourceCatalog=JSON.parse(fs.readFileSync(path.resolve(root,'assets/data/service-catalog.json'),'utf8'));
  const serviceIds=new Set(sourceCatalog.services.filter(row=>row.sellable===true).map(row=>row.id));
  fail(serviceIds.size===21,'All 21 officially sellable services must be included.');
  const gateIds=new Set([
    'governance_source','approved_visual_identity','homepage','original_media_licensed',
    'academic_content_integrity','service_internal_links_40','service_price_benchmark',
    'service_checkout_claims','service_user_dashboard','service_owner_dashboard',
    'service_file_custody','service_receipt_custody','donation_regression','auth_email_oauth',
    'client_account_dashboard','owner_operations_dashboard','golden_talent','rcas','bahar',
    'golden_path','assessment_psychometrics','consultation_booking','bookstore_and_receipts',
    'scientific_journal_ojs','books_publications','operational_ai_assistant',
    'bilingual_architecture','seo_eeat_geo','mobile_pwa','accessibility',
    'performance_core_web_vitals','privacy_security','notification_email',
    'analytics_observability','database_migrations','hosting_staging_parity',
    'e2e_payment_service_journey','load_recovery_backups','independent_academic_peer_review',
    'independent_design_ux_review','production_release_preflight'
  ]);
  reviewItems('verifiedGates',gateIds.size,gateIds);
  reviewItems('verifiedServices',serviceIds.size,serviceIds);
  const destinations=manifest.verifiedInternalDestinations;
  if(!Array.isArray(destinations)||destinations.length<40)
    errors.push('Fewer than 40 actual, approved internal destinations are verified.');
  else{
    const visited=new Set();
    for(const target of destinations){
      const destination=target?.path;
      if(typeof destination!=='string'
         || !/^(?:fa|en)\/[a-z0-9/_-]+\/$/.test(destination)
         ||visited.has(destination)||!validEvidence(root,target.evidence)
         ||!fs.existsSync(path.join(root,destination,'index.html')))
        errors.push('Internal service destination is missing, duplicated or lacks real evidence.');
      else visited.add(destination);
    }
  }
  if(typeof sha==='string'&&FULL_COMMIT.test(sha)
     &&typeof targetSha==='string'&&FULL_COMMIT.test(targetSha)&&requireGit){
    try{
      run(root,['cat-file','-e',sha+'^{commit}']);
      run(root,['merge-base','--is-ancestor',sha,targetSha]);
      const delta=run(root,['diff','--name-only','--no-renames',sha,targetSha])
        .trim().split('\n').filter(Boolean);
      for(const file of delta)
        if(file!==MANIFEST&&!/^docs\/governance\/release-evidence\/[a-z0-9_-]+\.md$/.test(file))
          errors.push('Reviewed code changed after source approval: '+file);
      if(delta.length===0&&sha!==targetSha)
        errors.push('Reviewed-source ancestry could not be reconciled.');
    }catch(e){errors.push(e.message);}
  }
  return {allowed:errors.length===0,errors,reviewedGates:gateIds.size,requiredServices:serviceIds.size};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  let m;
  try{m=JSON.parse(fs.readFileSync(path.resolve(ROOT,MANIFEST),'utf8'));}
  catch{console.error('Release BLOCKED: owner masterplan acceptance manifest missing.');process.exit(1);}
  const result=assessMasterplanRelease(m,{
    targetSha:process.env.GITHUB_SHA??'',
    ownerConfirmation:process.env.OWNER_FINAL_MASTERPLAN_CONFIRMATION??''
  });
  if(!result.allowed){
    console.error('Release BLOCKED. Full owner masterplan evidence not yet verified. '+result.errors.length+' blocking findings.');
    for(const reason of result.errors.slice(0,24))console.error(' - '+reason);
    process.exitCode=1;
  }else{
    console.log('Source/staging/masterplan evidence gates satisfied. Manual owner release preflight may proceed; deployment itself remains subject to all existing additional gates.');
  }
}
