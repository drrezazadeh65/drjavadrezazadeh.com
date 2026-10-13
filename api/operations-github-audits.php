<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Auditable Stage-7 read-only view of already-existing PUBLIC, non-deploying
 * Actions jobs. The owner must explicitly approve any subsequent dispatch.
 * This inventory does not grant an executor to a HIGH-risk Action.
 */
function operationsGithubAuditCatalog(): array {
    return [
        ['actionId'=>'ENG-01.ACT-001','workflow'=>'bertina-master-seo.yml',
         'labelFa'=>'ممیزی جامع سئو و ساختار کنونیکال','labelEn'=>'Master SEO and canonical audit'],
        ['actionId'=>'ENG-01.ACT-003','workflow'=>'external-link-monitor.yml',
         'labelFa'=>'ممیزی لینک‌های خارجی','labelEn'=>'External link audit'],
        ['actionId'=>'ENG-11.ACT-003','workflow'=>'http-compression-diagnostic.yml',
         'labelFa'=>'بررسی فشرده‌سازی برتینا','labelEn'=>'Bertina HTTP compression diagnostic'],
        ['actionId'=>'ENG-11.ACT-007','workflow'=>'full-route-responsive-certification.yml',
         'labelFa'=>'ممیزی واکنش‌گرایی مسیرها','labelEn'=>'Full route responsive audit']
    ];
}
function operationsGithubAuditSafeUrl(string $url): bool {
    return (bool)preg_match(
        '~^https://github\.com/drrezazadeh65/drjavadrezazadeh\.com/actions/runs/[0-9]+$~D',$url);
}
function operationsGithubAuditProject(array $input, string $workflow): array {
    $allowedStatuses=['queued','in_progress','completed','requested','waiting','pending'];
    $runs=[];
    foreach (($input['workflow_runs']??[]) as $item) {
        if (!is_array($item)||count($runs)>=50)break;
        $url=(string)($item['html_url']??'');
        $providerRunId=$item['id']??null;
        $status=(string)($item['status']??'');
        $conclusion=$item['conclusion']??null;
        $sha=(string)($item['head_sha']??'');
        $event=(string)($item['event']??'');
        if (!operationsGithubAuditSafeUrl($url)
            || !is_int($providerRunId) || $providerRunId<1
            || !hash_equals((string)$providerRunId,(string)substr($url,strrpos($url,'/')+1))
            || !preg_match('/^[a-f0-9]{40}$/D',$sha)
            || !in_array($status,$allowedStatuses,true)
            || !in_array($event,['push','workflow_dispatch','schedule','pull_request'],true)
            || (!is_null($conclusion)&&!in_array($conclusion,['success','failure','cancelled','skipped','timed_out','action_required','neutral','stale'],true)))
            continue;
        $displayTitle=(string)($item['display_title']??'');
        $requestKey=preg_match('/^Admin audit ([a-f0-9]{32})$/D',$displayTitle,$match)&&$event==='workflow_dispatch'
            ?$match[1]:null;
        $runs[]=[
            'requestKey'=>$requestKey,
            'runId'=>$providerRunId,
            'url'=>$url,'status'=>$status,'conclusion'=>$conclusion,'event'=>$event,
            'sourceSha'=>$sha,'createdAt'=>(string)($item['created_at']??''),
            'updatedAt'=>(string)($item['updated_at']??''),
            'workflow'=>$workflow
        ];
    }
    return $runs;
}
function operationsGithubAuditFetch(string $workflow): array {
    $allowed=array_column(operationsGithubAuditCatalog(),'workflow');
    if (!in_array($workflow,$allowed,true))return ['status'=>'not_allowlisted','runs'=>[]];
    if (!function_exists('curl_init'))return ['status'=>'transport_unavailable','runs'=>[]];
    $url='https://api.github.com/repos/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/'.
        rawurlencode($workflow).'/runs?per_page=50&branch=migration%2Fbertina-linux6';
    $ch=curl_init($url);
    if($ch===false)return ['status'=>'transport_unavailable','runs'=>[]];
    curl_setopt_array($ch,[
        CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_TIMEOUT=>6,
        CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_SSL_VERIFYPEER=>true,
        CURLOPT_USERAGENT=>'DrJR-Admin-ReadOnly-CI-Observer/1.0',
        CURLOPT_HTTPHEADER=>['Accept: application/vnd.github+json','X-GitHub-Api-Version: 2022-11-28'],
        CURLOPT_MAXREDIRS=>0
    ]);
    $raw=curl_exec($ch);$http=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    if(!is_string($raw)||strlen($raw)>1024*1024||$http!==200)
        return ['status'=>in_array($http,[403,429],true)?'provider_rate_limited':'provider_unavailable','runs'=>[]];
    $body=json_decode($raw,true);
    if(!is_array($body)||!is_array($body['workflow_runs']??null))
        return ['status'=>'provider_invalid_response','runs'=>[]];
    return ['status'=>'observed','runs'=>operationsGithubAuditProject($body,$workflow)];
}
/**
 * Fail-closed, read-only GitHub branch-governance observation. These two
 * fixed public API endpoints never mutate policies, workflows or releases.
 * A missing branch / inaccessible API is UNKNOWN, not "unprotected".
 */
function operationsGithubGovernanceProject(?array $repository, ?array $branches): array {
    $canonical='migration/bertina-linux6';
    $repoValid=is_array($repository)
        && ($repository['full_name']??null)==='drrezazadeh65/drjavadrezazadeh.com'
        && is_string($repository['default_branch']??null);
    $default=$repoValid?$repository['default_branch']:null;
    $protected=null;$branchFound=false;
    if($repoValid&&is_array($branches)&&array_is_list($branches)){
        foreach($branches as $entry){
            if(!is_array($entry)||($entry['name']??null)!==$canonical)continue;
            if(!is_bool($entry['protected']??null))break;
            $protected=$entry['protected'];$branchFound=true;break;
        }
    }
    return [
        'schema'=>'operations-github-governance-v1',
        'source'=>'GitHub public repository and branch-list REST API',
        'canonicalBranch'=>$canonical,'defaultBranch'=>$default,
        'defaultMatchesCanonical'=>$default===null?null:($default===$canonical),
        'canonicalBranchProtected'=>$protected,
        'branchObserved'=>$branchFound,
        'status'=>!$repoValid||!$branchFound?'unknown':
            ($default!==$canonical?'default_branch_drift':
                ($protected===false?'branch_unprotected':'branch_protection_reported')),
        'rulesetEnforcement'=>'not_independently_verified',
        'op02Certified'=>false,
        'op36RollbackVerified'=>false,
        'limitations'=>'GitHub branch metadata is not proof of branch ruleset details, revoked legacy deploy credentials, an isolated backup restore, or production rollback. No OP-02/OP-36 gate is closed.'
    ];
}
function operationsGithubGovernanceFetchJson(string $kind): ?array {
    $paths=[
        'repository'=>'https://api.github.com/repos/drrezazadeh65/drjavadrezazadeh.com',
        'branches'=>'https://api.github.com/repos/drrezazadeh65/drjavadrezazadeh.com/branches?per_page=100',
        'restore_ci'=>'https://api.github.com/repos/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/bertina-restore-readiness-ci.yml/runs?per_page=5&branch=migration%2Fbertina-linux6'
    ];
    if(!isset($paths[$kind])||!function_exists('curl_init'))return null;
    $ch=curl_init($paths[$kind]);if($ch===false)return null;
    curl_setopt_array($ch,[
        CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_TIMEOUT=>3,CURLOPT_CONNECTTIMEOUT=>2,CURLOPT_SSL_VERIFYHOST=>2,
        CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_MAXREDIRS=>0,
        CURLOPT_USERAGENT=>'DrJR-Admin-ReadOnly-CI-Observer/1.0',
        CURLOPT_HTTPHEADER=>['Accept: application/vnd.github+json',
            'X-GitHub-Api-Version: 2022-11-28']
    ]);
    $raw=curl_exec($ch);$http=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
    if(!is_string($raw)||strlen($raw)>256000||$http!==200)return null;
    $data=json_decode($raw,true);
    return is_array($data)?$data:null;
}
/**
 * Only the existing isolated CI recovery-tool workflow is observed here.
 * Even an official success is NOT proof that an actual Bertina backup has
 * been restored, or that production rollback has been exercised.
 */
function operationsGithubRestoreCiProject(?array $data, int $now): array {
    $empty=['status'=>'unavailable','checkedAt'=>$now,'runId'=>null,
        'url'=>null,'sourceSha'=>null,'conclusion'=>null,'createdAt'=>null,
        'scope'=>'isolated_recovery_tooling_ci','isolatedCiPassed'=>false,
        'productionRestoreVerified'=>false,'rollbackVerified'=>false,
        'limitation'=>'Passing an isolated restore-tooling regression is not an actual backup restore or production rollback.'];
    if(!is_array($data)||!is_array($data['workflow_runs']??null)||!array_is_list($data['workflow_runs']))return $empty;
    $valid=[];
    foreach(array_slice($data['workflow_runs'],0,5) as $run){
        if(!is_array($run))continue;
        $id=$run['id']??null;
        $url=$run['html_url']??null;
        $sha=$run['head_sha']??null;
        $created=$run['created_at']??null;
        $stamp=is_string($created)?strtotime($created):false;
        if(!is_int($id)||$id<1
            || !is_string($url)||!operationsGithubAuditSafeUrl($url)
            || $url!=='https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/'.$id
            || !is_string($sha)||!preg_match('/^[a-f0-9]{40}$/D',$sha)
            || !is_string($created)||!preg_match('/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$/D',$created)
            || $stamp===false||$stamp>$now+300
            || !in_array($run['event']??null,['push','workflow_dispatch'],true)
            || !in_array($run['status']??null,['queued','waiting','in_progress','completed'],true)
            || (($run['status']??null)==='completed'
                && !in_array($run['conclusion']??null,['success','failure','cancelled','skipped','timed_out','action_required','neutral','stale'],true))
        )continue;
        $valid[]=['runId'=>$id,'url'=>$url,'sourceSha'=>$sha,
            'createdAt'=>$created,'timestamp'=>$stamp,'rawStatus'=>$run['status'],
            'conclusion'=>$run['conclusion']??null];
    }
    if(!$valid)return $empty;
    usort($valid,static fn($a,$b)=>$b['timestamp']<=>$a['timestamp']
        ?:($b['runId']<=>$a['runId']));
    $last=$valid[0];
    $fresh=$last['timestamp']>=$now-604800;
    $passed=$fresh&&$last['rawStatus']==='completed'&&$last['conclusion']==='success';
    return array_merge($empty,[
        'status'=>!$fresh?'stale':($last['rawStatus']!=='completed'?'pending':
            ($passed?'isolated_ci_pass':'isolated_ci_not_passed')),
        'runId'=>$last['runId'],'url'=>$last['url'],'sourceSha'=>$last['sourceSha'],
        'createdAt'=>$last['createdAt'],'conclusion'=>$last['conclusion'],
        'isolatedCiPassed'=>$passed
    ]);
}

function operationsGithubGovernanceSnapshot(): array {
    $snapshot=operationsGithubGovernanceProject(
        operationsGithubGovernanceFetchJson('repository'),
        operationsGithubGovernanceFetchJson('branches')
    );
    $snapshot['restoreReadiness']=operationsGithubRestoreCiProject(
        operationsGithubGovernanceFetchJson('restore_ci'),time());
    return $snapshot;
}

function operationsGithubAuditSnapshot(array $registry): array {
    $identities=array_column($registry['actions']??[],null,'id');$entries=[];
    foreach(operationsGithubAuditCatalog() as $entry){
        $id=$entry['actionId'];$action=$identities[$id]??null;
        // Ensure we never relabel or authorize a newly reconfigured Action.
        if(!is_array($action)||($action['executionType']??'')!=='manual'
            || ($action['approvalPolicy']['required']??null)!==true
            || ($action['riskCategory']??'')!=='HIGH')
            continue;
        $remote=operationsGithubAuditFetch($entry['workflow']);
        $entries[]=array_merge($entry,$remote,[
            'executionMode'=>'external_read_only_observation',
            'dispatchAvailable'=>false,
            'source'=>'GitHub public Actions REST API; scoped to canonical branch and fixed workflow',
            'limitation'=>'A successful CI run verifies its own audit tests only. It does not complete the HIGH-risk Action, verify Bertina deployment, money settlement or external search indexing.'
        ]);
    }
    return [
        'ok'=>true,'schema'=>'operations-github-audits-v1','checkedAt'=>time(),
        'releaseScope'=>'migration/bertina-linux6','audits'=>$entries,
        'governance'=>operationsGithubGovernanceSnapshot(),
        'summary'=>[
            'registeredAllowlistedWorkflows'=>count(operationsGithubAuditCatalog()),
            'observableWorkflows'=>count(array_filter($entries,fn($x)=>$x['status']==='observed')),
            'dispatchReady'=>false
        ],
        'limitation'=>'Read-only public GitHub workflow observations; direct execution requires a separate verified owner-approved workflow dispatch integration.'
    ];
}
