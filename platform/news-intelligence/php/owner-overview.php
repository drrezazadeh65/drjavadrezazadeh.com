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
    // A dashboard refresh must not scan the same growing table two or
    // three times. Combine related counters into one read per table;
    // each group fails independently to UNKNOWN if its migration is absent.
    // The original customer/commerce database is never modified here.
    $groups=[
        [
            'keys'=>['registeredMonitors','enabledMonitors'],
            'sql'=>"SELECT COUNT(*) AS registeredMonitors,
                  COALESCE(SUM(enabled=1),0) AS enabledMonitors
                  FROM jrei_news_monitors"
        ],
        [
            'keys'=>['eligibleOriginalSourcesNow'],
            'sql'=>"SELECT COUNT(*) AS eligibleOriginalSourcesNow
              FROM jrei_news_monitors n
              JOIN jrei_exam_sources s ON s.source_id=n.jrei_source_reference
              JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
              WHERE n.enabled=1 AND n.policy_revision=p.revision
                AND n.source_url_sha256=SHA2(s.source_locator_uri,256)
                AND s.review_state='AUTHORITATIVE_REVIEWED'
                AND s.rights_state IN
                  ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
                AND s.is_revoked=0 AND s.is_superseded=0
                AND s.verified_at IS NOT NULL
                AND s.reviewer_account_id IS NOT NULL
                AND p.scheduling_state='APPROVED'
                AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
                AND p.transport_reviewed=1
                AND BINARY p.rights_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
                AND BINARY p.robots_terms_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
                AND BINARY p.transport_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'"
        ],
        [
            'keys'=>['discoveredCandidates','pendingEvidenceReview',
                     'independentlyReviewedCandidates'],
            'sql'=>"SELECT COUNT(*) AS discoveredCandidates,
                  COALESCE(SUM(state='PENDING_EVIDENCE_VERIFICATION'),0)
                     AS pendingEvidenceReview,
                  COALESCE(SUM(state='EVIDENCE_REVIEWED'),0)
                     AS independentlyReviewedCandidates
                  FROM jrei_news_candidates"
        ],
        [
            'keys'=>['ownerApprovalQueue','ownerApprovedRevisions'],
            'sql'=>"SELECT
                  COALESCE(SUM(editorial_state='PENDING_OWNER_APPROVAL'),0)
                     AS ownerApprovalQueue,
                  COALESCE(SUM(editorial_state='OWNER_APPROVED'),0)
                     AS ownerApprovedRevisions
                  FROM jrei_news_editorial_versions"
        ],
        [
            'keys'=>['actuallyPublishedBilingualItems'],
            'sql'=>"SELECT COUNT(*) AS actuallyPublishedBilingualItems
                  FROM jrei_news_publications p
                  JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
                  JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id
                  WHERE p.publisher_state='PUBLISHED'
                    AND p.published_at IS NOT NULL
                    AND p.publisher_receipt_reference IS NOT NULL
                    AND d.action_code='APPROVE'
                    AND d.revision_id=v.revision_id
                    AND v.editorial_state='OWNER_APPROVED'
                    AND d.approval_digest=v.approval_digest
                    AND p.fa_content_sha256 IS NOT NULL
                    AND p.en_content_sha256 IS NOT NULL"
        ],
        [
            'keys'=>['socialDeliveryFailures'],
            'sql'=>"SELECT COUNT(*) AS socialDeliveryFailures
                  FROM jrei_news_delivery_receipts
                  WHERE state IN ('FAILED','UNKNOWN_REVIEW_REQUIRED')"
        ],
        [
            'keys'=>['activeNewsTopicFollows'],
            'sql'=>"SELECT COUNT(*) AS activeNewsTopicFollows
                  FROM jrei_news_topic_follows WHERE follow_state='ACTIVE'"
        ],
        [
            'keys'=>['activeExamReminderFollows'],
            'sql'=>"SELECT COUNT(*) AS activeExamReminderFollows
                  FROM jrei_news_exam_follows WHERE follow_state='ACTIVE'"
        ]
    ];
    $results=[];
    foreach ($groups as $group) {
        try {
            $values=$pdo->query($group['sql'])->fetch(PDO::FETCH_ASSOC);
            if (!is_array($values))
                throw new RuntimeException('news_overview_unavailable');
            foreach ($group['keys'] as $key) {
                if (!isset($values[$key]) || !is_numeric($values[$key]))
                    throw new RuntimeException('news_overview_metric_unavailable');
            }
            foreach ($group['keys'] as $key)
                $results[$key]=[
                    'status'=>'MEASURED','value'=>(int)$values[$key],
                    'liveServerSource'=>'BERTINA_MOTHER_DATABASE'];
        }catch(Throwable $e){
            // Report unknown separately for each metric, never as false zero.
            foreach ($group['keys'] as $key)
                $results[$key]=[
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
