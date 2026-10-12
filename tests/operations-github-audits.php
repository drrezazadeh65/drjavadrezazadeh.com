<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/operations-github-audits.php';
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
echo 'PASS: '.$n.' public GitHub audit whitelisting, provenance, no-deploy and approval guard assertions.'.PHP_EOL;
