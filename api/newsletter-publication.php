<?php
declare(strict_types=1);
/**
 * Existing owner-MFA operations route is the ONLY publication approval caller.
 * This records owner-authorized, sitemap-listed published ARTICLES; it never
 * makes draft JHELA, research, payment or transactional mail into marketing.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsletterArticleProof(string $path): ?array {
    if(strlen($path)>100||!preg_match('#^/fa/akhbar/[a-z0-9-]{3,70}/$#D',$path))return null;
    $base=realpath(dirname(__DIR__));
    if(!$base)return null;
    $file=realpath($base.$path.'index.html');
    if(!$file||!str_starts_with($file,$base.DIRECTORY_SEPARATOR)||!is_file($file)||
       filesize($file)>1000000)return null;
    $source=file_get_contents($file);
    if(!is_string($source))return null;
    $meta=['storage_provider'=>'JR_NEWSLETTER_PUBLISHED_PAGE',
       'object_reference'=>$path,'content_sha256'=>hash('sha256',$source),
       'mime_type'=>'text/html','data_class'=>'PUBLIC'];
    $result=jrNewsletterPublishedPage($meta,'ARTICLES');
    return $result?['meta'=>$meta,'size'=>strlen($source),'article'=>$result]:null;
}

function jrNewsletterApproveArticle(PDO $pdo,string $path,string $actorId): array {
    if(getenv('JR_NEWSLETTER_EDITORIAL_APPROVED')!=='true')
        throw new RuntimeException('editorial_approval_not_configured');
    if(!jrNewsletterOutboundSchemaReady($pdo)||!validUuid($actorId))
        throw new RuntimeException('newsletter_queue_unavailable');
    $pdo->query('SELECT id FROM eco_outbox_events LIMIT 0');
    $proof=jrNewsletterArticleProof($path);
    if(!$proof)throw new InvalidArgumentException('article_not_verified_published');
    $key='NEWSLETTER_ARTICLES:'.hash('sha256',$path.'|'.$proof['meta']['content_sha256']);
    $now=gmdate('Y-m-d H:i:s').'.000';
    $pdo->beginTransaction();
    try{
        $old=$pdo->prepare('SELECT id FROM eco_outbox_events WHERE event_key=? FOR UPDATE');
        $old->execute([$key]);
        if($old->fetchColumn()){
            $pdo->rollBack();return ['state'=>'ALREADY_APPROVED','queued'=>0];
        }
        $ex=$pdo->prepare("SELECT id,content_sha256 FROM eco_object_refs
           WHERE storage_provider='JR_NEWSLETTER_PUBLISHED_PAGE' AND object_reference=? FOR UPDATE");
        $ex->execute([$path]);$obj=$ex->fetch(PDO::FETCH_ASSOC);
        if($obj){
            if(!hash_equals((string)$obj['content_sha256'],$proof['meta']['content_sha256']))
                throw new RuntimeException('published_article_revision_conflict');
            $objectId=(string)$obj['id'];
        }else{
            $objectId=uuidv4();
            $pdo->prepare("INSERT INTO eco_object_refs
             (id,storage_provider,object_reference,content_sha256,mime_type,byte_size,
              data_class,malware_scan_status)
             VALUES(?,'JR_NEWSLETTER_PUBLISHED_PAGE',?,?,'text/html',?,'PUBLIC','NOT_APPLICABLE')")
             ->execute([$objectId,$path,$proof['meta']['content_sha256'],$proof['size']]);
        }
        $eventId=uuidv4();
        $pdo->prepare("INSERT INTO eco_outbox_events
          (id,event_key,topic,subject_ref,payload_reference,state,created_at)
          VALUES(? ,?,'NEWSLETTER_ARTICLES',?,?,'APPROVED',?)")
          ->execute([$eventId,$key,$path,$objectId,$now]);
        $eligible=$pdo->query("SELECT p.account_id
          FROM eco_notification_preferences p
          JOIN customer_accounts a ON a.id=p.account_id
          JOIN eco_consent_records c ON c.id=p.consent_record_id
          WHERE p.purpose_code='ARTICLES' AND p.channel_code='EMAIL'
             AND p.opted_in=1 AND c.decision='GRANTED' AND c.withdrawn_at IS NULL
             AND a.status='active' AND a.email_verified_at IS NOT NULL
          ORDER BY p.account_id ASC LIMIT 251")->fetchAll(PDO::FETCH_COLUMN);
        // Bounded transaction: never silently enqueue only part of an audience.
        if(count($eligible)>250)throw new RuntimeException('newsletter_batch_capacity_reached');
        $ins=$pdo->prepare("INSERT INTO eco_notifications
          (id,recipient_account_id,channel_code,purpose_code,message_object_id,
           delivery_state,idempotency_key,created_at)
          VALUES(?,?,'EMAIL','ARTICLES',?,'PENDING',?,?)");
        foreach($eligible as $accountId){
            $ins->execute([uuidv4(),$accountId,$objectId,
                hash('sha256',$eventId.'|'.$accountId),$now]);
        }
        operationsAudit($pdo,$actorId,'newsletter_article_approved',$eventId);
        $pdo->commit();
        return ['state'=>'APPROVED','eventId'=>$eventId,'queued'=>count($eligible),
            'smtpDelivered'=>false,'mailboxDelivered'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

function jrNewsletterOperatorSummary(PDO $pdo): array {
    if(!jrNewsletterOutboundSchemaReady($pdo))throw new RuntimeException('newsletter_queue_unavailable');
    $campaigns=$pdo->query("SELECT e.id,e.subject_ref,e.created_at,e.state,
        (SELECT COUNT(*) FROM eco_notifications n WHERE n.message_object_id=e.payload_reference
           AND n.purpose_code='ARTICLES' AND n.delivery_state='PENDING') AS pending_count,
        (SELECT COUNT(*) FROM eco_notifications n WHERE n.message_object_id=e.payload_reference
           AND n.purpose_code='ARTICLES' AND n.delivery_state='SMTP_ACCEPTED') AS smtp_accepted_count,
        (SELECT COUNT(*) FROM eco_notifications n WHERE n.message_object_id=e.payload_reference
           AND n.purpose_code='ARTICLES' AND n.delivery_state IN ('SMTP_FAILED','RESERVED','SOURCE_BLOCKED')) AS attention_count
        FROM eco_outbox_events e WHERE e.topic='NEWSLETTER_ARTICLES'
        ORDER BY e.created_at DESC LIMIT 30")->fetchAll(PDO::FETCH_ASSOC);
    return ['ok'=>true,'schema'=>'newsletter-editorial-queue-v1',
        'editorialApprovalConfigured'=>getenv('JR_NEWSLETTER_EDITORIAL_APPROVED')==='true',
        'smtpWorkerConfigured'=>getenv('JR_NEWSLETTER_DELIVERY_ENABLED')==='true',
        'smtpDeliveryVerified'=>false,'mailboxDeliveryVerified'=>false,
        'campaigns'=>$campaigns,'privateAccountDetailsIncluded'=>false];
}
