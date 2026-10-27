<?php
declare(strict_types=1);
/**
 * One first-party Bertina, PHP-8.3-only JREI News publisher Cron adapter.
 * Original cron's DB lease/owner policy gates this CLI child; all other
 * authority stays in existing JREI + verified CMS + mother DB. Does nothing
 * on inclusion, API requests, or partial system migration.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/internal/jrei-news/news-library.php';
try{
    $cfg=cfg();
    $gate=($cfg['operations_cron_master_enabled']??false)===true&&
          ($cfg['jrei_news_integrated_release_accepted']??false)===true&&
          ($cfg['jrei_news_original_cms_writer_enabled']??false)===true&&
          ($cfg['jrei_news_standing_official_publishing_enabled']??false)===true&&
          ($cfg['jrei_news_verified_restore_accepted']??false)===true&&
          // Never write a public CMS page if its original verified
          // search/RSS reader is not independently authorized to show it.
          ($cfg['jrei_news_search_enabled']??false)===true&&
          ($cfg['jrei_news_publisher_receipts_accepted']??false)===true;
    if(!$gate){
        fwrite(STDOUT,"JREI official-news publisher OFF by original private policy.\n");
        exit(0);
    }
    $pdo=db();
    if(!($pdo instanceof PDO))
        throw new RuntimeException('news_private_mother_db_unavailable');
    $root=realpath(dirname(__DIR__,2));
    if($root===false||$root!==realpath(dirname(__DIR__,2))||
       !is_dir($root.DIRECTORY_SEPARATOR.'fa'.DIRECTORY_SEPARATOR.'akhbar')||
       !is_dir($root.DIRECTORY_SEPARATOR.'en'.DIRECTORY_SEPARATOR.'news-insights'))
        throw new RuntimeException('news_original_public_routes_unavailable');
    // Per-tick memory/IO protection, never an editorial DAILY quota.
    // A privately configured original CMS worker may clear multiple verified
    // official notices per scheduled tick without repeated owner approvals.
    $requested=$cfg['jrei_news_publish_batch_per_tick']??3;
    if(!is_int($requested)||$requested<1||$requested>8)
        throw new RuntimeException('news_private_publisher_batch_config_invalid');
    $result=jrNewsOriginalPrivateCmsPublishBatch(
        $pdo,$cfg,$root,time(),$requested);
    // CLOSE THE ORIGINAL CMS -> mother-DB index -> public newsroom loop
    // within the same authorized private Cron cycle. Previously, the
    // bilingual publication could succeed while its public archive/RSS
    // remained empty until a SEPARATELY enabled index worker ran.
    //
    // This is still the EXISTING receipts-only indexer. No new content,
    // fabricated SQL receipt, browser authority or public source bypass.
    $indexed=0;
    $syndication=0;
    if((int)($result['published']??0)>0){
        if(($cfg['jrei_news_publisher_receipts_accepted']??false)!==true||
           ($cfg['jrei_news_search_enabled']??false)!==true)
            throw new RuntimeException('news_original_public_archive_switches_not_accepted');
        $index=jrNewsOriginalIndexVerifiedPublishedPages(
            $pdo,$root,time(),min(50,max(2,$requested*2)));
        $indexed=(int)($index['indexedLanguages']??0);
        if($indexed<(int)$result['published']*2)
            throw new RuntimeException('news_original_public_index_not_caught_up');
        // The public RSS endpoint queries the verified index live. Static
        // JREI-owned feed/sitemap assets are optional and never overwrite
        // the website's historical feed.xml or sitemap-news.xml.
        if(($cfg['jrei_news_verified_syndication_enabled']??false)===true){
            $written=jrNewsWriteOriginalSyndication(
                $pdo,$root,time(),[
                   'source'=>'ORIGINAL_JREI_PRIVATE_INDEX_WORKER',
                   'actualPublishedCmsReceiptsRequired'=>true,
                   'originalSyndicationActivated'=>true
                ]);
            $syndication=(int)($written['writtenAssets']??0);
        }
    }
    $state=(string)($result['state']??'UNKNOWN');
    $code=preg_match('/^[A-Z_]{3,70}$/D',$state)?$state:'REQUIRES_REVIEW';
    fwrite(STDOUT,'JREI original CMS News='.$code.
      '; actual bilingual publication receipts='.(int)($result['published']??0).
      '; freshly indexed public languages='.$indexed.
      '; owned feed assets='.$syndication.
      '; no public browser authority accepted.'."\n");
}catch(Throwable $e){
    // Intentionally no source text, identifiers, SQL, token or filesystem paths.
    fwrite(STDERR,"JREI original CMS News requires private technical reconciliation.\n");
    exit(1);
}
