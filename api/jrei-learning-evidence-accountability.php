<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Actual recorded baseline-v-challenger evaluation metadata ONLY.
 * These counts do not prove that anyone verified benchmark cases,
 * that external facts are authentic or that any machine model improved.
 * One mother database, no learner identities, prompts or candidate outputs.
 */
function jrJreiLearningOwnerEvidenceAccountability(PDO $pdo): array {
    $out=[
      'schema'=>'jr.jrei.learning-comparison-accountability.v1',
      'available'=>false,
      'recordedProposals'=>null,
      'sampleBelowPolicyMinimum'=>null,
      'privacyIncidentsReported'=>null,
      'unsupportedEvidenceRegressions'=>null,
      'fairnessGapRegressions'=>null,
      'latencyRegressions'=>null,
      'accuracyNotImproved'=>null,
      'acceptedDespiteRecordedHazard'=>null,
      'approvedProposalsScientificallyValidated'=>false,
      'benchmarkCasesIndependentlyObserved'=>false,
      'codeOrModelAutomaticallyChanged'=>false
    ];
    try{
        $q=$pdo->query("SELECT minimum_reviewed_cases
           FROM jrei_learning_controls WHERE id=1 LIMIT 1");
        $threshold=$q->fetchColumn();
        if($threshold===false)return $out;
        $min=(int)$threshold;
        if($min<1||$min>1000000)return $out;
        $q=$pdo->prepare("SELECT COUNT(*) AS proposals,
           COALESCE(SUM(CASE WHEN sample_count<? THEN 1 ELSE 0 END),0)
             AS under_sampled,
           COALESCE(SUM(CASE WHEN privacy_incident_count>0
             THEN 1 ELSE 0 END),0) AS privacy_cases,
           COALESCE(SUM(CASE WHEN challenger_unsupported>baseline_unsupported
             THEN 1 ELSE 0 END),0) AS unsupported_regressions,
           COALESCE(SUM(CASE WHEN challenger_fairness_gap_bps>
             baseline_fairness_gap_bps THEN 1 ELSE 0 END),0)
             AS fairness_regressions,
           COALESCE(SUM(CASE WHEN challenger_p95_ms>baseline_p95_ms
             THEN 1 ELSE 0 END),0) AS latency_regressions,
           COALESCE(SUM(CASE WHEN challenger_correct<=baseline_correct
             THEN 1 ELSE 0 END),0) AS non_improvements,
           COALESCE(SUM(CASE WHEN review_state='APPROVED'
             AND (sample_count<? OR privacy_incident_count>0
              OR challenger_unsupported>baseline_unsupported
              OR challenger_fairness_gap_bps>baseline_fairness_gap_bps
              OR challenger_correct<=baseline_correct)
             THEN 1 ELSE 0 END),0) AS approved_hazards
          FROM jrei_learning_proposals");
        $q->execute([$min,$min]);
        $r=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($r))return $out;
        foreach([
          'recordedProposals'=>'proposals',
          'sampleBelowPolicyMinimum'=>'under_sampled',
          'privacyIncidentsReported'=>'privacy_cases',
          'unsupportedEvidenceRegressions'=>'unsupported_regressions',
          'fairnessGapRegressions'=>'fairness_regressions',
          'latencyRegressions'=>'latency_regressions',
          'accuracyNotImproved'=>'non_improvements',
          'acceptedDespiteRecordedHazard'=>'approved_hazards'
        ] as $label=>$sqlKey)$out[$label]=(int)$r[$sqlKey];
        $out['available']=true;
    }catch(Throwable $e){
        // Broken/staged schema is UNKNOWN, not "no risks".
    }
    return $out;
}
