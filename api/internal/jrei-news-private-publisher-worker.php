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
          ($cfg['jrei_news_verified_restore_accepted']??false)===true;
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
    $result=jrNewsOriginalPrivateCmsPublishBatch($pdo,$cfg,$root,time(),1);
    $state=(string)($result['state']??'UNKNOWN');
    $code=preg_match('/^[A-Z_]{3,70}$/D',$state)?$state:'REQUIRES_REVIEW';
    fwrite(STDOUT,'JREI original CMS News='.$code.
      '; actual bilingual publication receipts='.(int)($result['published']??0).
      '; no public browser authority accepted.'."\n");
}catch(Throwable $e){
    // Intentionally no source text, identifiers, SQL, token or filesystem paths.
    fwrite(STDERR,"JREI original CMS News requires private technical reconciliation.\n");
    exit(1);
}
