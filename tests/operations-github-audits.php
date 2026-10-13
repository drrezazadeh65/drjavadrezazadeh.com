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
