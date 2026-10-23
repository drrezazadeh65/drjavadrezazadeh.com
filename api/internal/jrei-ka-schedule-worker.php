<?php
declare(strict_types=1);
/**
 * Bertina owner-controlled Cron: JREI-KA safe scheduled metadata queueing.
 *
 * This process DOES NOT download any website/PDF, launch Windows tasks,
 * change assessment content, emit email, or enable commercial exam sales.
 * It is independently switched OFF in private config and original Cron.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-ka-scheduler.php';

try{
    $config=cfg();
    if(($config['jrei_ka_schedule_enabled']??false)!==true){
        fwrite(STDOUT,"JREI-KA scheduling disabled in private policy.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrKaSchemaReady($pdo)){
        fwrite(STDERR,"JREI-KA approved scheduling schema unavailable.\n");
        exit(2);
    }
    $result=jrKaScheduleApprovedSources($pdo,$config,time());
    fwrite(STDOUT,"JREI-KA status=".$result['status'].
        "; metadata_tasks_added=".$result['scheduled']."; no download attempted.\n");
}catch(Throwable $e){
    fwrite(STDERR,"JREI-KA scheduling unavailable; no external access attempted.\n");
    exit(1);
}
