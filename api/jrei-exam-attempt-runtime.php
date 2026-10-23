<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-exam-runtime-gates.php';
require_once __DIR__.'/jrei-exam-deterministic-scoring.php';

/**
 * JREI commercial attempt runtime, source-staged and OFF until final QA.
 * Bertina alone owns time, version, persistence, access and grading.
 * Windows AI workers must never be queried in these transactions.
 */
function jrExamAttemptRuntimeReady(PDO $pdo): bool {
    if(!jrExamCommercialSchemaReady($pdo))return false;
    try{
        foreach([
          'SELECT start_request_digest,response_revision,score_run_id FROM jrei_exam_commercial_attempts LIMIT 0',
          'SELECT item_id,key_state FROM jrei_exam_reviewed_answer_keys LIMIT 0',
          'SELECT scoring_model_id,policy_state FROM jrei_exam_scoring_policies LIMIT 0',
          'SELECT id,subject_id,consent_id FROM eco_assessment_sessions LIMIT 0',
          'SELECT id,session_id,item_id,selected_option_id FROM eco_assessment_responses LIMIT 0'
        ] as $sql)$pdo->query($sql);
        return true;
    }catch(Throwable $e){return false;}
}
function jrExamAttemptUuid(mixed $value): string {
    if(!is_string($value)||!validUuid($value))
        throw new InvalidArgumentException('invalid_exam_reference');
    return strtolower($value);
}
function jrExamAttemptStart(PDO $pdo,string $account,array $request,int $at): array {
    $offering=jrExamAttemptUuid($request['offeringId']??null);
    $subject=jrExamAttemptUuid($request['subjectId']??null);
    $requestId=jrExamAttemptUuid($request['requestId']??null);
    $lang=$request['locale']??null;
    if(!in_array($lang,['fa','en'],true)||
       ($request['confirmation']??null)!=='START_REVIEWED_EXAM')
        throw new InvalidArgumentException('invalid_exam_start');
    $requestHash=hash('sha256','jr-exam-start-v1|'.$requestId);
    $pdo->beginTransaction();
    try{
        // Lock the offering FIRST to serialize concurrent attempts and
        // prevent max-attempt bypass by multiple browser tabs/devices.
        $q=$pdo->prepare("SELECT o.offering_id,o.product_id,o.opens_at,
          o.closes_at,o.duration_seconds,o.max_attempts,o.offering_state,
          p.product_state,p.published_at,p.approved_by_account_id,
          p.instrument_version_id,p.scoring_model_id,p.content_rights_state,
          p.question_key_review_state,p.delivery_review_state,
          b.status AS blueprint_state,b.approved_by_account_id AS blueprint_reviewer,
          b.format_review_state,b.timing_review_state,b.scoring_review_state,
          v.status AS instrument_state,v.approved_by_account_id AS instrument_reviewer
          FROM jrei_exam_commercial_offerings o
          JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
          JOIN jrei_exam_blueprints b ON b.blueprint_id=p.blueprint_id
          JOIN eco_instrument_versions v ON v.id=p.instrument_version_id
          WHERE o.offering_id=? FOR UPDATE");
        $q->execute([$offering]);$o=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($o)||$o['offering_state']!=='PUBLISHED'||
           $o['product_state']!=='PUBLISHED'||$o['blueprint_state']!=='APPROVED'||
           $o['instrument_state']!=='PUBLISHED'||
           $o['published_at']===null||
           $o['approved_by_account_id']===null||
           $o['blueprint_reviewer']===null||
           $o['instrument_reviewer']===null||
           $o['content_rights_state']!=='APPROVED'||
           $o['question_key_review_state']!=='APPROVED'||
           $o['delivery_review_state']!=='APPROVED'||
           $o['format_review_state']!=='APPROVED'||
           $o['timing_review_state']!=='APPROVED'||
           $o['scoring_review_state']!=='APPROVED'||
           !validUuid((string)$o['scoring_model_id']))
            throw new DomainException('exam_publication_review_incomplete');
        $opens=(int)$o['opens_at'];$closes=(int)$o['closes_at'];
        $duration=(int)$o['duration_seconds'];
        $limit=(int)$o['max_attempts'];
        if($opens>$at||$closes<=$at||
           $duration<60||$duration>28800||
           $limit<1||$limit>10)
            throw new DomainException('exam_time_or_attempt_limit_unavailable');
        // The same client retry ID returns exactly the prior attempt.
        // It cannot be reused for another learner subject or language.
        $q=$pdo->prepare("SELECT a.attempt_id,a.attempt_state,
          a.starts_at,a.deadline_at,s.subject_id,s.locale
          FROM jrei_exam_commercial_attempts a
          JOIN eco_assessment_sessions s ON s.id=a.assessment_session_id
          WHERE a.account_id=? AND a.offering_id=?
            AND a.start_request_digest=? FOR UPDATE");
        $q->execute([$account,$offering,$requestHash]);$repeat=$q->fetch(PDO::FETCH_ASSOC);
        if(is_array($repeat)){
            if($repeat['subject_id']!==$subject||$repeat['locale']!==$lang)
                throw new DomainException('exam_start_idempotency_conflict');
            $pdo->commit();
            return [
              'ok'=>true,'attemptId'=>$repeat['attempt_id'],
              'state'=>$repeat['attempt_state'],
              'startedAt'=>$repeat['starts_at']===null?null:(int)$repeat['starts_at'],
              'deadlineAt'=>$repeat['deadline_at']===null?null:(int)$repeat['deadline_at'],
              'idempotentReplay'=>true,
              'liveItemDeliveryVerified'=>false
            ];
        }
        $entitlement=jrExamTrustedEntitlement($pdo,$account,$offering,$at);
        $consentId=jrExamAdultSubjectConsent($pdo,$account,$subject);
        $q=$pdo->prepare("SELECT attempt_number FROM jrei_exam_commercial_attempts
          WHERE offering_id=? AND account_id=? ORDER BY attempt_number DESC
          LIMIT 1 FOR UPDATE");
        $q->execute([$offering,$account]);
        $highest=$q->fetchColumn();
        $next=$highest===false?1:(int)$highest+1;
        if($next>$limit)
            throw new DomainException('exam_attempt_limit_reached');
        // No attempt begins with missing/unreviewed choices or key; this
        // calculation does not publish a scientific score.
        $score=jrExamVerifiedMcqContext($pdo,
          (string)$o['instrument_version_id'],(string)$o['scoring_model_id']);
        if(count($score['items'])<1)
            throw new DomainException('exam_items_not_released');
        $sessionId=uuidv4();$attemptId=uuidv4();
        $deadline=min($closes,$at+$duration,
          (int)$entitlement['expires_at']);
        if($deadline<=$at)throw new DomainException('exam_entitlement_time_expired');
        $q=$pdo->prepare("INSERT INTO eco_assessment_sessions
          (id,subject_id,instrument_version_id,consent_id,
           facilitator_account_id,locale,status,started_at)
          VALUES (?,?,?,?,NULL,?,'IN_PROGRESS',FROM_UNIXTIME(?))");
        $q->execute([$sessionId,$subject,
           $o['instrument_version_id'],$consentId,$lang,$at]);
        $q=$pdo->prepare("INSERT INTO jrei_exam_commercial_attempts
          (attempt_id,offering_id,entitlement_id,account_id,
           assessment_session_id,attempt_number,attempt_state,
           starts_at,deadline_at,start_request_digest,created_at,updated_at)
          VALUES (?,?,?,?,?,?,'IN_PROGRESS',?,?,?,?,?)");
        $q->execute([$attemptId,$offering,$entitlement['entitlement_id'],
           $account,$sessionId,$next,$at,$deadline,$requestHash,$at,$at]);
        $pdo->commit();
        return [
          'ok'=>true,'attemptId'=>$attemptId,'state'=>'IN_PROGRESS',
          'attemptNumber'=>$next,'startedAt'=>$at,'deadlineAt'=>$deadline,
          'responseRevision'=>0,'idempotentReplay'=>false,
          'liveItemDeliveryVerified'=>false,
          'scientificValidationEstablished'=>false
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
