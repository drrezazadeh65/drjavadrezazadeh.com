<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Operations alerting uses the EXISTING site SMTP transport and operations DB.
 * Never send email inside a public HTTP request. Only emit allowlisted incident
 * codes without customer identity, query parameters, IPs, secrets or stack traces.
 */
function operationsAlertDefinitions(): array {
    return [
        'api_runtime_unavailable'=>['severity'=>'critical','threshold'=>1,'cooldown'=>30,'name'=>'Administrative API failure','sensor'=>'on_error'],
        'collector_unavailable'=>['severity'=>'warning','threshold'=>2,'cooldown'=>120,'name'=>'GitHub collector could not obtain valid evidence','sensor'=>'collector_refresh'],
        'security_headers_regressed'=>['severity'=>'critical','threshold'=>1,'cooldown'=>60,'name'=>'Public security header regression','sensor'=>'not_yet_connected'],
        'redirects_regressed'=>['severity'=>'critical','threshold'=>1,'cooldown'=>60,'name'=>'Canonical or historical redirect regression','sensor'=>'not_yet_connected'],
        'http_404_surge'=>['severity'=>'warning','threshold'=>1,'cooldown'=>120,'name'=>'High volume of missing URLs','sensor'=>'private_access_log_observer_requires_configuration'],
        'http_5xx_surge'=>['severity'=>'critical','threshold'=>1,'cooldown'=>30,'name'=>'Server 5xx errors seen in the access log','sensor'=>'private_access_log_observer_requires_configuration'],
        'payment_runtime_unavailable'=>['severity'=>'critical','threshold'=>1,'cooldown'=>60,'name'=>'Checkout or payment runtime failure','sensor'=>'not_yet_connected']
    ];
}
/**
 * Mail delivery controls are independent of collectors, indexing, checkout
 * and security. All scopes belong to the existing ENG-01..ENG-13 hierarchy.
 * Missing source/feature discovery is shown as unavailable, never "active".
 */
function operationsAlertIncidentScopes(string $code,string $component): array {
    $map=[
        'api_runtime_unavailable'=>['ENG-13','admin-audit-and-2fa'],
        'security_headers_regressed'=>['ENG-11','response-security-headers'],
        'redirects_regressed'=>['ENG-01','redirect-301-410'],
        'http_404_surge'=>['ENG-01','incoming-404'],
        'http_5xx_surge'=>['ENG-11','site-runtime-health'],
        'payment_runtime_unavailable'=>['ENG-05','commerce-settlement']
    ];
    if($code==='collector_unavailable'){
        $catalogue=function_exists('operationsCollectorCatalogue')
            ?operationsCollectorCatalogue():[];
        $engine=(string)($catalogue[$component]['engineId']??'ENG-13');
        return ['engine:'.$engine,'feature:source-scheduler-and-retention',
            'source:collector:'.$component];
    }
    $mapping=$map[$code]??['ENG-13','incident-mail-alerts'];
    return ['engine:'.$mapping[0],'feature:'.$mapping[1]];
}
function operationsAlertScopeSettings(PDO $pdo): ?array {
    try{
        $q=$pdo->query('SELECT scope_id,enabled,updated_at FROM operations_alert_scope_policies');
        $rows=[];
        foreach($q as $record)$rows[(string)$record['scope_id']]=[
            'enabled'=>(bool)$record['enabled'],'updatedAt'=>(int)$record['updated_at']];
        return $rows;
    }catch(Throwable $e){return null;}
}
function operationsAlertScopesAllowed(PDO $pdo,int $at): array {
    $scopes=[];
    for($i=1;$i<=13;$i++){
        $engine='ENG-'.str_pad((string)$i,2,'0',STR_PAD_LEFT);
        $id='engine:'.$engine;
        $scopes[$id]=['id'=>$id,'kind'=>'engine','parent'=>null,
            'nameFa'=>'ایمیل موتور '.$engine,'nameEn'=>'Engine '.$engine.' email',
            'available'=>true];
    }
    if(function_exists('operationsExistingFeatures')){
        $features=operationsExistingFeatures();
        foreach($features['features']??[] as $feature) {
            $id='feature:'.(string)$feature['id'];
            if(strlen($id)>120)continue;
            $scopes[$id]=['id'=>$id,'kind'=>'feature',
                'parent'=>'engine:'.(string)$feature['engineId'],
                'nameFa'=>(string)$feature['nameFa'],'nameEn'=>(string)$feature['nameEn'],
                'available'=>($feature['sourceState']??'')==='source_present'];
        }
    }
    if(function_exists('operationsSourceDirectory')){
        $directory=operationsSourceDirectory($pdo,$at);
        foreach($directory['sources']??[] as $source){
            $id='source:'.(string)($source['id']??'');
            if(strlen($id)>120)continue;
            $scopes[$id]=['id'=>$id,'kind'=>'source',
                'parent'=>'engine:'.(string)($source['engineId']??'ENG-13'),
                'nameFa'=>(string)$source['name'],'nameEn'=>(string)$source['name'],
                'available'=>in_array(($source['status']??''),['cached_fresh','not_fresh','disabled'],true)
                    && ($source['kind']??'')==='github_feed'];
        }
    }
    return $scopes;
}
function operationsAlertScopeSnapshot(PDO $pdo,int $at): array {
    $settings=operationsAlertScopeSettings($pdo);
    if($settings===null)return ['status'=>'schema_not_provisioned','rows'=>[]];
    $allowed=operationsAlertScopesAllowed($pdo,$at);
    $rows=[];
    foreach($allowed as $id=>$value) {
        $explicit=$settings[$id]??null;
        $rows[]=$value+[
            'emailEnabled'=>$explicit===null?true:$explicit['enabled'],
            'inheritsDefault'=>$explicit===null,
            'updatedAt'=>$explicit['updatedAt']??null
        ];
    }
    return ['status'=>'available','rows'=>$rows,
        'limitation'=>'Email switches control notifications, not site features or data collection. Source-only features do not become active through email settings.'];
}
function operationsAlertScopeEnabled(PDO $pdo,string $code,string $component): bool {
    $settings=operationsAlertScopeSettings($pdo);
    if($settings===null)return false; // Fail closed until unified schema is installed.
    foreach(operationsAlertIncidentScopes($code,$component) as $id)
        if(isset($settings[$id])&&$settings[$id]['enabled']===false)return false;
    return true;
}
function operationsAlertScopeUpdate(PDO $pdo,array $input,string $actor,int $at): array {
    if(array_keys($input)!==['scopeId','enabled']
       ||!is_string($input['scopeId'])||!is_bool($input['enabled']))
        throw new InvalidArgumentException('invalid_alert_scope');
    $scope=$input['scopeId'];
    $allowed=operationsAlertScopesAllowed($pdo,$at);
    if(!isset($allowed[$scope])||strlen($scope)>120)
        throw new InvalidArgumentException('unknown_alert_scope');
    $pdo->prepare('INSERT INTO operations_alert_scope_policies
        (scope_id,enabled,updated_at) VALUES (?,?,?)
        ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),updated_at=VALUES(updated_at)')
        ->execute([$scope,$input['enabled']?1:0,$at]);
    operationsAudit($pdo,$actor,'alert_scope_changed',substr(hash('sha256',$scope),0,64));
    return operationsAlertScopeSnapshot($pdo,$at);
}
function operationsAlertAvailable(PDO $pdo): bool {
    try{
        foreach(['operations_alert_settings','operations_alert_rules','operations_alert_incidents','operations_alert_outbox','operations_alert_scope_policies'] as $t)
            $pdo->query('SELECT 1 FROM '.$t.' LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
function operationsAlertRecord(PDO $pdo,string $code,string $scope,int $at): bool {
    $definitions=operationsAlertDefinitions();
    if(!isset($definitions[$code]) || !preg_match('/^[a-zA-Z0-9:._-]{1,96}$/D',$scope))return false;
    if(!operationsAlertAvailable($pdo))return false;
    try{
        $pdo->beginTransaction();
        $ruleQ=$pdo->prepare('SELECT enabled,threshold_count,cooldown_minutes FROM operations_alert_rules WHERE event_code=?');
        $ruleQ->execute([$code]);$rule=$ruleQ->fetch(PDO::FETCH_ASSOC);
        $setting=$pdo->query('SELECT enabled FROM operations_alert_settings WHERE singleton_id=1')->fetch(PDO::FETCH_ASSOC);
        if(!$rule||!$setting){$pdo->rollBack();return false;}
        $fingerprint=hash('sha256','ops-incident-v1|'.$code.'|'.$scope);
        $q=$pdo->prepare('SELECT occurrence_count,last_seen_at,last_queued_at FROM operations_alert_incidents WHERE fingerprint=? FOR UPDATE');
        $q->execute([$fingerprint]);$previous=$q->fetch(PDO::FETCH_ASSOC);
        $count=$previous?(int)$previous['occurrence_count']+1:1;
        if($previous){
            $pdo->prepare("UPDATE operations_alert_incidents SET occurrence_count=?,last_seen_at=?,state='open' WHERE fingerprint=?")
                ->execute([$count,$at,$fingerprint]);
        }else{
            $pdo->prepare("INSERT INTO operations_alert_incidents
                (fingerprint,event_code,scope_key,severity,first_seen_at,last_seen_at,occurrence_count,state,last_queued_at)
                VALUES (?,?,?,?,?,?,?,'open',0)")
                ->execute([$fingerprint,$code,$scope,$definitions[$code]['severity'],$at,$at,$count]);
        }
        $minutes=max(15,(int)$rule['cooldown_minutes']);
        $last=$previous?(int)$previous['last_queued_at']:0;
        if((bool)$setting['enabled']&&(bool)$rule['enabled']
            &&operationsAlertScopeEnabled($pdo,$code,$scope)
            &&$count>=(int)$rule['threshold_count']
            &&($last===0||$at-$last>=$minutes*60)){
            // Serialize by incident row lock; one outbox item per approved window.
            $id=hash('sha256','ops-email-v1|'.$fingerprint.'|'.intdiv($at,$minutes*60));
            $insert=$pdo->prepare("INSERT IGNORE INTO operations_alert_outbox
                (message_id,fingerprint,status,created_at,attempted_at,sent_at)
                VALUES (?,?,'pending',?,NULL,NULL)");
            $insert->execute([$id,$fingerprint,$at]);
            if($insert->rowCount()===1)
                $pdo->prepare('UPDATE operations_alert_incidents SET last_queued_at=? WHERE fingerprint=?')
                    ->execute([$at,$fingerprint]);
        }
        $pdo->commit();return true;
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        return false; // Diagnostics must not break production requests.
    }
}
/**
 * Close an incident only on a fresh, affirmative successful sensor observation.
 * A stale/unavailable source must never be interpreted as healthy.
 */
function operationsAlertResolve(PDO $pdo,string $code,string $scope,int $at): bool {
    if(!isset(operationsAlertDefinitions()[$code])
       ||!preg_match('/^[a-zA-Z0-9:._-]{1,96}$/D',$scope)
       ||!operationsAlertAvailable($pdo))return false;
    try{
        $fingerprint=hash('sha256','ops-incident-v1|'.$code.'|'.$scope);
        $q=$pdo->prepare("UPDATE operations_alert_incidents SET state='resolved'
            WHERE fingerprint=? AND state='open' AND last_seen_at<=?");
        $q->execute([$fingerprint,$at-300]);
        return $q->rowCount()>0;
    }catch(Throwable $e){return false;}
}
function operationsAlertSnapshot(PDO $pdo,array $configuration): array {
    if(!operationsAlertAvailable($pdo))return [
        'ok'=>true,'schema'=>'operations-alert-center-v1','status'=>'schema_not_provisioned',
        'mailReady'=>false,'recipientConfigured'=>false,'rows'=>[],'rules'=>[],'recentEmails'=>[],
        'limitation'=>'Apply the existing unified Bertina operations schema before enabling alerts.'];
    $setting=$pdo->query('SELECT enabled FROM operations_alert_settings WHERE singleton_id=1')->fetch(PDO::FETCH_ASSOC);
    $definitions=operationsAlertDefinitions();$rules=[];
    $httpSensor='not_configured';
    if(function_exists('operationsHttpObserverStatus')){
        $httpStatus=operationsHttpObserverStatus($pdo,$configuration);
        $httpSensor=(string)($httpStatus['state']??'not_configured');
    }
    foreach($pdo->query('SELECT event_code,enabled,threshold_count,cooldown_minutes FROM operations_alert_rules') as $r){
        $code=(string)$r['event_code'];if(!isset($definitions[$code]))continue;
        $rules[]=['code'=>$code,'name'=>$definitions[$code]['name'],
            'severity'=>$definitions[$code]['severity'],
            'sensorState'=>in_array($code,['http_404_surge','http_5xx_surge'],true)
                ?'private_http_log_'.$httpSensor:$definitions[$code]['sensor'],
            'enabled'=>(bool)$r['enabled'],'threshold'=>(int)$r['threshold_count'],
            'cooldownMinutes'=>(int)$r['cooldown_minutes']];
    }
    // Accurate totals are queried separately from the 50-row incident timeline.
    $totals=['critical'=>0,'warning'=>0,'resolved'=>0];
    $counts=$pdo->query("SELECT severity,state,COUNT(*) AS n FROM operations_alert_incidents GROUP BY severity,state");
    foreach($counts as $row){
        if($row['state']==='open'&&isset($totals[$row['severity']]))
            $totals[$row['severity']]+=(int)$row['n'];
        if($row['state']==='resolved')$totals['resolved']+=(int)$row['n'];
    }
    $rows=[];
    $q=$pdo->query('SELECT event_code,scope_key,severity,first_seen_at,last_seen_at,occurrence_count,state,last_queued_at
        FROM operations_alert_incidents ORDER BY last_seen_at DESC LIMIT 50');
    foreach($q as $r)$rows[]=[
        'eventCode'=>$r['event_code'],'scope'=>$r['scope_key'],'severity'=>$r['severity'],
        'firstSeenAt'=>(int)$r['first_seen_at'],'lastSeenAt'=>(int)$r['last_seen_at'],
        'occurrences'=>(int)$r['occurrence_count'],'state'=>$r['state'],
        'lastQueuedAt'=>(int)$r['last_queued_at']?:null];
    $mail=[];
    $q=$pdo->query('SELECT o.status,o.created_at,o.attempted_at,o.sent_at,i.event_code
        FROM operations_alert_outbox o JOIN operations_alert_incidents i ON i.fingerprint=o.fingerprint
        ORDER BY o.created_at DESC LIMIT 30');
    foreach($q as $r)$mail[]=[
        'eventCode'=>$r['event_code'],'state'=>$r['status'],
        'createdAt'=>(int)$r['created_at'],
        'attemptedAt'=>$r['attempted_at']===null?null:(int)$r['attempted_at'],
        'acceptedAt'=>$r['sent_at']===null?null:(int)$r['sent_at']];
    $recipient=(string)($configuration['operations_alert_recipient']??'');
    $configured=filter_var($recipient,FILTER_VALIDATE_EMAIL)!==false;
    return [
        'ok'=>true,'schema'=>'operations-alert-center-v1','status'=>'available',
        'enabled'=>(bool)($setting['enabled']??false),'recipientConfigured'=>$configured,
        'mailReady'=>function_exists('mailReady')&&mailReady(),
        'worker'=>'dedicated_private_cron_required',
        'rules'=>$rules,'rows'=>$rows,'recentEmails'=>$mail,'openCounts'=>$totals,'incidentHistoryLimit'=>50,
        'scopeControls'=>operationsAlertScopeSnapshot($pdo,time()),
        'lastObservedAt'=>$rows[0]['lastSeenAt']??null,
        'limitation'=>'SMTP acceptance is not inbox delivery. Alerts arrive only when a trusted sensor records an incident and the private CLI mail worker runs. Disabled or unimplemented sensors do not monitor the named risk.'];
}
function operationsAlertUpdate(PDO $pdo,array $input,string $actor): void {
    if(!isset($input['eventCode'],$input['enabled'],$input['threshold'],$input['cooldownMinutes'])
        ||count($input)!==4||!is_string($input['eventCode'])
        ||!is_bool($input['enabled'])||!is_int($input['threshold'])
        ||!is_int($input['cooldownMinutes']))
        throw new InvalidArgumentException('invalid_alert_rule');
    $code=$input['eventCode'];
    if($code==='all'){
        if($input['threshold']!==1||$input['cooldownMinutes']!==60)
            throw new InvalidArgumentException('invalid_alert_rule');
        $pdo->prepare('UPDATE operations_alert_settings SET enabled=?,updated_at=? WHERE singleton_id=1')
            ->execute([$input['enabled']?1:0,time()]);
    }else{
        if(!isset(operationsAlertDefinitions()[$code])
            ||$input['threshold']<1||$input['threshold']>100
            ||$input['cooldownMinutes']<15||$input['cooldownMinutes']>1440)
            throw new InvalidArgumentException('invalid_alert_rule');
        $q=$pdo->prepare('UPDATE operations_alert_rules SET enabled=?,threshold_count=?,cooldown_minutes=?,updated_at=? WHERE event_code=?');
        $q->execute([$input['enabled']?1:0,$input['threshold'],$input['cooldownMinutes'],time(),$code]);
    }
    operationsAudit($pdo,$actor,'alert_rule_updated',substr(hash('sha256',$code),0,64));
}
/**
 * One mail worker pass, invoked only from a CLI-only task. Reserve BEFORE SMTP;
 * ambiguous acceptance is terminal 'uncertain', never blindly retried.
 */
function operationsAlertSendBatch(PDO $pdo,array $configuration,callable $transport,int $at): array {
    $recipient=(string)($configuration['operations_alert_recipient']??'');
    if(!filter_var($recipient,FILTER_VALIDATE_EMAIL)||!operationsAlertAvailable($pdo))
        return ['status'=>'not_configured','attempted'=>0,'accepted'=>0];
    // Revocation is authoritative even for messages queued BEFORE the owner
    // disabled emails. Pending items remain visible for audit but are not sent.
    $switch=$pdo->query('SELECT enabled FROM operations_alert_settings WHERE singleton_id=1')->fetch(PDO::FETCH_ASSOC);
    if(!$switch||!(bool)$switch['enabled'])
        return ['status'=>'disabled','attempted'=>0,'accepted'=>0];
    $definitions=operationsAlertDefinitions();$attempted=0;$accepted=0;
    for($i=0;$i<5;$i++){
        $pdo->beginTransaction();
        try{
            $q=$pdo->query("SELECT o.message_id,o.created_at,i.event_code,i.scope_key,i.severity,i.last_seen_at,i.occurrence_count,
                  r.enabled AS rule_enabled
                FROM operations_alert_outbox o JOIN operations_alert_incidents i ON i.fingerprint=o.fingerprint
                JOIN operations_alert_rules r ON r.event_code=i.event_code
                JOIN operations_alert_settings a ON a.singleton_id=1
                WHERE o.status='pending' AND a.enabled=1
                ORDER BY o.created_at ASC LIMIT 1 FOR UPDATE");
            $row=$q->fetch(PDO::FETCH_ASSOC);
            if(!$row){$pdo->commit();break;}
            // Send-time check is required: the owner may disable a motor,
            // feature, source or event AFTER an incident was queued.
            if(!(bool)$row['rule_enabled'] ||
                !operationsAlertScopeEnabled($pdo,(string)$row['event_code'],(string)$row['scope_key'])){
                $pdo->prepare("UPDATE operations_alert_outbox SET status='suppressed'
                    WHERE message_id=? AND status='pending'")
                    ->execute([$row['message_id']]);
                $pdo->commit();continue;
            }
            // Prevent delayed notice floods if a worker was not installed.
            if($at-(int)$row['created_at']>86400){
                $pdo->prepare("UPDATE operations_alert_outbox SET status='expired' WHERE message_id=?")
                    ->execute([$row['message_id']]);$pdo->commit();continue;
            }
            $pdo->prepare("UPDATE operations_alert_outbox SET status='reserved',attempted_at=? WHERE message_id=? AND status='pending'")
                ->execute([$at,$row['message_id']]);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();break;}
        $attempted++;
        $code=(string)$row['event_code'];
        $label=$definitions[$code]['name']??$code;
        $subject='[Site Alert] '.strtoupper((string)$row['severity']).' - '.$label;
        $body="Site: drjavadrezazadeh.com\nSeverity: ".$row['severity']."\nIncident: ".$label.
            "\nComponent: ".$row['scope_key']."\nLast observed (UTC): ".gmdate('c',(int)$row['last_seen_at']).
            "\nOccurrences: ".$row['occurrence_count']."\n\nAdministrator details: https://drjavadrezazadeh.com/en/account/admin/\n".
            "This is a server-recorded event, not an independently verified diagnosis. Review before making changes.\n";
        $ok=false;
        try{$ok=$transport($recipient,$subject,$body)===true;}catch(Throwable $e){}
        try{
            $q=$pdo->prepare("UPDATE operations_alert_outbox SET status=?,sent_at=? WHERE message_id=? AND status='reserved'");
            $q->execute([$ok?'accepted':'uncertain',$ok?$at:null,$row['message_id']]);
            if($ok&&$q->rowCount()===1)$accepted++;
        }catch(Throwable $e){
            // The SMTP server might have accepted the message. Never resend an
            // uncorrelated reserved item automatically.
        }
    }
    return ['status'=>'processed','attempted'=>$attempted,'accepted'=>$accepted];
}
