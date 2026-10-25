<?php
declare(strict_types=1);
/**
 * ONLY the original JREI private runtime may supply the source/QA ports.
 * Existing provider credentials stay in api/jrei-ai-cloud-provider.php.
 * No user-submitted URL, source, model output, session or dynamic PHP path
 * is ever accepted as a port. Absence of independent QA is a SYSTEM_HOLD.
 *
 * This adapter is a registry, not a second model executor or AI validator.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/** Returns only first-party, previously loaded ORIGINAL JREI service ports.
 * Plugins may not register extra functions, URL endpoints or arbitrary paths.
 */
function jrNewsOriginalTrustedDraftServices(): array {
    $registry=[
      'originalEvidence'=>'jrJreiPrivateReviewedNewsEvidence',
      'authorStyleProfile'=>'jrJreiApprovedMeasuredNewsAuthorStyle',
      'independentFactAndStyleAudit'=>'jrJreiIndependentNewsEditorialAudit',
      'approvedMedia'=>'jrJreiOriginalLicensedNewsMedia',
      'originalAuditorSignatureVerifier'=>'jrJreiVerifyIndependentNewsQaSignature'
    ];
    $ports=[];
    foreach($registry as $name=>$function){
        if(!function_exists($function))return [];
        // Not call_user_func() on any untrusted data. Fixed source-owned
        // names and no direct client request or pluggable provider paths.
        $ports[$name]=$function;
    }
    return $ports;
}

/** A missing first-party service is an operational blocker, NOT an owner
 * article approval or a fallback to generic unsourced AI text.
 */
function jrNewsOriginalPrivateDraftTick(
    PDO $pdo,array $cfg,int $now,int $limit=2
):array {
    if($now<=0||$limit<1||$limit>3)
        throw new InvalidArgumentException('news_original_draft_tick_invalid');
    if(($cfg['operations_cron_master_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['jrei_news_model_drafting_enabled']??false)!==true||
       ($cfg['jrei_live_ai_enabled']??false)!==true)
       return [
           'schema'=>'jr.jrei.news-private-draft-tick.v1',
           'state'=>'OFF','completed'=>0,'systemHolds'=>0,
           'publicationPerformed'=>false
       ];
    $ports=jrNewsOriginalTrustedDraftServices();
    if(count($ports)!==5)
       return [
           'schema'=>'jr.jrei.news-private-draft-tick.v1',
           'state'=>'SYSTEM_HOLD_ORIGINAL_JREI_SERVICE_MISSING',
           'completed'=>0,'systemHolds'=>1,
           'publicationPerformed'=>false
       ];
    $result=jrNewsOriginalPrivateDraftBatch(
        $pdo,$cfg,[
          'source'=>'ORIGINAL_JREI_NEWS_PRIVATE_CRON',
          'serverSideJobAuthenticated'=>true,
          'originalCronLeaseCurrent'=>true
        ],$ports,$now,$limit
    );
    $result['publicationPerformed']=false;
    return $result;
}
