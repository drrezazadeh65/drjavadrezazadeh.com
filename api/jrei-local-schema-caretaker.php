<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-local-chat.php';

/**
 * JREI first-party additive schema caretaker.
 *
 * A single prior owner policy may authorise routine installation of TWO
 * fixed, source-reviewed JREI-LM tables when prerequisites and a verified
 * private backup exist. Only the original drjavad1_store DB is touched;
 * no free-form SQL, table names, columns, payment/user mutations or remote
 * model-driven DDL are ever accepted. MySQL DDL is non-transactional;
 * backup and idempotent rerun are mandatory.
 */
function jrJreiLocalSchemaStatements(): array {
    $file=dirname(__DIR__).'/docs/migrations/'.
      '20261024_jrei_local_inference_queue_mother_mysql.sql';
    if(!is_file($file)||!is_readable($file)||filesize($file)>20000)
        throw new DomainException('jrei_schema_source_unavailable');
    $sql=file_get_contents($file);
    if(!is_string($sql)||strlen($sql)>20000)
        throw new DomainException('jrei_schema_source_unavailable');
    $sql=preg_replace('/^\s*--[^\r\n]*$/m','',$sql);
    if(!is_string($sql))
        throw new DomainException('jrei_schema_comment_parsing_failed');
    $stmts=array_values(array_filter(array_map('trim',explode(';',$sql))));
    $expected=['jrei_local_chat_node_authorizations','jrei_local_chat_jobs'];
    if(count($stmts)!==2)throw new DomainException('jrei_schema_whitelist_changed');
    foreach($stmts as $i=>$stmt){
        if(!preg_match('/^CREATE TABLE IF NOT EXISTS ([a-z_]+)\s*\(/i',$stmt,$m)||
           $m[1]!==$expected[$i]||
           !preg_match('/\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci$/',$stmt)||
           preg_match('/\b(?:DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE\s+DATABASE|FOREIGN_KEY_CHECKS)\b/i',$stmt))
            throw new DomainException('jrei_schema_unsafe_ddl');
    }
    return $stmts;
}
function jrJreiLocalSchemaBackupReady(array $cfg): bool {
    $file=$cfg['jrei_local_schema_backup_file']??null;
    $sha=$cfg['jrei_local_schema_backup_sha256']??null;
    if(!is_string($file)||$file===''||
       !is_string($sha)||!preg_match('/^[a-f0-9]{64}$/D',$sha)||
       is_link($file))return false;
    $path=realpath($file);$site=realpath(dirname(__DIR__));
    if($path===false||$site===false||
       str_starts_with($path,$site.DIRECTORY_SEPARATOR)||
       !is_file($path)||!is_readable($path))return false;
    $size=filesize($path);$at=filemtime($path);
    if(!is_int($size)||$size<65536||$size>10737418240||
       !is_int($at)||$at<time()-86400||$at>time()+120)return false;
    $got=hash_file('sha256',$path);
    return is_string($got)&&hash_equals($sha,$got);
}
function jrJreiLocalSchemaApply(PDO $pdo,array $cfg): array {
    if(($cfg['jrei_local_schema_caretaker_enabled']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true)
        throw new DomainException('jrei_schema_caretaker_disabled');
    if(!jrJreiLocalSchemaBackupReady($cfg))
        throw new DomainException('jrei_schema_private_backup_unverified');
    $name=$pdo->query('SELECT DATABASE()')->fetchColumn();
    if($name!=='drjavad1_store')
        throw new DomainException('jrei_schema_wrong_database');
    if(!jrHybridSchemaReady($pdo)||
       !jrHybridModelRegistryReady($pdo))
        throw new DomainException('jrei_schema_missing_approved_dependencies');
    $stmts=jrJreiLocalSchemaStatements();
    $lock='jrei-lm-approved-additive-schema-v1';
    $q=$pdo->prepare('SELECT GET_LOCK(?,0)');
    $q->execute([$lock]);
    if((int)$q->fetchColumn()!==1)
        throw new DomainException('jrei_schema_caretaker_already_running');
    try{
        $already=(int)$pdo->query("SELECT COUNT(*) FROM information_schema.TABLES
          WHERE TABLE_SCHEMA='drjavad1_store' AND TABLE_NAME IN
            ('jrei_local_chat_node_authorizations','jrei_local_chat_jobs')
            AND TABLE_TYPE='BASE TABLE'")->fetchColumn();
        if($already<0||$already>2)
            throw new DomainException('jrei_schema_unexpected_inventory');
        // Only fixed CREATE TABLE IF NOT EXISTS statements, with InnoDB
        // foreign keys referencing already present original system tables.
        foreach($stmts as $sql)$pdo->exec($sql);
        if(!jrLocalChatSchemaReady($pdo))
            throw new DomainException('jrei_schema_postflight_incompatible');
        return ['schema'=>'jr.jrei.local-schema-caretaker.v1',
          'state'=>'ADDITIVE_SCHEMA_READY','database'=>'drjavad1_store',
          'expectedTables'=>2,'newTables'=>2-$already,
          'paymentsChanged'=>false,'parallelDatabaseCreated'=>false,
          'modelActivated'=>false];
    }finally{
        $release=$pdo->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lock]);
    }
}
