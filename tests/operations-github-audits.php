<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/operations-github-audits.php';
require __DIR__.'/../api/operations-github-dispatch.php';
$n=0;
function assertAudit(bool $condition,string $message): void {
    global $n;
    if(!$condition)throw new RuntimeException($message);
    $n++;
}
$catalog=operationsGithubAuditCatalog();
assertAudit(count($catalog)===4,'Read-only public audit workflow inventory changed');
assertAudit(count(array_unique(array_column($catalog,'actionId')))===4,'Duplicate action IDs');
assertAudit(count(array_unique(array_column($catalog,'workflow')))===4,'Duplicate workflow file name');
foreach($catalog as $entry){
    assertAudit((bool)preg_match('/^[a-z0-9-]+\.yml$/D',$entry['workflow']),'Unsafe workflow name');
    assertAudit(str_starts_with($entry['actionId'],'ENG-'),'Missing canonical Action identity');
}
$repo='https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/';
assertAudit(operationsGithubAuditSafeUrl($repo.'38275309852'),'Legitimate GitHub Actions URL rejected');
foreach([
    'https://github.com/evil/drjavadrezazadeh.com/actions/runs/38275309852',
    $repo.'38275309852?token=private',$repo.'../../secrets',
    'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/123#fragment',
    'javascript:alert(1)'
] as $url)assertAudit(!operationsGithubAuditSafeUrl($url),'Untrusted GH link allowed: '.$url);
$valid=[
 'id'=>38275309852,'html_url'=>$repo.'38275309852','status'=>'completed',
 'conclusion'=>'success','event'=>'push','head_sha'=>str_repeat('a',40),
 'created_at'=>'2026-10-12T16:09:21Z','updated_at'=>'2026-10-12T16:09:58Z'
];
$input=['workflow_runs'=>[$valid,array_merge($valid,['html_url'=>$repo.'123?evil=1'])]];
$rows=operationsGithubAuditProject($input,'bertina-master-seo.yml');
assertAudit(count($rows)===1,'Untrusted API result not rejected');
assertAudit($rows[0]['sourceSha']===str_repeat('a',40),'Wrong observed source sha');
assertAudit($rows[0]['conclusion']==='success','Wrong observed conclusion');
assertAudit($rows[0]['url']===$repo.'38275309852','Wrong CI run URL');

$inconsistent=operationsGithubAuditProject(['workflow_runs'=>[
 array_merge($valid,['id'=>38275309821])
]],'bertina-master-seo.yml');
assertAudit($inconsistent===[],'GitHub run ID and official link mismatch wrongly accepted');
$zeroRun=operationsGithubAuditProject(['workflow_runs'=>[
 array_merge($valid,['id'=>0])
]],'bertina-master-seo.yml');
assertAudit($zeroRun===[],'Zero GitHub run ID accepted as evidence');

$busy=[];
for($n=0;$n<70;$n++){
    $runId=38275309852+$n;
    $busy[]=array_merge($valid,['id'=>$runId,'html_url'=>$repo.$runId]);
}
$bounded=operationsGithubAuditProject(['workflow_runs'=>$busy],'bertina-master-seo.yml');
assertAudit(count($bounded)===50,'High-traffic GitHub audit list lost its finite history bound');
assertAudit($bounded[49]['runId']===38275309901,'Stable GitHub audit ordering changed');
$empty=operationsGithubAuditProject(['workflow_runs'=>[array_merge($valid,['head_sha'=>'fake'])]],'bertina-master-seo.yml');
assertAudit($empty===[],'Malformed SHA accepted');
$bad=operationsGithubAuditFetch('deploy-bertina.yml');
assertAudit($bad['status']==='not_allowlisted'&&$bad['runs']===[],'Deployment workflow accepted for audit');
$registry=json_decode((string)file_get_contents(__DIR__.'/../api/internal/operations-registry.json'),true,512,JSON_THROW_ON_ERROR);
$identities=array_column($registry['actions'],null,'id');
foreach($catalog as $item){
 $action=$identities[$item['actionId']]??null;
 assertAudit(is_array($action),'Missing Action: '.$item['actionId']);
 assertAudit($action['executionType']==='manual','Manual Action risk policy was downgraded');
 assertAudit($action['approvalPolicy']['required']===true,'Action approval policy removed');
 assertAudit($action['riskCategory']==='HIGH','Manual Action risk changed');
 assertAudit(!isset($action['supportedExecutor']),'Read-only viewer must not grant risky Action executor');
}


$recoveryRun=[
 'id'=>38459475465,
 'html_url'=>'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38459475465',
 'head_sha'=>str_repeat('a',40),'created_at'=>'2026-10-13T18:10:00Z',
 'status'=>'completed','conclusion'=>'success','event'=>'push'
];
$recoveryAt=strtotime('2026-10-13T20:10:00Z');
$liveCi=operationsGithubRestoreCiProject(['workflow_runs'=>[$recoveryRun]],$recoveryAt);
assertAudit($liveCi['status']==='isolated_ci_pass'&&$liveCi['isolatedCiPassed']===true
    &&$liveCi['productionRestoreVerified']===false&&$liveCi['rollbackVerified']===false,
    'Tooling-only CI incorrectly certified a real backup restoration');
$expired=operationsGithubRestoreCiProject(['workflow_runs'=>[$recoveryRun]],$recoveryAt+604801);
assertAudit($expired['status']==='stale'&&$expired['isolatedCiPassed']===false,
    'Expired GitHub test reported as current');
$failedRun=$recoveryRun;$failedRun['conclusion']='failure';
$failedRun['id']=38459475466;
$failedRun['html_url']='https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38459475466';
$failedRun['created_at']='2026-10-13T19:10:00Z';
$latest=operationsGithubRestoreCiProject(['workflow_runs'=>[$recoveryRun,$failedRun]],$recoveryAt);
assertAudit($latest['status']==='isolated_ci_not_passed'&&$latest['runId']===38459475466,
    'Older successful CI masked newer failure');
$pending=$failedRun;$pending['status']='in_progress';$pending['conclusion']=null;
assertAudit(operationsGithubRestoreCiProject(['workflow_runs'=>[$pending]],$recoveryAt)['status']==='pending',
    'Pending GitHub job fabricated success');
$badRun=$recoveryRun;$badRun['html_url']='https://github.com/other/repo/actions/runs/38459475465';
assertAudit(operationsGithubRestoreCiProject(['workflow_runs'=>[$badRun]],$recoveryAt)['status']==='unavailable',
    'Untrusted GitHub evidence endpoint accepted');
$badRun=$recoveryRun;$badRun['event']='pull_request';
assertAudit(operationsGithubRestoreCiProject(['workflow_runs'=>[$badRun]],$recoveryAt)['status']==='unavailable',
    'PR-only CI accepted for branch governance');
assertAudit(operationsGithubRestoreCiProject(null,$recoveryAt)['isolatedCiPassed']===false,
    'Absent GitHub API response marked recovery ready');


$release=str_repeat('a',40);$at=strtotime('2026-10-13T20:30:00Z');
$make=function(int $id,string $path,string $event,string $created,string $conclusion='success')use($release):array{
 return ['id'=>$id,'path'=>'.github/workflows/'.$path,'event'=>$event,'head_sha'=>$release,
   'html_url'=>'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/'.$id,
   'created_at'=>$created,'status'=>'completed','conclusion'=>$conclusion];
};
$deploy=$make(38459966600,'deploy-bertina.yml','push','2026-10-13T20:04:55Z');
$accepted=$make(38460316374,'bertina-postrelease-acceptance.yml','workflow_run','2026-10-13T20:07:30Z');
$matched=operationsGithubReleaseTraceProject(['workflow_runs'=>[$accepted,$deploy]],$release,$at);
assertAudit($matched['status']==='release_ci_accepted'
  && $matched['releaseAcceptedByCi']===true
  && $matched['deploy']['runId']===38459966600
  && $matched['acceptance']['runId']===38460316374
  && $matched['rollbackVerified']===false && $matched['backupRestoreVerified']===false,
 'Deployment pipeline observation falsely certified a rollback');
$wrong=$accepted;$wrong['head_sha']=str_repeat('b',40);
assertAudit(operationsGithubReleaseTraceProject(['workflow_runs'=>[$deploy,$wrong]],$release,$at)['status']==='acceptance_not_observed',
 'Acceptance on another commit validated the current release');
$older=$accepted;$older['created_at']='2026-10-13T20:01:00Z';
assertAudit(operationsGithubReleaseTraceProject(['workflow_runs'=>[$deploy,$older]],$release,$at)['status']==='acceptance_not_observed',
 'Earlier acceptance validated later deployment');
$bad=$accepted;$bad['conclusion']='failure';
assertAudit(operationsGithubReleaseTraceProject(['workflow_runs'=>[$deploy,$bad]],$release,$at)['status']==='acceptance_not_successful',
 'Failed acceptance was certified as success');
$failedDeploy=$deploy;$failedDeploy['conclusion']='failure';
assertAudit(operationsGithubReleaseTraceProject(['workflow_runs'=>[$failedDeploy,$accepted]],$release,$at)['status']==='deploy_not_successful',
 'Failed deployment was certified by an unrelated acceptance');
$pending=$accepted;$pending['status']='in_progress';$pending['conclusion']=null;
assertAudit(operationsGithubReleaseTraceProject(['workflow_runs'=>[$deploy,$pending]],$release,$at)['status']==='acceptance_pending',
 'Pending acceptance was certified early');
$foreign=$deploy;$foreign['path']='.github/workflows/unknown.yml';
assertAudit(operationsGithubReleaseTraceProject(['workflow_runs'=>[$foreign,$accepted]],$release,$at)['status']==='deploy_run_not_observed',
 'Unknown workflow forged an authoritative deployment');
$untrusted=$deploy;$untrusted['html_url']='https://github.com/other/repo/actions/runs/38459966600';
assertAudit(operationsGithubReleaseTraceProject(['workflow_runs'=>[$untrusted,$accepted]],$release,$at)['status']==='deploy_run_not_observed',
 'Untrusted URL forged a canonical deployment');
assertAudit(operationsGithubReleaseTraceProject(null,$release,$at)['releaseAcceptedByCi']===false,
 'Absent provider observation marked release accepted');
assertAudit(operationsGithubReleaseTraceProject(['workflow_runs'=>[$deploy,$accepted]],'invalid',$at)['status']==='server_release_missing',
 'Invalid server release granted acceptance credit');


$bulkSources=operationsGithubBulkSources();
assertAudit(count($bulkSources)===8
    &&count(array_unique(array_values($bulkSources)))===8,
    'Expected exactly eight independent allowlisted GET URLs');
foreach($bulkSources as $kind=>$url)assertAudit(
    ($url==='https://api.github.com/repos/drrezazadeh65/drjavadrezazadeh.com'
      || str_starts_with($url,'https://api.github.com/repos/drrezazadeh65/drjavadrezazadeh.com/'))
      && !str_contains($url,'redirect') && !str_contains($url,'token'),
    'Unsafe GitHub batch URL: '.$kind);
$bulkData=[
 'audit:bertina-master-seo.yml'=>[
   'http'=>200,'error'=>0,'body'=>json_encode(['workflow_runs'=>[$valid]],JSON_THROW_ON_ERROR)],
 'governance:repository'=>[
   'http'=>200,'error'=>0,'body'=>json_encode([
     'full_name'=>'drrezazadeh65/drjavadrezazadeh.com','default_branch'=>'migration/bertina-linux6'
   ],JSON_THROW_ON_ERROR)],
 'governance:branches'=>[
   'http'=>200,'error'=>0,'body'=>json_encode([['name'=>'migration/bertina-linux6','protected'=>false]],JSON_THROW_ON_ERROR)]
];
$batchObserved=operationsGithubBulkAudit($bulkData,'bertina-master-seo.yml');
assertAudit($batchObserved['status']==='observed'
  &&count($batchObserved['runs'])===1
  &&$batchObserved['runs'][0]['runId']===38275309852,'Batch provider success not projected');
$governanceObserved=operationsGithubGovernanceSnapshot(str_repeat('a',40),$bulkData);
assertAudit($governanceObserved['status']==='branch_unprotected'
  &&$governanceObserved['releaseTrace']['releaseAcceptedByCi']===false,
  'Missing provider endpoints fabricated release certification');
$badBatch=$bulkData;$badBatch['audit:bertina-master-seo.yml']['http']=429;
assertAudit(operationsGithubBulkAudit($badBatch,'bertina-master-seo.yml')['status']==='provider_rate_limited',
    'Rate limiting accepted as successful observation');
$badBatch=$bulkData;$badBatch['audit:bertina-master-seo.yml']['body']='{bad';
assertAudit(operationsGithubBulkAudit($badBatch,'bertina-master-seo.yml')['status']==='provider_invalid_response',
    'Malformed provider JSON was accepted');
$badBatch=$bulkData;$badBatch['governance:branches']['error']=28;
assertAudit(operationsGithubGovernanceSnapshot(str_repeat('a',40),$badBatch)['status']==='unknown',
    'Timed-out GitHub branch-list falsely declared unprotected');
$batchSnapshot=operationsGithubAuditSnapshot($registry,str_repeat('a',40),$bulkData);
assertAudit($batchSnapshot['summary']['observableWorkflows']===1
    &&$batchSnapshot['summary']['registeredAllowlistedWorkflows']===4,
    'Batch snapshot conflated unavailable provider workflows with observed success');

assertAudit(operationsGithubDispatchToken([])===null,'Dispatch credentials must default OFF');
assertAudit(operationsGithubDispatchToken(['github_audit_dispatch_token'=>'x'])===null,'Short token accepted');
assertAudit(operationsGithubDispatchToken(['github_audit_dispatch_token'=>str_repeat('g',40)])===str_repeat('g',40),'Scoped fixture token rejected');
foreach($catalog as $item){
 assertAudit(operationsGithubDispatchDefinition($registry,$item['actionId'])!==null,
    'Approved audit-only contract missing '.$item['actionId']);
}
foreach(['ENG-11.ACT-005','ENG-05.ACT-002','ENG-04.ACT-001'] as $id)
 assertAudit(operationsGithubDispatchDefinition($registry,$id)===null,'Critical unsafe audit action mapped '.$id);
$trace=str_repeat('c',32);
$dispatch=$valid;
$dispatch['event']='workflow_dispatch';
$dispatch['display_title']='Admin audit '.$trace;
$projected=operationsGithubAuditProject(['workflow_runs'=>[$dispatch]],'bertina-master-seo.yml');
assertAudit(($projected[0]['requestKey']??null)===$trace,'Valid provider trace not projected');
$dispatch['display_title']='Admin audit '.str_repeat('e',32);
$projected=operationsGithubAuditProject(['workflow_runs'=>[$dispatch]],'bertina-master-seo.yml');
assertAudit(($projected[0]['requestKey']??null)!==$trace,'Unrelated trace accepted as current run');
$dispatch['event']='push';
$dispatch['display_title']='Admin audit '.$trace;
$projected=operationsGithubAuditProject(['workflow_runs'=>[$dispatch]],'bertina-master-seo.yml');
assertAudit(($projected[0]['requestKey']??null)===null,'Non-dispatch run forged an admin execution');
$untrusted=[['actionId'=>'ENG-01.ACT-001','runs'=>$projected]];
assertAudit(operationsGithubCorrelatedRuns($untrusted,[])===[],'Unowned run linked');

echo 'PASS: '.$n.' public GitHub audit whitelisting, provenance, no-deploy and approval guard assertions.'.PHP_EOL;
