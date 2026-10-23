<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ai-governed-benchmarks.php';

/**
 * Expert scores are genuine human judgments, NEVER model self-reviews.
 * Case approver and response reviewer must be different accounts.
 * Original MFA operations route performs all authorisation and auditing.
 */
function jrAiOwnerGradeBenchmark(PDO $pdo,string $actor,array $body): array {
    if(!jrAiBenchmarkSchemaReady($pdo))
        throw new DomainException('benchmark_schema_unavailable');
    $id=$body['runId']??null;
    $evidence=$body['expertReviewEvidenceSha256']??null;
    $labels=['factual','citations','pedagogy','safety'];
    if(!is_string($id)||!validUuid($id)||
       !is_string($evidence)||strlen($evidence)!==64||
       !ctype_xdigit($evidence)||
       ($body['confirmation']??null)!=='EXPERT_EVALUATION_NOT_MODEL_SELF_GRADE')
        throw new InvalidArgumentException('expert_review_invalid');
    $scores=[];
    foreach($labels as $label){
        $v=$body[$label]??null;
        if(!is_int($v)||$v<0||$v>4)
            throw new InvalidArgumentException('expert_score_outside_rubric');
        $scores[]=$v;
    }
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("SELECT r.run_state,r.answer_sha256,
          r.independently_graded,r.structural_citations_passed,
          c.author_account_id,c.independent_reviewer_account_id
          FROM jrei_ai_governed_benchmark_runs r
          JOIN jrei_ai_governed_benchmark_cases c ON c.case_id=r.case_id
          WHERE r.run_id=? FOR UPDATE");
        $q->execute([$id]);$r=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($r)||
           $r['run_state']!=='ANSWER_PENDING_INDEPENDENT_REVIEW'||
           (int)$r['independently_graded']!==0||
           !is_string($r['answer_sha256'])||
           $r['independent_reviewer_account_id']===null||
           $r['independent_reviewer_account_id']===$actor||
           $r['author_account_id']===$actor)
            throw new DomainException('independent_expert_reviewer_required');
        $quality=(int)round(array_sum($scores)*100/16);
        $q=$pdo->prepare("UPDATE jrei_ai_governed_benchmark_runs SET
           run_state='EXPERT_REVIEWED',independently_graded=1,
           expert_quality_score=?,factual_alignment_grade=?,
           citation_fidelity_grade=?,pedagogical_utility_grade=?,
           safety_grade=?,expert_review_evidence_sha256=?,
           expert_reviewer_account_id=?,expert_reviewed_at=?
           WHERE run_id=? AND run_state='ANSWER_PENDING_INDEPENDENT_REVIEW'
             AND independently_graded=0");
        $q->execute([$quality,...$scores,strtolower($evidence),
             $actor,time(),$id]);
        if($q->rowCount()!==1)
            throw new DomainException('expert_review_concurrent_change');
        operationsAudit($pdo,$actor,'jrei_ai_independent_benchmark_review',$id);
        $pdo->commit();
        return ['ok'=>true,'runId'=>$id,'expertScore'=>$quality,
           'rubricVersion'=>'FOUR_DOMAIN_0_TO_4_V1',
           'modelSelfGraded'=>false,'expertReviewRecorded'=>true,
           'modelScientificallyValidatedGlobally'=>false,
           'automaticPublicModelPromotion'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
