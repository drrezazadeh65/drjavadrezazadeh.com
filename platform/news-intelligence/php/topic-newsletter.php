<?php
declare(strict_types=1);
/**
 * Source-only news topic segmentation using original eco notification consent.
 * NOT routed until owner-approved final integration, no SMTP send.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
function jrNewsTopicValid(string $topic): bool {
    return in_array($topic,[
        'ARTICLES','SCHOOL','EXAMINATIONS','RESULTS','UNIVERSITIES',
        'EMPLOYMENT','LANGUAGE','SCHOLARSHIPS','INTERNATIONAL',
        'RESEARCH','EDTECH','TALENT','TEACHER_EDUCATION','EVENTS'
    ],true);
}
function jrNewsDigestValid(string $mode): bool {
    return in_array($mode,['URGENT','DAILY','WEEKLY','EXAM_ONLY'],true);
}
function jrNewsSaveTopicPreference(PDO $pdo,string $authenticatedAccountId,
    string $topic,string $mode,string $locale,string $channel,
    callable $currentEcoConsentResolver,int $nowEpoch): array {
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$authenticatedAccountId) ||
        !jrNewsTopicValid($topic) || !jrNewsDigestValid($mode) ||
        !in_array($locale,['fa','en'],true) ||
        !in_array($channel,['EMAIL','DASHBOARD'],true) ||
        $nowEpoch<=0) {
        throw new InvalidArgumentException('news_topic_preference_invalid');
    }
    // accountId must be derived from the original authenticated session,
    // never taken from a public request. Consent resolver reads existing
    // eco_consent_records and current suppression/unsubscribe policy.
    $consent=$currentEcoConsentResolver($authenticatedAccountId,'NEWSLETTER',$channel);
    if (!is_array($consent) || ($consent['granted']??null)!==true ||
        ($consent['withdrawn']??null)!==false ||
        !is_string($consent['reference']??null) ||
        strlen($consent['reference'])>100) {
        throw new RuntimeException('news_topic_consent_missing');
    }
    $followId=jrNewsTopicUuid();
    $stmt=$pdo->prepare(
        "INSERT INTO jrei_news_topic_follows
           (follow_id,account_id,topic_code,locale_code,digest_mode,channel_code,
            consent_reference,follow_state,updated_at)
         VALUES(?,?,?,?,?,?,?,'ACTIVE',?)
         ON DUPLICATE KEY UPDATE locale_code=VALUES(locale_code),
           consent_reference=VALUES(consent_reference),
           follow_state='ACTIVE',updated_at=VALUES(updated_at)"
    );
    $stmt->execute([$followId,$authenticatedAccountId,$topic,$locale,$mode,
        $channel,$consent['reference'],$nowEpoch]);
    return ['state'=>'ACTIVE','topic'=>$topic,'mode'=>$mode,
        'notificationSent'=>false,'source'=>'MOTHER_NEWS_TOPIC_SEGMENT'];
}
function jrNewsTopicUuid(): string {
    $b=random_bytes(16);
    $b[6]=chr((ord($b[6])&15)|64);
    $b[8]=chr((ord($b[8])&63)|128);
    $h=bin2hex($b);
    return substr($h,0,8).'-'.substr($h,8,4).'-'.
        substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20,12);
}
function jrNewsWithdrawTopics(PDO $pdo,string $authenticatedAccountId,
    ?string $topic,int $nowEpoch,
    callable $suppressExistingPendingNewsOutbox): array {
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$authenticatedAccountId) ||
        ($topic!==null&&!jrNewsTopicValid($topic)) || $nowEpoch<=0) {
        throw new InvalidArgumentException('news_topic_withdrawal_invalid');
    }
    $pdo->beginTransaction();
    try {
        $lock=$pdo->prepare(
            'SELECT id FROM customer_accounts WHERE id=? FOR UPDATE'
        );
        $lock->execute([$authenticatedAccountId]);
        if (!$lock->fetchColumn()) {
            throw new RuntimeException('news_withdrawal_account_missing');
        }
        if ($topic===null) {
            $stmt=$pdo->prepare(
                "UPDATE jrei_news_topic_follows
                 SET follow_state='WITHDRAWN',updated_at=?
                 WHERE account_id=? AND follow_state='ACTIVE'"
            );
            $stmt->execute([$nowEpoch,$authenticatedAccountId]);
        } else {
            $stmt=$pdo->prepare(
                "UPDATE jrei_news_topic_follows
                 SET follow_state='WITHDRAWN',updated_at=?
                 WHERE account_id=? AND topic_code=? AND follow_state='ACTIVE'"
            );
            $stmt->execute([$nowEpoch,$authenticatedAccountId,$topic]);
        }
        $changed=$stmt->rowCount();
        // Suppression callback MUST participate in this SAME PDO transaction.
        // Any ambiguous/failed response aborts preference updates.
        $suppressed=$suppressExistingPendingNewsOutbox(
            $pdo,$authenticatedAccountId,'JREI_NEWSLETTER','EMAIL',$topic
        );
        if (!is_int($suppressed)||$suppressed<0) {
            throw new RuntimeException('news_original_outbox_suppression_failed');
        }
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-withdrawal.v1',
            'state'=>'WITHDRAWN','affectedRows'=>$changed,
            'suppressedPendingNotifications'=>$suppressed,
            'newsletterMailNotDeliveredByThisCall'=>true];
    }catch(Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
/** Prepare one bounded recipient batch, but do not send email directly. */
function jrNewsTopicSubscribers(PDO $pdo,string $topic,string $mode,
    int $limit=100): array {
    if (!jrNewsTopicValid($topic) || !jrNewsDigestValid($mode) ||
        $limit<1 || $limit>200) {
        throw new InvalidArgumentException('news_topic_audience_invalid');
    }
    $stmt=$pdo->prepare(
        "SELECT f.account_id,f.locale_code,f.channel_code,
                f.consent_reference
         FROM jrei_news_topic_follows f
         JOIN customer_accounts a ON a.id=f.account_id
         WHERE f.topic_code=? AND f.digest_mode=?
           AND f.follow_state='ACTIVE' AND a.status='active'
           AND a.email_verified_at IS NOT NULL
         ORDER BY f.updated_at DESC LIMIT ?"
    );
    $stmt->bindValue(1,$topic,PDO::PARAM_STR);
    $stmt->bindValue(2,$mode,PDO::PARAM_STR);
    $stmt->bindValue(3,$limit,PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
