<?php
declare(strict_types=1);
/** Original-Bertina private owner-enabled metadata-only key matching. */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-ka-paper-key-proposals.php';
try{
    $cfg=cfg();
    if(($cfg['jrei_ka_key_match_proposals_enabled']??false)!==true){
        fwrite(STDOUT,"JREI-KA private key match proposals OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrKaPaperKeyProposalsReady($pdo,$cfg))
        throw new DomainException('ka_paper_key_review_schema_unavailable');
    $result=jrKaProposeExactPaperKeyMatches($pdo,$cfg);
    fwrite(STDOUT,"JREI-KA private key match=".$result['status'].
      "; proposals=".$result['proposalsAdded'].
      "; answer correctness not established.\n");
}catch(Throwable $e){
    fwrite(STDERR,"JREI-KA private key matching unavailable.\n");
    exit(1);
}
