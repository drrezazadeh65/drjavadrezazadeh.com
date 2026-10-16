<?php
declare(strict_types=1);
/**
 * Existing mother-database newsletter queue — at-most-one SMTP submission.
 * Do not include this as a public API or a cron-ready mailer without separately
 * verifying backup, private SMTP, consent, editorial approval and live inbox.
 * No automatic retry of ambiguous SMTP attempts (avoids duplicate campaigns).
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsletterOutboundSchemaReady(PDO $pdo): bool {
    if(!jrNewsletterSchemaReady($pdo))return false;
    try {
        foreach(['eco_notification_attempts','eco_object_refs'] as $t)
            $pdo->query('SELECT 1 FROM '.$t.' LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}

/** Limit to already published site content, pinned by the administrator. */
function jrNewsletterPublishedPage(array $object,string $topic): ?array {
    if(!in_array($topic,jrNewsletterTopics(),true)||
       ($object['storage_provider']??'')!=='JR_NEWSLETTER_PUBLISHED_PAGE'||
       ($object['data_class']??'')!=='PUBLIC'||
       ($object['mime_type']??'')!=='text/html')return null;
    $path=$object['object_reference']??null;
    if(!is_string($path)||strlen($path)>100||
       !preg_match('#^/[a-z0-9][a-z0-9/-]*/$#D',$path)||
       str_contains($path,'//')||str_contains($path,'/../'))return null;
    // The first source-safe delivery series is approved published articles only.
    // Other six-topic programme feeds cannot inherit this approval.
    if($topic!=='ARTICLES'||!str_starts_with($path,'/fa/akhbar/'))return null;
    $site=realpath(dirname(__DIR__));
    if(!$site)return null;
    $file=realpath($site.$path.'index.html');
    if(!$file||!str_starts_with($file,$site.DIRECTORY_SEPARATOR)||
       !is_file($file)||is_link($file)||filesize($file)>1000000)return null;
    $html=file_get_contents($file);
    if(!is_string($html)||!hash_equals((string)($object['content_sha256']??''),hash('sha256',$html)))return null;
    $url=SITE_ORIGIN.$path;
    $news=@file_get_contents($site.'/sitemap-news.xml');
    if(!is_string($news)||!str_contains($news,'<loc>'.$url.'</loc>')||
       !str_contains($html,'<link rel="canonical" href="'.$url.'"')||
       preg_match('/<meta[^>]+name=["\x27]robots["\x27][^>]+content=["\x27][^"\x27]*noindex/i',$html))
        return null;
    if(!preg_match('/<title>(.*?)<\/title>/is',$html,$m))return null;
    $title=trim(html_entity_decode(strip_tags($m[1]),ENT_QUOTES|ENT_HTML5,'UTF-8'));
    $title=preg_replace('/[\x00-\x1F\x7F]+/u',' ',$title);
    if($title===''||strlen($title)>250)return null;
    return ['url'=>$url,'title'=>$title,'locale'=>'fa'];
}

/**
 * Reserve before calling SMTP. A crash may leave RESERVED; that state is
 * intentionally not retried automatically because SMTP delivery is uncertain.
 */
function jrNewsletterReserve(PDO $pdo,string $notificationId): bool {
    $pdo->beginTransaction();
    try{
        $up=$pdo->prepare("UPDATE eco_notifications SET delivery_state='RESERVED'
          WHERE id=? AND delivery_state='PENDING' AND channel_code='EMAIL'");
        $up->execute([$notificationId]);
        if($up->rowCount()!==1){$pdo->rollBack();return false;}
        $ins=$pdo->prepare("INSERT INTO eco_notification_attempts
          (id,notification_id,attempt_no,provider_code,result_code,attempted_at)
          VALUES(?,?,1,'BERTINA_SMTP','RESERVED',?)");
        $ins->execute([uuidv4(),$notificationId,gmdate('Y-m-d H:i:s').'.000']);
        $pdo->commit();return true;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}

/** Send one previously reserved email with consent row locked until SMTP replies. */
function jrNewsletterSendReserved(PDO $pdo,string $id,callable $transport): string {
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare("SELECT n.id,n.purpose_code,n.delivery_state,n.recipient_account_id,
            a.email_normalized,a.email_verified_at,a.status AS account_status,
            p.opted_in,p.consent_record_id,c.decision,c.withdrawn_at,
            o.storage_provider,o.object_reference,o.content_sha256,o.mime_type,o.data_class
          FROM eco_notifications n
          JOIN customer_accounts a ON a.id=n.recipient_account_id
          LEFT JOIN eco_notification_preferences p
            ON p.account_id=n.recipient_account_id AND p.channel_code='EMAIL'
               AND p.purpose_code=n.purpose_code
          LEFT JOIN eco_consent_records c ON c.id=p.consent_record_id
          LEFT JOIN eco_object_refs o ON o.id=n.message_object_id
          WHERE n.id=? AND n.channel_code='EMAIL'
          FOR UPDATE");
        $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!$row||$row['delivery_state']!=='RESERVED'){ $pdo->rollBack();return 'NOT_RESERVED'; }
        $consent=($row['account_status']==='active'&&!empty($row['email_verified_at'])&&
          (int)$row['opted_in']===1&&$row['decision']==='GRANTED'&&
          $row['withdrawn_at']===null&&
          filter_var($row['email_normalized'],FILTER_VALIDATE_EMAIL)!==false);
        $page=$consent?jrNewsletterPublishedPage($row,(string)$row['purpose_code']):null;
        if(!$consent||!$page){
            $state=$consent?'SOURCE_BLOCKED':'SUPPRESSED';
            $pdo->prepare('UPDATE eco_notifications SET delivery_state=? WHERE id=?')->execute([$state,$id]);
            $pdo->prepare('UPDATE eco_notification_attempts SET result_code=? WHERE notification_id=? AND attempt_no=1')
              ->execute([$state,$id]);
            $pdo->commit();return $state;
        }
        require_once __DIR__.'/newsletter-unsubscribe.php';
        $optout=jrNewsletterUnsubscribeUrl((string)$row['recipient_account_id'],
                    (string)$row['email_normalized'],$page['locale']);
        $subject='انتشار مطلب جدید | Dr. Javad Rezazadeh';
        $body="مطلب جدید در وب‌سایت منتشر شده است.\n\n".$page['title']."\n".$page['url'].
          "\n\nبرای لغو خبرنامه (تأیید لازم است):\n".$optout.
          "\n\nA new publication is available on the official website.\n".
          "To stop optional newsletter emails, confirm the unsubscribe link above.\n";
        // No automatic retry even on SMTP failure; no fictitious delivery claim.
        $accepted=false;
        try{$accepted=$transport((string)$row['email_normalized'],$subject,$body)===true;}
        catch(Throwable $ignored){$accepted=false;}
        $state=$accepted?'SMTP_ACCEPTED':'SMTP_FAILED';
        $pdo->prepare('UPDATE eco_notifications SET delivery_state=? WHERE id=? AND delivery_state=?')
          ->execute([$state,$id,'RESERVED']);
        $pdo->prepare('UPDATE eco_notification_attempts
          SET result_code=? WHERE notification_id=? AND attempt_no=1')
          ->execute([$state,$id]);
        $pdo->commit();return $state;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}

function jrNewsletterDispatchOne(PDO $pdo,string $id,callable $transport): string {
    if(!validUuid($id)||!jrNewsletterOutboundSchemaReady($pdo))
        throw new RuntimeException('newsletter_queue_unavailable');
    if(!jrNewsletterReserve($pdo,$id))return 'ALREADY_HANDLED';
    return jrNewsletterSendReserved($pdo,$id,$transport);
}
