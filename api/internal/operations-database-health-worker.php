<?php
declare(strict_types=1);
/**
 * OPTIONAL, OWNER-GATED, CLI-ONLY mother-database health observer.
 * Merely deploying this file NEVER enables it. Bertina must independently
 * install an owner-approved Cron command; an OFF owner policy always blocks.
 * No visitor request, repair, table migration, email or data deletion.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/operations-activation.php';
require_once dirname(__DIR__).'/operations-database-health.php';
require_once dirname(__DIR__).'/operations-database-health-scheduling.php';
$config=require dirname(__DIR__).'/config.local.php';
if(!is_array($config)){fwrite(STDERR,"Health observer unavailable: private configuration missing.\n");exit(1);}
try{
    $pdo=new PDO((string)($config['db_dsn']??''),(string)($config['db_user']??''),
        (string)($config['db_password']??''),[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES=>false
        ]);
    $result=operationsDbHealthScheduleTick($pdo,time());
    $status=(string)($result['status']??'unavailable');
    // No internal DSN, SQL statement, stack trace or path in worker output.
    fwrite(STDOUT,"Owner-gated DB health observer: ".$status."\n");
    if(!in_array($status,['recorded','paused_by_owner','not_due','busy'],true))exit(1);
}catch(Throwable $e){
    fwrite(STDERR,"Owner-gated DB health observer unavailable; no repair attempted.\n");
    exit(1);
}
