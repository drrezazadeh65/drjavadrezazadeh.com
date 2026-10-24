<?php
declare(strict_types=1);
/**
 * Prepare one owner-only editorial email through ORIGINAL eco notification
 * infrastructure. The message links to the private MFA dashboard; it
 * contains NO magic approval URL and cannot itself publish an article.
 *
 * No mail transmission, public endpoint or independent address book.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/owner-editorial.php';
require_once __DIR__.'/owner-preview.php';

function jrNewsQueueOwnerEditorialReviewNotice(
    PDO $pdo,array $ownerSession,string $revisionId,
    callable $originalOwnerAddressReader,
    callable $originalEcoNotificationQueue,
    int $nowEpoch
): array {
    $owner=jrNewsOwnerAuthority($ownerSession);
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$revisionId) ||
        $nowEpoch<=0)throw new InvalidArgumentException('news_owner_mail_invalid');
    $preview=jrNewsPrivateOwnerPreview($pdo,$ownerSession,$revisionId);
    if ($preview['state']!=='PENDING_OWNER_APPROVAL')
        throw new RuntimeException('news_owner_notice_revision_no_longer_pending');
    $mailbox=$originalOwnerAddressReader($owner['actor']);
    if (!is_array($mailbox) ||
        ($mailbox['source']??null)!=='ORIGINAL_VERIFIED_OWNER_ACCOUNT' ||
        ($mailbox['ownerAccountId']??null)!==$owner['actor'] ||
        ($mailbox['emailVerified']??null)!==true ||
        ($mailbox['ownerEditorialNoticesAllowed']??null)!==true ||
        filter_var($mailbox['email']??null,FILTER_VALIDATE_EMAIL)===false) {
        throw new RuntimeException('news_owner_approved_email_unavailable');
    }
    $faHeadline=$preview['fa']['headline'];
    $enHeadline=$preview['en']['headline'];
    $source=$preview['sourceUrl'];
    $safeRoute='https://drjavadrezazadeh.com/fa/app/admin/';
    $body="JREI | پیش‌نمایش خبر برای تأیید مالک\n\n".
        $faHeadline."\n\n".$preview['fa']['summary']."\n\n".
        "English title: ".$enHeadline."\n\n".
        $preview['en']['summary']."\n\n".
        "منبع رسمی: ".$source."\n\n".
        "برای مشاهده متن کامل و تأیید با احراز هویت چندمرحله‌ای، ".
        "وارد داشبورد شوید:\n".$safeRoute."\n\n".
        "این ایمیل به‌تنهایی مجوز انتشار نیست.";
    if (strlen($body)>9000)
        throw new RuntimeException('news_owner_mail_preview_too_long');
    $message=[
        'schema'=>'jr.jrei.news-owner-email-intent.v1',
        'purpose'=>'PRIVATE_EDITORIAL_OWNER_REVIEW',
        'ownerAccountId'=>$owner['actor'],
        'email'=>$mailbox['email'],
        'subject'=>($preview['priority']==='P0'?
            'خبر فوری نیازمند تأیید شما | JREI':
            'خبر جدید نیازمند تأیید شما | JREI'),
        'body'=>$body,
        'revisionId'=>$preview['revisionId'],
        'exactApprovalDigest'=>$preview['approvalDigest'],
        'idempotencyKey'=>hash('sha256',
            'JREI_OWNER_EDITORIAL|'.$revisionId.'|'.$preview['approvalDigest']),
        'verificationRequiredBeforeSend'=>true,
        'requiresOriginalEcoOutbox'=>true,
        'mailboxDeliveryVerified'=>false,
        'clickToPublishAllowed'=>false
    ];
    $receipt=$originalEcoNotificationQueue($message);
    if (!is_array($receipt) ||
        !in_array($receipt['status']??null,
            ['QUEUED','ALREADY_QUEUED'],true) ||
        ($receipt['source']??null)!=='ORIGINAL_ECO_NOTIFICATION_OUTBOX') {
        throw new RuntimeException('news_owner_mail_queue_not_confirmed');
    }
    return [
        'schema'=>'jr.jrei.news-owner-review-queue-receipt.v1',
        'revisionId'=>$revisionId,
        'outboxStatus'=>$receipt['status'],
        'ownerApprovalStillPending'=>true,
        'smtpDelivered'=>false,
        'publiclyPublished'=>false
    ];
}
