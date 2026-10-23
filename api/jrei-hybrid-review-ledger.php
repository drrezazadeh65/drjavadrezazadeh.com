<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Optional append-only owner review rationale ledger (no free text, no PII).
 * The existing operationsAudit call must still be made in the SAME
 * transaction even if this additive table has not yet been installed.
 */
function jrHybridReviewLedgerReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT review_id FROM jrei_hybrid_job_reviews LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
function jrHybridReviewReasons(): array {
    return [
      'ACKNOWLEDGE'=>[
        'METRICS_INSPECTED_NO_PUBLICATION',
        'RESEARCH_VERIFICATION_OUTSTANDING',
        'LEGACY_REVIEW_NO_REASON'
      ],
      'REJECT'=>[
        'UNSUPPORTED_EVALUATION_METRICS',
        'CORPUS_APPROVAL_REVOKED',
        'PROTOCOL_MISMATCH',
        'LEGACY_REVIEW_NO_REASON'
      ],
      'CLOSE_UNKNOWN'=>[
        'UNKNOWN_OUTCOME_NOT_RETRIED',
        'CORPUS_APPROVAL_REVOKED',
        'LEGACY_REVIEW_NO_REASON'
      ]
    ];
}
function jrHybridReviewCode(mixed $action,mixed $code): ?string {
    if(!is_string($action))return null;
    $permitted=jrHybridReviewReasons()[$action]??null;
    // Old MFA operation clients may still post without a rationale.
    // Preserve forward compatibility while exposing the missing rationale.
    if($code===null)$code='LEGACY_REVIEW_NO_REASON';
    return is_string($code)&&is_array($permitted)&&
      in_array($code,$permitted,true)?$code:null;
}
function jrHybridRecordReviewLedger(PDO $pdo,string $jobId,
    string $actor,string $decision,string $code,int $revision,
    ?string $resultDigest,int $at): bool {
    if(!jrHybridReviewLedgerReady($pdo))return false;
    $q=$pdo->prepare('INSERT INTO jrei_hybrid_job_reviews
       (review_id,job_id,decision_code,rationale_code,
        job_revision_before,result_digest,reviewed_by_account_id,reviewed_at)
       VALUES (?,?,?,?,?,?,?,?)');
    $q->execute([
       jrHybridNewUuid(),$jobId,$decision,$code,$revision,
       $resultDigest,$actor,$at
    ]);
    return $q->rowCount()===1;
}
function jrHybridReviewLedgerSnapshot(PDO $pdo): array {
    $ready=jrHybridReviewLedgerReady($pdo);
    $out=['reviewLedgerReady'=>$ready,'reviewHistory'=>[]];
    if(!$ready)return $out;
    $q=$pdo->query('SELECT job_id,decision_code,rationale_code,
       job_revision_before,result_digest,reviewed_at
       FROM jrei_hybrid_job_reviews
       ORDER BY reviewed_at DESC,review_id DESC LIMIT 40');
    foreach($q as $r)$out['reviewHistory'][]=[
       'jobId'=>$r['job_id'],
       'decision'=>$r['decision_code'],
       'rationaleCode'=>$r['rationale_code'],
       'revisionBefore'=>(int)$r['job_revision_before'],
       'resultDigest'=>$r['result_digest'],
       'reviewedAt'=>(int)$r['reviewed_at']
    ];
    return $out;
}
