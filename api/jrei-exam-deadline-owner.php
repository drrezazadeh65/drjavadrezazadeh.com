<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * MFA SUPER_ADMIN-only pending expired attempt triage.
 *
 * No student answers, question text, contact details, scores, provider
 * transaction or raw personal identity leaves the original mother DB.
 * Terminal owner review is NOT a grade, refund, resit or publication.
 */
function jrExamDeadlineOwnerBacklog(PDO $pdo): array {
    $out=[
      'schema'=>'jr.jrei.deadline-owner-review.v1',
      'available'=>false,'pending'=>null,'items'=>[],
      'mayAutoGrade'=>false,'buyerObligationsMayExist'=>true
    ];
    if(!jrExamCommercialSchemaReady($pdo))return $out;
    try {
        $q=$pdo->query("SELECT a.attempt_id,a.offering_id,
            a.deadline_at,a.updated_at,a.revision,
            p.product_code,p.division,p.title_fa,p.title_en,
            e.grant_reason,
            CASE WHEN a.score_run_id IS NULL THEN 0 ELSE 1 END AS has_score_run
          FROM jrei_exam_commercial_attempts a
          JOIN jrei_exam_commercial_offerings o ON o.offering_id=a.offering_id
          JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
          JOIN jrei_exam_commercial_entitlements e
            ON e.entitlement_id=a.entitlement_id
          WHERE a.attempt_state='TIMED_OUT_PENDING_REVIEW'
          ORDER BY a.deadline_at ASC,a.attempt_id ASC LIMIT 41");
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['available']=true;
        $out['hasMorePossibly']=count($rows)>40;
        $out['items']=[];
        foreach(array_slice($rows,0,40) as $r)$out['items'][]=[
          'attemptId'=>(string)$r['attempt_id'],
          'offeringId'=>(string)$r['offering_id'],
          'deadlineAt'=>(int)$r['deadline_at'],
          'updatedAt'=>(int)$r['updated_at'],
          'revision'=>(int)$r['revision'],
          'productCode'=>(string)$r['product_code'],
          'division'=>(string)$r['division'],
          'titleFa'=>(string)$r['title_fa'],
          'titleEn'=>$r['title_en'],
          'grantReason'=>(string)$r['grant_reason'],
          'hasScoreRun'=>(int)$r['has_score_run']===1,
          'personalDataIncluded'=>false
        ];
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_exam_commercial_attempts
          WHERE attempt_state='TIMED_OUT_PENDING_REVIEW'");
        $out['pending']=(int)$q->fetchColumn();
    }catch(Throwable $e){
        // Unknown, never empty/zero.
        $out['available']=false;$out['pending']=null;$out['items']=[];
    }
    return $out;
}
function jrExamDeadlineOwnerClose(PDO $pdo,string $actor,array $body): array {
    if(!jrExamCommercialSchemaReady($pdo))
        throw new DomainException('exam_commercial_schema_unavailable');
    $id=$body['attemptId']??null;
    $revision=$body['revision']??null;
    $reason=$body['reasonCode']??null;
    if(!is_string($id)||!validUuid($id)||
       !is_int($revision)||$revision<1||
       !in_array($reason,['CANDIDATE_DISCONNECTED','TIME_EXPIRED',
           'CONTENT_OR_ACCESS_SUSPENDED','SERVICE_REVIEW_RECORDED'],true)||
       ($body['confirmation']??null)!=='CLOSE_UNGRADED_EXPIRED_ATTEMPT')
        throw new InvalidArgumentException('invalid_expired_attempt_review');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("SELECT attempt_state,revision,score_run_id,
            submission_digest,assessment_session_id
            FROM jrei_exam_commercial_attempts
            WHERE attempt_id=? FOR UPDATE");
        $q->execute([$id]);$a=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($a)||$a['attempt_state']!=='TIMED_OUT_PENDING_REVIEW'||
           (int)$a['revision']!==$revision||
           $a['score_run_id']!==null||$a['submission_digest']!==null)
            throw new DomainException('expired_attempt_owner_review_conflict');
        $q=$pdo->prepare("SELECT status FROM eco_assessment_sessions
          WHERE id=? FOR UPDATE");
        $q->execute([$a['assessment_session_id']]);
        if($q->fetchColumn()!=='EXPIRED')
            throw new DomainException('original_exam_session_not_expired');
        $q=$pdo->prepare("UPDATE jrei_exam_commercial_attempts
           SET attempt_state='TIMED_OUT_CLOSED',updated_at=?,revision=revision+1
           WHERE attempt_id=? AND revision=?
             AND attempt_state='TIMED_OUT_PENDING_REVIEW'
             AND score_run_id IS NULL");
        $q->execute([time(),$id,$revision]);
        if($q->rowCount()!==1)
            throw new DomainException('expired_attempt_owner_review_conflict');
        // The original operations audit retains the reason without a free
        // text field or candidate contact details.
        operationsAudit($pdo,$actor,'jrei_exam_deadline_closed_'.$reason,$id);
        $pdo->commit();
        return ['ok'=>true,'state'=>'TIMED_OUT_CLOSED',
          'gradeCreated'=>false,'answerRowsDeleted'=>0,
          'refundIssued'=>false,'financialReviewStillRequired'=>true];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
