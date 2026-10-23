<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Aggregate reconciliation of preliminary MCQ report evidence.
 * Only original mother-DB canonical attempts, score runs and the durable
 * numerical snapshot are read. No account IDs, choices, correct keys,
 * output hashes or student grades are disclosed to the owner projection.
 */
function jrExamOwnerPreliminaryGradeEvidence(PDO $pdo): array {
    $out=[
      'schema'=>'jr.jrei.preliminary-grade-audit.v1',
      'available'=>false,
      'recordedSnapshots'=>null,
      'canonicalDigestAligned'=>null,
      'missingSnapshotAfterSubmission'=>null,
      'orphanedOrMismatchedRun'=>null,
      'unexpectedSnapshotStates'=>null,
      'actualScientificValidationComplete'=>false,
      'automatedOfficialResultsAuthorized'=>false,
      'studentIdentityOrRawResponsesIncluded'=>false
    ];
    try{
        $q=$pdo->query("SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN
            a.attempt_id IS NOT NULL AND
            a.score_run_id=g.score_run_id AND
            a.assessment_session_id=g.assessment_session_id AND
            s.session_id=g.assessment_session_id AND
            s.scoring_model_id=g.scoring_model_id AND
            s.input_sha256=g.submission_sha256 AND
            s.output_sha256=g.output_sha256 AND
            s.state='UNREVIEWED' AND
            a.submission_digest=g.submission_sha256 AND
            g.status='PRELIMINARY_UNREVIEWED'
            THEN 1 ELSE 0 END),0) AS metadata_aligned,
          COALESCE(SUM(CASE WHEN
            a.attempt_id IS NULL OR a.score_run_id<>g.score_run_id
            OR a.assessment_session_id<>g.assessment_session_id
            OR s.session_id IS NULL OR s.session_id<>g.assessment_session_id
            OR s.scoring_model_id<>g.scoring_model_id
            OR s.input_sha256<>g.submission_sha256
            OR s.output_sha256<>g.output_sha256
            OR a.submission_digest<>g.submission_sha256
            THEN 1 ELSE 0 END),0) AS inconsistent,
          COALESCE(SUM(CASE WHEN g.status<>'PRELIMINARY_UNREVIEWED'
            THEN 1 ELSE 0 END),0) AS unexpected_state
          FROM jrei_exam_preliminary_grade_snapshots g
          LEFT JOIN jrei_exam_commercial_attempts a
            ON a.attempt_id=g.attempt_id
          LEFT JOIN eco_score_runs s ON s.id=g.score_run_id");
        $r=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_exam_commercial_attempts a
          LEFT JOIN jrei_exam_preliminary_grade_snapshots g
            ON g.attempt_id=a.attempt_id
          WHERE a.attempt_state IN ('SUBMITTED','TIMED_OUT')
            AND a.score_run_id IS NOT NULL AND g.attempt_id IS NULL");
        $out['missingSnapshotAfterSubmission']=(int)$q->fetchColumn();
        $out['recordedSnapshots']=(int)$r['total'];
        $out['canonicalDigestAligned']=(int)$r['metadata_aligned'];
        $out['orphanedOrMismatchedRun']=(int)$r['inconsistent'];
        $out['unexpectedSnapshotStates']=(int)$r['unexpected_state'];
        $out['available']=true;
    }catch(Throwable $e){
        // One missing migration, or a permissions error = UNKNOWN, not zero.
    }
    return $out;
}
