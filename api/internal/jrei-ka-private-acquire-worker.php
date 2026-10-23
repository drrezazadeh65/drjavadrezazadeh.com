<?php
declare(strict_types=1);
/**
 * JREI-KA: owner-enabled PRIVATE Cron, one licensed source acquisition
 * per run. Disconnected Windows nodes do not affect this Bertina task.
 * No customer data, provider AI invocation, financial call, shell command
 * or automatic scientific-content publication.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-ka-acquisition-dispatch.php';
try{
    $config=cfg();
    if(($config['jrei_ka_autofetch_enabled']??false)!==true||
       ($config['jrei_ka_schedule_enabled']??false)!==true){
        fwrite(STDOUT,"JREI-KA private acquisition OFF.\n");exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrKaAcquisitionReady($pdo,$config))
        throw new DomainException('ka_approved_source_or_private_storage_unavailable');
    $result=jrKaPrivateAcquireOne($pdo,$config);
    fwrite(STDOUT,"JREI-KA acquisition status=".$result['status'].
      "; new review observations=".($result['documentsAwaitingScienceReview']??0).
      "; no source auto-published; no AI inference.\n");
}catch(Throwable $e){
    // Avoid leaking source URL, private directory, token or copyrighted text.
    fwrite(STDERR,"JREI-KA acquisition safely unavailable. No source published.\n");
    exit(1);
}
