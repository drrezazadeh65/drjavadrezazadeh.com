<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ai-improvement-sensors.php';

/** A signal is a starting point for investigation, not a tested code fix. */
function jrAiOwnerDispositionImprovement(PDO $pdo,string $actor,
    array $body): array {
    if(!jrAiImprovementSchemaReady($pdo))
        throw new DomainException('improvement_schema_unavailable');
    $id=$body['opportunityId']??null;
    $decision=$body['decision']??null;
    if(!is_string($id)||!validUuid($id)||
       !in_array($decision,[
          'ACKNOWLEDGED_FOR_INVESTIGATION',
          'REJECTED_NOT_REPRODUCIBLE'],true)||
       ($body['confirmation']??null)!==
          'REVIEW_OBSERVED_SIGNAL_WITHOUT_CODE_CHANGES')
        throw new InvalidArgumentException('improvement_disposition_invalid');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("SELECT owner_state,rule_code
           FROM jrei_ai_improvement_opportunities
           WHERE opportunity_id=? FOR UPDATE");
        $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||$row['owner_state']!=='PROPOSED_UNVERIFIED')
            throw new DomainException('improvement_disposition_conflict');
        $q=$pdo->prepare("UPDATE jrei_ai_improvement_opportunities SET
          owner_state=?,owner_reviewer_account_id=?,owner_reviewed_at=?,
          updated_at=? WHERE opportunity_id=?
          AND owner_state='PROPOSED_UNVERIFIED'
          AND code_change_approved=0 AND public_release_approved=0");
        $at=time();$q->execute([$decision,$actor,$at,$at,$id]);
        if($q->rowCount()!==1)
            throw new DomainException('improvement_disposition_race');
        operationsAudit($pdo,$actor,
          $decision==='ACKNOWLEDGED_FOR_INVESTIGATION'?
            'jrei_ai_improvement_triaged_for_investigation':
            'jrei_ai_improvement_unreproducible',$id);
        $pdo->commit();
        return [
          'ok'=>true,'state'=>$decision,
          'actualFixProven'=>false,'codeWrittenAutomatically'=>false,
          'testsPerformed'=>false,'pullRequestMerged'=>false,
          'productionDeployed'=>false
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
