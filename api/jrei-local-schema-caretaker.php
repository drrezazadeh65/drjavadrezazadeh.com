<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-local-chat.php';
require_once __DIR__.'/jrei-hybrid-owner-models.php';

/**
 * JREI first-party additive schema caretaker.
 *
 * A single prior owner policy may authorise routine installation of THREE
 * fixed, source-reviewed JREI-LM tables when prerequisites and a verified
 * private backup exist. Only the original drjavad1_store DB is touched;
 * no free-form SQL, table names, columns, payment/user mutations or remote
 * model-driven DDL are ever accepted. MySQL DDL is non-transactional;
 * backup and idempotent rerun are mandatory.
 */
function jrJreiLocalSchemaStatements(): array {
    // Original docs SQL in developer fixtures; packaged, digest-checked JSON
    // in Bertina's existing HTTP-denied api/internal folder.
    $spec=[
      ['20261023_jrei_model_registry_mother_mysql.sql',
        ['jrei_local_model_registry']],
      ['20261024_jrei_local_inference_queue_mother_mysql.sql',
        ['jrei_local_chat_node_authorizations','jrei_local_chat_jobs']]
    ];
    $private=__DIR__.'/internal/jrei-reviewed-ddl-v1.json';
    $packaged=null;
    if(is_file($private)){
        if(filesize($private)>50000)throw new DomainException('jrei_schema_private_package_invalid');
        $decoded=json_decode((string)file_get_contents($private),true);
        if(!is_array($decoded)||
           ($decoded['schema']??null)!=='jr.jrei.owner-reviewed-local-ddl.v1'||
           !is_array($decoded['entries']??null)||
           count($decoded['entries'])!==2)
            throw new DomainException('jrei_schema_private_package_invalid');
        $packaged=$decoded['entries'];
    }
    $stmts=[];
    foreach($spec as $idx=>[$filename,$tables]){
        $original=dirname(__DIR__).'/docs/migrations/'.$filename;
        if(is_file($original)){
            if(filesize($original)>20000||!is_readable($original))
                throw new DomainException('jrei_schema_source_unavailable');
            $sql=file_get_contents($original);
        }elseif(is_array($packaged)){
            $entry=$packaged[$idx]??null;
            if(!is_array($entry)||($entry['name']??null)!==$filename||
               !is_string($entry['sql']??null)||
               !is_string($entry['sha256']??null)||
               !preg_match('/^[a-f0-9]{64}$/D',$entry['sha256'])||
               !hash_equals($entry['sha256'],hash('sha256',$entry['sql'])))
                throw new DomainException('jrei_schema_private_package_invalid');
            $sql=$entry['sql'];
        }else{
            throw new DomainException('jrei_schema_source_unavailable');
        }
        if(!is_string($sql)||strlen($sql)>20000)
            throw new DomainException('jrei_schema_source_unavailable');
        $sql=preg_replace('/^\s*--[^\r\n]*$/m','',$sql);
        if(!is_string($sql))throw new DomainException('jrei_schema_comment_parsing_failed');
        $parts=array_values(array_filter(array_map('trim',explode(';',$sql))));
        if(count($parts)!==count($tables))
            throw new DomainException('jrei_schema_whitelist_changed');
        foreach($parts as $i=>$stmt){
            if(!preg_match('/^CREATE TABLE IF NOT EXISTS ([a-z_]+)\s*\(/i',$stmt,$m)||
               $m[1]!==$tables[$i]||
               !preg_match('/\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci$/',$stmt)||
               preg_match('/\b(?:DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE\s+DATABASE|FOREIGN_KEY_CHECKS)\b/i',$stmt))
                throw new DomainException('jrei_schema_unsafe_ddl');
            $stmts[]=$stmt;
        }
    }
    if(count($stmts)!==3)throw new DomainException('jrei_schema_whitelist_changed');
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
    $name=$pdo->query('SELECT DATABASE()')->fetchColumn();
    if($name!=='drjavad1_store')
        throw new DomainException('jrei_schema_wrong_database');
    if(!jrHybridSchemaReady($pdo))
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
            ('jrei_local_model_registry',
             'jrei_local_chat_node_authorizations','jrei_local_chat_jobs')
            AND TABLE_TYPE='BASE TABLE'")->fetchColumn();
        if($already<0||$already>3)
            throw new DomainException('jrei_schema_unexpected_inventory');
        if($already===3&&jrHybridModelRegistryReady($pdo)&&jrLocalChatSchemaReady($pdo)){
            // Do not dump production repeatedly once the three approved
            // tables are already installed and their columns are usable.
            return ['schema'=>'jr.jrei.local-schema-caretaker.v1',
              'state'=>'ADDITIVE_SCHEMA_READY','database'=>'drjavad1_store',
              'expectedTables'=>3,'newTables'=>0,
              'paymentsChanged'=>false,'parallelDatabaseCreated'=>false,
              'modelActivated'=>false];
        }
        if(!jrJreiLocalSchemaBackupReady($cfg)){
            // A configured but stale/wrong private backup must STOP DDL.
            // Only when no backup reference was supplied may this same
            // owner-approved CLI task create a fresh native dump itself.
            if(!empty($cfg['jrei_local_schema_backup_file'])||
               !empty($cfg['jrei_local_schema_backup_sha256']))
                throw new DomainException('jrei_schema_private_backup_unverified');
            if(PHP_SAPI!=='cli')
                throw new DomainException('jrei_schema_cli_required_for_autobackup');
            require_once __DIR__.'/jrei-local-private-backup.php';
            $cfg=array_replace($cfg,jrJreiPrivateBackupCreate($pdo,$cfg));
            if(!jrJreiLocalSchemaBackupReady($cfg))
                throw new DomainException('jrei_schema_private_backup_unverified');
        }
        // Only reviewed CREATE TABLE IF NOT EXISTS: model registry first,
        // followed by grants and queue with original foreign keys.
        foreach($stmts as $sql)$pdo->exec($sql);
        if(!jrHybridModelRegistryReady($pdo)||!jrLocalChatSchemaReady($pdo))
            throw new DomainException('jrei_schema_postflight_incompatible');
        return ['schema'=>'jr.jrei.local-schema-caretaker.v1',
          'state'=>'ADDITIVE_SCHEMA_READY','database'=>'drjavad1_store',
          'expectedTables'=>3,'newTables'=>3-$already,
          'paymentsChanged'=>false,'parallelDatabaseCreated'=>false,
          'modelActivated'=>false];
    }finally{
        $release=$pdo->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lock]);
    }
}
