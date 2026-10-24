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
        "SELECT p.fa_route,p.en_route,p.published_at,
                v.bilingual_editorial_json,
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
           AND d.revision_id=v.revision_id
           AND p.fa_content_sha256 IS NOT NULL
           AND p.en_content_sha256 IS NOT NULL
         ORDER BY p.published_at DESC LIMIT 500"
    );
    $stmt->execute([$since,$nowEpoch]);
    $articles=$stmt->fetchAll(PDO::FETCH_ASSOC);
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
            'channel'=>$row['channel_code'],'consentReferences'=>[],
            'topics'=>[]];
        $grouped[$key]['topics'][]=$row['topic_code'];
        $grouped[$key]['consentReferences'][]=$row['consent_reference'];
    }
    $queued=0;$skipped=0;
    $lastAccount=$pageIds?end($pageIds):$afterAccountId;
    foreach ($grouped as $subscriber) {
        $consent=$currentEcoConsentResolver(
            $subscriber['accountId'],'NEWSLETTER',$subscriber['channel']);
        if (!is_array($consent) ||
            ($consent['granted']??null)!==true ||
            ($consent['withdrawn']??null)!==false ||
            !in_array($consent['reference']??'',
                $subscriber['consentReferences'],true)) {
            $skipped++;continue;
        }
        $selected=[];
        foreach ($articles as $a) {
            $topic=strtoupper((string)$a['category_code']);
            $match=in_array('ARTICLES',$subscriber['topics'],true) ||
                in_array($topic,$subscriber['topics'],true) ||
                ($a['event_type']==='RESULTS_RELEASED' &&
                    in_array('RESULTS',$subscriber['topics'],true));
            if (!$match)continue;
            if ($mode==='URGENT' && $a['priority_code']!=='P0')continue;
            if ($mode==='EXAM_ONLY' && !in_array($topic,
                ['EXAMINATIONS','LANGUAGE','EMPLOYMENT'],true))continue;
            $locale=$subscriber['locale'];
            $path=$a[$locale.'_route'];
            if (!is_string($path) ||
                !preg_match('#^/'.$locale.'/[a-z0-9/-]+/$#D',$path))continue;
            $data=json_decode((string)$a['bilingual_editorial_json'],true,32);
            $title=is_array($data)&&is_array($data[$locale]??null)?
                ($data[$locale]['headline']??null):null;
            if (!is_string($title)||trim($title)===''||strlen($title)>720)
                continue;
            $selected[]=[
                'url'=>'https://drjavadrezazadeh.com'.$path,
                'title'=>$title,'publishedAt'=>(int)$a['published_at']];
            if (count($selected)>=20)break;
        }
        if (!$selected)continue;
        $digestKey=hash('sha256','JREI_NEWS_DIGEST|'.$mode.'|'.
            gmdate($mode==='WEEKLY'?'o-W':'Y-m-d',$nowEpoch).'|'.
            $subscriber['accountId'].'|'.implode('|',
                array_column($selected,'url')));
        $message=['purpose'=>'NEWSLETTER','accountId'=>$subscriber['accountId'],
            'locale'=>$subscriber['locale'],'channel'=>$subscriber['channel'],
            'digestMode'=>$mode,'items'=>$selected,
            'idempotencyKey'=>$digestKey,
            'smtpAccepted'=>false,'mailboxDelivered'=>false];
        $receipt=$existingOutboxEnqueue($message);
        if (is_array($receipt) &&
            in_array($receipt['state']??null,
                ['QUEUED','ALREADY_QUEUED'],true))$queued++;
        else $skipped++;
    }
    return ['schema'=>'jr.jrei.news-digest-queue.v1',
        'queued'=>$queued,'skipped'=>$skipped,
        'nextAfterAccountId'=>$lastAccount,
        'mayHaveMoreAudience'=>$hasMore,
        'actualSmtpDeliveryUnverified'=>true];
}
