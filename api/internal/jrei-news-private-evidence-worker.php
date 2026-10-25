<?php
declare(strict_types=1);
/**
 * PRIVATE JREI-KA official headline evidence step.
 * No browser route, independent network crawler, private source approval,
 * model call, SMTP, or public CMS write. Original master Cron owns the lease.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-ka-acquisition-dispatch.php';
require_once dirname(__DIR__).'/internal/jrei-news/news-library.php';

try{
    $cfg=cfg();
    if(($cfg['operations_cron_master_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['jrei_news_independent_evidence_enabled']??false)!==true||
       ($cfg['jrei_ka_schedule_enabled']??false)!==true||
       ($cfg['jrei_ka_autofetch_enabled']??false)!==true){
        fwrite(STDOUT,"JREI News independent evidence worker OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo instanceof PDO)
        throw new RuntimeException('news_independent_evidence_mother_db_unavailable');
    $archive=jrKaPrivateArchiveRoot($cfg);
    if($archive===null)
        throw new RuntimeException('news_independent_evidence_original_archive_unavailable');
    $lock=$pdo->query(
        "SELECT GET_LOCK('jrei-news-primary-evidence',0)")->fetchColumn();
    if((int)$lock!==1){
        fwrite(STDOUT,"JREI News original evidence worker busy.\n");
        exit(0);
    }
    try{
        $out=jrNewsReviewOriginalOfficialObservations(
            $pdo,$archive,[
                'source'=>'ORIGINAL_JREI_PRIVATE_EVIDENCE_WORKER',
                'cronLeaseVerified'=>true,
                'sourcePolicyEnabled'=>true
            ],time(),6);
    }finally{
        $pdo->query("SELECT RELEASE_LOCK('jrei-news-primary-evidence')");
    }
    fwrite(STDOUT,'JREI News independent primary-source observations='.
        (int)$out['examined'].'; narrowly approved='.
        (int)$out['accepted'].'; ambiguous='.(int)$out['exceptions'].
        '; technical holds='.(int)$out['technicalHolds'].
        '; no model or CMS publication.'.PHP_EOL);
}catch(Throwable $e){
    fwrite(STDERR,"JREI News independent primary-source QA needs technical reconciliation.\n");
    exit(1);
}
