<?php
declare(strict_types=1);
/**
 * Owner-only live DB counters, source-only.
 * Missing migration, missing source records or query failures report UNKNOWN,
 * never fabricated zeroes or a successful release.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/owner-editorial.php';

function jrNewsOwnerOperationalOverview(PDO $pdo,array $ownerSession,
    int $nowEpoch): array {
    jrNewsOwnerAuthority($ownerSession);
    if ($nowEpoch<=0)throw new InvalidArgumentException('news_ops_clock_invalid');
    $metrics=[
        'registeredMonitors'=>
            'SELECT COUNT(*) FROM jrei_news_monitors',
        'enabledMonitors'=>
            'SELECT COUNT(*) FROM jrei_news_monitors WHERE enabled=1',
        'discoveredCandidates'=>
            'SELECT COUNT(*) FROM jrei_news_candidates',
        'pendingEvidenceReview'=>
            "SELECT COUNT(*) FROM jrei_news_candidates
             WHERE state='PENDING_EVIDENCE_VERIFICATION'",
        'independentlyReviewedCandidates'=>
            "SELECT COUNT(*) FROM jrei_news_candidates WHERE state='EVIDENCE_REVIEWED'",
        'ownerApprovalQueue'=>
            "SELECT COUNT(*) FROM jrei_news_editorial_versions
             WHERE editorial_state='PENDING_OWNER_APPROVAL'",
        'ownerApprovedRevisions'=>
            "SELECT COUNT(*) FROM jrei_news_editorial_versions
             WHERE editorial_state='OWNER_APPROVED'",
        'actuallyPublishedBilingualItems'=>
            "SELECT COUNT(*) FROM jrei_news_publications p
             JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
             JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id
             WHERE p.publisher_state='PUBLISHED'
               AND p.published_at IS NOT NULL
               AND p.publisher_receipt_reference IS NOT NULL
               AND d.action_code='APPROVE'
               AND d.approval_digest=v.approval_digest
               AND p.fa_content_sha256 IS NOT NULL
               AND p.en_content_sha256 IS NOT NULL",
        'socialDeliveryFailures'=>
            "SELECT COUNT(*) FROM jrei_news_delivery_receipts
             WHERE state IN ('FAILED','UNKNOWN_REVIEW_REQUIRED')",
        'activeNewsTopicFollows'=>
            "SELECT COUNT(*) FROM jrei_news_topic_follows
             WHERE follow_state='ACTIVE'",
        'activeExamReminderFollows'=>
            "SELECT COUNT(*) FROM jrei_news_exam_follows
             WHERE follow_state='ACTIVE'"
    ];
    $results=[];
    foreach ($metrics as $metric=>$sql) {
        try {
            $value=$pdo->query($sql)->fetchColumn();
            $results[$metric]=[
                'status'=>'MEASURED','value'=>(int)$value,
                'liveServerSource'=>'BERTINA_MOTHER_DATABASE'];
        }catch(Throwable $e){
            // No leaks of SQL or private connection details in the UI.
            $results[$metric]=[
                'status'=>'UNKNOWN','value'=>null,
                'reason'=>'SCHEMA_OR_OBSERVATION_NOT_AVAILABLE'];
        }
    }
    return [
        'schema'=>'jr.jrei.news-owner-operations-overview.v1',
        'observedAtUtc'=>gmdate('Y-m-d\TH:i:s\Z',$nowEpoch),
        'metrics'=>$results,
        'testStatus'=>'NOT_RUN',
        'productionReleased'=>false,
        'sourceCommitDoesNotProveLiveOperation'=>true,
        'publicAccessPermitted'=>false
    ];
}
