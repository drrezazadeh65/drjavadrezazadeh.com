<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Owner-only JREI V5 adaptive learning governance.
 *
 * This module never trains a model, evaluates private learner text, runs
 * remote code, publishes an educational claim or changes model weights.
 * All responses are metadata-only projections from the EXISTING mother DB.
 */
function jrJreiLearningSchemaReady(PDO $pdo): bool {
    try {
        $pdo->query('SELECT id,enabled,auto_promote_low_risk,revision,
            active_retrieval_version,active_retrieval_sha256,max_daily_evaluations,
            minimum_reviewed_cases,updated_at,updated_by_account_id
            FROM jrei_learning_controls LIMIT 0');
        $pdo->query('SELECT cycle_day,status,reviewed_source_count,
            approved_holdout_case_count,candidate_count,evaluated_candidate_count,
            accepted_candidate_count,last_started_at,last_finished_at,revision
            FROM jrei_learning_daily_cycles LIMIT 0');
        $pdo->query('SELECT proposal_id,cycle_day,change_type,decision,review_state,
            sample_count,baseline_correct,challenger_correct,
            baseline_unsupported,challenger_unsupported,privacy_incident_count,
            baseline_fairness_gap_bps,challenger_fairness_gap_bps,
            baseline_p95_ms,challenger_p95_ms,created_at,reviewed_at
            FROM jrei_learning_proposals LIMIT 0');
        return true;
    } catch(Throwable $e) { return false; }
}
function jrJreiLearningSnapshot(PDO $pdo, array $cfg): array {
    $ready=jrJreiLearningSchemaReady($pdo);
    $base=[
      'ok'=>true,'schema'=>'jr.jrei.learning-owner.v1',
      'dataState'=>$ready?'MOTHER_DB_SOURCE_METADATA':'MOTHER_DB_MIGRATION_REQUIRED',
      'motherDbSchemaReady'=>$ready,
      'privateGlobalFlagEnabled'=>($cfg['jrei_learning_daily_enabled']??false)===true,
      'liveModelVerified'=>false,
      'windowsWorkerVerified'=>false,
      'independentEvaluationVerified'=>false,
      'scientificValidationVerified'=>false,
      'modelWeightLearningVerified'=>false,
      'autoPromotionActive'=>false,
      'sourceOnly'=>true,
      'checkedAt'=>time(),
      'controls'=>null,'recentCycles'=>[],'proposalCounts'=>[
          'pending'=>0,'reviewed'=>0,'approved'=>0,'rejected'=>0],
      'disclaimer'=>'Daily scheduling or stored aggregate counts do not prove that a model learned, citations were scientifically verified, or user data was retained.'
    ];
    if(!$ready)return $base;
    $q=$pdo->query('SELECT enabled,auto_promote_low_risk,revision,
            active_retrieval_version,active_retrieval_sha256,
            max_daily_evaluations,minimum_reviewed_cases,updated_at
          FROM jrei_learning_controls WHERE id=1 LIMIT 1');
    $r=$q->fetch(PDO::FETCH_ASSOC);
    if($r) {
        $base['controls']=[
            'enabled'=>(int)$r['enabled']===1,
            'autoPromoteLowRisk'=>(int)$r['auto_promote_low_risk']===1,
            'revision'=>(int)$r['revision'],
            'retrievalVersion'=>(int)$r['active_retrieval_version'],
            'activeRetrievalSha256'=>$r['active_retrieval_sha256'],
            'maxDailyEvaluations'=>(int)$r['max_daily_evaluations'],
            'minimumReviewedCases'=>(int)$r['minimum_reviewed_cases'],
            'lastUpdatedAt'=>(int)$r['updated_at']
        ];
    }
    $q=$pdo->query('SELECT cycle_day,status,reviewed_source_count,
        approved_holdout_case_count,candidate_count,evaluated_candidate_count,
        accepted_candidate_count,last_started_at,last_finished_at
        FROM jrei_learning_daily_cycles
        ORDER BY cycle_day DESC LIMIT 14');
    foreach($q as $row) {
        $base['recentCycles'][]=[
          'day'=>(string)$row['cycle_day'],
          'status'=>(string)$row['status'],
          'reviewedSourceCount'=>(int)$row['reviewed_source_count'],
          'approvedHoldoutCaseCount'=>(int)$row['approved_holdout_case_count'],
          'candidateCount'=>(int)$row['candidate_count'],
          'evaluatedCandidateCount'=>(int)$row['evaluated_candidate_count'],
          'acceptedCandidateCount'=>(int)$row['accepted_candidate_count'],
          'lastStartedAt'=>$row['last_started_at']===null?null:(int)$row['last_started_at'],
          'lastFinishedAt'=>$row['last_finished_at']===null?null:(int)$row['last_finished_at']
        ];
    }
    $q=$pdo->query("SELECT review_state,COUNT(*) count_rows
          FROM jrei_learning_proposals GROUP BY review_state");
    foreach($q as $row){
        $n=(int)$row['count_rows'];
        switch(strtoupper((string)$row['review_state'])){
            case 'PENDING': $base['proposalCounts']['pending']+=$n;break;
            case 'REVIEWED': $base['proposalCounts']['reviewed']+=$n;break;
            case 'APPROVED': $base['proposalCounts']['approved']+=$n;break;
            case 'REJECTED': $base['proposalCounts']['rejected']+=$n;break;
        }
    }
    return $base;
}
/**
 * Owner can request daily aggregate observations to be staged; no source is
 * independently trusted or executed by the action. Auto-promote is ALWAYS
 * forced OFF until a separate scientifically approved reversible publisher
 * and independent Windows executor are installed and accepted.
 */
function jrJreiLearningOwnerChange(PDO $pdo,array $cfg,string $actor,array $body): array {
    if(!jrJreiLearningSchemaReady($pdo))
        throw new DomainException('jrei_learning_migration_required');
    $action=$body['action']??null;
    $revision=$body['revision']??null;
    if($action!=='set_enabled'||!is_int($revision)||$revision<1)
        throw new InvalidArgumentException('invalid_jrei_learning_policy');
    $enabled=$body['enabled']??null;
    if(!is_bool($enabled))
        throw new InvalidArgumentException('invalid_jrei_learning_policy');
    if($enabled&&(($cfg['jrei_learning_daily_enabled']??false)!==true||
       ($body['confirmation']??'')!=='APPROVE_METADATA_ONLY_DAILY_LEARNING'))
        throw new DomainException('learning_runtime_not_authorized');
    $now=time();
    $pdo->beginTransaction();
    try {
        $q=$pdo->query('SELECT enabled,revision,auto_promote_low_risk
            FROM jrei_learning_controls WHERE id=1 FOR UPDATE');
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!$row||(int)$row['revision']!==$revision)
            throw new DomainException('jrei_learning_policy_conflict');
        $q=$pdo->prepare('UPDATE jrei_learning_controls
            SET enabled=?,auto_promote_low_risk=0,revision=revision+1,
                updated_at=?,updated_by_account_id=?
            WHERE id=1 AND revision=?');
        $q->execute([$enabled?1:0,$now,$actor,$revision]);
        if($q->rowCount()!==1)
            throw new DomainException('jrei_learning_policy_conflict');
        operationsAudit($pdo,$actor,
            $enabled?'jrei_daily_aggregate_enabled':'jrei_daily_aggregate_disabled',
            'jrei-v5-daily-metadata');
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return jrJreiLearningSnapshot($pdo,$cfg);
}
