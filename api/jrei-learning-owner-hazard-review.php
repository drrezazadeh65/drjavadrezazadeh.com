<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Original MFA SUPER_ADMIN emergency human veto of a recorded learning
 * proposal whose mother-DB metrics show real reported risks. A veto can
 * never APPROVE or deploy a model and never changes the original measures.
 */
function jrJreiLearningHazardPredicate(): string {
    return "(p.sample_count<c.minimum_reviewed_cases
      OR p.privacy_incident_count>0
      OR p.challenger_unsupported>p.baseline_unsupported
      OR p.challenger_fairness_gap_bps>p.baseline_fairness_gap_bps
      OR p.challenger_p95_ms>p.baseline_p95_ms
      OR p.challenger_correct<=p.baseline_correct)";
}
function jrJreiLearningOwnerHazardQueue(PDO $pdo): array {
    $out=[
      'schema'=>'jr.jrei.learning-owner-hazard-queue.v1',
      'available'=>false,'totalRecordedHazardProposals'=>null,
      'recordedVetoDecisions'=>null,'vetoStateConflicts'=>null,
      'items'=>[],'truncated'=>false,
      'onlyHumanRejectionSupported'=>true,
      'modelAlteredAutomatically'=>false,
      'scientificEvidenceIndependentlyVerified'=>false
    ];
    try{
        $pdo->query('SELECT decision_id,proposal_id,observation_sha256
            FROM jrei_learning_hazard_review_history LIMIT 0');
        $q=$pdo->query('SELECT COUNT(*) FROM jrei_learning_hazard_review_history');
        $out['recordedVetoDecisions']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_learning_hazard_review_history h
          LEFT JOIN jrei_learning_proposals p ON p.proposal_id=h.proposal_id
          WHERE p.proposal_id IS NULL OR p.review_state<>'REJECTED'
            OR p.decision<>'REJECTED_OWNER_HAZARD'");
        $out['vetoStateConflicts']=(int)$q->fetchColumn();
        $predicate=jrJreiLearningHazardPredicate();
        $from=" FROM jrei_learning_proposals p
           JOIN jrei_learning_controls c ON c.id=1
           WHERE p.review_state IN ('PENDING','REVIEWED','APPROVED')
             AND $predicate";
        $q=$pdo->query("SELECT COUNT(*) $from");
        $out['totalRecordedHazardProposals']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT p.proposal_id,p.change_type,p.review_state,
          p.sample_count,c.minimum_reviewed_cases,p.privacy_incident_count,
          p.baseline_unsupported,p.challenger_unsupported,
          p.baseline_fairness_gap_bps,p.challenger_fairness_gap_bps,
          p.baseline_p95_ms,p.challenger_p95_ms,
          p.baseline_correct,p.challenger_correct
          $from ORDER BY p.created_at DESC,p.proposal_id DESC LIMIT 21");
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['truncated']=count($rows)>20;
        foreach(array_slice($rows,0,20) as $r){
            $out['items'][]=[
              'id'=>(string)$r['proposal_id'],
              'changeType'=>(string)$r['change_type'],
              'reviewState'=>(string)$r['review_state'],
              'insufficientSample'=>(int)$r['sample_count']<
                  (int)$r['minimum_reviewed_cases'],
              'reportedPrivacyIncident'=>(int)$r['privacy_incident_count']>0,
              'unsupportedCitationsIncreased'=>
                  (int)$r['challenger_unsupported']>
                  (int)$r['baseline_unsupported'],
              'fairnessGapIncreased'=>
                  (int)$r['challenger_fairness_gap_bps']>
                  (int)$r['baseline_fairness_gap_bps'],
              'p95LatencyIncreased'=>
                  (int)$r['challenger_p95_ms']>(int)$r['baseline_p95_ms'],
              'correctAnswersNotImproved'=>
                  (int)$r['challenger_correct']<=(int)$r['baseline_correct'],
              'notAutomaticallyDeployed'=>true
            ];
        }
        $out['available']=true;
    }catch(Throwable $e){
        $out['totalRecordedHazardProposals']=null;
        $out['items']=[];$out['truncated']=false;
        $out['recordedVetoDecisions']=null;
        $out['vetoStateConflicts']=null;
    }
    return $out;
}
function jrJreiLearningOwnerRejectHazard(PDO $pdo,string $actor,
    array $body): array {
    $id=$body['proposalId']??null;
    $expected=$body['expectedReviewState']??null;
    $reason=$body['reasonCode']??null;
    if(!is_string($id)||!validUuid($id)||
       !in_array($expected,['PENDING','REVIEWED','APPROVED'],true)||
       !in_array($reason,[
          'INSUFFICIENT_EVALUATION_SAMPLE','REPORTED_PRIVACY_INCIDENT',
          'UNSUPPORTED_SOURCE_REGRESSION','FAIRNESS_GAP_REGRESSION',
          'LATENCY_REGRESSION','NO_ACCURACY_IMPROVEMENT'],true)||
       ($body['confirmation']??null)!==
           'REJECT_RISKY_LEARNING_PROPOSAL_WITH_ORIGINAL_EVIDENCE')
        throw new InvalidArgumentException('invalid_learning_hazard_decision');
    try{
        $pdo->query('SELECT decision_id,proposal_id,observation_sha256
          FROM jrei_learning_hazard_review_history LIMIT 0');
    }catch(Throwable $e){
        throw new DomainException('learning_hazard_review_migration_required',0,$e);
    }
    $pdo->beginTransaction();
    try{
        $q=$pdo->query('SELECT minimum_reviewed_cases
          FROM jrei_learning_controls WHERE id=1 FOR UPDATE');
        $min=$q->fetchColumn();
        if($min===false||(int)$min<1)
            throw new DomainException('original_learning_policy_unavailable');
        $q=$pdo->prepare('SELECT proposal_id,review_state,change_type,
          sample_count,privacy_incident_count,
          baseline_unsupported,challenger_unsupported,
          baseline_fairness_gap_bps,challenger_fairness_gap_bps,
          baseline_p95_ms,challenger_p95_ms,
          baseline_correct,challenger_correct
          FROM jrei_learning_proposals WHERE proposal_id=? FOR UPDATE');
        $q->execute([$id]);$proposal=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($proposal)||$proposal['review_state']!==$expected)
            throw new DomainException('learning_hazard_original_state_changed');
        $hazards=[
          'INSUFFICIENT_EVALUATION_SAMPLE'=>
              (int)$proposal['sample_count']<(int)$min,
          'REPORTED_PRIVACY_INCIDENT'=>
              (int)$proposal['privacy_incident_count']>0,
          'UNSUPPORTED_SOURCE_REGRESSION'=>
              (int)$proposal['challenger_unsupported']>
              (int)$proposal['baseline_unsupported'],
          'FAIRNESS_GAP_REGRESSION'=>
              (int)$proposal['challenger_fairness_gap_bps']>
              (int)$proposal['baseline_fairness_gap_bps'],
          'LATENCY_REGRESSION'=>
              (int)$proposal['challenger_p95_ms']>
              (int)$proposal['baseline_p95_ms'],
          'NO_ACCURACY_IMPROVEMENT'=>
              (int)$proposal['challenger_correct']<=
              (int)$proposal['baseline_correct']
        ];
        if(!$hazards[$reason])
            throw new DomainException('human_veto_requires_current_recorded_hazard');
        $observed=hash('sha256',json_encode([
           'proposalId'=>$id,'changeType'=>$proposal['change_type'],
           'reviewState'=>$expected,
           'minimumRequiredSamples'=>(int)$min,
           'sampleCount'=>(int)$proposal['sample_count'],
           'privacyIncidentCount'=>(int)$proposal['privacy_incident_count'],
           'baselineUnsupported'=>(int)$proposal['baseline_unsupported'],
           'challengerUnsupported'=>(int)$proposal['challenger_unsupported'],
           'baselineFairnessGapBps'=>(int)$proposal['baseline_fairness_gap_bps'],
           'challengerFairnessGapBps'=>(int)$proposal['challenger_fairness_gap_bps'],
           'baselineP95Ms'=>(int)$proposal['baseline_p95_ms'],
           'challengerP95Ms'=>(int)$proposal['challenger_p95_ms'],
           'baselineCorrect'=>(int)$proposal['baseline_correct'],
           'challengerCorrect'=>(int)$proposal['challenger_correct']
        ],JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
        $at=time();
        // Preserve the ORIGINAL reviewer and original review timestamp.
        // The new owner veto actor/date live only in the immutable decision
        // ledger so the earlier scientific attribution is never destroyed.
        $q=$pdo->prepare("UPDATE jrei_learning_proposals
          SET review_state='REJECTED',decision='REJECTED_OWNER_HAZARD'
          WHERE proposal_id=? AND review_state=?");
        $q->execute([$id,$expected]);
        if($q->rowCount()!==1)
            throw new DomainException('learning_hazard_rejection_conflict');
        $q=$pdo->prepare('INSERT INTO jrei_learning_hazard_review_history
           (decision_id,proposal_id,prior_review_state,decision,reason_code,
            observation_sha256,decided_by_account_id,decided_at)
           VALUES(?,?,?,?,?,?,?,?)');
        $q->execute([uuidv4(),$id,$expected,'REJECTED_OWNER_HAZARD',
          $reason,$observed,$actor,$at]);
        if($q->rowCount()!==1)
            throw new DomainException('human_learning_veto_history_failed');
        operationsAudit($pdo,$actor,
          'jrei_learning_proposal_rejected_'.$reason,$id);
        $pdo->commit();
        return ['ok'=>true,'state'=>'REJECTED',
            'originalBenchmarkMetricsDeleted'=>false,
            'modelOrRetrievalRulesChanged'=>false,
            'scientificValidationEstablished'=>false,
            'privacyDataExported'=>false,
            'requiresIndependentReviewBeforeAnyFutureApproval'=>true];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
