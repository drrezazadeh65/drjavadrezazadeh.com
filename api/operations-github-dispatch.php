<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Optional and explicitly approved GitHub audit-only dispatcher. It is NOT
 * an executor of the four HIGH-risk Action acceptance criteria. No deploy,
 * payments, shell commands, arbitrary repo selection or dynamic workflows.
 */
function operationsGithubDispatchToken(array $configuration): ?string {
    $token=$configuration['github_audit_dispatch_token']??null;
    if(!is_string($token) || strlen($token)<30 || strlen($token)>255
        || !preg_match('/^[A-Za-z0-9_]+$/D',$token))return null;
    return $token;
}
function operationsGithubDispatchDefinition(array $registry,string $id): ?array {
    $row=null;
    foreach(operationsGithubAuditCatalog() as $item)if($item['actionId']===$id){$row=$item;break;}
    if($row===null)return null;
    foreach($registry['actions']??[] as $action){
        if(($action['id']??null)!==$id)continue;
        if(($action['executionType']??null)!=='manual'
            || ($action['riskCategory']??null)!=='HIGH'
            || ($action['approvalPolicy']['required']??null)!==true
            || ($action['approvalPolicy']['serverEnforced']??null)!==true
            || isset($action['supportedExecutor']))return null;
        return $row;
    }
    return null;
}
function operationsGithubDispatchHttp(string $workflow,string $nonce,string $token): int {
    $allowed=array_column(operationsGithubAuditCatalog(),'workflow');
    if(!in_array($workflow,$allowed,true) || !preg_match('/^[a-f0-9]{32}$/D',$nonce))
        throw new InvalidArgumentException('invalid_dispatch_target');
    if(!function_exists('curl_init'))return 0;
    $url='https://api.github.com/repos/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/'.
        rawurlencode($workflow).'/dispatches';
    $body=json_encode(['ref'=>'migration/bertina-linux6','inputs'=>['ops_request'=>$nonce]],JSON_THROW_ON_ERROR);
    $ch=curl_init($url);if($ch===false)return 0;
    curl_setopt_array($ch,[
        CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_FOLLOWLOCATION=>false,CURLOPT_TIMEOUT=>7,CURLOPT_CONNECTTIMEOUT=>3,
        CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_MAXREDIRS=>0,
        CURLOPT_USERAGENT=>'DrJR-Approved-Audit-Dispatch/1.0',
        CURLOPT_HTTPHEADER=>[
            'Authorization: Bearer '.$token,
            'Accept: application/vnd.github+json',
            'X-GitHub-Api-Version: 2022-11-28',
            'Content-Type: application/json'
        ]
    ]);
    $response=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    // No response content is ever logged or displayed: GitHub API may include sensitive diagnostics.
    return is_string($response)?$status:0;
}
function operationsGithubDispatchRun(PDO $pdo,array $registry,string $actor,string $actionId,
    string $nonce,string $approval,string $release,array $configuration,int $at,?callable $transport=null): array {
    if(!preg_match('/^[a-f0-9]{32}$/D',$nonce)
        || !preg_match('/^[a-f0-9-]{36}$/Di',$actor)
        || !preg_match('/^[a-f0-9]{40}$/D',$release)
        || $approval!=='APPROVE_READONLY_AUDIT')
        throw new InvalidArgumentException('invalid_audit_approval');
    $definition=operationsGithubDispatchDefinition($registry,$actionId);
    if($definition===null)throw new DomainException('audit_not_allowlisted');
    $token=operationsGithubDispatchToken($configuration);
    if($token===null)throw new RuntimeException('audit_dispatch_not_configured');
    if(!operationsActionRunsReady($pdo))throw new RuntimeException('action_journal_schema_unavailable');
    $runId=hash('sha256','jr-ops-gh-audit-v1|'.$actor.'|'.$nonce);
    $mutex='jr-ops-gh-'.substr(hash('sha256',$actionId),0,40);
    $locked=false;
    if($pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'){
        $q=$pdo->prepare('SELECT GET_LOCK(?,0)');$q->execute([$mutex]);
        if((int)$q->fetchColumn()!==1)throw new RuntimeException('audit_concurrent');
        $locked=true;
    }
    try{
        $q=$pdo->prepare('SELECT action_id FROM operations_action_runs WHERE account_id=? AND request_key=? LIMIT 1');
        $q->execute([$actor,$nonce]);$existing=$q->fetch(PDO::FETCH_ASSOC);
        if($existing){
            if($existing['action_id']!==$actionId)throw new DomainException('audit_idempotency_conflict');
            foreach(operationsActionHistory($pdo,$actor,$at) as $row)if($row['runId']===$runId)return $row;
            throw new RuntimeException('audit_journal_row_unavailable');
        }
        $pending=['kind'=>'github_ci_audit','workflow'=>$definition['workflow'],
            'dispatchState'=>'submission_unconfirmed','requestKey'=>$nonce,'githubRunId'=>null,
            'verifiedByProvider'=>false,'sourceScope'=>'migration/bertina-linux6'];
        $pdo->prepare('INSERT INTO operations_action_runs(run_id,account_id,action_id,request_key,release_sha,status,created_at,finished_at,result_json) VALUES(?,?,?,?,?,?,?,?,?)')
            ->execute([$runId,$actor,$actionId,$nonce,$release,'running',$at,null,json_encode($pending,JSON_THROW_ON_ERROR)]);
        $status=0;
        try{
            $status=$transport?($transport)($definition['workflow'],$nonce,$token):
                operationsGithubDispatchHttp($definition['workflow'],$nonce,$token);
        }catch(Throwable $e){$status=0;}
        $accepted=$status===204;
        // 204 confirms GitHub accepted a dispatch REQUEST; no run ID or execution outcome.
        $state=$accepted?'accepted_run_unconfirmed':'submission_unconfirmed';
        $result=array_merge($pending,['dispatchState'=>$state]);
        $pdo->prepare('UPDATE operations_action_runs SET status=?,finished_at=?,result_json=? WHERE run_id=? AND account_id=?')
            ->execute([$accepted?'running':'blocked',$accepted?null:$at,json_encode($result,JSON_THROW_ON_ERROR),$runId,$actor]);
        operationsAudit($pdo,$actor,'github_audit_requested',$runId);
        foreach(operationsActionHistory($pdo,$actor,$at) as $row)if($row['runId']===$runId)return $row;
        throw new RuntimeException('audit_journal_row_unavailable');
    }finally{
        if($locked){try{$q=$pdo->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$mutex]);}catch(Throwable $e){}}
    }
}
function operationsGithubCorrelatedRuns(array $audits,array $history): array {
    $map=[];
    foreach($audits as $audit)foreach(($audit['runs']??[]) as $run){
        $trace=$run['requestKey']??null;
        if(is_string($trace)&&preg_match('/^[a-f0-9]{32}$/D',$trace))
            $map[$audit['actionId'].'|'.$trace]=$run;
    }
    $matches=[];
    foreach($history as $row){
        if(($row['result']['kind']??null)!=='github_ci_audit')continue;
        $trace=$row['result']['requestKey']??null;
        // The stored public response intentionally does not echo the request nonce.
        // Correlation therefore requires explicit persisted request keys from a trusted server row.
        if(!is_string($trace)||!preg_match('/^[a-f0-9]{32}$/D',$trace))continue;
        $run=$map[$row['actionId'].'|'.$trace]??null;
        $matches[]=[
            'actionId'=>$row['actionId'],'requestRunId'=>$row['runId'],
            'dispatchState'=>$row['result']['dispatchState'],
            'github'=> $run ? [
                'runId'=>$run['runId'],'url'=>$run['url'],'status'=>$run['status'],
                'conclusion'=>$run['conclusion'],'sourceSha'=>$run['sourceSha'],
                'updatedAt'=>$run['updatedAt']
            ] : null,
            'status'=>$run?'github_observed':'awaiting_external_run_correlation',
            'limitation'=>'A GitHub audit success is not acceptance of the manual/high-risk site Action or confirmation of production deployment.'
        ];
    }
    return array_slice($matches,0,30);
}
