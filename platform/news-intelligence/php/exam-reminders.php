<?php
declare(strict_types=1);
/**
 * SOURCE-ONLY JREI News exam reminders.
 * Existing authenticated account, consent and eco_notification_* outbox are
 * authoritative. This is NOT a Cron registration or standalone mailer.
 * Include behind original Bertina bootstrap after approved mother migration.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
function jrNewsUuid(): string {
    $b=random_bytes(16);
    $b[6]=chr((ord($b[6])&15)|64);
    $b[8]=chr((ord($b[8])&63)|128);
    $h=bin2hex($b);
    return substr($h,0,8).'-'.substr($h,8,4).'-'.
        substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20,12);
}
function jrNewsFollowExam(PDO $pdo,string $accountId,
    string $milestoneId,int $daysBefore,string $channel,
    callable $existingConsentResolver,int $nowEpoch): array {
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$accountId) ||
        !preg_match('/^[a-f0-9-]{36}$/iD',$milestoneId) ||
        !in_array($daysBefore,[0,1,3,5,7,10,15,30],true) ||
        !in_array($channel,['EMAIL','DASHBOARD'],true) ||
        $nowEpoch<=0)throw new InvalidArgumentException('news_follow_invalid');
    // Existing server session must own accountId, and resolver must validate
    // scoped CURRENT eco_consent_records + eco_notification_preferences.
    $consent=$existingConsentResolver($accountId,'EXAM_REMINDERS',$channel);
    if (!is_array($consent) || ($consent['granted']??null)!==true ||
        ($consent['withdrawn']??null)!==false ||
        !is_string($consent['reference']??null) ||
        strlen($consent['reference'])>100) {
        throw new RuntimeException('news_reminder_consent_missing');
    }
    $stmt=$pdo->prepare(
        "SELECT m.milestone_id,m.event_utc,m.review_state,m.owner_approved
         FROM jrei_news_exam_milestones m WHERE m.milestone_id=?
         AND NOT EXISTS (
           SELECT 1 FROM jrei_news_exam_milestones newer
           WHERE newer.external_exam_key=m.external_exam_key
             AND newer.milestone_type=m.milestone_type
             AND newer.version_number>m.version_number
             AND newer.owner_approved=1
             AND newer.review_state='OFFICIAL_DATE_REVIEWED'
         )"
    );
    $stmt->execute([$milestoneId]);
    $event=$stmt->fetch(PDO::FETCH_ASSOC);
    if (!$event || $event['review_state']!=='OFFICIAL_DATE_REVIEWED' ||
        (int)$event['owner_approved']!==1 ||
        (int)$event['event_utc']<=$nowEpoch) {
        throw new RuntimeException('news_deadline_not_current_or_approved');
    }
    $followId=jrNewsUuid();
    $pdo->prepare(
        "INSERT INTO jrei_news_exam_follows
          (follow_id,account_id,milestone_id,days_before,channel_code,
           consent_reference,follow_state,created_at)
         VALUES(?,?,?,?,?,?,'ACTIVE',?)
         ON DUPLICATE KEY UPDATE
           consent_reference=VALUES(consent_reference),follow_state='ACTIVE'"
    )->execute([$followId,$accountId,$milestoneId,$daysBefore,$channel,
        $consent['reference'],$nowEpoch]);
    return ['state'=>'ACTIVE','milestoneId'=>$milestoneId,
        'daysBefore'=>$daysBefore,'channel'=>$channel,
        'notificationQueued'=>false];
}
/**
 * One bounded reminder batch. The original eco outbox enforces idempotency
 * and physical email sending; this function cannot claim inbox delivery.
 * IMPORTANT: $consentResolver and $enqueueExistingOutbox are trusted
 * server-owned callbacks, never user/model-supplied invocations.
 */
function jrNewsQueueDueReminders(PDO $pdo,int $nowEpoch,
    callable $consentResolver,callable $enqueueExistingOutbox): array {
    if ($nowEpoch<=0)throw new InvalidArgumentException('news_reminder_clock_invalid');
    $stmt=$pdo->prepare(
        "SELECT f.follow_id,f.account_id,f.milestone_id,f.days_before,
                f.channel_code,f.consent_reference,m.title_fa,m.title_en,
                m.event_utc,m.version_number,m.source_ref
         FROM jrei_news_exam_follows f
         JOIN jrei_news_exam_milestones m
           ON m.milestone_id=f.milestone_id
         JOIN customer_accounts a ON a.id=f.account_id
         WHERE f.follow_state='ACTIVE'
           AND m.review_state='OFFICIAL_DATE_REVIEWED'
           AND m.owner_approved=1 AND a.status='active'
           AND a.email_verified_at IS NOT NULL
           AND m.event_utc>=:recent AND m.event_utc<=:future
           AND (m.event_utc-(f.days_before*86400))<=:current
           AND (m.event_utc-(f.days_before*86400))>:earliest
           AND NOT EXISTS (
              SELECT 1 FROM jrei_news_exam_milestones newer
              WHERE newer.external_exam_key=m.external_exam_key
                AND newer.milestone_type=m.milestone_type
                AND newer.version_number>m.version_number
                AND newer.owner_approved=1
                AND newer.review_state='OFFICIAL_DATE_REVIEWED'
           )
         ORDER BY m.event_utc ASC LIMIT 100"
    );
    // Never enqueue a deadline reminder after the OFFICIAL event has
    // already begun. A delayed host Cron may still deliver future reminders,
    // but it must not mislead applicants with an expired exam date.
    $stmt->execute([':recent'=>$nowEpoch,
        ':future'=>$nowEpoch+30*86400,':current'=>$nowEpoch,
        ':earliest'=>$nowEpoch-86400]);
    $queued=0;$suppressed=0;
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $consent=$consentResolver($row['account_id'],
            'EXAM_REMINDERS',$row['channel_code']);
        if (!is_array($consent) ||
            ($consent['granted']??null)!==true ||
            ($consent['withdrawn']??null)!==false ||
            ($consent['reference']??null)!==$row['consent_reference']) {
            $suppressed++;continue;
        }
        $key=hash('sha256','JREI_EXAM_REMINDER|'.$row['follow_id'].'|'.
            $row['version_number']);
        $message=['topic'=>'EXAM_REMINDERS',
            'idempotencyKey'=>$key,
            'accountId'=>$row['account_id'],
            'channel'=>$row['channel_code'],
            'milestoneId'=>$row['milestone_id'],
            'eventUtc'=>(int)$row['event_utc'],
            'titleFa'=>$row['title_fa'],
            'titleEn'=>$row['title_en'],
            'sourceRegistryRef'=>$row['source_ref'],
            'mailboxDelivered'=>false];
        $result=$enqueueExistingOutbox($message);
        if (is_array($result) &&
            ($result['source']??null)==='ORIGINAL_ECO_EXAM_REMINDER_OUTBOX' &&
            ($result['idempotencyKey']??null)===$key &&
            in_array($result['state']??null,['QUEUED','ALREADY_QUEUED'],true)) {
            $queued++;
        } else $suppressed++;
    }
    return ['schema'=>'jr.jrei.news-reminder-outbox-summary.v1',
        'queued'=>$queued,'suppressed'=>$suppressed,
        'smtpAcceptedUnverified'=>true,'mailboxDeliveredUnverified'=>true,
        'usesExistingOutbox'=>true];
}


/** One account's approved and not-yet-expired exam reminders. */
function jrNewsCurrentExamReminders(
    PDO $pdo,string $accountId,int $nowEpoch
): array {
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$accountId) ||
        $nowEpoch<=0)throw new InvalidArgumentException('news_reminder_owner_invalid');
    $q=$pdo->prepare(
        "SELECT f.follow_id,f.milestone_id,f.days_before,f.channel_code,
                f.follow_state,m.title_fa,m.title_en,m.event_utc,
                m.milestone_type,m.version_number
         FROM jrei_news_exam_follows f
         JOIN jrei_news_exam_milestones m
           ON m.milestone_id=f.milestone_id
         WHERE f.account_id=? AND f.follow_state='ACTIVE'
           AND m.review_state='OFFICIAL_DATE_REVIEWED'
           AND m.owner_approved=1 AND m.event_utc>?
           AND NOT EXISTS (
              SELECT 1 FROM jrei_news_exam_milestones newer
              WHERE newer.external_exam_key=m.external_exam_key
                AND newer.milestone_type=m.milestone_type
                AND newer.version_number>m.version_number
                AND newer.owner_approved=1
                AND newer.review_state='OFFICIAL_DATE_REVIEWED'
           )
         ORDER BY m.event_utc ASC,f.days_before DESC LIMIT 100"
    );
    $q->execute([$accountId,$nowEpoch]);
    $rows=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $rows[]=[
            'followId'=>$r['follow_id'],
            'milestoneId'=>$r['milestone_id'],
            'titleFa'=>$r['title_fa'],
            'titleEn'=>$r['title_en'],
            'eventUtc'=>(int)$r['event_utc'],
            'daysBefore'=>(int)$r['days_before'],
            'channel'=>$r['channel_code'],
            'milestoneType'=>$r['milestone_type'],
            'eventVersion'=>(int)$r['version_number']
        ];
    }
    return [
        'schema'=>'jr.jrei.news-account-exam-reminders.v1',
        'items'=>$rows,
        'activeFutureReminderCount'=>count($rows),
        'actualEmailDeliveryUnverified'=>true
    ];
}

/**
 * Withdraw one exact account-owned reminder. The existing eco outbox must
 * atomically suppress queued deliveries for this follow record. Does not
 * withdraw other newsletter/transactional consent scopes.
 */
function jrNewsWithdrawExamReminder(
    PDO $pdo,string $accountId,string $followId,
    callable $originalEcoReminderSuppressor,int $nowEpoch
): array {
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$accountId)||
        !preg_match('/^[a-f0-9-]{36}$/iD',$followId)||
        $nowEpoch<=0)throw new InvalidArgumentException('news_reminder_withdraw_invalid');
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('SELECT id FROM customer_accounts
            WHERE id=? FOR UPDATE');
        $q->execute([$accountId]);
        if(!$q->fetchColumn())
            throw new RuntimeException('news_reminder_owner_missing');
        $q=$pdo->prepare(
            "SELECT follow_id,milestone_id,channel_code,follow_state
             FROM jrei_news_exam_follows
             WHERE follow_id=? AND account_id=? FOR UPDATE"
        );
        $q->execute([$followId,$accountId]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!$row)throw new RuntimeException('news_reminder_follow_not_owned');
        if($row['follow_state']==='ACTIVE'){
            $pdo->prepare(
                "UPDATE jrei_news_exam_follows
                 SET follow_state='WITHDRAWN'
                 WHERE follow_id=? AND account_id=? AND follow_state='ACTIVE'"
            )->execute([$followId,$accountId]);
        }
        $receipt=$originalEcoReminderSuppressor(
            $pdo,$accountId,'EXAM_REMINDERS',
            $row['channel_code'],$followId,$row['milestone_id']
        );
        if(!is_array($receipt)||
            ($receipt['source']??null)!=='ORIGINAL_ECO_NOTIFICATION_OUTBOX'||
            ($receipt['queuedMessagesSuppressed']??null)!==true) {
            throw new RuntimeException('news_reminder_original_outbox_not_suppressed');
        }
        $pdo->commit();
        return [
            'schema'=>'jr.jrei.news-exam-reminder-withdrawal.v1',
            'state'=>'WITHDRAWN','followId'=>$followId,
            'queuedDeliveriesSuppressed'=>true,
            'previouslySentMailCannotBeRecalled'=>true
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
