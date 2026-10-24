<?php
declare(strict_types=1);
/**
 * JREI News private Cron projection of ORIGINAL JREI-KA RSS/Atom receipts.
 * PHP 8.3 CLI only. Never opens an HTTP route, new crawler, SMTP client,
 * provider account, model inference or public publisher.
 * Owner master Cron and both news-release switches remain OFF by default.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-news-private-feed-bridge.php';
try{
    $cfg=cfg();
    if(($cfg['jrei_news_feed_discovery_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true){
        fwrite(STDOUT,"JREI News original-feed projection OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!($pdo instanceof PDO))
        throw new RuntimeException('news_mother_database_unavailable');
    $summary=jrNewsBridgeOriginalFeedObservation($pdo,$cfg,time());
    $state=(string)($summary['state']??'UNKNOWN');
    if(!preg_match('/^[A-Z_]{3,80}$/D',$state))$state='REQUIRES_REVIEW';
    fwrite(STDOUT,
      'JREI News private feed projection='.$state.
      '; private link suggestions='.(int)$summary['newPrivateLinksSuggested'].
      '; no independent downloads, no public publishing.'."\n");
}catch(Throwable $e){
    // Do not print original source URLs, private archive paths, personal
    // information, content bytes, SQL errors or unreadable publisher feeds.
    fwrite(STDERR,
       "JREI News private feed projection requires owner review.\n");
    exit(1);
}
