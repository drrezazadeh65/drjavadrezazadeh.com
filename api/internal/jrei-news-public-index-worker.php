<?php
declare(strict_types=1);
/** First-party JREI News indexed-pages reconciliation; private CLI only. */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/internal/jrei-news/news-library.php';
try{
    $cfg=cfg();
    if(($cfg['operations_cron_master_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['jrei_news_publisher_receipts_accepted']??false)!==true||
       ($cfg['jrei_news_original_cms_writer_enabled']??false)!==true){
        fwrite(STDOUT,"JREI original News indexing OFF.\n");exit(0);
    }
    $pdo=db();
    if(!$pdo instanceof PDO)
        throw new RuntimeException('news_original_index_mother_db_unavailable');
    $root=realpath(dirname(__DIR__,2));
    if($root===false)
        throw new RuntimeException('news_original_index_root_missing');
    $out=jrNewsOriginalIndexVerifiedPublishedPages($pdo,$root,time(),6);
    fwrite(STDOUT,'JREI original News index verified languages='.
      (int)$out['indexedLanguages'].'; publication writes=0.'."\n");
}catch(Throwable $e){
    fwrite(STDERR,"JREI original News index reconciliation requires review.\n");
    exit(1);
}
