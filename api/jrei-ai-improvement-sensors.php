<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-exam-source-release-impact.php';
require_once __DIR__.'/jrei-exam-buyer-risk-exposure.php';
require_once __DIR__.'/jrei-exam-preliminary-grade-owner-audit.php';
require_once __DIR__.'/jrei-learning-evidence-accountability.php';
require_once __DIR__.'/jrei-learning-owner-hazard-review.php';

/**
 * Evidence-only self-improvement detection from ACTUAL measured events.
 * Does not invent incidents, run models, draft privileged patches,
 * change payment/security/privacy, execute commands or publish any code.
 */
function jrAiImprovementSchemaReady(PDO $pdo): bool {
    try{
        $pdo->query("SELECT opportunity_id,rule_code,owner_state
          FROM jrei_ai_improvement_opportunities LIMIT 0");
        return true;
    }catch(Throwable $e){return false;}
}
function jrAiDetectImprovementOpportunities(PDO $pdo,array $cfg): array {
    $out=[
      'schema'=>'jr.jrei.improvement-sensor.v1',
      'status'=>'OFF','realSourceSignalsScanned'=>0,
      'newProposalsRecorded'=>0,'codeModified'=>false,
      'benchmarkQualityCertified'=>false,'productionDeployed'=>false
    ];
    if(($cfg['jrei_ai_improvement_discovery_enabled']??false)!==true||
       !jrAiImprovementSchemaReady($pdo))return $out;
    $today=gmdate('Y-m-d');
    $candidates=[];
    // A provider API request count from real telemetry is genuine data.
    try{
        $q=$pdo->prepare("SELECT model_code,
          SUM(completed_count) AS completions,
          SUM(failed_count) AS failures
          FROM jrei_ai_provider_telemetry_daily
          WHERE date_utc>=DATE_SUB(?,INTERVAL 7 DAY)
          GROUP BY model_code HAVING SUM(failed_count)>=3 LIMIT 12");
        $q->execute([$today]);
        foreach($q as $r){
            $count=(int)$r['failures'];
            $model=(string)$r['model_code'];
            if($count<3||strlen($model)>96)continue;
            $candidates[]=[
              'rule'=>'OBSERVED_PROVIDER_FAILURES',
              'sourceKey'=>'OPENAI|'.$model,
              'count'=>$count,
              'severity'=>$count>=10?'HIGH':'REVIEW',
              'summary'=>'MODEL_TRANSPORT_RELIABILITY_REQUIRES_ANALYSIS'
            ];
        }
    }catch(Throwable $e){} // Unavailable telemetry is NOT zero failures.

    // A human review must occur before a scientific-quality gap can be
    // observed. Model self-generated scores are not evaluation evidence.
    try{
        $q=$pdo->query("SELECT model_code,COUNT(*) AS reviews,
          AVG(expert_quality_score) AS mean_quality
          FROM jrei_ai_governed_benchmark_runs
          WHERE independently_graded=1
            AND expert_reviewer_account_id IS NOT NULL
            AND expert_quality_score IS NOT NULL
            AND expert_reviewed_at>=UNIX_TIMESTAMP(
                DATE_SUB(UTC_DATE(),INTERVAL 30 DAY))
          GROUP BY model_code
          HAVING COUNT(*)>=3 AND AVG(expert_quality_score)<60
          LIMIT 12");
        foreach($q as $r){
            $model=(string)$r['model_code'];
            $count=(int)$r['reviews'];
            if($count<3||strlen($model)>96)continue;
            $candidates[]=[
              'rule'=>'LOW_INDEPENDENT_BENCHMARK_REVIEW',
              'sourceKey'=>'EXPERT|'.$model,
              'count'=>$count,
              'severity'=>'REVIEW',
              'summary'=>'BENCHMARK_QUALITY_REQUIRES_QUALIFIED_INVESTIGATION'
            ];
        }
    }catch(Throwable $e){}

    // A stale source lease can conceal an outcome. It is never
    // auto-retried or counted as successful information acquisition.
    try{
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_ka_jobs
          WHERE job_state='UNKNOWN_REVIEW_REQUIRED'");
        $count=(int)$q->fetchColumn();
        if($count>=3)$candidates[]=[
          'rule'=>'UNKNOWN_LICENSED_ACQUISITION_OUTCOMES',
          'sourceKey'=>'JREI_KA|ORIGINAL_MOTHER_QUEUE',
          'count'=>$count,'severity'=>'REVIEW',
          'summary'=>'PRIVATE_SOURCE_LEASE_OUTCOMES_NEED_RECONCILIATION'
        ];
    }catch(Throwable $e){}

    // Genuine recorded commercial exam source/key retraction risks must be
    // surfaced before new questions or sales are advertised. Observations
    // only: never automatically suspend a paid product or reimburse a buyer.
    try{
        $impact=jrExamOwnerSourceReleaseImpact($pdo);
        $count=$impact['available']===true?
           (int)$impact['publishedProductsWithBlockers']:0;
        if($impact['available']===true&&$count>0){
            $candidates[]=[
              'rule'=>'PUBLISHED_EXAM_SOURCE_RELEASE_BLOCKERS',
              'sourceKey'=>'EXAM|PUBLISHED_SOURCE_AND_KEY_METADATA',
              'count'=>$count,'severity'=>'HIGH',
              'summary'=>'PUBLISHED_EXAM_SOURCE_RISK_REQUIRES_OWNER_REVIEW'
            ];
        }
    }catch(Throwable $e){}

    // Read only the existence and aggregate counts of canonical score-run
    // mismatches; never submit learner answers or source-free model guesses.
    try{
        $evidence=jrExamOwnerPreliminaryGradeEvidence($pdo);
        if($evidence['available']===true){
            $count=(int)$evidence['orphanedOrMismatchedRun']+
                (int)$evidence['missingSnapshotAfterSubmission']+
                (int)$evidence['unexpectedSnapshotStates'];
            if($count>0)$candidates[]=[
              'rule'=>'PRELIMINARY_EXAM_GRADE_INTEGRITY_GAP',
              'sourceKey'=>'EXAM|CANONICAL_SCORE_SNAPSHOT_RECONCILIATION',
              'count'=>$count,'severity'=>'HIGH',
              'summary'=>'CANONICAL_SCORE_INTEGRITY_REQUIRES_HUMAN_REVIEW'
            ];
        }
    }catch(Throwable $e){}

    // An actual recorded learner-service exposure deserves independent
    // owner review but is never an automatic refund, identity export or
    // a claim that a particular paid consumer is legally owed an amount.
    try{
        $buyerRisk=jrExamOwnerAtRiskBuyerObligations($pdo);
        if($buyerRisk['available']===true){
            $count=(int)$buyerRisk['activeEntitlementsOnAtRiskPublishedProducts'];
            if($count>0)$candidates[]=[
              'rule'=>'EXAM_BUYER_SERVICE_OBLIGATIONS',
              'sourceKey'=>'EXAM|ACTIVE_ACCESS_SOURCE_REVIEW',
              'count'=>$count,'severity'=>'HIGH',
              'summary'=>'OWNER_BUYER_REMEDY_WORKFLOW_NEEDS_REVIEW'
            ];
        }
    }catch(Throwable $e){}
    // "Approved" is merely a stored human/workflow decision: if the
    // recorded evaluation itself shows privacy, citation, fairness or
    // sample-size hazards, require another independent investigation
    // before any future scientific release. Never auto-rollback or deploy.
    try{
        $learning=jrJreiLearningOwnerEvidenceAccountability($pdo);
        if($learning['available']===true){
            $count=(int)$learning['acceptedDespiteRecordedHazard'];
            if($count>0)$candidates[]=[
                'rule'=>'APPROVED_LEARNING_EVIDENCE_HAZARDS',
                'sourceKey'=>'JREI|DAILY_BENCHMARK_POLICY_COUNTS',
                'count'=>$count,'severity'=>'HIGH',
                'summary'=>'LEARNING_POLICY_EVIDENCE_NEEDS_INDEPENDENT_REVIEW'
            ];
        }
    }catch(Throwable $e){}

    // A historical human review must not be silently rewritten into a
    // different current decision without an independent owner investigation.
    try{
        $audit=jrJreiLearningOwnerHazardQueue($pdo);
        if($audit['available']===true){
            $count=(int)$audit['vetoStateConflicts'];
            if($count>0)$candidates[]=[
              'rule'=>'SCIENTIFIC_REVIEW_DECISION_DRIFT',
              'sourceKey'=>'JREI|ORIGINAL_HUMAN_VETO_HISTORY',
              'count'=>$count,'severity'=>'HIGH',
              'summary'=>'REVIEW_DECISION_PROVENANCE_NEEDS_OWNER_RECONCILIATION'
            ];
        }
    }catch(Throwable $e){}
    $out['realSourceSignalsScanned']=count($candidates);
    $stmt=$pdo->prepare("INSERT INTO jrei_ai_improvement_opportunities
       (opportunity_id,rule_code,rule_version,evidence_window_utc,
        evidence_source_digest,observed_count,observed_severity,
        opportunity_summary_code,created_at,updated_at)
       VALUES (?,?,1,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         observed_count=GREATEST(observed_count,VALUES(observed_count)),
         updated_at=VALUES(updated_at)");
    $new=0;
    foreach($candidates as $c){
        if(!preg_match('/^[A-Z0-9_]{5,48}$/D',$c['rule'])||
           !preg_match('/^[A-Z0-9_]{5,90}$/D',$c['summary'])||
           !in_array($c['severity'],['REVIEW','HIGH'],true))
            continue;
        $stable=hash('sha256','jr.jrei.improvement.v1|'.$c['rule'].'|'.$c['sourceKey']);
        $stmt->execute([uuidv4(),$c['rule'],$today,$stable,
           $c['count'],$c['severity'],$c['summary'],time(),time()]);
        if($stmt->rowCount()===1)$new++;
    }
    return [...$out,'status'=>'PROPOSED_FOR_OWNER_INVESTIGATION',
      'newProposalsRecorded'=>$new];
}
function jrAiImprovementOwnerSnapshot(PDO $pdo,array $cfg): array {
    $out=[
      'schema'=>'jr.jrei.improvement-owner.v1',
      'available'=>false,'openCount'=>null,
      'recordedSignals'=>[],'truncated'=>false,
      'privateSensorOptIn'=>($cfg['jrei_ai_improvement_discovery_enabled']??false)===true,
      'actualPatchBranchesCreated'=>false,'pullRequestsCreated'=>false,
      'codeExecuted'=>false,'automaticProdDeployment'=>false
    ];
    if(!jrAiImprovementSchemaReady($pdo))return $out;
    try{
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_ai_improvement_opportunities
          WHERE owner_state='PROPOSED_UNVERIFIED'");
        $out['openCount']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT opportunity_id,rule_code,rule_version,
          evidence_window_utc,observed_count,observed_severity,
          opportunity_summary_code,owner_state,created_at
          FROM jrei_ai_improvement_opportunities
          WHERE owner_state='PROPOSED_UNVERIFIED'
          ORDER BY created_at DESC,opportunity_id LIMIT 21");
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['truncated']=count($rows)>20;
        foreach(array_slice($rows,0,20) as $r)$out['recordedSignals'][]=[
          'id'=>$r['opportunity_id'],'rule'=>$r['rule_code'],
          'observedSeverity'=>$r['observed_severity'],
          'summaryCode'=>$r['opportunity_summary_code'],
          'realEvidenceCount'=>(int)$r['observed_count'],
          'timeWindow'=>$r['evidence_window_utc'],
          'ownerState'=>$r['owner_state']
        ];
        $out['available']=true;
    }catch(Throwable $e){
        $out['recordedSignals']=[];$out['openCount']=null;
    }
    return $out;
}
