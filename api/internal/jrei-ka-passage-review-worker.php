<?php
declare(strict_types=1);
/**
 * Private review-proposal only. Creates SHA-256 byte span metadata from
 * existing approved archived UTF-8 text. Never publishes RAG citations or
 * exposes document content, and never executes a model/OCR.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-ka-private-passage-index.php';
try{
    $cfg=cfg();
    if(($cfg['jrei_ka_passage_proposals_enabled']??false)!==true){
        fwrite(STDOUT,"JREI-KA passage proposals OFF.\n");exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrKaPassageSourceReady($pdo,$cfg))
        throw new DomainException('ka_passage_reviewer_sources_unavailable');
    $result=jrKaProposeOnePrivatePassageSet($pdo,$cfg);
    fwrite(STDOUT,"JREI-KA private passage state=".$result['status'].
       " reviewed/published=NO.\n");
}catch(Throwable $e){
    fwrite(STDERR,"JREI-KA passage source not accepted, no text released.\n");
    exit(1);
}
