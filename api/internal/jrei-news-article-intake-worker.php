<?php
declare(strict_types=1);
/**
 * JREI News PRIVATE original-article receipt intake.
 * PHP CLI only; original JREI-KA rights and owner acceptance mandatory.
 * This does not fetch a new URL, run an LLM, score science or publish.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-news-private-article-bridge.php';
try{
    $cfg=cfg();
    if(($cfg['jrei_news_article_intake_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true){
        fwrite(STDOUT,"JREI News original article intake OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!($pdo instanceof PDO))
        throw new RuntimeException('news_private_database_unavailable');
    $result=jrNewsBridgeOriginalArticleObservation($pdo,$cfg,time());
    $state=(string)($result['state']??'UNKNOWN');
    if(!preg_match('/^[A-Z_]{3,80}$/D',$state))$state='REQUIRES_REVIEW';
    fwrite(STDOUT,
        'JREI News original article receipt intake='.$state.
        '; private review proposals='.(int)$result['privateNewsCandidatesStaged'].
        '; no new fetch, no automatic publication.'."\n");
}catch(Throwable $e){
    fwrite(STDERR,
        "JREI News original article intake requires private review.\n");
    exit(1);
}
