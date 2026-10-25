<?php
declare(strict_types=1);
/**
 * ORIGINAL scheduled JREI News bilingual draft worker — PHP 8.3 CLI only.
 * The one mother DB and existing JREI model budget/transport are reused.
 * No direct HTTP access; original master scheduler supplies the lease.
 * Independent source facts, real author corpus and independent QA remain
 * mandatory. Missing originals are a SYSTEM_HOLD, never fabricated facts.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/internal/jrei-news/news-library.php';
require_once dirname(__DIR__).'/internal/jrei-news/original-draft-runtime-adapter.php';
try {
    $config=cfg();
    if(($config['operations_cron_master_enabled']??false)!==true||
       ($config['jrei_news_integrated_release_accepted']??false)!==true||
       ($config['jrei_news_model_drafting_enabled']??false)!==true||
       ($config['jrei_live_ai_enabled']??false)!==true){
        fwrite(STDOUT,"JREI News private original model drafting OFF.\n");
        exit(0);
    }
    if(PHP_VERSION_ID<80300)
        throw new RuntimeException('news_original_draft_php_version_unsupported');
    $pdo=db();
    if(!$pdo instanceof PDO)
        throw new RuntimeException('news_original_draft_mother_database_missing');
    $result=jrNewsOriginalPrivateDraftTick($pdo,$config,time(),2);
    $state=(string)($result['state']??'SYSTEM_HOLD');
    if(!preg_match('/^[A-Z_]{3,80}$/D',$state))$state='SYSTEM_HOLD';
    fwrite(STDOUT,'JREI News private bilingual draft='.$state.
        '; completed='.(int)($result['completed']??0).
        '; system_holds='.(int)($result['systemHolds']??0).
        '; no public publication.'.PHP_EOL);
    // Service absence is not a recurring PHP crash. The original owner
    // dashboard exposes a bounded system hold; leave the master scheduler
    // functioning for other source and public delivery jobs.
    exit(0);
}catch(Throwable $e){
    // No customer content, DB/SQL, provider keys or internal paths in logs.
    fwrite(STDERR,"JREI News original private model draft worker unavailable.\n");
    exit(1);
}
