<?php
declare(strict_types=1);
/**
 * Erase short-lived encrypted JREI-LM conversations from the original
 * mother database even if visitors disconnect and both Windows PCs stop.
 * CLI only, 300-second minimum host cadence, bounded deletion, never logs
 * text, account identifiers, source titles or local model prompts.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-local-chat.php';
try{
    $cfg=cfg();
    if(($cfg['jrei_local_chat_retention_enabled']??false)!==true){
        fwrite(STDOUT,"JREI-LM privacy retention job disabled.\n");
        exit(0);
    }
    $pdo=db();
    if(!($pdo instanceof PDO)||!jrLocalChatSchemaReady($pdo)){
        fwrite(STDERR,"JREI-LM privacy retention schema unavailable.\n");
        exit(2);
    }
    $now=time();
    $q=$pdo->prepare("DELETE FROM jrei_local_chat_jobs
      WHERE expires_at<? LIMIT 250");
    $q->execute([$now-120]);
    $count=$q->rowCount();
    fwrite(STDOUT,"JREI-LM expired encrypted chat rows deleted: ".$count."\n");
}catch(Throwable $error){
    fwrite(STDERR,"JREI-LM retention failed, owner review required.\n");
    exit(1);
}
