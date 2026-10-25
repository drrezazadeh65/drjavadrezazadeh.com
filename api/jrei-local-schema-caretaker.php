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
    // The model registry must precede the owner grants and encrypted queue.
    // Files and table names are fixed in source, never user/model input.
    $files=[
      ['20261023_jrei_model_registry_mother_mysql.sql',
        ['jrei_local_model_registry']],
      ['20261024_jrei_local_inference_queue_mother_mysql.sql',
        ['jrei_local_chat_node_authorizations','jrei_local_chat_jobs']]
    ];
    $sourceDir=dirname(__DIR__).'/docs/migrations';
    $sourcesPresent=is_readable($sourceDir.'/'.$files[0][0])&&
        is_readable($sourceDir.'/'.$files[1][0]);
    $bundle=null;
    if(!$sourcesPresent){
        // The production bundle deliberately excludes docs/ SQL source.
        // The build projects ONLY these reviewed statements into the
        // HTTP-denied API internal directory; never load caller-supplied SQL.
        $safe=__DIR__.'/internal/jrei-approved-schema-v1.json';
        if(!is_file($safe)||!is_readable($safe)||filesize($safe)>30000)
            throw new DomainException('jrei_schema_source_unavailable');
        try{$bundle=json_decode((string)file_get_contents($safe),
            true,16,JSON_THROW_ON_ERROR);}
        catch(Throwable $e){
            throw new DomainException('jrei_schema_source_unavailable');
        }
        if(!is_array($bundle)||
            ($bundle['schema']??null)!=='jr.jrei.owner-reviewed-additive-migrations.v1'||
            ($bundle['database']??null)!=='drjavad1_store'||
            !is_array($bundle['files']??null)||
            !array_is_list($bundle['files'])||count($bundle['files'])!==2)
            throw new DomainException('jrei_schema_bundle_invalid');
    }
    $statements=[];
    foreach($files as $fileIndex=>[$filename,$names]){
        if($sourcesPresent){
            $file=$sourceDir.'/'.$filename;
            if(!is_file($file)||!is_readable($file)||filesize($file)>20000)
                throw new DomainException('jrei_schema_source_unavailable');
            $sql=file_get_contents($file);
            if(!is_string($sql)||strlen($sql)>20000)
                throw new DomainException('jrei_schema_source_unavailable');
            $sql=preg_replace('/^\s*--[^\r\n]*$/m','',$sql);
            if(!is_string($sql))
                throw new DomainException('jrei_schema_comment_parsing_failed');
            $parts=array_values(array_filter(array_map('trim',explode(';',$sql))));
        }else{
            $file=$bundle['files'][$fileIndex]??null;
            if(!is_array($file)||
               ($file['source']??null)!==$filename||
               ($file['tables']??null)!==$names||
               !is_array($file['statements']??null)||
               !array_is_list($file['statements']))
                throw new DomainException('jrei_schema_bundle_invalid');
            $parts=$file['statements'];
        }
        if(count($parts)!==count($names))
            throw new DomainException('jrei_schema_whitelist_changed');
        foreach($parts as $i=>$stmt){
            if(!is_string($stmt)||strlen($stmt)>20000||
               !preg_match('/^CREATE TABLE IF NOT EXISTS ([a-z_]+)\s*\(/i',$stmt,$m)||
               $m[1]!==$names[$i]||
               !preg_match('/\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci$/',$stmt)||
               preg_match('/\b(?:DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE\s+DATABASE|FOREIGN_KEY_CHECKS)\b/i',$stmt))
                throw new DomainException('jrei_schema_unsafe_ddl');
            $statements[]=$stmt;
        }
    }
    if(count($statements)!==3)
        throw new DomainException('jrei_schema_whitelist_changed');
    return $statements;
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
