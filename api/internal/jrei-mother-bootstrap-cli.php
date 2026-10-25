<?php
declare(strict_types=1);
/**
 * One-time original Bertina mother-DB bootstrap, with owner console consent.
 *
 * The scope is FIXED: add the local Qwen registry + two temporary chat
 * tables; no unreviewed migrations or direct SQL arguments. The original
 * credential and 2FA infrastructure is never modified. The script creates
 * and verifies a new local private DB backup itself before any DDL.
 * The source does not turn on public chat or general administrator powers.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
if(!isset($argv)||$argv!==[
    $argv[0],'--owner-approved','--jrei-lm-three-tables'
]){
    fwrite(STDERR,"Usage: php api/internal/jrei-mother-bootstrap-cli.php --owner-approved --jrei-lm-three-tables\n");
    exit(2);
}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-local-schema-caretaker.php';

try{
    $pdo=db();
    if(!$pdo instanceof PDO)throw new DomainException('JREI_MOTHER_DB_UNAVAILABLE');
    $config=cfg();
    // Explicit invocation is a one-off owner policy for these THREE
    // source-whitelisted additive statements ONLY. It does not persist a
    // global approval, enable Cron, bypass dependency/backup checks,
    // or change any existing private config.local.php value.
    $config['jrei_local_schema_caretaker_enabled']=true;
    $config['operations_cron_master_enabled']=true;
    $before=(int)$pdo->query("SELECT COUNT(*) FROM information_schema.TABLES
       WHERE TABLE_SCHEMA=DATABASE()
         AND TABLE_NAME IN ('jrei_local_model_registry',
          'jrei_local_chat_node_authorizations','jrei_local_chat_jobs')
         AND TABLE_TYPE='BASE TABLE'")->fetchColumn();
    $result=jrJreiLocalSchemaApply($pdo,$config);
    if($result['state']!=='ADDITIVE_SCHEMA_READY'||$result['expectedTables']!==3||
       $result['newTables']!==3-$before||
       !jrHybridModelRegistryReady($pdo)||!jrLocalChatSchemaReady($pdo))
        throw new DomainException('JREI_MOTHER_SCHEMA_POSTFLIGHT_FAILED');
    fwrite(STDOUT,"[JREI] ORIGINAL_MOTHER_DB_VERIFIED\n");
    fwrite(STDOUT,"[JREI] THREE_SOURCE_APPROVED_TABLES_READY\n");
    fwrite(STDOUT,"[JREI] TABLES_CREATED=".$result['newTables']."\n");
    fwrite(STDOUT,"[JREI] PUBLIC_CHAT_STILL_OFF\n");
    fwrite(STDOUT,"[JREI] ADMIN_KEYS_ACCOUNTS_COMMERCE_UNCHANGED\n");
    exit(0);
}catch(Throwable $error){
    // Fixed reason code only. Sensitive DB/server errors never leave console.
    $known=[
        'jrei_backup_private_home_unavailable',
        'jrei_backup_native_dump_unavailable',
        'jrei_backup_process_unavailable',
        'jrei_backup_private_db_config_missing',
        'jrei_backup_wrong_database',
        'jrei_backup_native_dump_failed',
        'jrei_backup_dump_size_unacceptable',
        'jrei_schema_missing_approved_dependencies',
        'jrei_schema_private_backup_unverified',
        'jrei_schema_source_unavailable',
        'jrei_schema_postflight_incompatible',
        'jrei_schema_caretaker_already_running',
        'jrei_schema_wrong_database'
    ];
    $code=$error->getMessage();
    fwrite(STDERR,'[JREI] '.(in_array($code,$known,true)
        ?strtoupper($code):'PRIVATE_BOOTSTRAP_UNAVAILABLE')."\n");
    exit(1);
}
