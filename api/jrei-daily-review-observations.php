<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Honest source/holdout readiness counters for the EXISTING JREI daily cycle.
 * Counts rights/current scientific review metadata only; it cannot score
 * a model, compare policies, ingest student data or approve improvement.
 * An unavailable table returns UNKNOWN, never misleading zeros.
 */
function jrJreiDailyReviewObservations(PDO $pdo): array {
    $out=['schema'=>'jr.jrei.daily-input-readiness.v1',
      'available'=>false,'approvedReviewSourceCount'=>null,
      'approvedIndependentCaseCount'=>null,
      'modelImprovementMeasured'=>false,
      'actualModelEvaluationsPerformed'=>0,
      'studentRecordAccessed'=>false,
      'scientificModelAcceptance'=>false];
    try{
        $cases=$pdo->query("SELECT COUNT(*) FROM
          jrei_ai_governed_benchmark_cases
          WHERE case_state='APPROVED'
            AND independent_reviewer_account_id IS NOT NULL
            AND (author_account_id IS NULL OR
                 independent_reviewer_account_id<>author_account_id)
            AND reviewed_at IS NOT NULL
            AND source_evidence_sha256 IS NOT NULL
            AND benchmark_spec_sha256 IS NOT NULL")->fetchColumn();
        $sources=$pdo->query("SELECT COUNT(DISTINCT s.source_id)
          FROM jrei_ka_public_quote_attestations a
          JOIN jrei_ka_private_passages p ON p.passage_id=a.passage_id
          JOIN jrei_exam_sources s ON s.source_id=a.source_id
          JOIN jrei_ka_source_policies policy ON policy.source_id=s.source_id
          WHERE a.decision='APPROVE_PUBLIC_QUOTE'
            AND a.reviewer_account_id IS NOT NULL
            AND p.reviewer_account_id=a.reviewer_account_id
            AND a.reviewer_account_id<>s.reviewer_account_id
            AND a.source_id=p.source_id
            AND a.quoted_passage_sha256=p.passage_sha256
            AND a.independent_review_evidence_sha256 IS NOT NULL
            AND a.reviewed_source_rights_sha256=policy.rights_evidence_sha256
            AND p.passage_state='APPROVED_PUBLIC_AI_EVIDENCE'
            AND p.review_rights_state='PERMITTED_PUBLIC_QUOTE'
            AND s.review_state='AUTHORITATIVE_REVIEWED'
            AND s.rights_state='PERMITTED_REPRODUCTION'
            AND s.is_revoked=0 AND s.is_superseded=0
            AND policy.rights_reviewed=1")->fetchColumn();
        $out['available']=true;
        $out['approvedIndependentCaseCount']=max(0,(int)$cases);
        $out['approvedReviewSourceCount']=max(0,(int)$sources);
    }catch(Throwable $e){}
    return $out;
}
