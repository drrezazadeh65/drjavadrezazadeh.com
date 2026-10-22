<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/operations-alerts.php';

/**
 * Owner-only response integrity monitor. Fixed HTTPS origin + fixed paths:
 * no user-selected URL, no redirects followed, no cookies, no HTML read, no
 * unbounded crawling. CLI worker performs probes; HTTP/admin GET reads stored
 * observations only. Missing HSTS/CSP is advisory, never silently "passed".
 */
function operationsResponseProbes(): array {
    return [
        ['id'=>'home','path'=>'/','kind'=>'headers','expected'=>200],
        ['id'=>'fa','path'=>'/fa/','kind'=>'headers','expected'=>200],
        ['id'=>'en','path'=>'/en/','kind'=>'headers','expected'=>200],
        ['id'=>'legacy_home','path'=>'/home/','kind'=>'redirect','expected'=>301,'location'=>'https://drjavadrezazadeh.com/'],
        ['id'=>'legacy_about','path'=>'/about/','kind'=>'redirect','expected'=>301,'location'=>'https://drjavadrezazadeh.com/en/about/'],
        ['id'=>'legacy_books','path'=>'/books/','kind'=>'redirect','expected'=>301,'location'=>'https://drjavadrezazadeh.com/en/books/'],
        ['id'=>'legacy_shop','path'=>'/shop/','kind'=>'redirect','expected'=>301,'location'=>'https://drjavadrezazadeh.com/fa/shop/']
    ];
}
function operationsResponseMonitorPolicy(PDO $pdo): ?array {
    try {
        $q=$pdo->query('SELECT enabled,cadence,weekday,clock_minutes,retention_days,next_due,requested_at,updated_at
            FROM operations_response_probe_settings WHERE singleton_id=1');
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!$row)return null;
        return [
            'enabled'=>(bool)$row['enabled'],'cadence'=>(string)$row['cadence'],
            'weekday'=>(int)$row['weekday'],'clockMinutes'=>(int)$row['clock_minutes'],
            'retentionDays'=>(int)$row['retention_days'],'nextDue'=>(int)$row['next_due'],
            'requestedAt'=>(int)$row['requested_at'],'updatedAt'=>(int)$row['updated_at']
        ];
    }catch(Throwable $e){return null;}
}
function operationsResponseMonitorStatus(PDO $pdo,int $at): array {
    $settings=operationsResponseMonitorPolicy($pdo);
    if($settings===null)return [
        'ok'=>true,'schema'=>'operations-response-monitor-v1','status'=>'schema_not_provisioned',
        'settings'=>null,'latest'=>[],'history'=>[],
        'limitation'=>'Read-only observation not yet installed in unified MySQL.'];
    $rows=[];$history=[];$observations=[];
    try{
        $q=$pdo->query('SELECT probe_id,kind,observed_at,response_code,result,details_json
            FROM operations_response_probe_samples
            ORDER BY sample_id DESC LIMIT 150');
        $seen=[];
        foreach($q as $item) {
            $id=(string)$item['probe_id'];
            $observedAt=(int)$item['observed_at'];
            $details=json_decode((string)$item['details_json'],true);
            if(!is_array($details))$details=[];
            $runId=(string)($details['observerRunId']??'');
            if(!preg_match('/^[a-f0-9]{32}$/D',$runId))$runId='';
            $observations[]=[
                'id'=>$id,'observedAt'=>$observedAt,'runId'=>$runId,
                'result'=>(string)$item['result']
            ];
            if(!isset($seen[$id])){
                $rows[]=[
                    'id'=>$id,'kind'=>(string)$item['kind'],
                    'observedAt'=>$observedAt,'responseCode'=>$item['response_code']===null?null:(int)$item['response_code'],
                    'result'=>(string)$item['result'],
                    'fresh'=>$observedAt>=$at-172800,
                    'checks'=>$details
                ];
                $seen[$id]=true;
            }
            // A bounded dated source of truth for the admin chart.
            $history[]=['probeId'=>$id,'at'=>$observedAt,
                'result'=>(string)$item['result']];
        }
    }catch(Throwable $e){
        return ['ok'=>true,'schema'=>'operations-response-monitor-v1',
            'status'=>'read_unavailable','settings'=>$settings,'latest'=>[],'history'=>[]];
    }
    // A unique non-personal CLI collection token is stored *inside* the
    // existing per-probe details_json TEXT field, so no schema upgrade is
    // required. Mixed historical rows remain readable. Only legacy rows
    // without a token are conservatively grouped by timestamp, never called
    // an independently verified worker run.
    $probeIds=array_column(operationsResponseProbes(),'id');
    $newest=$observations[0]??null;
    $newestAt=(int)($newest['observedAt']??0);
    $newestRunId=(string)($newest['runId']??'');
    $cohort=[];
    if($newestAt>0){
        foreach($observations as $observation){
            if(!in_array($observation['id'],$probeIds,true))continue;
            if($newestRunId!==''){
                if($observation['runId']!==$newestRunId)continue;
            }elseif($observation['runId']!=='' ||
                   $observation['observedAt']!==$newestAt)continue;
            // Latest sample wins for duplicate paths from a single run.
            if(!isset($cohort[$observation['id']]))
                $cohort[$observation['id']]=$observation;
        }
    }
    $missingIds=array_values(array_diff($probeIds,array_keys($cohort)));
    // Split trusted source observations by their *actual* sensor family.
    // A complete header sample says nothing about the redirect sample, and
    // vice versa. Missing, stale and unavailable must remain distinguishable.
    $byKind=[];
    foreach(operationsResponseProbes() as $definition){
        $kind=$definition['kind'];$id=$definition['id'];
        if(!isset($byKind[$kind]))$byKind[$kind]=[
            'expectedTargets'=>0,'observedTargets'=>0,
            'passedTargets'=>0,'failedTargets'=>0,
            'unavailableTargets'=>0,'missingTargets'=>[]
        ];
        $byKind[$kind]['expectedTargets']++;
        if(!isset($cohort[$id])){
            $byKind[$kind]['missingTargets'][]=$id;
            continue;
        }
        $byKind[$kind]['observedTargets']++;
        $state=$cohort[$id]['result'];
        if($state==='pass')$byKind[$kind]['passedTargets']++;
        elseif($state==='fail')$byKind[$kind]['failedTargets']++;
        else $byKind[$kind]['unavailableTargets']++;
    }
    foreach($byKind as &$group){
        $group['complete']=$group['observedTargets']===$group['expectedTargets'];
        $group['fresh']=$newestAt>0&&$newestAt>=$at-172800
            &&$newestAt<=$at+60;
    }
    unset($group);
    $failed=0;$unavailable=0;$passed=0;
    foreach($cohort as $row){
        if($row['result']==='fail')$failed++;
        elseif($row['result']==='pass')$passed++;
        else $unavailable++;
    }
    $coverage=[
        'evidence'=>$newestRunId!==''?'stored_cli_collection_token'
            :'legacy_same_timestamp_not_unique_run_id',
        'runId'=>$newestRunId!==''?$newestRunId:null,
        'byKind'=>$byKind,
        'expectedTargets'=>count($probeIds),
        'observedTargets'=>count($cohort),
        'missingTargets'=>$missingIds,
        'failedTargets'=>$failed,'unavailableTargets'=>$unavailable,
        'passedTargets'=>$passed,'observedAt'=>$newestAt?:null,
        'fresh'=>$newestAt>0&&$newestAt>=$at-172800
            &&$newestAt<=$at+60,
        'complete'=>count($missingIds)===0,
        'allPassedAtObservedTime'=>count($missingIds)===0&&
            $failed===0&&$unavailable===0
    ];
    return ['ok'=>true,'schema'=>'operations-response-monitor-v1',
        'status'=>'stored_observations','settings'=>$settings,
        'latest'=>$rows,'history'=>array_slice($history,0,80),
        'latestTimestampCoverage'=>$coverage,
        'checks'=>[
            'mandatory'=>['http_status','x_frame_options_or_csp_frame_ancestors','x_content_type_options','referrer_policy','permissions_policy'],
            'advisory'=>['strict_transport_security','content_security_policy']
        ],
        'limitation'=>'Newest observations are grouped by an opaque private CLI collection token; historical rows without one use a labeled same-second fallback. A stored collection token proves source correlation, not Cron operation, current live site integrity, mobile rendering, or independent security validation. Missing HSTS/CSP remain advisory until separately approved.'];
}
function operationsResponseMonitorConfigure(PDO $pdo,array $input,string $actor,int $at): array {
    $keys=array_keys($input);
    $requestNow=$keys===['requestNow'];
    if($requestNow){
        if($input['requestNow']!==true)
            throw new InvalidArgumentException('invalid_monitor_request');
    }elseif($keys!==['enabled','cadence','weekday','clockMinutes','retentionDays']
        ||!is_bool($input['enabled'])||!is_string($input['cadence'])
        ||!is_int($input['weekday'])||!is_int($input['clockMinutes'])
        ||!is_int($input['retentionDays'])
        ||!in_array($input['cadence'],['manual','daily','weekly'],true)
        ||$input['weekday']<1||$input['weekday']>7
        ||$input['clockMinutes']<0||$input['clockMinutes']>1439
        ||!in_array($input['retentionDays'],[7,30,90,180,365],true)){
        throw new InvalidArgumentException('invalid_monitor_policy');
    }
    if($pdo->inTransaction())
        throw new RuntimeException('response_monitor_nested_transaction');
    // A policy change or one-off manual request and its audit entry are ONE
    // operation. The singleton is locked first, as in other owner controls.
    $pdo->beginTransaction();
    try{
        $q=$pdo->query('SELECT enabled FROM operations_response_probe_settings
            WHERE singleton_id=1 FOR UPDATE');
        $current=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($current))
            throw new DomainException('response_monitor_schema_missing');
        if($requestNow){
            if(!(bool)$current['enabled'])
                throw new DomainException('response_monitor_disabled');
            $pdo->prepare('UPDATE operations_response_probe_settings
                SET requested_at=?,updated_at=? WHERE singleton_id=1')
                ->execute([$at,$at]);
            operationsAudit($pdo,$actor,'response_probe_requested',
                substr(hash('sha256','manual_response_probe'),0,64));
        }else{
            $due=$input['enabled']?operationsSourceNextDue(
                $input['cadence'],$input['weekday'],$input['clockMinutes'],$at):0;
            // Any policy edit invalidates a previously queued manual request.
            // Disabling the observer MUST clear requested_at; no stale opt-in.
            $pdo->prepare('UPDATE operations_response_probe_settings SET
                enabled=?,cadence=?,weekday=?,clock_minutes=?,retention_days=?,
                next_due=?,requested_at=0,updated_at=? WHERE singleton_id=1')
                ->execute([$input['enabled']?1:0,$input['cadence'],
                    $input['weekday'],$input['clockMinutes'],
                    $input['retentionDays'],$due,$at]);
            operationsAudit($pdo,$actor,'response_probe_policy_changed',
                substr(hash('sha256','response_probe_policy'),0,64));
        }
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return operationsResponseMonitorStatus($pdo,$at);
}
function operationsResponseCurl(string $route): array {
    // Only fixed internal routes reach this function; reject unexpected input.
    if(!in_array($route,array_column(operationsResponseProbes(),'path'),true)
       ||!function_exists('curl_init'))
        return ['code'=>null,'headers'=>[],'error'=>'unavailable'];
    $ch=curl_init('https://drjavadrezazadeh.com'.$route);
    if($ch===false)return ['code'=>null,'headers'=>[],'error'=>'unavailable'];
    $headers=[];
    curl_setopt_array($ch,[
        CURLOPT_NOBODY=>true,CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>5,
        CURLOPT_TIMEOUT=>10,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
        CURLOPT_USERAGENT=>'DrJavadOperationsHealth/1.0',
        CURLOPT_HEADERFUNCTION=>static function($ch,$line)use(&$headers){
            $n=strlen($line);$colon=strpos($line,':');
            if($colon!==false){
                $key=strtolower(trim(substr($line,0,$colon)));
                if(in_array($key,[
                    'location','x-frame-options','x-content-type-options',
                    'referrer-policy','permissions-policy',
                    'strict-transport-security','content-security-policy',
                    'cache-control','x-robots-tag'
                ],true))$headers[$key]=substr(trim(substr($line,$colon+1)),0,1024);
            }return $n;
        }
    ]);
    try{
        $ok=curl_exec($ch);
        $code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);
        if($ok===false||$code<100||$code>599)return ['code'=>null,'headers'=>[],'error'=>'request_unavailable'];
        return ['code'=>$code,'headers'=>$headers,'error'=>null];
    }finally{curl_close($ch);}
}
function operationsResponseEvaluate(array $definition,array $response): array {
    $status=$response['code']??null;
    if($status===null)return ['result'=>'unavailable','code'=>null,
        'details'=>['reason'=>(string)($response['error']??'request_unavailable')]];
    if($definition['kind']==='redirect'){
        $location=$response['headers']['location']??null;
        $matches=$status===301 && is_string($location) && hash_equals($definition['location'],$location);
        return ['result'=>$matches?'pass':'fail','code'=>$status,
            'details'=>['expectedCode'=>301,'redirectTargetMatched'=>$matches,
                'expectedLocation'=>$definition['location'],
                // Do not save arbitrary upstream Location values.
                'locationObserved'=>$location!==null]];
    }
    $h=$response['headers'];
    $csp=(string)($h['content-security-policy']??'');
    // Modern frame-ancestors CSP is an accepted clickjacking protection
    // equivalent; do not raise a false incident solely because XFO is absent.
    $xFrame=strtoupper(trim((string)($h['x-frame-options']??'')));
    $cspFrames=(bool)preg_match('/(?:^|;)\\s*frame-ancestors\\s+(?:\\x27none\\x27|\\x27self\\x27)\\s*(?:;|$)/i',$csp);
    $clickjackProtected=in_array($xFrame,['DENY','SAMEORIGIN'],true)||$cspFrames;
    $checks=[
        'http_status'=>$status===(int)$definition['expected'],
        'x_frame_options_or_csp_frame_ancestors'=>$clickjackProtected,
        'x_content_type_options'=>strtolower((string)($h['x-content-type-options']??''))==='nosniff',
        'referrer_policy'=>in_array(strtolower((string)($h['referrer-policy']??'')),
            ['strict-origin-when-cross-origin','no-referrer','same-origin'],true),
        'permissions_policy'=>str_contains(strtolower((string)($h['permissions-policy']??'')),'geolocation=()')
    ];
    $advisory=[
        'strict_transport_security'=>isset($h['strict-transport-security']),
        'content_security_policy'=>isset($h['content-security-policy'])
    ];
    return ['result'=>!in_array(false,$checks,true)?'pass':'fail','code'=>$status,
        'details'=>['mandatory'=>$checks,'advisory'=>$advisory]];
}
function operationsResponseMonitorCollect(PDO $pdo,int $at): array {
    if(PHP_SAPI!=='cli')throw new RuntimeException('cli_only');
    $lock=(int)$pdo->query("SELECT GET_LOCK('drjr_response_monitor_v1',0)")->fetchColumn();
    if($lock!==1)return ['status'=>'busy','checked'=>0];
    try{
        $policy=operationsResponseMonitorPolicy($pdo);
        if($policy===null)return ['status'=>'schema_unavailable','checked'=>0];
        // A disabled master policy must NEVER honor a historical manual
        // request, including one created before a concurrent policy change.
        // The owner setting writer also clears requested_at on every edit.
        $manual=$policy['enabled'] && $policy['requestedAt']>0;
        $due=$policy['enabled'] && $policy['cadence']!=='manual'
            &&$policy['nextDue']>0&&$policy['nextDue']<=$at;
        if(!$manual&&!$due)return ['status'=>'nothing_due','checked'=>0];
        // One fresh identifier per attempted private collector pass; stored
        // only with non-personal bounded observations, never in a public log.
        $runId=bin2hex(random_bytes(16));
        $rows=[];$failed=[];$unavailableByKind=[];$unavailableTargets=0;
        $failedTargets=0;
        foreach(operationsResponseProbes() as $definition){
            $result=operationsResponseEvaluate($definition,
                operationsResponseCurl($definition['path']));
            $rows[]=['id'=>$definition['id'],'kind'=>$definition['kind'],
                'result'=>$result['result'],'code'=>$result['code'],
                'details'=>$result['details']+['observerRunId'=>$runId]];
            if($result['result']==='fail'){
                $failed[$definition['kind']]=true;$failedTargets++;
            }
            if($result['result']==='unavailable'){
                $unavailableByKind[$definition['kind']]=true;
                $unavailableTargets++;
            }
        }
        $next=$policy['enabled']?operationsSourceNextDue(
            $policy['cadence'],$policy['weekday'],$policy['clockMinutes'],$at+60):0;
        $pdo->beginTransaction();
        try{
            // The operator can disable or reconfigure the observer *while*
            // its 7 HTTPS requests are in flight. Lock and compare the
            // singleton just before storing/alerting. A canceled/changed
            // policy must never be overwritten by stale collector output.
            $lockRow=$pdo->query('SELECT singleton_id FROM operations_response_probe_settings
                WHERE singleton_id=1 FOR UPDATE');
            if($lockRow->fetchColumn()===false){
                $pdo->rollBack();
                return ['status'=>'schema_unavailable','checked'=>0];
            }
            $currentPolicy=operationsResponseMonitorPolicy($pdo);
            if($currentPolicy===null||$currentPolicy!==$policy){
                $pdo->rollBack();
                return ['status'=>'policy_changed','checked'=>0,
                    'limitation'=>'Owner changed or revoked the observer during the in-flight requests. Samples and alerts were discarded.'];
            }
            $q=$pdo->prepare('INSERT INTO operations_response_probe_samples
                (probe_id,kind,observed_at,response_code,result,details_json,expires_at)
                VALUES(?,?,?,?,?,?,?)');
            foreach($rows as $row)$q->execute([
                $row['id'],$row['kind'],$at,$row['code'],$row['result'],
                json_encode($row['details'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),
                $at+$policy['retentionDays']*86400
            ]);
            $pdo->prepare('UPDATE operations_response_probe_settings
                SET requested_at=0,next_due=?,updated_at=? WHERE singleton_id=1')
                ->execute([$next,$at]);
            $pdo->prepare('DELETE FROM operations_response_probe_samples
                WHERE expires_at<? LIMIT 150')->execute([$at]);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        if(isset($failed['headers']))
            operationsAlertRecord($pdo,'security_headers_regressed','public_response_headers',$at);
        elseif(!isset($unavailableByKind['headers']))
            operationsAlertResolve($pdo,'security_headers_regressed','public_response_headers',$at);
        if(isset($failed['redirect']))
            operationsAlertRecord($pdo,'redirects_regressed','historical_redirects',$at);
        elseif(!isset($unavailableByKind['redirect']))
            operationsAlertResolve($pdo,'redirects_regressed','historical_redirects',$at);
        return [
            'status'=>count($failed)?'regression':
                ($unavailableTargets>0?'partial':'observed'),
            'checked'=>count($rows),'failed'=>count($failed),
            'failedTargets'=>$failedTargets,
            'unavailableTargets'=>$unavailableTargets,
            'collectionId'=>$runId
        ];
    }finally{$pdo->query("SELECT RELEASE_LOCK('drjr_response_monitor_v1')");}
}
