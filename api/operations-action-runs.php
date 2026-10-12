<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * One narrow source-owned executor for the seven pre-existing read-only
 * operationsSignals contracts. This never invokes shell, SQL from the browser,
 * external workflow or payment. No report acceptance gate is written.
 */
function operationsActionDefinition(array $registry, string $id): ?array {
    if (!preg_match('/^ENG-[0-9]{2}\.ACT-[0-9]{3}$/D', $id)) return null;
    foreach ($registry['actions']??[] as $action) {
        if (($action['id']??null)!==$id)continue;
        $contract=$action['supportedExecutor']??null;
        if (($action['executionType']??null)!=='automatic'
            || ($action['scoringScope']??null)!=='observation'
            || ($action['riskCategory']??null)!=='LOW'
            || ($action['approvalPolicy']['serverEnforced']??false)!==true
            || ($action['approvalPolicy']['cannotBeDowngradedByLearning']??false)!==true
            || !is_array($contract)
            || ($contract['type']??'')!=='readonly_snapshot'
            || ($contract['function']??'')!=='operationsSignals'
            || ($contract['endpoint']??'')!=='/api/admin/operations'
            || ($contract['writes']??true)!==false
            || ($action['approvalPolicy']['required']??false)!==false
            || ($action['authorizationLevel']??'')!=='verified_active_administrator_with_fresh_MFA_readonly')return null;
        if (!is_array($contract['signalIds']??null) || count($contract['signalIds'])<1
            || count($contract['signalIds'])>20
            || count(array_unique($contract['signalIds']))!==count($contract['signalIds']))return null;
        return $action;
    }
    return null;
}
function operationsActionRunsReady(PDO $pdo): bool {
    try { $pdo->query('SELECT 1 FROM operations_action_runs LIMIT 1');return true; }
    catch (Throwable $e) { return false; }
}
function operationsActionHistory(PDO $pdo, string $accountId, int $at): array {
    $q=$pdo->prepare('SELECT run_id,action_id,release_sha,status,created_at,finished_at,result_json FROM operations_action_runs WHERE account_id=? ORDER BY created_at DESC,run_id DESC LIMIT 50');
    $q->execute([$accountId]);$rows=[];
    foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $result=json_decode((string)$row['result_json'],true);
        $status=(string)$row['status'];
        // External GitHub dispatch acknowledgement is NOT a synchronous local job.
        // A long-running provider run may legitimately outlast a two-minute HTTP window;
        // never relabel an uncorrelated audit request as an interrupted PHP collector.
        $githubRequest=is_array($result)&&($result['kind']??null)==='github_ci_audit';
        if($githubRequest && $status==='running'){
            $status=($result['verifiedByProvider']??false)===true
                ?'provider_in_progress':'awaiting_external_run_correlation';
        }elseif($status==='running' && $at-(int)$row['created_at']>120){
            $status='interrupted';
        }
        $rows[]=[
            'runId'=>(string)$row['run_id'],'actionId'=>(string)$row['action_id'],
            'releaseSha'=>(string)$row['release_sha'],'status'=>$status,
            'createdAt'=>(int)$row['created_at'],
            'finishedAt'=>$row['finished_at']!==null?(int)$row['finished_at']:null,
            'result'=>is_array($result)?$result:[],
            'limitation'=>($result['kind']??null)==='github_ci_audit'
                ?'Owner-approved fixed GitHub audit submission; HTTP acknowledgement is not a matched GitHub run or successful QA, and never certifies this HIGH-risk Action or production.'
                :'Read-only observation run; not a CI suite execution, verified report closure, live publication, financial settlement or durable scheduler.'
        ];
    }
    return $rows;
}
function operationsActionExecute(PDO $pdo, array $registry, string $accountId, string $actionId,
    string $requestKey, string $release, array $configuration, int $at): array {
    if (!preg_match('/^[a-f0-9]{32}$/D',$requestKey)
        || !preg_match('/^[a-f0-9-]{36}$/Di',$accountId)
        || !preg_match('/^[a-f0-9]{40}$/D',$release))
        throw new InvalidArgumentException('invalid_action_request');
    $action=operationsActionDefinition($registry,$actionId);
    if ($action===null)throw new DomainException('action_executor_unavailable');
    if (!operationsActionRunsReady($pdo))throw new RuntimeException('action_journal_schema_unavailable');
    $runId=hash('sha256','jr-ops-run-v1|'.$accountId.'|'.$requestKey);
    $mutex='jr-ops-'.substr(hash('sha256',$actionId),0,40);
    $mysql=$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql';
    $locked=false;
    if ($mysql) {
        $q=$pdo->prepare('SELECT GET_LOCK(?,0)');$q->execute([$mutex]);
        if ((int)$q->fetchColumn()!==1)throw new RuntimeException('action_busy');
        $locked=true;
    }
    try {
        $existing=$pdo->prepare('SELECT action_id FROM operations_action_runs WHERE run_id=? AND account_id=?');
        $existing->execute([$runId,$accountId]);$row=$existing->fetch(PDO::FETCH_ASSOC);
        if($row) {
            if($row['action_id']!==$actionId)throw new DomainException('request_key_conflict');
            foreach(operationsActionHistory($pdo,$accountId,$at) as $record)if($record['runId']===$runId)return $record;
            throw new RuntimeException('action_history_unavailable');
        }
        $insert=$pdo->prepare('INSERT INTO operations_action_runs(run_id,account_id,action_id,request_key,release_sha,status,created_at,finished_at,result_json) VALUES(?,?,?,?,?,?,?,?,?)');
        $insert->execute([$runId,$accountId,$actionId,$requestKey,$release,'running',$at,null,'{}']);
        $status='failed';$result=['status'=>'execution_failed','expectedSignalCount'=>count($action['supportedExecutor']['signalIds']),'freshSignalCount'=>0,'signalIds'=>[]];
        try {
            $all=operationsSignals($pdo,$configuration,$release,$at);
            $records=[];
            foreach (($action['legacyReportIds']??[]) as $section)$records[$section]=['signals'=>$all[$section]??[]];
            $observation=operationsCollectorObservation($action,$records,$at);
            if(!is_array($observation))throw new RuntimeException('no_registered_collector');
            $status=$observation['status']==='observed'?'succeeded':'blocked';
            $result=[
                'status'=>$observation['status'],'expectedSignalCount'=>$observation['expectedSignalCount'],
                'collectedSignalCount'=>$observation['collectedSignalCount'],
                'freshSignalCount'=>$observation['freshSignalCount'],
                'signalIds'=>array_column($observation['signals'],'id'),
                'lastObservedAt'=>$observation['lastObservedAt']
            ];
        } catch (Throwable $e) { $result['status']='collector_unavailable'; }
        $pdo->prepare('UPDATE operations_action_runs SET status=?,finished_at=?,result_json=? WHERE run_id=? AND account_id=?')
            ->execute([$status,$at,json_encode($result,JSON_THROW_ON_ERROR),$runId,$accountId]);
        // Existing append-only audit, not a fake operations_evidence acceptance event.
        operationsAudit($pdo,$accountId,'readonly_observation',$runId);
        foreach(operationsActionHistory($pdo,$accountId,$at) as $record)if($record['runId']===$runId)return $record;
        throw new RuntimeException('action_history_unavailable');
    } finally {
        if($locked) {
            try{$q=$pdo->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$mutex]);}catch(Throwable $e){}
        }
    }
}
