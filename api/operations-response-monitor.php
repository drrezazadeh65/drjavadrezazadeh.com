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
    $rows=[];$history=[];
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
    return ['ok'=>true,'schema'=>'operations-response-monitor-v1',
        'status'=>'stored_observations','settings'=>$settings,
        'latest'=>$rows,'history'=>array_slice($history,0,80),
        'checks'=>[
            'mandatory'=>['http_status','x_frame_options','x_content_type_options','referrer_policy','permissions_policy'],
            'advisory'=>['strict_transport_security','content_security_policy']
        ],
        'limitation'=>'The newest observation is historical, not a continuous live monitor. HSTS and CSP absence is reported as advisory until an independently approved non-breaking policy is installed. HEAD is not a visual test or a security penetration test.'];
}
function operationsResponseMonitorConfigure(PDO $pdo,array $input,string $actor,int $at): array {
    $keys=array_keys($input);
    if($keys===['requestNow']){
        if($input['requestNow']!==true)throw new InvalidArgumentException('invalid_monitor_request');
        $pdo->prepare('UPDATE operations_response_probe_settings SET requested_at=?,updated_at=? WHERE singleton_id=1')
            ->execute([$at,$at]);
        operationsAudit($pdo,$actor,'response_probe_requested',substr(hash('sha256','manual_response_probe'),0,64));
        return operationsResponseMonitorStatus($pdo,$at);
    }
    if($keys!==['enabled','cadence','weekday','clockMinutes','retentionDays']
        ||!is_bool($input['enabled'])||!is_string($input['cadence'])
        ||!is_int($input['weekday'])||!is_int($input['clockMinutes'])
        ||!is_int($input['retentionDays'])
        ||!in_array($input['cadence'],['manual','daily','weekly'],true)
        ||$input['weekday']<1||$input['weekday']>7
        ||$input['clockMinutes']<0||$input['clockMinutes']>1439
        ||!in_array($input['retentionDays'],[7,30,90,180,365],true))
        throw new InvalidArgumentException('invalid_monitor_policy');
    $due=$input['enabled']?operationsSourceNextDue($input['cadence'],
        $input['weekday'],$input['clockMinutes'],$at):0;
    $q=$pdo->prepare('UPDATE operations_response_probe_settings
       SET enabled=?,cadence=?,weekday=?,clock_minutes=?,retention_days=?,next_due=?,updated_at=? WHERE singleton_id=1');
    $q->execute([$input['enabled']?1:0,$input['cadence'],$input['weekday'],
        $input['clockMinutes'],$input['retentionDays'],$due,$at]);
    operationsAudit($pdo,$actor,'response_probe_policy_changed',substr(hash('sha256','response_probe_policy'),0,64));
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
    $checks=[
        'http_status'=>$status===(int)$definition['expected'],
        'x_frame_options'=>strtoupper((string)($h['x-frame-options']??''))==='DENY',
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
        $manual=$policy['requestedAt']>0 && $policy['requestedAt']>$policy['updatedAt']-1;
        $due=$policy['enabled'] && $policy['cadence']!=='manual'
            &&$policy['nextDue']>0&&$policy['nextDue']<=$at;
        if(!$manual&&!$due)return ['status'=>'nothing_due','checked'=>0];
        $rows=[];$failed=[];$unavailable=false;
        foreach(operationsResponseProbes() as $definition){
            $result=operationsResponseEvaluate($definition,
                operationsResponseCurl($definition['path']));
            $rows[]=['id'=>$definition['id'],'kind'=>$definition['kind'],
                'result'=>$result['result'],'code'=>$result['code'],
                'details'=>$result['details']];
            if($result['result']==='fail')$failed[$definition['kind']]=true;
            if($result['result']==='unavailable')$unavailable=true;
        }
        $next=$policy['enabled']?operationsSourceNextDue(
            $policy['cadence'],$policy['weekday'],$policy['clockMinutes'],$at+60):0;
        $pdo->beginTransaction();
        try{
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
        elseif(!$unavailable)
            operationsAlertResolve($pdo,'security_headers_regressed','public_response_headers',$at);
        if(isset($failed['redirect']))
            operationsAlertRecord($pdo,'redirects_regressed','historical_redirects',$at);
        elseif(!$unavailable)
            operationsAlertResolve($pdo,'redirects_regressed','historical_redirects',$at);
        return ['status'=>$unavailable?'partial':(count($failed)?'regression':'observed'),
            'checked'=>count($rows),'failed'=>count($failed)];
    }finally{$pdo->query("SELECT RELEASE_LOCK('drjr_response_monitor_v1')");}
}
