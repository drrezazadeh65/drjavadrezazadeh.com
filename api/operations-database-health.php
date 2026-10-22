<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Owner-only, on-demand, metadata-only health of the existing mother DB.
 * Never runs on public page views, never executes CHECK/REPAIR/OPTIMIZE,
 * SELECT * over customer data, unbounded counts or arbitrary SQL from users.
 */
function operationsDbHealthSettings(PDO $pdo): array {
    try {
        $row=$pdo->query('SELECT monitoring_enabled,error_logging_enabled,cadence,clock_minutes,retention_days,updated_at
          FROM operations_database_health_settings WHERE singleton_id=1')->fetch(PDO::FETCH_ASSOC);
    }catch(Throwable $e){return ['available'=>false,'monitoringEnabled'=>false,
        'errorLoggingEnabled'=>false,'cadence'=>'manual','clockMinutes'=>210,
        'retentionDays'=>90,'updatedAt'=>null];}
    return ['available'=>true,'monitoringEnabled'=>is_array($row)&&(int)$row['monitoring_enabled']===1,
        'errorLoggingEnabled'=>is_array($row)&&(int)$row['error_logging_enabled']===1,
        'cadence'=>is_array($row)?(string)$row['cadence']:'manual',
        'clockMinutes'=>is_array($row)?(int)$row['clock_minutes']:210,
        'retentionDays'=>is_array($row)?(int)$row['retention_days']:90,
        'updatedAt'=>is_array($row)?(int)$row['updated_at']:null];
}

/** Opt-in only. Errors contain codes, never SQL statements, DSNs, hostnames,
 * paths, query parameters, messages, passwords or user records.
 */
function operationsDbHealthRecordError(PDO $pdo,string $component,Throwable $e,int $at): void {
    $settings=operationsDbHealthSettings($pdo);
    if(!$settings['errorLoggingEnabled'])return;
    if(!preg_match('/^[a-z_]{3,48}$/D',$component))$component='unknown_component';
    $raw=(string)$e->getCode();
    $state=preg_match('/^[A-Z0-9]{5}$/D',$raw)?substr($raw,0,2):null;
    $driverCode=null;
    if($e instanceof PDOException && is_array($e->errorInfo??null)){
        $number=$e->errorInfo[1]??null;
        if((is_int($number)||is_string($number))&&preg_match('/^[0-9]{1,12}$/D',(string)$number))
            $driverCode=(string)$number;
    }
    $category=$state==='23'?'constraint':($state==='42'?'schema':
        ($state==='08'?'connection':($state==='40'?'transaction':'database_error')));
    $fingerprint=hash('sha256',implode('|',[$category,$component,$state??'',$driverCode??'',intdiv($at,3600)]));
    try {
        $pdo->prepare('INSERT INTO operations_database_error_events
            (fingerprint,category,component,sqlstate_class,driver_code,
             first_observed_at,last_observed_at,occurrence_count)
            VALUES (?,?,?,?,?,?,?,1)
            ON DUPLICATE KEY UPDATE last_observed_at=VALUES(last_observed_at),
              occurrence_count=LEAST(occurrence_count+1,4294967295)')
            ->execute([$fingerprint,$category,$component,$state,$driverCode,$at,$at]);
    }catch(Throwable $ignored){
        // A database outage cannot reliably be logged back to the same DB.
        // Do not fall back to a public file, leak SQL or break the caller.
    }
}

/** These are information_schema estimates, not expensive exact row counts. */
function operationsDbHealthReport(PDO $pdo,int $at): array {
    $settings=operationsDbHealthSettings($pdo);
    $result=['ok'=>true,'schema'=>'operations-database-health-v1',
        'asOf'=>$at,'mode'=>'manual_readonly','hostCronVerified'=>null,
        'settings'=>$settings,'connection'=>'available',
        'inventoryStatus'=>'unavailable','inventory'=>null,
        'checks'=>[],'errors'=>['status'=>'unavailable','rows'=>[]],
        'correctionPolicy'=>'owner_review_only_no_auto_repair',
        'automaticRepairEnabled'=>false,'automaticCleanupEnabled'=>false];
    try {
        if((int)$pdo->query('SELECT 1')->fetchColumn()!==1)
            throw new RuntimeException('metadata_probe_unavailable');
        $result['checks'][]=['id'=>'connection','state'=>'observed'];
    }catch(Throwable $e){
        $result['connection']='unavailable';
        $result['checks'][]=['id'=>'connection','state'=>'unavailable'];
        operationsDbHealthRecordError($pdo,'connection_probe',$e,$at);
        return $result;
    }
    try {
        $stmt=$pdo->query("SELECT TABLE_NAME,ENGINE,TABLE_ROWS,DATA_LENGTH,INDEX_LENGTH,TABLE_COLLATION
          FROM information_schema.TABLES
          WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'
          ORDER BY TABLE_NAME");
        $tables=$stmt->fetchAll(PDO::FETCH_ASSOC);
        $required=function_exists('operationsActivationRequiredTables')
            ?operationsActivationRequiredTables():[];
        $found=[];$allBytes=0;$ops=[];$nonInno=[];$wrongCollation=[];
        foreach($tables as $row){
            $name=(string)$row['TABLE_NAME'];
            $found[$name]=true;
            $bytes=max(0,(int)$row['DATA_LENGTH'])+max(0,(int)$row['INDEX_LENGTH']);
            $allBytes+=$bytes;
            if((string)($row['ENGINE']??'')!=='InnoDB')$nonInno[]=$name;
            if(str_starts_with($name,'operations_')){
                $ops[]=['table'=>$name,'estimatedRows'=>$row['TABLE_ROWS']===null?null:(int)$row['TABLE_ROWS'],
                    'dataBytes'=>max(0,(int)$row['DATA_LENGTH']),
                    'indexBytes'=>max(0,(int)$row['INDEX_LENGTH']),
                    'engine'=>(string)($row['ENGINE']??''),
                    'collation'=>(string)($row['TABLE_COLLATION']??'')];
                if(($row['TABLE_COLLATION']??'')!=='utf8mb4_unicode_ci')$wrongCollation[]=$name;
            }
        }
        usort($ops,static fn(array $a,array $b)=>($b['dataBytes']+$b['indexBytes'])<=>($a['dataBytes']+$a['indexBytes']));
        $missing=array_values(array_filter($required,static fn(string $name)=>!isset($found[$name])));
        $result['inventoryStatus']='observed';
        $result['inventory']=['tableCount'=>count($tables),'totalAllocatedBytesEstimate'=>$allBytes,
            'operationsTableCount'=>count($ops),'requiredOperationsCount'=>count($required),
            'missingOperationsTables'=>$missing,'nonInnoDbTableCount'=>count($nonInno),
            'operationsCollationExceptions'=>$wrongCollation,
            'largestOperationsTables'=>array_slice($ops,0,20),
            'rowCountsAreEstimates'=>true,'storageBytesAreMetadataEstimates'=>true];
        $result['checks'][]=['id'=>'required_tables',
            'state'=>$missing?'attention':'observed','count'=>count($missing)];
        $result['checks'][]=['id'=>'storage_engine',
            'state'=>$nonInno?'attention':'observed','count'=>count($nonInno)];
        $result['checks'][]=['id'=>'operations_collation',
            'state'=>$wrongCollation?'attention':'observed','count'=>count($wrongCollation)];
    }catch(Throwable $e){
        $result['checks'][]=['id'=>'metadata_inventory','state'=>'unavailable'];
        operationsDbHealthRecordError($pdo,'metadata_inventory',$e,$at);
    }
    try{
        $q=$pdo->query('SELECT category,component,sqlstate_class,driver_code,
            first_observed_at,last_observed_at,occurrence_count
            FROM operations_database_error_events ORDER BY last_observed_at DESC LIMIT 60');
        $events=$q->fetchAll(PDO::FETCH_ASSOC);
        $result['errors']=['status'=>'available','rows'=>array_map(
            static fn(array $r):array=>[
                'category'=>(string)$r['category'],'component'=>(string)$r['component'],
                'sqlstateClass'=>$r['sqlstate_class']===null?null:(string)$r['sqlstate_class'],
                'driverCode'=>$r['driver_code']===null?null:(string)$r['driver_code'],
                'firstAt'=>(int)$r['first_observed_at'],
                'lastAt'=>(int)$r['last_observed_at'],
                'occurrences'=>(int)$r['occurrence_count']],$events)];
    }catch(Throwable $e){
        // Additive log table not installed, missing privilege or DB outage:
        // cannot distinguish causes without independent host evidence.
    }
    return $result;
}

/** Owner changes monitoring preference only, not a cron entry. Absent table is
 * fail-closed. A separate CLI adapter and cPanel registration are prerequisites.
 */
function operationsDbHealthConfigure(PDO $pdo,array $request,string $actor,int $at): array {
    if(array_keys($request)!==['monitoringEnabled','errorLoggingEnabled','cadence','clockMinutes','retentionDays']
        ||!is_bool($request['monitoringEnabled'])
        ||!is_bool($request['errorLoggingEnabled'])
        ||!is_string($request['cadence'])
        ||!in_array($request['cadence'],['manual','hourly','daily'],true)
        ||!is_int($request['clockMinutes'])||$request['clockMinutes']<0||$request['clockMinutes']>1439
        ||!is_int($request['retentionDays'])
        ||!in_array($request['retentionDays'],[7,30,90,180,365],true))
        throw new InvalidArgumentException('invalid_database_health_policy');
    $pdo->beginTransaction();
    try {
        $pdo->prepare('INSERT INTO operations_database_health_settings
          (singleton_id,monitoring_enabled,error_logging_enabled,cadence,clock_minutes,retention_days,updated_at)
          VALUES (1,?,?,?,?,?,?)
          ON DUPLICATE KEY UPDATE monitoring_enabled=VALUES(monitoring_enabled),
            error_logging_enabled=VALUES(error_logging_enabled),cadence=VALUES(cadence),
            clock_minutes=VALUES(clock_minutes),retention_days=VALUES(retention_days),
            updated_at=VALUES(updated_at)')
            ->execute([$request['monitoringEnabled']?1:0,
                $request['errorLoggingEnabled']?1:0,$request['cadence'],
                $request['clockMinutes'],$request['retentionDays'],$at]);
        $pdo->prepare('INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)')
            ->execute([$actor,'database_health_policy','db_health_preferences',$at]);
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return operationsDbHealthSettings($pdo);
}

/** Preview-free deletion is deliberately forbidden. Bounded per-owner action
 * removes only already-expired redacted diagnostic error groups.
 */
function operationsDbHealthPurgeExpired(PDO $pdo,string $actor,int $at): array {
    $settings=operationsDbHealthSettings($pdo);
    if(!$settings['available'])throw new RuntimeException('database_health_schema_unavailable');
    $cutoff=$at-$settings['retentionDays']*86400;
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('DELETE FROM operations_database_error_events WHERE last_observed_at<? LIMIT 100');
        $q->execute([$cutoff]);$deleted=$q->rowCount();
        $pdo->prepare('INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)')
            ->execute([$actor,'database_error_log_purge','expired_only',$at]);
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return ['ok'=>true,'deleted'=>$deleted,'boundedPerRequest'=>100,
        'moreMayRemain'=>$deleted===100,'scope'=>'expired_redacted_db_error_events_only'];
}
