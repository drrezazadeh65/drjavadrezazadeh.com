<?php
declare(strict_types=1);
/**
 * Original Bertina master-Cron child, native ARTICLES opt-in email only.
 * No API route, parallel SMTP, inferred subscription or account store.
 * Mode is owner-configured, never supplied by a visitor.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/newsletter-preferences.php';
require_once dirname(__DIR__).'/newsletter-delivery.php';
require_once dirname(__DIR__).'/newsletter-unsubscribe.php';
require_once dirname(__DIR__).'/internal/jrei-news/news-library.php';

try{
    $cfg=cfg();
    if(($cfg['operations_cron_master_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['jrei_news_original_digest_enabled']??false)!==true||
       ($cfg['jrei_news_publisher_receipts_accepted']??false)!==true||
       getenv('JR_NEWSLETTER_DELIVERY_ENABLED')!=='true'||
       !mailReady()){
        fwrite(STDOUT,"JREI original consented News digest OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo instanceof PDO||!jrNewsletterOutboundSchemaReady($pdo))
        throw new RuntimeException('news_original_eco_schema_missing');
    $lock=$pdo->query(
        "SELECT GET_LOCK('jrei-original-news-digest-single',0)")->fetchColumn();
    if((int)$lock!==1){
        fwrite(STDOUT,"JREI original News digest busy.\n");exit(0);
    }
    $queued=0;$already=0;$attempted=0;$accepted=0;
    try{
        $at=time();
        // Four independently scheduled modes, with a bounded per-mode batch.
        // No fabricated daily limit on NEWS publication: these bounds protect
        // subscriber notification memory, SMTP rates and consent audit.
        $jobs=[
            ['mode'=>'URGENT','cadence'=>3600],
            ['mode'=>'DAILY','cadence'=>86400],
            ['mode'=>'WEEKLY','cadence'=>604800],
            ['mode'=>'EXAM_ONLY','cadence'=>86400]
        ];
        foreach($jobs as $job){
            $mode=$job['mode'];
            if($mode!=='URGENT'&&$mode!=='DAILY'&&$mode!=='WEEKLY'&&
               $mode!=='EXAM_ONLY')continue;
            $consent=static fn(string $account,string $purpose,string $channel):array=>
                jrNewsReadOriginalArticlesConsent($pdo,$account,$purpose,$channel);
            $enqueue=static fn(array $intent):array=>
                jrNewsOriginalEcoEnqueueDigest($pdo,$intent,[
                   'source'=>'EXISTING_OPERATIONS_CRON_SIGNED_DISPATCH',
                   'signedJobVerified'=>true,'existingEcoEnabled'=>true
                ],$at);
            // A real durable cadence/lease belongs to the original master
            // Cron. This child must never start overlapping schedules itself.
            $summary=jrNewsQueueTopicDigests(
                $pdo,$mode,$at,$consent,$enqueue);
            $queued+=(int)($summary['queued']??0);
            $already+=(int)($summary['alreadyQueued']??0);
        }
        $stmt=$pdo->query(
            "SELECT n.id FROM eco_notifications n
             JOIN eco_object_refs o ON o.id=n.message_object_id
             WHERE n.delivery_state='PENDING'
               AND n.channel_code='EMAIL' AND n.purpose_code='ARTICLES'
               AND o.storage_provider='JR_JREI_PRIVATE_NEWS_DIGEST'
               AND o.data_class='PRIVATE'
             ORDER BY n.created_at,n.id LIMIT 5");
        foreach($stmt->fetchAll(PDO::FETCH_COLUMN) as $id){
            if(!jrNewsletterReserve($pdo,(string)$id))continue;
            $result=jrNewsSendOriginalEcoDigestReserved(
                $pdo,(string)$id,[
                  'source'=>'EXISTING_OPERATIONS_CRON_SIGNED_DISPATCH',
                  'signedJobVerified'=>true,'existingEcoEnabled'=>true
                ],
                static fn(string $to,string $subject,string $body):bool=>
                    sendLocalMail($to,$subject,$body),
                $at
            );
            $attempted++;
            if($result==='SMTP_ACCEPTED')$accepted++;
        }
    }finally{
        $pdo->query("SELECT RELEASE_LOCK('jrei-original-news-digest-single')");
    }
    fwrite(STDOUT,'JREI original News digest: queued='.$queued.
       '; idempotent='.$already.'; SMTP attempts='.$attempted.
       '; SMTP accepted='.$accepted.'; no inbox acceptance claimed.'.PHP_EOL);
}catch(Throwable $e){
    fwrite(STDERR,"JREI original News digest requires technical reconciliation.\n");
    exit(1);
}
