<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ai-benchmark-intake.php';

/** Original MFA administration; reviewed cases cannot authorize public AI. */
function jrAiOwnerReviewBenchmarkCase(PDO $pdo,string $actor,array $body): array {
    if(!jrAiBenchmarkSchemaReady($pdo))
        throw new DomainException('benchmark_schema_unavailable');
    $id=$body['caseId']??null;
    $digest=$body['specSha256']??null;
    $choice=$body['decision']??null;
    if(!is_string($id)||!validUuid($id)||
       !is_string($digest)||strlen($digest)!==64||
       !ctype_xdigit($digest)||
       !in_array($choice,['APPROVE_CASE','REJECT_CASE'],true)||
       ($body['confirmation']??null)!=='REVIEW_BENCHMARK_WITHOUT_RUNNING_MODEL')
        throw new InvalidArgumentException('benchmark_review_invalid');
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('SELECT * FROM jrei_ai_governed_benchmark_cases WHERE case_id=? FOR UPDATE');
        $q->execute([$id]);
        $case=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($case)||$case['case_state']!=='DRAFT'||
           $case['author_account_id']===$actor||
           !hash_equals($digest,(string)$case['benchmark_spec_sha256'])||
           !hash_equals($digest,jrAiBenchmarkSpecDigest($case)))
            throw new DomainException('benchmark_not_independent_or_changed');
        if($choice==='APPROVE_CASE'){
            if(jrAiPublicTextSensitive((string)$case['question_text']))
                throw new DomainException('benchmark_sensitive_question');
            $references=jrAiPublicEvidence($case['question_text'],$case['locale']);
            $evidenceHash=hash('sha256',json_encode($references,
                JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
            if(!$references||!hash_equals((string)$case['source_evidence_sha256'],$evidenceHash))
                throw new DomainException('benchmark_source_digest_stale');
        }
        $approved=$choice==='APPROVE_CASE';
        $q=$pdo->prepare("UPDATE jrei_ai_governed_benchmark_cases SET
            case_state=?,independent_reviewer_account_id=?,
            reviewed_at=?,updated_at=?
            WHERE case_id=? AND case_state='DRAFT'");
        $at=time();$q->execute([$approved?'APPROVED':'REJECTED',$actor,$at,$at,$id]);
        if($q->rowCount()!==1)
            throw new DomainException('benchmark_review_conflict');
        operationsAudit($pdo,$actor,
            $approved?'jrei_benchmark_case_approved':'jrei_benchmark_case_rejected',$id);
        $pdo->commit();
        return ['ok'=>true,'state'=>$approved?'APPROVED':'REJECTED',
            'realInferenceExecuted'=>false,'independentModelQualityProven'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
