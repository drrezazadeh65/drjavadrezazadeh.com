<?php
declare(strict_types=1);
/**
 * Transactional replacement of per-account JREI news topic preferences.
 * Uses ORIGINAL mother DB account lock and existing eco_* consent/suppression.
 * No separate email list. Source only; not yet loaded by the live site.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/topic-newsletter.php';

function jrNewsReplaceTopicPreferences(
    PDO $pdo,string $verifiedAccountId,array $topics,
    string $mode,string $locale,string $channel,
    callable $currentEcoConsentResolver,
    callable $suppressExistingPendingNewsOutbox,
    int $nowEpoch
): array {
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$verifiedAccountId)||
        !jrNewsDigestValid($mode)||
        !in_array($locale,['fa','en'],true)||
        !in_array($channel,['EMAIL','DASHBOARD'],true)||
        $nowEpoch<=0||count($topics)>14||
        count($topics)!==count(array_unique($topics))) {
        throw new InvalidArgumentException('news_preference_replace_invalid');
    }
    foreach ($topics as $topic) {
        if (!is_string($topic)||!jrNewsTopicValid($topic))
            throw new InvalidArgumentException('news_preference_topic_invalid');
    }
    $pdo->beginTransaction();
    try {
        // Account-level serial lock prevents two concurrent tab submissions
        // from independently overwriting different sets of selections.
        $stmt=$pdo->prepare(
            'SELECT id,status,email_verified_at FROM customer_accounts
             WHERE id=? FOR UPDATE'
        );
        $stmt->execute([$verifiedAccountId]);
        $account=$stmt->fetch(PDO::FETCH_ASSOC);
        if (!$account || $account['status']!=='active' ||
            empty($account['email_verified_at'])) {
            throw new RuntimeException('news_account_not_verified');
        }
        $consent=$currentEcoConsentResolver($verifiedAccountId,
            'NEWSLETTER',$channel);
        if (!is_array($consent)||
            ($consent['source']??null)!=='EXISTING_ECO_CONSENT'||
            ($consent['granted']??null)!==true||
            ($consent['withdrawn']??null)!==false||
            !is_string($consent['reference']??null)||
            strlen($consent['reference'])>100) {
            throw new RuntimeException('news_opt_in_not_current');
        }
        $stmt=$pdo->prepare(
            "UPDATE jrei_news_topic_follows SET follow_state='WITHDRAWN',
                    updated_at=?
             WHERE account_id=? AND channel_code=? AND follow_state='ACTIVE'"
        );
        $stmt->execute([$nowEpoch,$verifiedAccountId,$channel]);
        if ($topics) {
            $stmt=$pdo->prepare(
                "INSERT INTO jrei_news_topic_follows
                  (follow_id,account_id,topic_code,locale_code,digest_mode,
                   channel_code,consent_reference,follow_state,updated_at)
                 VALUES(?,?,?,?,?,?,?,'ACTIVE',?)
                 ON DUPLICATE KEY UPDATE locale_code=VALUES(locale_code),
                  digest_mode=VALUES(digest_mode),
                  consent_reference=VALUES(consent_reference),
                  follow_state='ACTIVE',updated_at=VALUES(updated_at)"
            );
            foreach ($topics as $topic) {
                $stmt->execute([jrNewsTopicUuid(),$verifiedAccountId,
                    $topic,$locale,$mode,$channel,
                    $consent['reference'],$nowEpoch]);
            }
        }
        // Original outbox must suppress previously queued news digests.
        // This callback must be an internal same-transaction function and
        // must NOT suppress unrelated account/security notifications.
        $suppressed=$suppressExistingPendingNewsOutbox(
            $pdo,$verifiedAccountId,'JREI_NEWSLETTER',$channel,null
        );
        if (!is_int($suppressed)||$suppressed<0) {
            throw new RuntimeException('news_eco_suppression_unconfirmed');
        }
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-preferences-replaced.v1',
            'state'=>$topics?'ACTIVE':'WITHDRAWN',
            'accountId'=>$verifiedAccountId,
            'selectedTopics'=>$topics,'digestMode'=>$mode,
            'channel'=>$channel,
            'suppressedOldPending'=>$suppressed,
            'emailDelivered'=>false];
    }catch(Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
