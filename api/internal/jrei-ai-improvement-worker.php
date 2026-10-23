<?php
declare(strict_types=1);
/**
 * Private evidence-based JREI issue detection, NOT autonomous code change.
 * Uses only the original mother DB with no model, API or learner records.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-ai-improvement-sensors.php';
try {
    $cfg=cfg();
    if(($cfg['jrei_ai_improvement_discovery_enabled']??false)!==true){
        fwrite(STDOUT,"JREI evidence discovery OFF.\n");exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrAiImprovementSchemaReady($pdo))
        throw new DomainException('improvement_schema_missing');
    $result=jrAiDetectImprovementOpportunities($pdo,$cfg);
    fwrite(STDOUT,"JREI evidence review signals=".$result['newProposalsRecorded'].
        "; code or deployment changes=NONE.\n");
}catch(Throwable $e){
    fwrite(STDERR,"JREI improvement sensor not authorised or available.\n");
    exit(1);
}
