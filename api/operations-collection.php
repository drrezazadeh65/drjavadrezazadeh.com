<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/operations-alerts.php';
require_once __DIR__.'/operations-source-controls.php';

/**
 * Stage-7 collection control: one existing MySQL database, 13 engine switches,
 * eight fixed public GitHub sources and no provider work on public requests.
 * "Live" means existing local event/runtime data, never a GitHub polling loop.
 */
function operationsCollectorCatalogue(): array {
    $sources=[
        'audit:bertina-master-seo.yml'=>['ENG-01','daily',240],
        'audit:external-link-monitor.yml'=>['ENG-01','daily',260],
        'audit:http-compression-diagnostic.yml'=>['ENG-11','hourly',15],
        'audit:full-route-responsive-certification.yml'=>['ENG-10','daily',300],
        'governance:repository'=>['ENG-11','hourly',20],
        'governance:branches'=>['ENG-11','hourly',25],
        'governance:restore_ci'=>['ENG-11','daily',190],
        'governance:release_runs'=>['ENG-11','hourly',30],
    ];
    $result=[];
    for($i=1;$i<=13;$i++){
        $id='ENG-'.str_pad((string)$i,2,'0',STR_PAD_LEFT);
        $hasSource=in_array($id,['ENG-01','ENG-10','ENG-11'],true);
        $live=in_array($id,['ENG-04','ENG-05','ENG-07','ENG-12'],true);
        $result[$id]=['id'=>$id,'type'=>'engine','engineId'=>$id,
            'connected'=>$hasSource,'enabled'=>true,
            'cadence'=>$hasSource?'daily':($live?'live':'manual'),
            'clockMinutes'=>210];
    }
    foreach($sources as $key=>$data){
        $result[$key]=['id'=>$key,'type'=>'source','engineId'=>$data[0],
            'connected'=>true,'enabled'=>true,'cadence'=>$data[1],
            'clockMinutes'=>$data[2]];
    }
    return $result;
}
function operationsCollectorNextDue(string $cadence,int $clock,int $now): int {
    if(!in_array($cadence,['hourly','daily'],true))return 0;
    $zone=new DateTimeZone('Asia/Tehran');
    $date=(new DateTimeImmutable('@'.$now))->setTimezone($zone);
    if($cadence==='hourly'){
        $candidate=$date->setTime((int)$date->format('G'),$clock%60,0);
        if($candidate->getTimestamp()<=$now)$candidate=$candidate->modify('+1 hour');
    }else{
        $candidate=$date->setTime(intdiv($clock,60),$clock%60,0);
        if($candidate->getTimestamp()<=$now)$candidate=$candidate->modify('+1 day');
    }
    return $candidate->getTimestamp();
}
function operationsCollectorSeed(PDO $pdo,int $at): void {
    $q=$pdo->prepare('INSERT IGNORE INTO operations_collection_policies(scope_key,enabled,cadence,clock_minutes,next_due,updated_at) VALUES(?,?,?,?,?,?)');
    foreach(operationsCollectorCatalogue() as $policy)
        $q->execute([$policy['id'],1,$policy['cadence'],$policy['clockMinutes'],
            operationsCollectorNextDue($policy['cadence'],$policy['clockMinutes'],$at),$at]);
}
function operationsCollectorPolicies(PDO $pdo): array {
    $items=operationsCollectorCatalogue();
    $q=$pdo->query('SELECT scope_key,enabled,cadence,clock_minutes,next_due,updated_at FROM operations_collection_policies');
    foreach($q as $row){
        $id=(string)$row['scope_key'];
        if(!isset($items[$id]))continue;
        $items[$id]['enabled']=(bool)$row['enabled'];
        $items[$id]['cadence']=(string)$row['cadence'];
        $items[$id]['clockMinutes']=(int)$row['clock_minutes'];
        $items[$id]['nextDue']=(int)$row['next_due'];
        $items[$id]['updatedAt']=(int)$row['updated_at'];
    }
    // A specific collector's policy takes precedence over legacy switches.
    // Other 46 references never gain a collector just by enabling the toggle.
    $overrides=operationsSourceControlRows($pdo)??[];
    foreach($items as $key=>&$policy){
        if($policy['type']!=='source')continue;
        $custom=$overrides['collector:'.$key]??null;
        if(!is_array($custom))continue;
        $policy['enabled']=(bool)$custom['enabled'];
        $policy['cadence']=(string)$custom['cadence'];
        $policy['clockMinutes']=(int)$custom['clock_minutes'];
        $policy['weekday']=(int)$custom['weekday'];
        $policy['nextDue']=(int)$custom['next_due'];
        $policy['updatedAt']=(int)$custom['updated_at'];
        $policy['sourceControlOverride']=true;
    }unset($policy);
    return $items;
}
/**
 * Policies created outside the canonical 13-engine/eight-GitHub-source
 * catalogue are not consumed by the scheduled GitHub worker. Report the
 * discrepancy to MFA administrators, without enabling or deleting anything.
 */
/**
 * A fail-closed, independent owner master switch: even if a host cron job
 * exists and older per-source rows are enabled, no scheduled network fetch
 * is permitted unless SUPER_ADMIN explicitly saves this reserved policy.
 * An absent row means OFF (including Bertina's current live DB).
 */
function operationsCollectorAutomaticEnabled(PDO $pdo): bool {
    try {
        $q=$pdo->prepare('SELECT enabled FROM operations_collection_policies WHERE scope_key=? LIMIT 1');
        $q->execute(['system:scheduled_collection']);
        $value=$q->fetchColumn();
        return $value!==false && (int)$value===1;
    } catch (Throwable $e) {
        return false;
    }
}
function operationsCollectorAutomaticConfigure(PDO $pdo,bool $enabled,string $actor,int $at): void {
    $pdo->beginTransaction();
    try {
        $pdo->prepare("INSERT INTO operations_collection_policies
            (scope_key,enabled,cadence,clock_minutes,next_due,updated_at)
            VALUES ('system:scheduled_collection',?,'manual',0,0,?)
            ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),updated_at=VALUES(updated_at)")
            ->execute([$enabled?1:0,$at]);
        $pdo->prepare('INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)')
            ->execute([$actor,$enabled?'collector_master_enabled':'collector_master_disabled',
                'system:scheduled_collection',$at]);
        $pdo->commit();
    } catch (Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function operationsCollectorUnmappedPolicies(PDO $pdo): array {
    try {
        $known=operationsCollectorCatalogue();
        $query=$pdo->query('SELECT scope_key FROM operations_collection_policies ORDER BY scope_key');
        $unknown=[];
        foreach ($query as $row) {
            $id=(string)$row['scope_key'];
            if($id!=='system:scheduled_collection'&&!isset($known[$id]))$unknown[]=$id;
        }
        return ['status'=>'available','count'=>count($unknown),
            'ids'=>array_slice($unknown,0,25)];
    } catch (Throwable $e) {
        return ['status'=>'unavailable','count'=>null,'ids'=>[]];
    }
}
function operationsCollectorConfigure(PDO $pdo,string $key,bool $enabled,string $cadence,int $clock,string $actor,int $at): array {
    $catalogue=operationsCollectorCatalogue();
    if(!isset($catalogue[$key])||!in_array($cadence,['manual','hourly','daily','live'],true)
        ||$clock<0||$clock>1439||($cadence==='live'&&$catalogue[$key]['type']!=='engine'))
        throw new InvalidArgumentException('invalid_collector_policy');
    $next=operationsCollectorNextDue($cadence,$clock,$at);
    $q=$pdo->prepare('UPDATE operations_collection_policies SET enabled=?,cadence=?,clock_minutes=?,next_due=?,updated_at=? WHERE scope_key=?');
    $q->execute([$enabled?1:0,$cadence,$clock,$next,$at,$key]);
    if(!$q->rowCount()){
        $verify=$pdo->prepare('SELECT 1 FROM operations_collection_policies WHERE scope_key=?');
        $verify->execute([$key]);
        if(!$verify->fetchColumn())throw new RuntimeException('collector_schema_unavailable');
    }
    $log=$pdo->prepare('INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)');
    $log->execute([$actor,'collector_policy_changed',substr($key,0,64),$at]);
    return operationsCollectorPolicies($pdo);
}
function operationsCollectorCache(PDO $pdo,array $policies,int $at): array {
    $sources=[];$state=[];
    $rows=$pdo->query('SELECT scope_key,fetched_at,expires_at,body_json FROM operations_collection_cache');
    $byId=[];
    foreach($rows as $row)$byId[$row['scope_key']]=$row;
    foreach($policies as $key=>$policy){
        if($policy['type']!=='source')continue;
        $engine=$policies[$policy['engineId']]??null;
        $active=$policy['enabled']&&($engine['enabled']??false);
        $row=$byId[$key]??null;
        $fresh=$active&&$row!==null&&(int)$row['expires_at']>$at;
        $state[$key]=[
            'status'=>!$active?'disabled':($row===null?'missing':($fresh?'fresh':'stale')),
            'fetchedAt'=>$row===null?null:(int)$row['fetched_at'],
            'expiresAt'=>$row===null?null:(int)$row['expires_at'],
            'nextDue'=>$policy['nextDue']??null
        ];
        if(!$fresh)continue;
        $decoded=json_decode((string)$row['body_json'],true);
        if(!is_array($decoded)){$state[$key]['status']='invalid';continue;}
        $sources[$key]=['http'=>200,'error'=>0,'body'=>json_encode($decoded,JSON_UNESCAPED_SLASHES)];
    }
    return ['sources'=>$sources,'states'=>$state];
}
/**
 * Optional unified-DB collection attempt journal. An uninstalled migration
 * must never interrupt the existing collector or dashboard.
 */
function operationsCollectorAttemptHistory(PDO $pdo): array {
    try {
        $rows=$pdo->query('SELECT scope_key,attempted_at,result,failure_code FROM operations_collection_attempts ORDER BY attempt_id DESC LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        return ['status'=>'schema_not_provisioned','byScope'=>[]];
    }
    $byScope=[];
    foreach ($rows as $record) {
        $key=(string)$record['scope_key'];
        if(isset($byScope[$key]))continue;
        $byScope[$key]=[
            'attemptedAt'=>(int)$record['attempted_at'],
            'result'=>in_array($record['result'],['succeeded','failed'],true)?$record['result']:'unknown',
            'failureCode'=>$record['failure_code']===null?null:(string)$record['failure_code']
        ];
    }
    return ['status'=>'available','byScope'=>$byScope];
}
function operationsCollectorRecordAttempt(PDO $pdo,string $scope,int $at,bool $succeeded): void {
    try {
        $record=$pdo->prepare('INSERT INTO operations_collection_attempts(scope_key,attempted_at,result,failure_code) VALUES(?,?,?,?)');
        $record->execute([$scope,$at,$succeeded?'succeeded':'failed',$succeeded?null:'provider_result_unavailable']);
    } catch (Throwable $e) {
        // Backward-compatible while Bertina migration is pending.
        // Do not interrupt a valid result or expose SQL details.
    }
}
function operationsCollectorStatus(PDO $pdo,int $at): array {
    $policies=operationsCollectorPolicies($pdo);
    $cache=operationsCollectorCache($pdo,$policies,$at);
    $attempts=operationsCollectorAttemptHistory($pdo);
    $rows=[];
    foreach($policies as $key=>$policy){
        $policy['cacheState']=$cache['states'][$key]['status']??($policy['connected']?'not_connected':'not_implemented');
        $policy['lastFetchedAt']=$cache['states'][$key]['fetchedAt']??null;
        $policy['lastAttempt']=$policy['type']==='source'?($attempts['byScope'][$key]??null):null;
        // Recorded attempts prove only application-level activity; neither a
        // due timestamp nor a manual refresh can certify cPanel Cron.
        $policy['executionEvidence']=$policy['type']!=='source'?'not_applicable':
            ($attempts['status']!=='available'?'journal_unavailable':
                ($policy['lastAttempt']===null?'never_observed':
                    (($policy['lastAttempt']['result']??'')==='failed'?'last_attempt_failed':
                        (($policy['lastAttempt']['result']??'')==='succeeded'?'attempt_recorded':'attempt_unknown'))));
        $due=(int)($policy['nextDue']??0);
        $policy['scheduleEvidence']=$policy['type']!=='source'?'engine_switch_only':
            (!$policy['enabled']?'disabled':
                (in_array($policy['cadence'],['manual','live'],true)?'not_scheduled':
                    ($due<=0?'not_scheduled':
                        ($due<=$at?'due_unverified':'scheduled_unverified'))));
        $rows[]=$policy;
    }
    return ['ok'=>true,'schema'=>'operations-collection-controls-v1',
        'timezone'=>'Asia/Tehran','scheduler'=>'external_bertina_cron_required',
        'automaticCollection'=>['enabled'=>operationsCollectorAutomaticEnabled($pdo),
            'installedCronVerified'=>null,'policy'=>'owner_opt_in_fail_closed'],
        'attemptJournalStatus'=>$attempts['status'],
        'unmappedPolicies'=>operationsCollectorUnmappedPolicies($pdo),
        'rows'=>$rows,'sourceStates'=>$cache['states'],
        'limitation'=>'Settings cannot activate an unimplemented collector; real-time commerce, auth and user events never depend on GitHub polling.'];
}
/** Only owner-selected existing source snapshots may be deleted, never
 * original evidence, immutable audit records or business/customer data.
 */
function operationsCollectorDataScopes(string $scope): array {
    $catalogue=operationsCollectorCatalogue();
    if(!isset($catalogue[$scope]))throw new InvalidArgumentException('invalid_collector_data_scope');
    if($catalogue[$scope]['type']==='source')return [$scope];
    $sourceIds=[];
    foreach($catalogue as $key=>$value){
        if($value['type']==='source'&&$value['engineId']===$scope)$sourceIds[]=$key;
    }
    if(!$sourceIds)throw new InvalidArgumentException('collector_scope_not_implemented');
    return $sourceIds;
}
function operationsCollectorDataPreview(PDO $pdo,string $scope): array {
    $sources=operationsCollectorDataScopes($scope);
    $totals=['cacheRows'=>0,'attemptRows'=>0,'metricRows'=>0];
    $more=false;
    foreach($sources as $key){
        $cache=$pdo->prepare('SELECT scope_key FROM operations_collection_cache WHERE scope_key=? LIMIT 1');
        $cache->execute([$key]);$totals['cacheRows']+=count($cache->fetchAll(PDO::FETCH_COLUMN));
        $attempts=$pdo->prepare('SELECT attempt_id FROM operations_collection_attempts WHERE scope_key=? LIMIT 101');
        $attempts->execute([$key]);$found=count($attempts->fetchAll(PDO::FETCH_COLUMN));
        $totals['attemptRows']+=min(100,$found);$more=$more||$found>100;
        $metrics=$pdo->prepare('SELECT sample_id FROM operations_source_metric_samples WHERE source_id=? LIMIT 101');
        $metrics->execute(['collector:'.$key]);$found=count($metrics->fetchAll(PDO::FETCH_COLUMN));
        $totals['metricRows']+=min(100,$found);$more=$more||$found>100;
    }
    return ['ok'=>true,'schema'=>'operations-collector-delete-preview-v1',
        'scope'=>$scope,'affectedSources'=>$sources,'countsBounded'=>$totals,
        'moreMayRemain'=>$more,'previewOnly'=>true,
        'preserved'=>'commerce_customer_accounts_immutable_audit_scientific_and_release_evidence'];
}
function operationsCollectorDataPurge(PDO $pdo,string $scope,string $actor,int $at): array {
    $sources=operationsCollectorDataScopes($scope);
    $locked=(int)$pdo->query("SELECT GET_LOCK('drjr_ops_collection_v1',0)")->fetchColumn();
    if($locked!==1)throw new DomainException('collector_busy');
    try {
        $pdo->beginTransaction();
        $deleted=['cacheRows'=>0,'attemptRows'=>0,'metricRows'=>0];
        try {
            $cache=$pdo->prepare('DELETE FROM operations_collection_cache WHERE scope_key=?');
            $attempts=$pdo->prepare('DELETE FROM operations_collection_attempts WHERE scope_key=? LIMIT 100');
            $metrics=$pdo->prepare('DELETE FROM operations_source_metric_samples WHERE source_id=? LIMIT 100');
            foreach($sources as $key){
                $cache->execute([$key]);$deleted['cacheRows']+=$cache->rowCount();
                $attempts->execute([$key]);$deleted['attemptRows']+=$attempts->rowCount();
                $metrics->execute(['collector:'.$key]);$deleted['metricRows']+=$metrics->rowCount();
            }
            $pdo->prepare('INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)')
                ->execute([$actor,'collector_data_purged',substr(hash('sha256',$scope),0,64),$at]);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'scope'=>$scope,'deleted'=>$deleted,
            'boundedPerSource'=>100,
            'moreMayRemain'=>$deleted['attemptRows']>=100||$deleted['metricRows']>=100,
            'protectedTablesUntouched'=>true];
    }finally{
        $pdo->query("SELECT RELEASE_LOCK('drjr_ops_collection_v1')");
    }
}

function operationsCollectorRefresh(PDO $pdo,string $mode,int $at,string $scope='all'): array {
    if(!in_array($mode,['manual','scheduled'],true))throw new InvalidArgumentException('collector_mode_invalid');
    if($mode==='scheduled'&&!operationsCollectorAutomaticEnabled($pdo))
        return ['status'=>'paused_by_owner','attempted'=>0,'saved'=>0];
    $catalogue=operationsCollectorCatalogue();
    if($scope!=='all'&&!isset($catalogue[$scope]))throw new InvalidArgumentException('collector_scope_invalid');
    $lock=(int)$pdo->query("SELECT GET_LOCK('drjr_ops_collection_v1',0)")->fetchColumn();
    if($lock!==1)return ['status'=>'busy','attempted'=>0,'saved'=>0];
    try{
        $policies=operationsCollectorPolicies($pdo);
        $keys=[];
        foreach($policies as $key=>$p){
            if($p['type']!=='source')continue;
            // Explicit owner manual refresh is independent from the automatic
            // schedule switch. Never silently toggle any stored policy.
            if($mode==='scheduled'&&(!$p['enabled']||!($policies[$p['engineId']]['enabled']??false)))continue;
            if($scope!=='all'&&$scope!==$key&&$scope!==$p['engineId'])continue;
            if($mode==='scheduled'&&($p['cadence']==='manual'||$p['cadence']==='live'||($p['nextDue']??PHP_INT_MAX)>$at))continue;
            $keys[]=$key;
        }
        if(!$keys)return ['status'=>'nothing_due','attempted'=>0,'saved'=>0];
        $data=operationsGithubBulkFetch($keys);
        $saved=0;
        $write=$pdo->prepare('INSERT INTO operations_collection_cache(scope_key,fetched_at,expires_at,body_json) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE fetched_at=VALUES(fetched_at),expires_at=VALUES(expires_at),body_json=VALUES(body_json)');
        $advance=$pdo->prepare('UPDATE operations_collection_policies SET next_due=? WHERE scope_key=?');
        foreach($keys as $key){
            $receivedThisKey=false;
            $policy=$policies[$key];
            $limit=str_starts_with($key,'audit:')?1048576:256000;
            $value=is_array($data)?operationsGithubBulkJson($data,$key,$limit):null;
            $expected=str_starts_with($key,'audit:')||in_array($key,['governance:restore_ci','governance:release_runs'],true)?'workflow_runs':null;
            if(is_array($value) &&
                ($expected===null||is_array($value[$expected]??null)) &&
                ($key!=='governance:repository'||($value['full_name']??null)==='drrezazadeh65/drjavadrezazadeh.com') &&
                ($key!=='governance:branches'||array_is_list($value))){
                $encoded=json_encode($value,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
                // Source cache is short-lived, private, and contains public provider data only.
                $ttl=$policy['cadence']==='hourly'?10800:129600;
                $write->execute([$key,$at,$at+$ttl,$encoded]);$saved++;$receivedThisKey=true;
            }
            operationsCollectorRecordAttempt($pdo,$key,$at,$receivedThisKey);
            if(!$receivedThisKey)operationsAlertRecord($pdo,'collector_unavailable',$key,$at);
            else operationsAlertResolve($pdo,'collector_unavailable',$key,$at);
            operationsSourceRecordMetric($pdo,'collector:'.$key,'fetch_success',
                $receivedThisKey?1.0:0.0,'boolean',$at);
            if($receivedThisKey)operationsSourceRecordMetric($pdo,'collector:'.$key,
                'payload_bytes',(float)strlen($encoded),'bytes',$at);
            $next=$policy['cadence']==='weekly'
                ?operationsSourceNextDue('weekly',(int)($policy['weekday']??1),
                    (int)$policy['clockMinutes'],$at+60)
                :operationsCollectorNextDue($policy['cadence'],$policy['clockMinutes'],$at+60);
            if($mode==='scheduled'&&!$receivedThisKey)$next=$at+900;
            $advance->execute([$next,$key]);
            if(!empty($policy['sourceControlOverride'])){
                $updateControl=$pdo->prepare('UPDATE operations_source_controls SET next_due=? WHERE source_id=?');
                $updateControl->execute([$next,'collector:'.$key]);
            }
        }
        return ['status'=>$saved===count($keys)?'updated':($saved?'partial':'provider_unavailable'),
            'attempted'=>count($keys),'saved'=>$saved];
    }finally{
        $pdo->query("SELECT RELEASE_LOCK('drjr_ops_collection_v1')");
    }
}
