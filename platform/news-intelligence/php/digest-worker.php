<?php
declare(strict_types=1);
/**
 * JREI News digest queue builder — source only, NOT Cron-wired.
 * Uses existing eco_* purpose-specific consent + notification outbox; this
 * function never sends SMTP. No private drafts or unpublished URLs selected.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
function jrNewsDigestWindow(string $mode,int $now): int {
    return match ($mode) {
        'URGENT'=>$now-12*3600,
        'DAILY'=>$now-24*3600,
        'WEEKLY'=>$now-7*86400,
        'EXAM_ONLY'=>$now-7*86400,
        default=>throw new InvalidArgumentException('news_digest_mode_invalid')
    };
}
/**
 * Call from the original authenticated JREI Cron worker after consent/mail
 * acceptance. $afterAccountId pagination is essential for large newsletters.
 */
function jrNewsQueueTopicDigests(PDO $pdo,string $mode,int $nowEpoch,
    callable $currentEcoConsentResolver,callable $existingOutboxEnqueue,
    string $afterAccountId=''): array {
    if ($nowEpoch<=0 ||
        !in_array($mode,['URGENT','DAILY','WEEKLY','EXAM_ONLY'],true) ||
        strlen($afterAccountId)>36) {
        throw new InvalidArgumentException('news_digest_job_invalid');
    }
    $since=jrNewsDigestWindow($mode,$nowEpoch);
    $stmt=$pdo->prepare(
        "SELECT p.publication_id,p.fa_route,p.en_route,p.published_at,
                p.fa_content_sha256,p.en_content_sha256,
                v.bilingual_editorial_json,v.approval_digest,
                c.priority_code,c.event_type,
                m.category_code
         FROM jrei_news_publications p
         JOIN jrei_news_editorial_versions v
           ON v.revision_id=p.revision_id
         JOIN jrei_news_candidates c
           ON c.candidate_id=v.candidate_id
         JOIN jrei_news_monitors m
           ON m.monitor_id=c.monitor_id
         JOIN jrei_news_owner_decisions d
           ON d.decision_id=p.approved_decision_id
         WHERE p.publisher_state='PUBLISHED'
           AND p.published_at>=? AND p.published_at<=?
           AND d.action_code='APPROVE'
           AND v.editorial_state='OWNER_APPROVED'
           AND d.revision_id=v.revision_id
           AND d.approval_digest=v.approval_digest
           AND p.publisher_receipt_reference IS NOT NULL
           AND p.fa_content_sha256 IS NOT NULL
           AND p.en_content_sha256 IS NOT NULL
         ORDER BY p.published_at DESC LIMIT 500"
    );
    $stmt->execute([$since,$nowEpoch]);
    // Never materialize 500 large bilingual draft bodies in a PHP array,
    // or retain 500 fully decoded bodies for every subscriber. Inspect each
    // approved row once, keep only small public headline projections, and
    // discard the full draft before reading more rows.
    $articles=[];
    while(($article=$stmt->fetch(PDO::FETCH_ASSOC))!==false){
        if(!hash_equals((string)$article['approval_digest'],
            hash('sha256',(string)$article['bilingual_editorial_json'])))
            continue;
        $copy=json_decode((string)$article['bilingual_editorial_json'],true,32);
        if(!is_array($copy))continue;
        $article['headlineFa']=$copy['fa']['headline']??null;
        $article['headlineEn']=$copy['en']['headline']??null;
        unset($article['bilingual_editorial_json']);
        $articles[]=$article;
    }
    unset($article,$copy);
    // No approved articles: do not scan or lock thousands of customer
    // preferences simply to discover that no digest can be sent.
    if(!$articles){
        return [
            'schema'=>'jr.jrei.news-digest-queue.v1',
            'queued'=>0,'skipped'=>0,
            'nextAfterAccountId'=>$afterAccountId,
            'mayHaveMoreAudience'=>false,
            'actualSmtpDeliveryUnverified'=>true
        ];
    }
    // Page account IDs rather than preference rows: every selected account
    // must have ALL topic subscriptions considered in the same digest.
    $idsQuery=$pdo->prepare(
        "SELECT DISTINCT f.account_id
         FROM jrei_news_topic_follows f
         JOIN customer_accounts a ON a.id=f.account_id
         WHERE f.digest_mode=? AND f.follow_state='ACTIVE'
           AND a.status='active' AND a.email_verified_at IS NOT NULL
           AND f.account_id>?
         ORDER BY f.account_id LIMIT 51"
    );
    $idsQuery->execute([$mode,$afterAccountId]);
    $accountRows=$idsQuery->fetchAll(PDO::FETCH_COLUMN,0);
    $hasMore=count($accountRows)>50;
    $pageIds=array_slice($accountRows,0,50);
    $rows=[];
    if ($pageIds) {
        $markers=implode(',',array_fill(0,count($pageIds),'?'));
        $audience=$pdo->prepare(
            "SELECT f.account_id,f.topic_code,f.locale_code,
                    f.channel_code,f.consent_reference
             FROM jrei_news_topic_follows f
             JOIN customer_accounts a ON a.id=f.account_id
             WHERE f.digest_mode=? AND f.follow_state='ACTIVE'
               AND a.status='active' AND a.email_verified_at IS NOT NULL
               AND f.account_id IN ($markers)
             ORDER BY f.account_id,f.topic_code"
        );
        $audience->execute(array_merge([$mode],$pageIds));
        $rows=$audience->fetchAll(PDO::FETCH_ASSOC);
    }
    $grouped=[];
    foreach ($rows as $row) {
        $key=$row['account_id'].'|'.$row['locale_code'].'|'.$row['channel_code'];
        if (!isset($grouped[$key])) $grouped[$key]=[
            'accountId'=>$row['account_id'],'locale'=>$row['locale_code'],
            'channel'=>$row['channel_code'],'topicsByConsent'=>[]];
        // Do not merge topics from expired/replaced notices with the
        // subscriber's currently granted original ARTICLES consent.
        $reference=(string)$row['consent_reference'];
        if(!preg_match('/^[a-f0-9-]{36}$/iD',$reference))continue;
        $grouped[$key]['topicsByConsent'][$reference][]=$row['topic_code'];
    }
    $queued=0;$alreadyQueued=0;$skipped=0;
    $lastAccount=$pageIds?end($pageIds):$afterAccountId;
    foreach ($grouped as $subscriber) {
        $consent=$currentEcoConsentResolver(
            $subscriber['accountId'],'ARTICLES',$subscriber['channel']);
        if (!is_array($consent) ||
            ($consent['granted']??null)!==true ||
            ($consent['withdrawn']??null)!==false ||
            !is_string($consent['reference']??null) ||
            !isset($subscriber['topicsByConsent'][$consent['reference']])) {
            $skipped++;continue;
        }
        $topics=array_values(array_unique(
            $subscriber['topicsByConsent'][$consent['reference']]
        ));
        $selected=[];
        foreach ($articles as $a) {
            $topic=strtoupper((string)$a['category_code']);
            $match=in_array('ARTICLES',$topics,true) ||
                in_array($topic,$topics,true) ||
                ($a['event_type']==='RESULTS_RELEASED' &&
                    in_array('RESULTS',$topics,true));
            if (!$match)continue;
            if ($mode==='URGENT' && $a['priority_code']!=='P0')continue;
            if ($mode==='EXAM_ONLY' && !in_array($topic,
                ['EXAMINATIONS','LANGUAGE','EMPLOYMENT'],true))continue;
            $locale=$subscriber['locale'];
            $path=$a[$locale.'_route'];
            if (!is_string($path) ||
                !preg_match('#^/'.$locale.'/[a-z0-9/-]+/$#D',$path))continue;
            $title=$a[$locale==='fa'?'headlineFa':'headlineEn']??null;
            if (!is_string($title)||trim($title)===''||strlen($title)>720)
                continue;
            // Immutable, server-owned references permit the ORIGINAL
            // eco worker to reload/recheck the actual CMS receipt and
            // withdrawn-page state immediately before sending any mail.
            $selected[]=[
                'url'=>'https://drjavadrezazadeh.com'.$path,
                'title'=>$title,'publishedAt'=>(int)$a['published_at'],
                'publicationId'=>$a['publication_id'],
                'contentSha256'=>$a[$locale.'_content_sha256'],
                'ownerApprovalDigest'=>$a['approval_digest']
            ];
            if (count($selected)>=20)break;
        }
        if (!$selected)continue;
        // Urgent releases are independently deduplicated PER verified
        // edition. A fresh P0 must not resend yesterday's P0 simply because
        // the membership of one aggregate changed. Scheduled digests, by
        // contrast, have ONE idempotency key per subscriber, mode and period.
        // Their item set is frozen by the ORIGINAL eco outbox on first queue.
        $batches=$mode==='URGENT'?
            array_map(static fn(array $entry): array=>[$entry],$selected):
            [$selected];
        foreach($batches as $batch){
            $editions=array_map(static fn(array $item): string=>
                $item['publicationId'].':'.$item['contentSha256'].':'.
                $item['ownerApprovalDigest'], $batch);
            $period=gmdate($mode==='WEEKLY'?'o-W':'Y-m-d',$nowEpoch);
            $editionScope=$mode==='URGENT'?
                implode('|',$editions):'SINGLE_SCHEDULED_PERIOD';
            $digestKey=hash('sha256','JREI_NEWS_DIGEST|'.$mode.'|'.
                $period.'|'.$subscriber['accountId'].'|'.
                $subscriber['locale'].'|'.$subscriber['channel'].'|'.
                $consent['reference'].'|'.$editionScope);
            $message=['schema'=>'jr.jrei.news-articles-digest-intent.v1',
                'purpose'=>'ARTICLES','accountId'=>$subscriber['accountId'],
                'locale'=>$subscriber['locale'],'channel'=>$subscriber['channel'],
                'digestMode'=>$mode,'items'=>$batch,
                'consentReference'=>$consent['reference'],
                'verifyCurrentConsentBeforeDelivery'=>true,
                'idempotencyKey'=>$digestKey,
                'smtpAccepted'=>false,'mailboxDelivered'=>false];
            $receipt=$existingOutboxEnqueue($message);
            if(is_array($receipt)&&
                ($receipt['source']??null)==='ORIGINAL_ECO_NEWS_DIGEST_OUTBOX'&&
                ($receipt['purpose']??null)==='ARTICLES'&&
                ($receipt['idempotencyKey']??null)===$digestKey){
                if(($receipt['state']??null)==='QUEUED')$queued++;
                elseif(($receipt['state']??null)==='ALREADY_QUEUED')$alreadyQueued++;
                else $skipped++;
            }else $skipped++;
        }
    }
    return ['schema'=>'jr.jrei.news-digest-queue.v1',
        'queued'=>$queued,'alreadyQueued'=>$alreadyQueued,
        'skipped'=>$skipped,
        'nextAfterAccountId'=>$lastAccount,
        'mayHaveMoreAudience'=>$hasMore,
        'actualSmtpDeliveryUnverified'=>true];
}
