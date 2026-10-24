<?php
declare(strict_types=1);
/**
 * Owner-MFA approval of an independently reviewed exam milestone.
 * Additive to original JREI source governance and central mother DB.
 * No email, Cron, public page publication or external requests here.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/owner-editorial.php';
require_once __DIR__.'/candidate-intake.php';

function jrNewsApproveOfficialExamMilestone(
    PDO $pdo,array $ownerSession,string $milestoneId,
    callable $originalJreiExamSourceRecheck,int $nowEpoch
): array {
    $owner=jrNewsOwnerAuthority($ownerSession);
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$milestoneId) || $nowEpoch<=0) {
        throw new InvalidArgumentException('news_exam_owner_request_invalid');
    }
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT milestone_id,external_exam_key,milestone_type,event_utc,
                    source_ref,source_evidence_sha256,version_number,
                    previous_milestone_id,review_state,owner_approved
             FROM jrei_news_exam_milestones
             WHERE milestone_id=? FOR UPDATE'
        );
        $q->execute([$milestoneId]);
        $event=$q->fetch(PDO::FETCH_ASSOC);
        if (!$event)throw new RuntimeException('news_exam_record_missing');
        if ($event['review_state']==='OFFICIAL_DATE_REVIEWED' &&
            (int)$event['owner_approved']===1) {
            $pdo->commit();
            return ['schema'=>'jr.jrei.news-approved-milestone.v1',
                'milestoneId'=>$milestoneId,'alreadyApproved'=>true,
                'emailSent'=>false,'published'=>false];
        }
        if ($event['review_state']!=='PENDING_OFFICIAL_REVIEW' ||
            (int)$event['owner_approved']!==0) {
            throw new RuntimeException('news_exam_version_not_reviewable');
        }
        $review=$originalJreiExamSourceRecheck([
            'sourceReference'=>$event['source_ref'],
            'evidenceSha256'=>$event['source_evidence_sha256'],
            'externalExamKey'=>$event['external_exam_key'],
            'milestoneType'=>$event['milestone_type'],
            'scheduledAtUtc'=>(int)$event['event_utc'],
            'ownerAccountId'=>$owner['actor']
        ]);
        if (!is_array($review) ||
            ($review['source']??null)!=='ORIGINAL_JREI_OFFICIAL_EXAM_REVIEW' ||
            ($review['issuerVerified']??null)!==true ||
            ($review['examDateFromOriginalSource']??null)!==true ||
            ($review['current']??null)!==true ||
            ($review['rightsCurrent']??null)!==true ||
            ($review['ownerMfaReverified']??null)!==true ||
            ($review['evidenceSha256']??null)!==$event['source_evidence_sha256']) {
            throw new RuntimeException('news_official_exam_date_not_reverified');
        }
        $oldId=$event['previous_milestone_id']??null;
        if ($oldId!==null) {
            $old=$pdo->prepare(
                'SELECT milestone_id,external_exam_key,milestone_type,
                        version_number,review_state
                 FROM jrei_news_exam_milestones
                 WHERE milestone_id=? FOR UPDATE'
            );
            $old->execute([$oldId]);
            $prior=$old->fetch(PDO::FETCH_ASSOC);
            if (!$prior ||
                $prior['external_exam_key']!==$event['external_exam_key']||
                $prior['milestone_type']!==$event['milestone_type']||
                (int)$prior['version_number']+1!==(int)$event['version_number']) {
                throw new RuntimeException('news_exam_previous_version_conflict');
            }
            $pdo->prepare(
                "UPDATE jrei_news_exam_milestones
                 SET review_state='SUPERSEDED',owner_approved=0
                 WHERE milestone_id=?"
            )->execute([$oldId]);
            // Existing opt-in follows remain purpose-scoped. Move ONLY active
            // subscriptions to the newly approved version. The original eco
            // consent and recipient status are rechecked before any delivery.
            $pdo->prepare(
                "INSERT INTO jrei_news_exam_follows
                 (follow_id,account_id,milestone_id,days_before,channel_code,
                  consent_reference,follow_state,created_at)
                 SELECT LOWER(CONCAT(
                     SUBSTR(MD5(CONCAT(f.follow_id,':',?)),1,8),'-',
                     SUBSTR(MD5(CONCAT(f.follow_id,':',?)),9,4),'-',
                     SUBSTR(MD5(CONCAT(f.follow_id,':',?)),13,4),'-',
                     SUBSTR(MD5(CONCAT(f.follow_id,':',?)),17,4),'-',
                     SUBSTR(MD5(CONCAT(f.follow_id,':',?)),21,12))),
                  f.account_id,?,f.days_before,f.channel_code,
                  f.consent_reference,'ACTIVE',?
                 FROM jrei_news_exam_follows f
                 WHERE f.milestone_id=? AND f.follow_state='ACTIVE'
                 ON DUPLICATE KEY UPDATE
                   follow_state='ACTIVE'"
            )->execute([$milestoneId,$milestoneId,$milestoneId,
                $milestoneId,$milestoneId,$milestoneId,$nowEpoch,$oldId]);
            $pdo->prepare(
                "UPDATE jrei_news_exam_follows
                 SET follow_state='SUPERSEDED'
                 WHERE milestone_id=? AND follow_state='ACTIVE'"
            )->execute([$oldId]);
        }
        $pdo->prepare(
            "UPDATE jrei_news_exam_milestones
             SET review_state='OFFICIAL_DATE_REVIEWED',owner_approved=1
             WHERE milestone_id=? AND review_state='PENDING_OFFICIAL_REVIEW'"
        )->execute([$milestoneId]);
        if (function_exists('operationsAudit')) {
            operationsAudit($pdo,$owner['actor'],
                'jrei_news_official_exam_milestone_approved',
                hash('sha256',$milestoneId));
        }
        $pdo->commit();
        return [
            'schema'=>'jr.jrei.news-approved-milestone.v1',
            'milestoneId'=>$milestoneId,
            'supersedesMilestoneId'=>$oldId,
            'ownerApproved'=>true,'officialEvidenceRechecked'=>true,
            'oldRemindersInvalidated'=>$oldId!==null,
            'emailSent'=>false,'published'=>false,
            'existingEcosystemScheduleRequired'=>true
        ];
    }catch(Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
