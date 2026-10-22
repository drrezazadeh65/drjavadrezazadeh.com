<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Administrative collection preferences for existing source IDs, in the ONE
 * customer/operations MySQL database. A preference does NOT install an API
 * adapter, create an OAuth grant or authorize social publication.
 * The 8 existing GitHub collectors remain the only source-directory entries
 * with concrete fetch adapters; all other entries are reference-only.
 */
function operationsSourceControlRows(PDO $pdo): ?array {
    try {
        $rows=$pdo->query('SELECT source_id,enabled,cadence,weekday,clock_minutes,retention_days,next_due,updated_at FROM operations_source_controls')->fetchAll(PDO::FETCH_ASSOC);
    } catch(Throwable $e) {
        return null;
    }
    $byId=[];
    foreach($rows as $row)$byId[(string)$row['source_id']]=$row;
    return $byId;
}
function operationsSourceNextDue(string $cadence,int $weekday,int $clock,int $at): int {
    if($cadence==='manual')return 0;
    $tz=new DateTimeZone('Asia/Tehran');
    $now=(new DateTimeImmutable('@'.$at))->setTimezone($tz);
    $candidate=$now->setTime(intdiv($clock,60),$clock%60,0);
    if($cadence==='daily'){
        if($candidate->getTimestamp()<=$at)$candidate=$candidate->modify('+1 day');
    }elseif($cadence==='weekly'){
        $diff=($weekday-(int)$candidate->format('N')+7)%7;
        if($diff>0)$candidate=$candidate->modify('+'.$diff.' days');
        if($candidate->getTimestamp()<=$at)$candidate=$candidate->modify('+7 days');
    }else throw new InvalidArgumentException('invalid_source_cadence');
    return $candidate->getTimestamp();
}
function operationsSourceControlView(PDO $pdo,array $directory,int $at): array {
    $stored=operationsSourceControlRows($pdo);
    $rows=[];
    $policyStorageAvailable=$stored!==null;
    // Scheduling requires a separate, explicitly owner-enabled master gate.
    // A provider catalogue entry or due timestamp is not execution evidence.
    $masterEnabled=function_exists('operationsCollectorAutomaticEnabled')
        ?operationsCollectorAutomaticEnabled($pdo):false;
    foreach($directory['sources']??[] as $source){
        $id=(string)($source['id']??'');
        $configured=$stored[$id]??null;
        $isCollector=($source['kind']??'')==='github_feed';
        $hasOwnerPolicy=is_array($configured);
        // Fail closed when the preferences table is missing. For historical
        // collector defaults, report the origin rather than owner consent.
        $enabled=$hasOwnerPolicy?(bool)$configured['enabled']:($policyStorageAvailable&&$isCollector);
        $cadence=$configured!==null?(string)$configured['cadence']:($isCollector?'daily':'manual');
        $clock=$configured!==null?(int)$configured['clock_minutes']:210;
        $weekday=$configured!==null?(int)$configured['weekday']:1;
        $rows[$id]=[
            'id'=>$id,
            'enabled'=>$enabled,
            'policyConfigured'=>$hasOwnerPolicy,
            'policyStorageAvailable'=>$policyStorageAvailable,
            'policyOrigin'=>!$policyStorageAvailable?'schema_unavailable':
                ($hasOwnerPolicy?'owner_saved':'legacy_default_unattested'),
            'cadence'=>$cadence,
            'weekday'=>$weekday,
            'clockMinutes'=>$clock,
            'retentionDays'=>$configured!==null?(int)$configured['retention_days']:90,
            'nextDueAt'=>$configured!==null&&$enabled?(int)$configured['next_due']:null,
            'updatedAt'=>$configured!==null?(int)$configured['updated_at']:null,
            'adapterAvailable'=>$isCollector,
            'runtimeState'=>!$policyStorageAvailable?'schema_unavailable':
                (!$enabled?'disabled':($isCollector?'adapter_present':'adapter_unavailable')),
            'automaticCollectionAvailable'=>$isCollector,
            'automaticMasterEnabled'=>$masterEnabled,
            'hostCronVerified'=>null,
            'effectivePolling'=>'never_on_dashboard_view',
        ];
    }
    return ['ok'=>true,'schema'=>'operations-source-controls-v1',
        'status'=>$policyStorageAvailable?'available':'schema_not_provisioned',
        'timezone'=>'Asia/Tehran','automaticMasterEnabled'=>$masterEnabled,
        'hostCronVerified'=>null,'rows'=>array_values($rows),
        'limitation'=>'Only existing audited GitHub collection adapters may fetch. Enabled status for other providers records monitoring intent, not a verified account, connected API, scheduler, impressions or revenue.'];
}
function operationsSourceControlSave(PDO $pdo,array $directory,array $request,string $actor,int $at): array {
    if(array_keys($request)!==['sourceId','enabled','cadence','weekday','clockMinutes','retentionDays']
        ||!is_string($request['sourceId'])||!is_bool($request['enabled'])
        ||!is_string($request['cadence'])||!is_int($request['weekday'])
        ||!is_int($request['clockMinutes'])||!is_int($request['retentionDays']))
        throw new InvalidArgumentException('invalid_source_policy');
    $id=$request['sourceId'];
    // Do not silently create a policy or claim a successful save on a host
    // whose mother-database migration has not been provisioned.
    if(operationsSourceControlRows($pdo)===null)
        throw new RuntimeException('source_control_schema_unavailable');
    $allowed=array_column($directory['sources']??[],null,'id');
    if(!isset($allowed[$id])||strlen($id)>96
        ||!in_array($request['cadence'],['manual','daily','weekly'],true)
        ||$request['weekday']<1||$request['weekday']>7
        ||$request['clockMinutes']<0||$request['clockMinutes']>1439
        ||!in_array($request['retentionDays'],[7,30,90,180,365],true))
        throw new InvalidArgumentException('invalid_source_policy');
    $next=$request['enabled']?operationsSourceNextDue(
        $request['cadence'],$request['weekday'],$request['clockMinutes'],$at):0;
    // No implicit collection is started by saving a setting. Existing Bertina
    // cron remains opt-in; missing collector adapters remain unsupported.
    $stmt=$pdo->prepare('INSERT INTO operations_source_controls
      (source_id,enabled,cadence,weekday,clock_minutes,retention_days,next_due,updated_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE enabled=VALUES(enabled),cadence=VALUES(cadence),
      weekday=VALUES(weekday),clock_minutes=VALUES(clock_minutes),
      retention_days=VALUES(retention_days),next_due=VALUES(next_due),
      updated_at=VALUES(updated_at)');
    $stmt->execute([$id,$request['enabled']?1:0,$request['cadence'],
        $request['weekday'],$request['clockMinutes'],$request['retentionDays'],$next,$at]);
    operationsAudit($pdo,$actor,'source_policy_changed',substr(hash('sha256',$id),0,64));
    return operationsSourceControlView($pdo,$directory,$at);
}
/** Advisory and bounded: only actual source metrics and collection-attempt logs. */
function operationsSourceMetrics(PDO $pdo,string $sourceId,int $days,int $at): array {
    if($days<1||$days>365)throw new InvalidArgumentException('invalid_range');
    $from=$at-$days*86400;
    $samples=[];$history=[];
    $ready=true;
    try{
        $q=$pdo->prepare('SELECT metric_key,metric_value,unit,observed_at,evidence_type FROM operations_source_metric_samples WHERE source_id=? AND observed_at>=? AND observed_at<=? ORDER BY observed_at DESC,sample_id DESC LIMIT 365');
        $q->execute([$sourceId,$from,$at]);$samples=$q->fetchAll(PDO::FETCH_ASSOC);
        foreach($samples as &$sample){
            $sample['observed_at']=(int)$sample['observed_at'];
            $sample['metric_value']=(float)$sample['metric_value'];
        }unset($sample);
    }catch(Throwable $e){$ready=false;}
    if(str_starts_with($sourceId,'collector:')){
        try{
            $q=$pdo->prepare('SELECT attempted_at,result FROM operations_collection_attempts WHERE scope_key=? AND attempted_at>=? AND attempted_at<=? ORDER BY attempted_at DESC,attempt_id DESC LIMIT 500');
            $q->execute([substr($sourceId,10),$from,$at]);
            foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row)
                $history[]=['at'=>(int)$row['attempted_at'],'succeeded'=>$row['result']==='succeeded'];
        }catch(Throwable $e){/* older schema: no attempt history */ }
    }
    return ['ok'=>true,'schema'=>'operations-source-metrics-v1',
        'sourceId'=>$sourceId,'asOf'=>$at,'days'=>$days,
        'samplesStatus'=>$ready?'available':'schema_not_provisioned',
        'samples'=>$samples,'recentAttempts'=>$history,
        'maxReturnedSamples'=>365,'maxReturnedAttempts'=>500,
        'limitation'=>'Source-scoped retained observations only; absence of observations is unknown, not zero. GitHub attempt histories are operational counts, not website traffic or provider audience statistics.'];
}
function operationsSourceRecordMetric(PDO $pdo,string $id,string $key,float $value,string $unit,int $at): void {
    if(!preg_match('/^collector:[a-zA-Z0-9:_\.\-]{1,80}$/D',$id)
       ||!in_array($key,['fetch_success','payload_bytes'],true)
       ||!is_finite($value)||$value<0)return;
    try{
        $policies=operationsSourceControlRows($pdo);
        $days=isset($policies[$id])?(int)$policies[$id]['retention_days']:90;
        $q=$pdo->prepare('INSERT INTO operations_source_metric_samples
          (source_id,metric_key,metric_value,unit,observed_at,expires_at,evidence_type,created_at)
          VALUES (?,?,?,?,?,?,?,?)');
        $q->execute([$id,$key,$value,$unit,$at,$at+$days*86400,'internal_event',$at]);
    }catch(Throwable $e){/* additive telemetry cannot break normal collection */ }
}
/** Retention deletes only source-scoped diagnostic records, never orders,
 * identities, financial ledger, journal manuscripts, or immutable audit logs.
 * Purge of cached GitHub source data is limited to the targeted source.
 */
function operationsSourceRetentionPurge(PDO $pdo,string $sourceId,int $at): array {
    $control=operationsSourceControlRows($pdo);
    if($control===null)throw new RuntimeException('source_control_schema_unavailable');
    $setting=$control[$sourceId]??null;
    if($setting===null)throw new DomainException('source_policy_not_configured');
    $days=(int)$setting['retention_days'];
    $before=$at-$days*86400;
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('DELETE FROM operations_source_metric_samples WHERE source_id=? AND observed_at<? LIMIT 500');
        $q->execute([$sourceId,$before]);$metrics=$q->rowCount();
        $attempts=0;
        if(str_starts_with($sourceId,'collector:')){
            $scope=substr($sourceId,10);
            $q=$pdo->prepare('DELETE FROM operations_collection_attempts WHERE scope_key=? AND attempted_at<? LIMIT 500');
            $q->execute([$scope,$before]);$attempts=$q->rowCount();
            $q=$pdo->prepare('DELETE FROM operations_collection_cache WHERE scope_key=? AND expires_at<=?');
            $q->execute([$scope,$at]);
        }
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return ['ok'=>true,'schema'=>'operations-source-retention-v1',
        'sourceId'=>$sourceId,'retentionDays'=>$days,
        'deletedMetrics'=>$metrics,'deletedAttempts'=>$attempts,
        'boundedPerRequest'=>500,'moreMayRemain'=>$metrics===500||$attempts===500,
        'note'=>'Only expired or retention-eligible telemetry was deleted. Business and audit records are retained.'];
}
