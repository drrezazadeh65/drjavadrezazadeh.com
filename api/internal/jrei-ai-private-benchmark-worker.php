<?php
declare(strict_types=1);
/**
 * Genuine paid provider benchmark, independent of public release, default
 * OFF, original allowlisted CLI only. One independently approved case per
 * authorised batch/cycle. No learner chats, examination grades or payment
 * changes. Never call until end-stage owner approval + funded provider API.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-ai-governed-benchmarks.php';
try {
    $cfg=cfg();
    if(($cfg['jrei_ai_benchmark_enabled']??false)!==true ||
       ($cfg['jrei_live_ai_enabled']??false)!==true){
        fwrite(STDOUT,"JREI independent real-model benchmark OFF.\n");
        exit(0);
    }
    $batch=(string)($cfg['jrei_ai_benchmark_batch_id']??'');
    if(!validUuid($batch))throw new DomainException('benchmark_owner_batch_not_approved');
    $pdo=db();
    if(!$pdo||!jrAiBenchmarkSchemaReady($pdo))
        throw new DomainException('benchmark_schema_not_accepted');
    $out=jrAiBenchmarkOneRealInference($pdo,$cfg,$batch);
    fwrite(STDOUT,"JREI benchmark state=".$out['state'].
      "; independently verified accuracy=NO; public release=NO.\n");
}catch(Throwable $e){
    // No benchmark prompt, response, local private path, secret/API key or
    // provider failure body is ever copied into server Cron logs.
    fwrite(STDERR,"JREI independent benchmark not authorised or unavailable.\n");
    exit(1);
}
