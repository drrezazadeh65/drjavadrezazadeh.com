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
        'payment_runtime_unavailable'=>['severity'=>'critical','threshold'=>1,'cooldown'=>60,'name'=>'Checkout or payment runtime failure','sensor'=>'not_yet_connected'],
        'bahar_private_storage_failure'=>['severity'=>'critical','threshold'=>1,'cooldown'=>60,
          'name'=>'Unexpected encrypted BAHAR private storage failure','sensor'=>'on_error_after_owner_opt_in'],
        'bahar_eligibility_queue_failure'=>['severity'=>'warning','threshold'=>1,'cooldown'=>120,
          'name'=>'Verified adult review queue failed unexpectedly','sensor'=>'on_admin_error_after_owner_opt_in'],
        'bahar_private_erasure_requested'=>['severity'=>'warning','threshold'=>1,'cooldown'=>60,
          'name'=>'A BAHAR privacy erasure request was recorded','sensor'=>'new_request_post_commit_source_unverified']
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
        'payment_runtime_unavailable'=>['ENG-05','commerce-settlement'],
        'bahar_private_storage_failure'=>['ENG-04','bahar-private-storage-alerts'],
        'bahar_eligibility_queue_failure'=>['ENG-04','bahar-adult-review-alerts'],
        'bahar_private_erasure_requested'=>['ENG-04','bahar-privacy-erasure-alerts']
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
    // New BAHAR alerts are individually disabled until a super admin
    // explicitly opts in through the EXISTING mail-notification matrix.
    foreach([
      'bahar-private-storage-alerts'=>[
        'fa'=>'خرابی ذخیره امن BAHAR','en'=>'BAHAR encrypted storage failures'
      ],
      'bahar-adult-review-alerts'=>[
        'fa'=>'خطاهای صف تأیید بزرگسالی','en'=>'BAHAR adult verification queue failures'
      ],
      'bahar-privacy-erasure-alerts'=>[
        'fa'=>'درخواست‌های حذف خصوصی BAHAR','en'=>'New BAHAR privacy erasure requests'
      ]
    ] as $key=>$title){
        $id='feature:'.$key;
        $scopes[$id]=[
          'id'=>$id,'kind'=>'feature','parent'=>'engine:ENG-04',
          'nameFa'=>$title['fa'],'nameEn'=>$title['en'],
          'available'=>function_exists('operationsBaharPrivatePolicy')
        ];
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
        // Only the new BAHAR-sensitive scopes default OFF. Display the
        // exact effective status that the dispatch gate actually enforces.
        $baharOptIn= in_array($id,[
          'feature:bahar-private-storage-alerts',
          'feature:bahar-adult-review-alerts',
          'feature:bahar-privacy-erasure-alerts'
        ],true);
        $rows[]=$value+[
            'emailEnabled'=>$explicit===null?!$baharOptIn:$explicit['enabled'],
            'inheritsDefault'=>$explicit===null,
            'requiresExplicitOptIn'=>$baharOptIn,
            'updatedAt'=>$explicit['updatedAt']??null
        ];
    }
    return ['status'=>'available','rows'=>$rows,
        'limitation'=>'Email switches control notifications, not site features or data collection. Source-only features do not become active through email settings.'];
}
function operationsAlertScopeEnabled(PDO $pdo,string $code,string $component): bool {
    $settings=operationsAlertScopeSettings($pdo);
    if($settings===null)return false; // Fail closed until unified schema is installed.
    // Existing incident preferences are preserved. Only the two new
    // educational/age-verification alert classes require explicit enablement.
    $educationAlerts=[
      'bahar_private_storage_failure'=>'feature:bahar-private-storage-alerts',
      'bahar_eligibility_queue_failure'=>'feature:bahar-adult-review-alerts',
      'bahar_private_erasure_requested'=>'feature:bahar-privacy-erasure-alerts'
    ];
    if(isset($educationAlerts[$code])&&
      ($settings[$educationAlerts[$code]]['enabled']??false)!==true)
        return false;
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
    // Preference and audit must commit together. An unavailable audit table
    // must never leave behind an unaudited owner setting change.
    if($pdo->inTransaction())throw new RuntimeException('alert_scope_nested_transaction');
    $pdo->beginTransaction();
    try{
        $pdo->prepare('INSERT INTO operations_alert_scope_policies
            (scope_id,enabled,updated_at) VALUES (?,?,?)
            ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),updated_at=VALUES(updated_at)')
            ->execute([$scope,$input['enabled']?1:0,$at]);
        operationsAudit($pdo,$actor,'alert_scope_changed',substr(hash('sha256',$scope),0,64));
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
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
    // Even with missing mother-DB tables, show ALL allowlisted incident
    // definitions as source-only, NOT as absent or remotely monitored. A
    // disabled owner console must remain informative without fabricating
    // zero incidents, a mail queue, a verified recipient, or active rules.
    if(!operationsAlertAvailable($pdo)){
        $unprovisioned=[];
        foreach(operationsAlertDefinitions() as $code=>$def){
            $unprovisioned[]=[
                'code'=>$code,'name'=>$def['name'],'severity'=>$def['severity'],
                'sensorState'=>'schema_unavailable_source_only_'.(string)$def['sensor'],
                'ruleProvisioned'=>false,'enabled'=>false,
                'threshold'=>(int)$def['threshold'],
                'cooldownMinutes'=>(int)$def['cooldown'],
                'emailDeliveryVerified'=>false
            ];
        }
        return [
            'ok'=>true,'schema'=>'operations-alert-center-v1',
            'status'=>'schema_not_provisioned','enabled'=>null,
            'mailReady'=>false,'recipientConfigured'=>false,
            'worker'=>'unverified','rows'=>[],
            'rules'=>$unprovisioned,'recentEmails'=>[],
            'openCounts'=>['critical'=>null,'warning'=>null,'resolved'=>null],
            'scopeControls'=>['status'=>'schema_not_provisioned','rows'=>[]],
            'lastObservedAt'=>null,
            'limitation'=>'The source defines incident types, but the existing mother database lacks required alert tables. Incident counts and mail readiness are UNKNOWN, not zero. No rule, sensor or delivery is active based on source code alone.'
        ];
    }
    $setting=$pdo->query('SELECT enabled FROM operations_alert_settings WHERE singleton_id=1')->fetch(PDO::FETCH_ASSOC);
    $definitions=operationsAlertDefinitions();$rules=[];
    $httpSensor='not_configured';
    if(function_exists('operationsHttpObserverStatus')){
        $httpStatus=operationsHttpObserverStatus($pdo,$configuration);
        $httpSensor=(string)($httpStatus['state']??'not_configured');
    }
    // The fixed response worker emits real security/redirect incidents. Treat
    // installation and freshness separately; source code alone is not coverage.
    $responseStatus=function_exists('operationsResponseMonitorStatus')
        ?operationsResponseMonitorStatus($pdo,time()):null;
    // Enumerate every supported event, including rules whose *additive*
    // MariaDB seed has not yet been installed. A missing row must be visible
    // as NOT PROVISIONED; it cannot be enabled by a no-op UPDATE.
    $savedRules=[];
    foreach($pdo->query('SELECT event_code,enabled,threshold_count,cooldown_minutes FROM operations_alert_rules') as $stored){
        $key=(string)$stored['event_code'];
        if(isset($definitions[$key]))$savedRules[$key]=$stored;
    }
    foreach($definitions as $code=>$definition){
        $r=$savedRules[$code]??null;
        $ruleProvisioned=is_array($r);
        $sensor=(string)$definition['sensor'];
        if(in_array($code,['http_404_surge','http_5xx_surge'],true)){
            $sensor='private_http_log_'.$httpSensor;
        }elseif(in_array($code,['security_headers_regressed','redirects_regressed'],true)){
            $kind=$code==='security_headers_regressed'?'headers':'redirect';
            $policy=$responseStatus['settings']??null;
            $family=$responseStatus['latestTimestampCoverage']['byKind'][$kind]??null;
            // Do not call a sensor operational just because one of its
            // fixed routes returned a recent HEAD response. All family
            // targets must be from the same stored private collection.
            if(!is_array($policy))$sensor='response_monitor_schema_missing';
            elseif(!($policy['enabled']??false))$sensor='response_monitor_disabled';
            elseif(($responseStatus['status']??'')==='read_unavailable')
                $sensor='response_monitor_samples_read_unavailable';
            elseif(!is_array($family)||($family['observedTargets']??0)===0)
                $sensor='response_monitor_no_observation';
            elseif(!($family['complete']??false))
                $sensor='response_monitor_incomplete_collection';
            elseif(!($family['fresh']??false))$sensor='response_monitor_stale';
            elseif(($family['unavailableTargets']??0)>0)
                $sensor='response_monitor_unavailable_targets';
            elseif(($family['failedTargets']??0)>0)
                $sensor='response_monitor_observed_failure';
            else $sensor='response_monitor_recent_complete_source_cron_unverified';
        }
        $rules[]=['code'=>$code,'name'=>$definition['name'],
            'severity'=>$definition['severity'],
            'sensorState'=>$sensor,
            'ruleProvisioned'=>$ruleProvisioned,
            'enabled'=>$ruleProvisioned?(bool)$r['enabled']:false,
            'threshold'=>$ruleProvisioned?(int)$r['threshold_count']:(int)$definition['threshold'],
            'cooldownMinutes'=>$ruleProvisioned?(int)$r['cooldown_minutes']:(int)$definition['cooldown'],
            'emailDeliveryVerified'=>false];
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
    }elseif(!isset(operationsAlertDefinitions()[$code])
        ||$input['threshold']<1||$input['threshold']>100
        ||$input['cooldownMinutes']<15||$input['cooldownMinutes']>1440){
        throw new InvalidArgumentException('invalid_alert_rule');
    }
    if($pdo->inTransaction())throw new RuntimeException('alert_rule_nested_transaction');
    $pdo->beginTransaction();
    try{
        if($code==='all'){
            $q=$pdo->query('SELECT singleton_id FROM operations_alert_settings
                WHERE singleton_id=1 FOR UPDATE');
            if($q->fetchColumn()===false)
                throw new DomainException('alert_master_setting_not_provisioned');
            $pdo->prepare('UPDATE operations_alert_settings SET enabled=?,updated_at=?
                WHERE singleton_id=1')
                ->execute([$input['enabled']?1:0,time()]);
        }else{
            $q=$pdo->prepare('SELECT event_code FROM operations_alert_rules
                WHERE event_code=? FOR UPDATE');
            $q->execute([$code]);
            if($q->fetchColumn()===false)
                throw new DomainException('alert_rule_not_provisioned');
            $pdo->prepare('UPDATE operations_alert_rules
                SET enabled=?,threshold_count=?,cooldown_minutes=?,updated_at=?
                WHERE event_code=?')
                ->execute([$input['enabled']?1:0,$input['threshold'],
                    $input['cooldownMinutes'],time(),$code]);
        }
        operationsAudit($pdo,$actor,'alert_rule_updated',
            substr(hash('sha256',$code),0,64));
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
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
            // SMTP acceptance could have occurred. Do not retry an
            // uncorrelated reserved item automatically.
        }
    }
    return ['status'=>'processed','attempted'=>$attempted,'accepted'=>$accepted];
}

/**
 * Searchable, bounded MFA-only incident history in the EXISTING incident log.
 * No IP, visitor query string, email address or unbounded raw log is exposed.
 * GET does not trigger mail, sensors or collection.
 */
function operationsAlertHistory(PDO $pdo,array $input,int $at): array {
    $severity=(string)($input['severity']??'all');
    $state=(string)($input['state']??'all');
    $event=(string)($input['eventCode']??'all');
    $days=filter_var($input['days']??30,FILTER_VALIDATE_INT);
    $page=filter_var($input['page']??1,FILTER_VALIDATE_INT);
    if(!in_array($severity,['all','critical','warning'],true)
        ||!in_array($state,['all','open','acknowledged','resolved'],true)
        ||($event!=='all'&&!isset(operationsAlertDefinitions()[$event]))
        ||$days===false||!in_array($days,[1,7,30,90,180,365],true)
        ||$page===false||$page<1||$page>100)
        throw new InvalidArgumentException('invalid_incident_history_filters');
    if(!operationsAlertAvailable($pdo))
        return ['ok'=>true,'schema'=>'operations-incident-history-v1',
            'status'=>'schema_not_provisioned','records'=>[],'total'=>null];
    $where=['last_seen_at >= ?','last_seen_at <= ?'];
    $args=[$at-$days*86400,$at+60];
    if($severity!=='all'){$where[]='severity = ?';$args[]=$severity;}
    if($state!=='all'){$where[]='state = ?';$args[]=$state;}
    if($event!=='all'){$where[]='event_code = ?';$args[]=$event;}
    $predicate=implode(' AND ',$where);
    $q=$pdo->prepare('SELECT COUNT(*) FROM operations_alert_incidents WHERE '.$predicate);
    $q->execute($args);$total=(int)$q->fetchColumn();
    $limit=50;$offset=($page-1)*$limit;
    $q=$pdo->prepare('SELECT event_code,scope_key,severity,first_seen_at,last_seen_at,
        occurrence_count,state,last_queued_at
        FROM operations_alert_incidents WHERE '.$predicate.'
        ORDER BY last_seen_at DESC,fingerprint ASC LIMIT '.$limit.' OFFSET '.$offset);
    $q->execute($args);$items=[];
    foreach($q as $row)$items[]=[
        'eventCode'=>(string)$row['event_code'],'scope'=>(string)$row['scope_key'],
        'severity'=>(string)$row['severity'],'state'=>(string)$row['state'],
        'occurrences'=>(int)$row['occurrence_count'],
        'firstSeenAt'=>(int)$row['first_seen_at'],
        'lastSeenAt'=>(int)$row['last_seen_at'],
        'lastQueuedAt'=>(int)$row['last_queued_at']?:null
    ];
    return ['ok'=>true,'schema'=>'operations-incident-history-v1',
        'status'=>'stored_incidents_only','days'=>$days,'page'=>$page,
        'pageCount'=>max(1,(int)ceil($total/$limit)),'perPage'=>$limit,
        'total'=>$total,'records'=>$items,
        'note'=>'Historical server-recorded incidents, not current health or an exhaustive PHP/security/payment log.'];
}
