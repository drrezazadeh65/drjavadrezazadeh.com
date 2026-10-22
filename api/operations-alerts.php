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
function operationsAlertAvailable(PDO $pdo): bool {
    try{
        foreach(['operations_alert_settings','operations_alert_rules','operations_alert_incidents','operations_alert_outbox'] as $t)
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
    foreach($pdo->query('SELECT event_code,enabled,threshold_count,cooldown_minutes FROM operations_alert_rules') as $r){
        $code=(string)$r['event_code'];if(!isset($definitions[$code]))continue;
        $rules[]=['code'=>$code,'name'=>$definitions[$code]['name'],
            'severity'=>$definitions[$code]['severity'],
            'sensorState'=>$definitions[$code]['sensor'],
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
    $definitions=operationsAlertDefinitions();$attempted=0;$accepted=0;
    for($i=0;$i<5;$i++){
        $pdo->beginTransaction();
        try{
            $q=$pdo->query("SELECT o.message_id,o.created_at,i.event_code,i.scope_key,i.severity,i.last_seen_at,i.occurrence_count
                FROM operations_alert_outbox o JOIN operations_alert_incidents i ON i.fingerprint=o.fingerprint
                WHERE o.status='pending' ORDER BY o.created_at ASC LIMIT 1 FOR UPDATE");
            $row=$q->fetch(PDO::FETCH_ASSOC);
            if(!$row){$pdo->commit();break;}
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
