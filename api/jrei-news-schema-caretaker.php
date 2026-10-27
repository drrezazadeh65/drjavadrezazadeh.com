<?php
declare(strict_types=1);
/**
 * PRIVATE JREI News DDL caretaker: ONLY four reviewed, additive tables.
 * Existing drjavad1_store, account foreign keys and original schemas remain
 * authoritative; no automatic ALTER of live editorial/publication tables.
 * Safe idempotent reruns; ALL public HTTP requests are prohibited.
 * A new source requirement is not permission for arbitrary model-written SQL.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsApprovedAdditiveTables():array {
    return [
      'jrei_news_standing_policies',
      'jrei_news_independent_qa_receipts',
      'jrei_news_owner_exceptions',
      'jrei_news_admin_source_submissions'
    ];
}
function jrNewsAdditiveCurrentTables(PDO $pdo):array {
    $q=$pdo->query("SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA='drjavad1_store'
        AND TABLE_TYPE='BASE TABLE'
        AND TABLE_NAME IN (
          'jrei_news_standing_policies',
          'jrei_news_independent_qa_receipts',
          'jrei_news_owner_exceptions',
          'jrei_news_admin_source_submissions'
        )");
    return array_fill_keys($q->fetchAll(PDO::FETCH_COLUMN),true);
}
function jrNewsAdditiveBackupConfirmed(array $cfg):bool {
    if(($cfg['jrei_news_schema_restore_rehearsed']??false)!==true)
        return false;
    $file=$cfg['jrei_news_schema_backup_file']??null;
    $sha=$cfg['jrei_news_schema_backup_sha256']??null;
    if(!is_string($file)||!is_string($sha)||
       !preg_match('/^[a-f0-9]{64}$/D',$sha)||
       strlen($file)>700||is_link($file))return false;
    $p=realpath($file);
    $site=realpath(dirname(__DIR__));
    if($p===false||$site===false||
       $p===$site||str_starts_with($p,$site.DIRECTORY_SEPARATOR)||
       !is_file($p)||!is_readable($p))return false;
    $size=filesize($p);$mtime=filemtime($p);
    if(!is_int($size)||$size<65536||$size>10737418240||
       !is_int($mtime)||$mtime<time()-86400||$mtime>time()+120)return false;
    $actual=hash_file('sha256',$p);
    return is_string($actual)&&hash_equals($sha,$actual);
}
/** The build step hashes exactly the reviewed repository SQL sources. */
function jrNewsApprovedAdditiveStatements():array {
    $path=__DIR__.'/internal/jrei-news-reviewed-additive-ddl-v1.json';
    if(!is_file($path)||is_link($path)||!is_readable($path)||
       filesize($path)>36000)
        throw new DomainException('news_additive_ddl_package_unavailable');
    $doc=json_decode((string)file_get_contents($path),true,12,JSON_THROW_ON_ERROR);
    $expected=jrNewsApprovedAdditiveTables();
    if(($doc['schema']??null)!=='jr.jrei.news-reviewed-additive-ddl.v1'||
       !is_array($doc['entries']??null)||
       count($doc['entries'])!==count($expected))
        throw new DomainException('news_additive_ddl_package_invalid');
    $statements=[];
    foreach($expected as $i=>$name){
        $row=$doc['entries'][$i]??null;
        if(!is_array($row)||($row['table']??null)!==$name||
           !is_string($row['sql']??null)||
           !is_string($row['sha256']??null)||
           preg_match('/^[a-f0-9]{64}$/D',$row['sha256'])!==1||
           !hash_equals($row['sha256'],hash('sha256',$row['sql'])))
            throw new DomainException('news_additive_ddl_digest_invalid');
        $sql=trim($row['sql']);
        if(strlen($sql)>12000||
           !preg_match('/^CREATE TABLE IF NOT EXISTS '.preg_quote($name,'/').'\s*\(/',$sql)||
           !preg_match('/\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci$/D',$sql)||
           preg_match('/[;]|\b(?:DROP|TRUNCATE|ALTER|GRANT|REVOKE|UPDATE|DELETE|INSERT|CREATE\s+DATABASE|FOREIGN_KEY_CHECKS)\b/i',$sql))
            throw new DomainException('news_additive_ddl_not_allowlisted');
        $statements[$name]=$sql;
    }
    return $statements;
}
function jrNewsAdditiveSchemaCaretaker(PDO $pdo,array $cfg):array {
    if(PHP_SAPI!=='cli'||
       ($cfg['operations_cron_master_enabled']??false)!==true||
       ($cfg['jrei_news_schema_caretaker_enabled']??false)!==true)
        throw new DomainException('news_additive_caretaker_not_owner_enabled');
    if($pdo->query('SELECT DATABASE()')->fetchColumn()!=='drjavad1_store')
        throw new DomainException('news_additive_wrong_mother_database');
    $required=['customer_accounts','jrei_exam_sources',
       'jrei_news_monitors','jrei_news_candidates',
       'jrei_news_evidence_reviews','jrei_news_editorial_versions'];
    $placeholders=implode(',',array_fill(0,count($required),'?'));
    $q=$pdo->prepare("SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA='drjavad1_store' AND TABLE_TYPE='BASE TABLE'
        AND TABLE_NAME IN ($placeholders)");
    $q->execute($required);
    $have=$q->fetchAll(PDO::FETCH_COLUMN);
    if(count($have)!==count($required))
        throw new DomainException('news_additive_original_dependencies_missing');
    $sql=jrNewsApprovedAdditiveStatements();
    $lock='jrei-news-additive-schema-v1';
    $stmt=$pdo->prepare('SELECT GET_LOCK(?,0)');
    $stmt->execute([$lock]);
    if((int)$stmt->fetchColumn()!==1)
        throw new DomainException('news_additive_schema_in_progress');
    try {
        $current=jrNewsAdditiveCurrentTables($pdo);
        $missing=array_diff(array_keys($sql),array_keys($current));
        if($missing!==[]){
            if(!jrNewsAdditiveBackupConfirmed($cfg))
                throw new DomainException('news_additive_backup_and_restore_gate_missing');
            // SQL DDL does not roll back atomically in MariaDB. Every table
            // is checked before and after the single fixed CREATE statement.
            foreach($sql as $table=>$ddl){
                if(isset($current[$table]))continue;
                $pdo->exec($ddl);
            }
        }
        $after=jrNewsAdditiveCurrentTables($pdo);
        foreach(array_keys($sql) as $table){
            if(!isset($after[$table]))
                throw new RuntimeException('news_additive_missing_after_install');
        }
        // Existing 20261025 ALTER migrations are explicitly OUT OF SCOPE.
        // Their missing columns must not be silently invented/approbated.
        $q=$pdo->query("SELECT TABLE_NAME,COLUMN_NAME
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA='drjavad1_store'
            AND (
              (TABLE_NAME='jrei_news_publications'
               AND COLUMN_NAME='standing_policy_id')
              OR
              (TABLE_NAME='jrei_news_evidence_reviews'
               AND COLUMN_NAME='independent_service_id')
            )");
        $columns=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row)
            $columns[$row['TABLE_NAME'].'.'.$row['COLUMN_NAME']]=true;
        return ['schema'=>'jr.jrei.news-additive-mother-caretaker.v1',
           'state'=>'REVIEWED_CREATE_TABLES_PRESENT',
           'motherDatabase'=>'drjavad1_store',
           'expectedTables'=>count($sql),'newTables'=>count($missing),
           'existingPublicationStandingColumn'=>
             isset($columns['jrei_news_publications.standing_policy_id']),
           'existingIndependentEvidenceColumn'=>
             isset($columns['jrei_news_evidence_reviews.independent_service_id']),
           'remainingSchemaAmendmentsRequireSeparateReview'=>true,
           'ownerPoliciesOrSourceRightsGranted'=>false,
           'newsPublisherActivated'=>false,'parallelDatabaseCreated'=>false];
    }finally{
        $q=$pdo->prepare('SELECT RELEASE_LOCK(?)');
        $q->execute([$lock]);
        $q->fetchColumn();
    }
}
