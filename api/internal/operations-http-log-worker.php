<?php
declare(strict_types=1);
/**
 * OPTIONAL Bertina cPanel CLI-only access-log ingestion. Run once per minute.
 * Starts at EOF, never requests the public site, never sends SMTP itself,
 * never changes redirect rules, and never stores IP/UA/query/credentials.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/operations-http-log.php';
try{
    $config=cfg();
    $file=(string)($config['operations_access_log_path']??'');
    if($file===''){
        fwrite(STDERR,"HTTP access-log observer not configured; no false monitoring coverage.\n");
        exit(1);
    }
    $pdo=db();
    if(!$pdo){fwrite(STDERR,"HTTP observer database unavailable.\n");exit(1);}
    $retention=(int)($config['operations_http_retention_days']??90);
    $result=operationsHttpObserve($pdo,$file,time(),$retention);
    fwrite(STDOUT,"HTTP observer: ".$result['status']."; lines=".$result['lines'].
        "; 404=".$result['errors404']."; 5xx=".$result['errors5xx']."\n");
    if(!in_array($result['status'],['observed','initialized_at_eof','busy'],true))exit(1);
}catch(Throwable $e){
    fwrite(STDERR,"HTTP log observer unavailable; no customer data changed.\n");
    exit(1);
}
