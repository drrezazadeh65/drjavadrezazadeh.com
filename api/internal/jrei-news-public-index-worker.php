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
    // Rebuild only JREI-owned RSS and sitemap after the ORIGINAL
    // bilingual authenticated-CMS index has been reconciled.
    $syndicated=0;
    if(($cfg['jrei_news_verified_syndication_enabled']??false)===true&&
       ($cfg['jrei_news_verified_restore_accepted']??false)===true&&
       ($cfg['jrei_news_standing_official_publishing_enabled']??false)===true){
        $receipt=jrNewsWriteOriginalSyndication(
            $pdo,$root,time(),[
                'source'=>'ORIGINAL_JREI_PRIVATE_INDEX_WORKER',
                'actualPublishedCmsReceiptsRequired'=>true,
                'originalSyndicationActivated'=>true
            ]);
        $syndicated=(int)$receipt['writtenAssets'];
    }
    fwrite(STDOUT,'JREI original News index verified languages='.
      (int)$out['indexedLanguages'].'; dedicated RSS/sitemap assets='.
      $syndicated.'; article writes=0.'."\n");
}catch(Throwable $e){
    fwrite(STDERR,"JREI original News index reconciliation requires review.\n");
    exit(1);
}
