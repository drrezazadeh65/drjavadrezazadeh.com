<?php
declare(strict_types=1);
/**
 * Private source-content first-pass extraction, one approved observation
 * per cron invocation. Not an OCR/AI/question-publication worker.
 * No external commands, real checkout or private learner data.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-ka-private-text-extraction.php';
try{
    $policy=cfg();
    if(($policy['jrei_ka_text_extraction_enabled']??false)!==true){
        fwrite(STDOUT,"JREI-KA private extraction OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrKaTextSchemaReady($pdo,$policy))
        throw new DomainException('ka_private_extraction_not_authorized');
    $result=jrKaExtractOnePrivateObservation($pdo,$policy);
    fwrite(STDOUT,"JREI-KA private text status=".$result['status'].
      "; first-pass processed=".$result['processed'].
      "; OCR performed=NO; scientific publication=NO.\n");
}catch(Throwable $e){
    // Intentionally omit file bytes, original URLs, secret paths and
    // potentially identifying source material from runtime logs.
    fwrite(STDERR,"JREI-KA private extraction unavailable, no publication.\n");
    exit(1);
}
