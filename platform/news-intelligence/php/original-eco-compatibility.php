<?php
declare(strict_types=1);
/**
 * REAL existing eco consent read and pending suppression compatibility.
 * This file reuses the original ARTICLES purpose; the 14 news subtopics
 * only segment consented ARTICLES updates, never create implicit opt-in.
 *
 * Legacy newsletter-delivery.php accepts ONE published Persian /fa/akhbar/
 * page per email. It does NOT implement personalized 20-item digests or
 * multi-day EXAM_REMINDERS. Those require original eco worker extensions
 * before activating the corresponding JREI News Cron jobs.
 *
 * Source only; not yet loaded by api/index.php.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {http_response_code(404);exit;}

function jrNewsReadOriginalArticlesConsent(
    PDO $pdo,string $accountId,string $purpose,string $channel
): array {
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$accountId)||
        $purpose!=='ARTICLES'||$channel!=='EMAIL') {
        return ['source'=>'EXISTING_ECO_CONSENT',
            'granted'=>false,'withdrawn'=>true,
            'reference'=>null,'supported'=>false];
    }
    $q=$pdo->prepare(
        "SELECT p.opted_in,p.consent_record_id,
                c.decision,c.withdrawn_at
         FROM eco_notification_preferences p
         JOIN eco_consent_records c ON c.id=p.consent_record_id
         JOIN customer_accounts a ON a.id=p.account_id
         WHERE p.account_id=? AND p.channel_code='EMAIL'
           AND p.purpose_code='ARTICLES'
           AND a.status='active' AND a.email_verified_at IS NOT NULL
         LIMIT 1"
    );
    $q->execute([$accountId]);
    $r=$q->fetch(PDO::FETCH_ASSOC);
    $reference=is_array($r)?($r['consent_record_id']??null):null;
    $granted=is_array($r)&&(int)$r['opted_in']===1&&
        $r['decision']==='GRANTED'&&$r['withdrawn_at']===null&&
        is_string($reference)&&preg_match('/^[a-f0-9-]{36}$/iD',$reference);
    return [
        'source'=>'EXISTING_ECO_CONSENT',
        'purpose'=>'ARTICLES',
        'granted'=>(bool)$granted,
        'withdrawn'=>!$granted,
        'reference'=>$granted?$reference:null,
        'supported'=>true,
        'newNewsDigestMailerActive'=>false,
        'noSecondaryConsentDatabase'=>true
    ];
}

/**
 * Called within the topic-preferences transaction. Legacy pending ARTICLES
 * deliveries are suppressed conservatively, as that worker cannot identify
 * independent 14-topic message segments. Already attempted SMTP is never
 * retried or falsely reported as recalled.
 */
function jrNewsSuppressOriginalArticlesPending(
    PDO $pdo,string $accountId,string $purpose,
    string $channel,?string $topic
): int {
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$accountId)||
        $purpose!=='ARTICLES'||$channel!=='EMAIL'||
        ($topic!==null&&!jrNewsTopicValid($topic))) {
        throw new InvalidArgumentException('news_eco_suppress_invalid_scope');
    }
    if(!function_exists('jrNewsletterSuppressPending')) {
        throw new RuntimeException('news_original_newsletter_suppress_not_loaded');
    }
    return jrNewsletterSuppressPending($pdo,$accountId,['ARTICLES']);
}

/**
 * Diagnostic capability manifest: does not probe mail provider or modify
 * any user records. Lack of an original news-specific sender must remain
 * visible to the owner instead of reported as a successful delivery.
 */
function jrNewsExistingEcoCompatibilityCapabilities(): array {
    return [
        'schema'=>'jr.jrei.news-original-eco-capabilities.v1',
        'originalArticlesPurpose'=>'ARTICLES',
        'originalNewsTopics'=>'SEGMENTED_ONLY_AFTER_ARTICLES_CONSENT',
        'legacyPersianSingleArticleSupport'=>true,
        'legacySourceRestriction'=>'PUBLISHED_FA_AKHBAR_IN_NEWS_SITEMAP',
        'personalizedBilingualDigestWorkerAvailable'=>false,
        'examReminderSenderAvailable'=>false,
        'ownerEditorialEmailSenderAvailableViaLegacyNewsletter'=>false,
        'requiresOriginalEcoWorkerExtension'=>true,
        'liveEmailSentByThisReadModel'=>false
    ];
}
