<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED') && PHP_SAPI!=='cli') { http_response_code(404); exit; }
/**
 * Transactional mail worker: no email unless bank payment claimed and revalidated.
 * No buyer identity is ever included in author notification body.
 * Retries are bounded and status is observable in the author panel.
 */
function jrPubProcessOutbox(PDO $pdo, string $orderId): int {
    if(!validUuid($orderId)||!mailReady())return 0;
    $s=$pdo->prepare("SELECT o.id,o.customer_email,o.amount_toman,o.items_json
      FROM commerce_orders o JOIN commerce_payment_claims p ON p.order_id=o.id
      AND p.provider='bitpay' AND p.transaction_id=o.provider_trans_id
      AND p.verified_amount=o.provider_amount
      WHERE o.id=? AND o.state='paid' AND o.currency='IRT' AND o.paid_at IS NOT NULL");
    $s->execute([$orderId]);$order=$s->fetch(PDO::FETCH_ASSOC);if(!$order)return 0;
    $items=json_decode((string)$order['items_json'],true);
    if(!is_array($items)||count($items)!==1||($items[0]['sku']??null)!==JR_PUB_SKU||
       (int)$order['amount_toman']!==1000000)return 0;
    $x=$items[0];$success=0;
    for($i=0;$i<2;$i++){
      try {
        $pdo->beginTransaction();
        $a=$pdo->prepare("SELECT id,event_type,attempts FROM publishing_notification_outbox
         WHERE order_id=? AND event_type IN('buyer_paid','author_sale')
           AND ((status IN('queued','retry') AND next_attempt_at<=NOW()) OR
                (status='processing' AND next_attempt_at<=NOW()))
           ORDER BY created_at ASC LIMIT 1 FOR UPDATE");
        $a->execute([$orderId]);$notice=$a->fetch(PDO::FETCH_ASSOC);
        if(!$notice){$pdo->commit();break;}
        $attempts=(int)$notice['attempts']+1;
        $pdo->prepare("UPDATE publishing_notification_outbox
           SET status='processing', attempts=?,next_attempt_at=DATE_ADD(NOW(),INTERVAL 15 MINUTE)
           WHERE id=?")->execute([$attempts,$notice['id']]);
        $pdo->commit();
        $type=(string)$notice['event_type'];$recipient='';$subject='';$body='';
        if($type==='buyer_paid'){
          $recipient=(string)$order['customer_email'];
          $q=$pdo->prepare("SELECT g.id,a.logical_kind FROM publishing_digital_access_grants g
             JOIN publishing_private_assets a ON a.id=g.asset_id
             WHERE g.order_id=? AND g.revoked_at IS NULL AND g.expires_at>NOW()
             ORDER BY a.logical_kind");
          $q->execute([$orderId]);$grants=$q->fetchAll(PDO::FETCH_ASSOC);
          if(count($grants)!==2)throw new RuntimeException('missing_two_download_grants');
          $pepper=(string)(cfg()['auth_pepper']??'');
          if(strlen($pepper)<32)throw new RuntimeException('digital_key_unavailable');
          $links=[];
          foreach($grants as $g){
            $id=(string)$g['id'];
            $token=hash_hmac('sha256','jr-publishing-download-v1|'.$id,$pepper);
            $label=$g['logical_kind']==='question_pdf'?'سؤالات تخصصی':'پاسخنامه تشریحی';
            $links[]=$label.': '.SITE_ORIGIN.'/api/publishing/download?grant='.$id.'&token='.$token;
          }
          $subject='دریافت مجموعه دیجیتال کارشناسی ارشد آموزش زبان انگلیسی | سفارش تأییدشده';
          $body="خرید شما پس از تأیید درگاه ثبت شد.\n\nشناسه سفارش: ".$orderId."\n"
           ."مبلغ: ۱٬۰۰۰٬۰۰۰ تومان\n\n".implode("\n\n",$links)
           ."\n\nپیوندها تا ۷ روز معتبرند و هر فایل حداکثر ۵ بار دریافت می‌شود."
           ."\nاگر دریافت انجام نشد، شناسه سفارش خود را به پشتیبانی رسمی سایت اعلام کنید."
           ."\n\nاین رسید پرداخت است، نه صورتحساب رسمی مالیاتی.";
        } elseif($type==='author_sale'){
          $q=$pdo->prepare("SELECT acc.email,a.display_name_fa FROM publishing_offers f
            JOIN publishing_works w ON w.id=f.work_id
            JOIN publishing_authors a ON a.id=w.author_id
            JOIN publishing_author_accounts l ON l.author_id=a.id AND l.role='author'
              AND l.approved_at IS NOT NULL AND l.revoked_at IS NULL
            JOIN customer_accounts acc ON acc.id=l.account_id AND acc.status='active'
              AND acc.email_verified_at IS NOT NULL
            WHERE f.id=? AND a.id=? ORDER BY l.created_at LIMIT 1");
          $q->execute([(string)$x['offerId'],(string)$x['authorId']]);
          $person=$q->fetch(PDO::FETCH_ASSOC);
          if(!$person)throw new RuntimeException('author_email_unavailable');
          $recipient=(string)$person['email'];
          require_once __DIR__.'/jr-publishing-notifications.php';
          $noticeBody=jrPublishingAuthorSaleNotice([
            'provider_verified'=>true,
            'safe_sale_reference'=>substr(hash('sha256','jr-pub-privacy-v1|'.$orderId),0,12),
            'gross_toman'=>1000000,'author_toman'=>600000,
            'talent_fund_toman'=>400000,'operating_reserve_toman'=>70000
          ],(string)$person['display_name_fa']);
          $subject=$noticeBody['subject'];$body=$noticeBody['body'];
        }
        if(!filter_var($recipient,FILTER_VALIDATE_EMAIL)||$body==='')throw new RuntimeException('email_destination_unavailable');
        $sent=sendLocalMail($recipient,$subject,$body);
        if(!$sent)throw new RuntimeException('smtp_send_failed');
        $pdo->prepare("UPDATE publishing_notification_outbox SET status='sent',sent_at=NOW()
            WHERE id=? AND status='processing'")->execute([$notice['id']]);
        ++$success;
      }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        error_log('Publishing email outbox error '.get_class($e));
        if(isset($notice['id'])){
          try{
            $wait=min(1440,5*(2**min(8,(int)($notice['attempts']??0))));
            $status=(int)($notice['attempts']??0)+1>=6?'dead_letter':'retry';
            $pdo->prepare("UPDATE publishing_notification_outbox
               SET status=?,next_attempt_at=DATE_ADD(NOW(),INTERVAL ".$wait." MINUTE)
               WHERE id=? AND status='processing'")->execute([$status,$notice['id']]);
          }catch(Throwable $ignore){}
        }
      }
    }
    return $success;
}
