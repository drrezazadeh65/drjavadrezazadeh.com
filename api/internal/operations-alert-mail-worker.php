<?php
declare(strict_types=1);
// Invoke from Bertina cPanel CLI cron once per minute for near-real-time alerts.
// This never runs on page requests, and requires the existing private SMTP
// configuration, unified MySQL tables and a deliberately configured recipient.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/operations-alerts.php';
try{
    $cfg=cfg();
    if(!mailReady()){
        fwrite(STDERR,"Operations alert SMTP is not configured; no messages sent.\n");
        exit(1);
    }
    $pdo=db();
    if(!$pdo){fwrite(STDERR,"Operations alert database unavailable.\n");exit(1);}
    $result=operationsAlertSendBatch($pdo,$cfg,
        static fn(string $to,string $subject,string $body): bool =>
            sendLocalMail($to,$subject,$body),time());
    fwrite(STDOUT,"Alert outbox: ".$result['status']."; attempted=".
        $result['attempted']."; SMTP accepted=".$result['accepted']."\n");
}catch(Throwable $e){
    fwrite(STDERR,"Operations alert dispatch failed; see private operations logs.\n");
    exit(1);
}
