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
        'operations_content_drafts','operations_content_revisions'
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
    $has=static fn(array $tables):bool=>$inventory!=='unavailable'
        &&count(array_filter($tables,static fn($table)=>!isset($present[$table])))===0;
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
    $recipient=(string)($configuration['operations_alert_recipient']??'');
    return ['schema'=>'operations-activation-readiness-v1',
        'status'=>'source_and_server_inventory_only','observedAt'=>$at,
        'schemaInventory'=>[
            'state'=>$inventory,'requiredCount'=>count($needed),
            'presentCount'=>$inventory==='unavailable'?null:
                count(array_filter($needed,static fn($table)=>isset($present[$table]))),
            'missing'=>$missing,
            'foreignKeysChecked'=>false,'columnContractsChecked'=>false,
            'migrationExecuted'=>false,'migrationsVersioned'=>false
        ],
        'smtp'=>[
            'recipientConfigured'=>filter_var($recipient,FILTER_VALIDATE_EMAIL)!==false,
            'transportConfigurationReady'=>function_exists('mailReady')?mailReady():false,
            'mailboxReceiptConfirmed'=>null
        ],
        'workers'=>$workers,
        'note'=>'Read-only observations and table names are not live E2E proof. Cron, SMTP, schema contracts and approved additive migrations await final acceptance.'];
}
