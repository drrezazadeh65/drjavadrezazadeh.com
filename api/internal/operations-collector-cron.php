<?php
declare(strict_types=1);
/* Set Bertina cPanel Cron Jobs to call this CLI-only file every 10 minutes.
 * Nothing is publicly callable or triggered by site visitors.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/operations-github-audits.php';
require_once dirname(__DIR__).'/operations-collection.php';
$config=require dirname(__DIR__).'/config.local.php';
if(!is_array($config))exit(1);
try{
    $pdo=new PDO((string)($config['db_dsn']??''),(string)($config['db_user']??''),
        (string)($config['db_password']??''),[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES=>false
        ]);
    $result=operationsCollectorRefresh($pdo,'scheduled',time());
    fwrite(STDOUT,"Operations scheduled collector: ".$result['status']."; attempted=".$result['attempted']."; saved=".$result['saved']."\n");
}catch(Throwable $e){
    fwrite(STDERR,"Operations scheduled collector unavailable; no public request affected.\n");exit(1);
}
