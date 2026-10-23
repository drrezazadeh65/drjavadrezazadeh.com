<?php
declare(strict_types=1);
/**
 * Independently gated PUBLIC website benchmark discovery.
 * This worker NEVER calls a model, tests code, reads learner answers
 * or approves scientific quality. It stages DRAFT cases for owner review.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-ai-benchmark-intake.php';
try {
    $cfg=cfg();
    if(($cfg['jrei_ai_benchmark_discovery_enabled']??false)!==true){
        fwrite(STDOUT,"JREI benchmark discovery OFF.\n");exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrAiBenchmarkSchemaReady($pdo))
        throw new DomainException('benchmark_schema_not_accepted');
    $out=jrAiDiscoverPublicBenchmarkDrafts($pdo,$cfg);
    fwrite(STDOUT,"JREI benchmark draft discovery=".$out['state'].
        "; case drafts=".$out['draftsAdded']."; no model spend.\n");
}catch(Throwable $e){
    fwrite(STDERR,"JREI benchmark discovery safely unavailable.\n");
    exit(1);
}
