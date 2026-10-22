<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Existing mother-DB activation preflight for the MFA-gated operations screen.
 * Read-only: no DDL, SMTP, cURL, cron execution or visitor-data processing.
 */
function operationsActivationRequiredTables(): array {
    // Existing operationsInstall() contract as at 2026-10-22. Update alongside
    // the canonical installer; this does not describe the commerce/JHELA tables.
    return [
        'operations_admin_memberships','operations_session_mfa','operations_mfa_counters',
        'operations_evidence','operations_audit','operations_release',
        'operations_action_runs','operations_collection_policies',
        'operations_collection_cache','operations_collection_attempts',
        'operations_source_controls','operations_source_metric_samples',
        'operations_alert_settings','operations_alert_rules',
        'operations_alert_scope_policies','operations_alert_incidents',
        'operations_alert_outbox','operations_http_log_cursor',
        'operations_http_error_routes','operations_http_observation_batches',
        'operations_response_probe_settings','operations_response_probe_samples',
        'operations_content_drafts','operations_content_revisions',
        'operations_database_health_settings','operations_database_health_runs',
        'operations_database_error_events'
    ];
}
/**
 * Frozen source-derived column and named-index signature for operationsInstall.
 * A matching signature still does not prove FK/ENUM/collation compatibility.
 * This is a private read-only DDL *preflight*, never an auto migrator.
 */
function operationsActivationExpectedColumns(): array {
    return [
        'operations_admin_memberships'=>['account_id'=>'char','role'=>'enum','enabled'=>'tinyint','created_at'=>'bigint'],
        'operations_session_mfa'=>['session_hash'=>'char','account_id'=>'char','verified_at'=>'bigint','expires_at'=>'bigint','last_counter'=>'bigint','credential_hash'=>'char'],
        'operations_mfa_counters'=>['account_id'=>'char','last_counter'=>'bigint'],
        'operations_evidence'=>['sequence_id'=>'bigint','evidence_id'=>'char','section_id'=>'varchar','gate_id'=>'varchar','result'=>'enum','release_sha'=>'char','source'=>'varchar','source_url'=>'varchar','test_name'=>'varchar','environment'=>'enum','checked_at'=>'bigint','expires_at'=>'bigint','details_json'=>'text'],
        'operations_audit'=>['sequence_id'=>'bigint','actor_id'=>'char','action'=>'varchar','reference_id'=>'varchar','occurred_at'=>'bigint'],
        'operations_release'=>['singleton_id'=>'tinyint','release_sha'=>'char','published_at'=>'bigint'],
        'operations_action_runs'=>['run_id'=>'char','account_id'=>'char','action_id'=>'varchar','request_key'=>'char','release_sha'=>'char','status'=>'enum','created_at'=>'bigint','finished_at'=>'bigint','result_json'=>'text'],
        'operations_collection_policies'=>['scope_key'=>'varchar','enabled'=>'tinyint','cadence'=>'enum','clock_minutes'=>'smallint','next_due'=>'bigint','updated_at'=>'bigint'],
        'operations_collection_cache'=>['scope_key'=>'varchar','fetched_at'=>'bigint','expires_at'=>'bigint','body_json'=>'mediumtext'],
        'operations_collection_attempts'=>['attempt_id'=>'bigint','scope_key'=>'varchar','attempted_at'=>'bigint','result'=>'enum','failure_code'=>'varchar'],
        'operations_source_controls'=>['source_id'=>'varchar','enabled'=>'tinyint','cadence'=>'enum','weekday'=>'tinyint','clock_minutes'=>'smallint','retention_days'=>'smallint','next_due'=>'bigint','updated_at'=>'bigint'],
        'operations_source_metric_samples'=>['sample_id'=>'bigint','source_id'=>'varchar','metric_key'=>'varchar','metric_value'=>'decimal','unit'=>'varchar','observed_at'=>'bigint','expires_at'=>'bigint','evidence_type'=>'enum','created_at'=>'bigint'],
        'operations_alert_settings'=>['singleton_id'=>'tinyint','enabled'=>'tinyint','updated_at'=>'bigint'],
        'operations_alert_rules'=>['event_code'=>'varchar','enabled'=>'tinyint','threshold_count'=>'smallint','cooldown_minutes'=>'smallint','updated_at'=>'bigint'],
        'operations_alert_scope_policies'=>['scope_id'=>'varchar','enabled'=>'tinyint','updated_at'=>'bigint'],
        'operations_alert_incidents'=>['fingerprint'=>'char','event_code'=>'varchar','scope_key'=>'varchar','severity'=>'enum','first_seen_at'=>'bigint','last_seen_at'=>'bigint','occurrence_count'=>'bigint','state'=>'enum','last_queued_at'=>'bigint'],
        'operations_alert_outbox'=>['message_id'=>'char','fingerprint'=>'char','status'=>'enum','created_at'=>'bigint','attempted_at'=>'bigint','sent_at'=>'bigint'],
        'operations_http_log_cursor'=>['singleton_id'=>'tinyint','log_inode'=>'varchar','byte_offset'=>'bigint','updated_at'=>'bigint'],
        'operations_http_error_routes'=>['route_hash'=>'char','route_path'=>'varchar','classification'=>'enum','http_status'=>'smallint','total_hits'=>'bigint','first_seen_at'=>'bigint','last_seen_at'=>'bigint'],
        'operations_http_observation_batches'=>['batch_id'=>'bigint','observed_at'=>'bigint','records_read'=>'int','errors_404'=>'int','errors_5xx'=>'int'],
        'operations_response_probe_settings'=>['singleton_id'=>'tinyint','enabled'=>'tinyint','cadence'=>'enum','weekday'=>'tinyint','clock_minutes'=>'smallint','retention_days'=>'smallint','next_due'=>'bigint','requested_at'=>'bigint','updated_at'=>'bigint'],
        'operations_response_probe_samples'=>['sample_id'=>'bigint','probe_id'=>'varchar','kind'=>'enum','observed_at'=>'bigint','response_code'=>'smallint','result'=>'enum','details_json'=>'text','expires_at'=>'bigint'],
        'operations_content_drafts'=>['id'=>'char','language'=>'enum','content_type'=>'enum','title'=>'varchar','body_markdown'=>'mediumtext','seo_title'=>'varchar','seo_description'=>'varchar','media_path'=>'varchar','status'=>'enum','version'=>'int','created_at'=>'bigint','updated_at'=>'bigint','updated_by'=>'char'],
        'operations_content_revisions'=>['revision_id'=>'bigint','draft_id'=>'char','version'=>'int','title'=>'varchar','body_markdown'=>'mediumtext','seo_title'=>'varchar','seo_description'=>'varchar','media_path'=>'varchar','status'=>'enum','created_at'=>'bigint','actor_id'=>'char'],
        'operations_database_health_settings'=>['singleton_id'=>'tinyint','monitoring_enabled'=>'tinyint','error_logging_enabled'=>'tinyint','cadence'=>'enum','clock_minutes'=>'smallint','retention_days'=>'smallint','updated_at'=>'bigint'],
        'operations_database_health_runs'=>['sequence_id'=>'bigint','origin'=>'enum','slot_due_at'=>'bigint','observed_at'=>'bigint','result'=>'enum','checks_observed'=>'smallint','checks_attention'=>'smallint','checks_unavailable'=>'smallint','tables_observed'=>'int'],
        'operations_database_error_events'=>['fingerprint'=>'char','category'=>'varchar','component'=>'varchar','sqlstate_class'=>'char','driver_code'=>'varchar','first_observed_at'=>'bigint','last_observed_at'=>'bigint','occurrence_count'=>'int'],
    ];
}
function operationsActivationExpectedIndexes(): array {
    return [
        'operations_evidence'=>['idx_operations_release'],
        'operations_action_runs'=>['uq_ops_actor_request','idx_ops_actor_history','idx_ops_action_status'],
        'operations_collection_policies'=>['idx_collector_due'],
        'operations_collection_cache'=>['idx_collector_expires'],
        'operations_collection_attempts'=>['idx_ops_collection_attempt','idx_ops_collection_attempt_time'],
        'operations_source_controls'=>['idx_source_controls_due'],
        'operations_source_metric_samples'=>['idx_ops_sample_source_time','idx_ops_sample_expiration'],
        'operations_alert_scope_policies'=>['idx_ops_alert_scope_enabled'],
        'operations_alert_incidents'=>['idx_ops_incident_time','idx_ops_incident_code'],
        'operations_alert_outbox'=>['idx_ops_alert_due','idx_ops_alert_incident'],
        'operations_http_error_routes'=>['idx_ops_http_404_priority'],
        'operations_http_observation_batches'=>['idx_ops_http_batch_time'],
        'operations_response_probe_samples'=>['idx_ops_probe_key_time','idx_ops_probe_expires'],
        'operations_content_drafts'=>['idx_editor_draft_status','idx_editor_draft_lang'],
        'operations_content_revisions'=>['uq_editor_version','idx_editor_revisions'],
        'operations_database_health_runs'=>['uniq_db_health_slot','idx_db_health_at'],
        'operations_database_error_events'=>['idx_ops_db_error_last','idx_ops_db_error_category'],
    ];
}
/**
 * information_schema diagnosis is observational, never a repair operation.
 * Missing metadata privileges, absent table or failed reads yield unknown.
 */
function operationsActivationStructure(PDO $pdo,array $present): array {
    $types=operationsActivationExpectedColumns();
    $indexes=operationsActivationExpectedIndexes();
    $observed=[];$seenIndexes=[];$storage=[];$foreignKeys=[];
    try {
        $q=$pdo->query("SELECT TABLE_NAME,ENGINE,TABLE_COLLATION
            FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
              AND TABLE_NAME LIKE 'operations\\_%'");
        foreach($q as $row)$storage[(string)$row['TABLE_NAME']]=[
            'engine'=>strtolower((string)($row['ENGINE']??'')),
            'collation'=>strtolower((string)($row['TABLE_COLLATION']??''))];
        $q=$pdo->query("SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'operations\\_%'
              AND REFERENCED_TABLE_NAME IS NOT NULL");
        foreach($q as $row)$foreignKeys[(string)$row['TABLE_NAME']][]=[
            (string)$row['COLUMN_NAME'],
            (string)$row['REFERENCED_TABLE_NAME'],
            (string)$row['REFERENCED_COLUMN_NAME']];
        $q=$pdo->query("SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE
            FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()
              AND TABLE_NAME LIKE 'operations\\_%'");
        foreach($q as $row)$observed[(string)$row['TABLE_NAME']][(string)$row['COLUMN_NAME']]
            =strtolower((string)$row['DATA_TYPE']);
        $q=$pdo->query("SELECT TABLE_NAME,INDEX_NAME
            FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
              AND TABLE_NAME LIKE 'operations\\_%'");
        foreach($q as $row)$seenIndexes[(string)$row['TABLE_NAME']][(string)$row['INDEX_NAME']]=true;
    }catch(Throwable $e) {
        return ['state'=>'metadata_unavailable','checkedColumns'=>null,
            'missingColumns'=>null,'typeMismatches'=>null,
            'missingIndexes'=>null,'storageDiscrepancies'=>null,
            'missingForeignKeys'=>null,'foreignKeysChecked'=>false];
    }
    $missing=[];$mismatch=[];$absentIndexes=[];$checked=0;
    foreach($types as $table=>$expected) {
        if(!isset($present[$table]))continue; // table absence is reported separately.
        foreach($expected as $column=>$type){
            $checked++;
            $actual=$observed[$table][$column]??null;
            if($actual===null)$missing[]=$table.'.'.$column;
            elseif($actual!==$type)$mismatch[]=$table.'.'.$column.' ('.$type.' vs '.$actual.')';
        }
    }
    foreach($indexes as $table=>$names){
        if(!isset($present[$table]))continue;
        foreach($names as $name)if(!isset($seenIndexes[$table][$name]))
            $absentIndexes[]=$table.'.'.$name;
    }
    $storageIssues=[];$fkIssues=[];
    foreach($types as $table=>$_columns){
        if(!isset($present[$table]))continue;
        $engine=$storage[$table]['engine']??'';
        $collation=$storage[$table]['collation']??'';
        if($engine!=='innodb')$storageIssues[]=$table.': engine not InnoDB';
        if($collation!=='utf8mb4_unicode_ci')$storageIssues[]=$table.': table collation differs from source contract';
    }
    foreach(operationsActivationExpectedForeignKeys() as $table=>$references){
        if(!isset($present[$table]))continue;
        foreach($references as $reference){
            $found=false;
            foreach($foreignKeys[$table]??[] as $observedRef){
                if($observedRef===$reference){$found=true;break;}
            }
            if(!$found)$fkIssues[]=$table.'.'.$reference[0].
                ' -> '.$reference[1].'.'.$reference[2];
        }
    }
    $ok=!$missing&&!$mismatch&&!$absentIndexes&&!$storageIssues&&!$fkIssues;
    return ['state'=>$ok?'source_structural_signature_matches':
        'source_structural_signature_discrepancy',
        'checkedColumns'=>$checked,'missingColumns'=>$missing,
        'typeMismatches'=>$mismatch,'missingIndexes'=>$absentIndexes,
        'storageDiscrepancies'=>$storageIssues,'missingForeignKeys'=>$fkIssues,
        'foreignKeysChecked'=>true,
        'limitations'=>'Read-only shape comparison only; unique inline constraints, column precision, nullability, data integrity and ENUM members not certified.'];
}

function operationsActivationExpectedForeignKeys(): array {
    return [
        'operations_admin_memberships'=>[['account_id','customer_accounts','id']],
        'operations_session_mfa'=>[['account_id','customer_accounts','id']],
        'operations_mfa_counters'=>[['account_id','customer_accounts','id']],
        'operations_action_runs'=>[['account_id','customer_accounts','id']],
        'operations_alert_outbox'=>[['fingerprint','operations_alert_incidents','fingerprint']],
        'operations_content_revisions'=>[['draft_id','operations_content_drafts','id']],
    ];
}

function operationsActivationLast(PDO $pdo,string $sql): ?int {
    try {
        $value=$pdo->query($sql)->fetchColumn();
        return $value===false||$value===null?null:(int)$value;
    }catch(Throwable $e){return null;}
}
function operationsActivationWorker(string $key,string $label,?int $observed,int $window,int $at,bool $schema): array {
    $state=!$schema?'schema_not_provisioned':($observed===null?'no_observation':
        ($observed>$at+60?'timestamp_invalid':
        ($observed<$at-$window?'observation_stale':'recent_observation')));
    return ['id'=>$key,'label'=>$label,'state'=>$state,
        'lastObservedAt'=>$observed,'cronInstalled'=>null];
}
function operationsActivationReport(PDO $pdo,array $configuration,int $at): array {
    $needed=operationsActivationRequiredTables();
    $present=[];$inventory='unavailable';
    try {
        // Do not expose mother DB name, host paths or credentials.
        $q=$pdo->query("SELECT TABLE_NAME FROM information_schema.TABLES
            WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'");
        foreach($q as $row) {
            $table=(string)($row['TABLE_NAME']??'');
            if(str_starts_with($table,'operations_'))$present[$table]=true;
        }
        $inventory='table_names_observed';
    }catch(Throwable $e){$present=[];}
    $missing=$inventory==='unavailable'?null:
        array_values(array_filter($needed,static fn(string $table):bool=>!isset($present[$table])));
    $has=static function(array $tables) use ($inventory,$present): bool {
        if($inventory==='unavailable')return false;
        foreach($tables as $table)if(!isset($present[$table]))return false;
        return true;
    };
    $collectionSchema=$has(['operations_collection_attempts']);
    $httpSchema=$has(['operations_http_log_cursor']);
    $responseSchema=$has(['operations_response_probe_samples']);
    $mailSchema=$has(['operations_alert_outbox']);
    $workers=[
        operationsActivationWorker('github_collectors','GitHub collector',
            $collectionSchema?operationsActivationLast($pdo,
                'SELECT MAX(attempted_at) FROM operations_collection_attempts'):null,
            172800,$at,$collectionSchema),
        operationsActivationWorker('access_log','Private HTTP access-log observer',
            $httpSchema?operationsActivationLast($pdo,
                'SELECT MAX(updated_at) FROM operations_http_log_cursor'):null,
            1800,$at,$httpSchema),
        operationsActivationWorker('response_integrity','HTTP response integrity',
            $responseSchema?operationsActivationLast($pdo,
                'SELECT MAX(observed_at) FROM operations_response_probe_samples'):null,
            691200,$at,$responseSchema),
        operationsActivationWorker('smtp_alert_outbox','Alert SMTP worker',
            $mailSchema?operationsActivationLast($pdo,
                'SELECT MAX(attempted_at) FROM operations_alert_outbox'):null,
            604800,$at,$mailSchema)
    ];
    // One trusted owner-facing dependency map, derived strictly from the
    // information_schema inventory. A complete table set proves neither a
    // live adapter nor a successfully executed admin workflow.
    $moduleCatalog=[
        ['owner_mfa','هویت و ورود مدیر','Owner identity and MFA','ops-command-center',
            ['operations_admin_memberships','operations_session_mfa','operations_mfa_counters']],
        ['audit','شواهد و حسابرسی','Release evidence and audit','ops-audit-timeline',
            ['operations_evidence','operations_audit','operations_release','operations_action_runs']],
        ['collectors','گردآوری و کش منابع','Source collection and cache','ops-collection-settings',
            ['operations_collection_policies','operations_collection_cache','operations_collection_attempts']],
        ['source_policies','تنظیمات مستقل منابع','Per-source policies','ops-source-directory',
            ['operations_source_controls','operations_source_metric_samples']],
        ['alerts','هشدارها و کنترل ایمیل','Incident alerts and email controls','ops-alert-center',
            ['operations_alert_settings','operations_alert_rules','operations_alert_scope_policies',
             'operations_alert_incidents','operations_alert_outbox']],
        ['http_errors','ثبت خطاهای HTTP و ۴۰۴','HTTP error intake','ops-http-health',
            ['operations_http_log_cursor','operations_http_error_routes','operations_http_observation_batches']],
        ['response','هدر، HTTPS و ریدایرکت','HTTPS and response integrity','ops-response-monitor',
            ['operations_response_probe_settings','operations_response_probe_samples']],
        ['content_editor','میز محتوای مدیر','Private content revision desk','ops-editor-workbench',
            ['operations_content_drafts','operations_content_revisions']],
        ['db_health','سلامت دیتابیس مادر','Mother database health','ops-database-health',
            ['operations_database_health_settings','operations_database_health_runs',
             'operations_database_error_events']]
    ];
    $moduleContracts=[];
    foreach($moduleCatalog as [$id,$nameFa,$nameEn,$target,$tables]){
        $absent=$inventory==='unavailable'?null:
            array_values(array_filter($tables,static fn(string $name):bool=>!isset($present[$name])));
        $moduleContracts[]=[
            'id'=>$id,'nameFa'=>$nameFa,'nameEn'=>$nameEn,'uiTarget'=>$target,
            'tableCount'=>count($tables),
            'presentCount'=>$absent===null?null:count($tables)-count($absent),
            'missingTables'=>$absent,
            'schemaState'=>$absent===null?'unknown':($absent?'missing_tables':'table_names_observed'),
            'runtimeVerified'=>null,
            'sourceRouteDeclared'=>true,
            'hostCronVerified'=>null
        ];
    }
    $recipient=(string)($configuration['operations_alert_recipient']??'');
    $structure=$inventory==='unavailable'?[
        'state'=>'table_inventory_unavailable',
        'missingColumns'=>null,'typeMismatches'=>null,
        'missingIndexes'=>null,'storageDiscrepancies'=>null,
        'missingForeignKeys'=>null,'foreignKeysChecked'=>false
    ]:operationsActivationStructure($pdo,$present);
    return ['schema'=>'operations-activation-readiness-v1',
        'status'=>'source_and_server_inventory_only','observedAt'=>$at,
        'schemaInventory'=>[
            'state'=>$inventory,'requiredCount'=>count($needed),
            'presentCount'=>$inventory==='unavailable'?null:
                count(array_filter($needed,static fn($table)=>isset($present[$table]))),
            'missing'=>$missing,
            'structure'=>$structure,
            'foreignKeysChecked'=>$structure['foreignKeysChecked'],
            'columnContractsChecked'=>in_array($structure['state'],[
                'source_structural_signature_matches',
                'source_structural_signature_discrepancy'],true),
            'migrationExecuted'=>false,'migrationsVersioned'=>false
        ],
        'smtp'=>[
            'recipientConfigured'=>filter_var($recipient,FILTER_VALIDATE_EMAIL)!==false,
            'transportConfigurationReady'=>function_exists('mailReady')?mailReady():false,
            'mailboxReceiptConfirmed'=>null
        ],
        'workers'=>$workers,
        'moduleContracts'=>$moduleContracts,
        'note'=>'Read-only observations and table names are not live E2E proof. Cron, SMTP, schema contracts and approved additive migrations await final acceptance.'];
}
