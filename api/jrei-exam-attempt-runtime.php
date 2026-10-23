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
          'SELECT id,session_id,item_id,selected_option_id FROM eco_assessment_responses LIMIT 0',
          'SELECT attempt_id,score_run_id,submission_sha256,output_sha256,raw_score_millipoints FROM jrei_exam_preliminary_grade_snapshots LIMIT 0'
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
        $at=time(); // Re-evaluate after the offering row lock and any wait.
        if($opens>$at||$closes<=$at||
           $duration<60||$duration>28800||$limit<1||$limit>10)
            throw new DomainException('exam_time_or_attempt_limit_unavailable');
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
        // Never create a timed session unless every original prompt and
        // option can actually be served from the verified private archive.
        $published=jrExamDeliveredItemSet($pdo,
          (string)$o['instrument_version_id'],$lang);
        if(count($published)!==count($score['items']))
            throw new DomainException('reviewed_key_and_prompt_count_conflict');
        $reviewedOptions=[];
        foreach($score['items'] as $item){
            $reviewedOptions[$item['itemId']]=$item['allowedOptionIds'];
        }
        foreach($published as $item){
            $id=$item['itemId'];
            if(!isset($reviewedOptions[$id]))
                throw new DomainException('published_question_set_not_reviewed');
            $actual=array_column($item['options'],'id');
            if(count($actual)!==count($reviewedOptions[$id])||
               array_diff($actual,$reviewedOptions[$id])||
               array_diff($reviewedOptions[$id],$actual))
                throw new DomainException('published_item_option_lineage_conflict');
        }
        // A publisher can withdraw approval before the expensive original
        // item checks. Do not start using a stale earlier timestamp.
        $at=time();
        if($at<$opens||$at>=$closes)
            throw new DomainException('exam_window_elapsed');
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


/** Read the original canonical session under an attempt row lock. */
function jrExamLockedAttempt(PDO $pdo,string $account,string $attemptId): array {
    $q=$pdo->prepare("SELECT
      a.attempt_id,a.offering_id,a.entitlement_id,a.account_id,
      a.assessment_session_id,a.attempt_state,a.deadline_at,
      a.response_revision,a.submission_digest,a.score_run_id,
      s.subject_id,s.instrument_version_id,s.consent_id,s.status AS session_state,
      p.scoring_model_id,o.offering_state,p.product_state
      FROM jrei_exam_commercial_attempts a
      JOIN eco_assessment_sessions s ON s.id=a.assessment_session_id
      JOIN jrei_exam_commercial_offerings o ON o.offering_id=a.offering_id
      JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
      WHERE a.attempt_id=? AND a.account_id=? FOR UPDATE");
    $q->execute([$attemptId,$account]);$r=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($r))throw new DomainException('exam_attempt_not_owned');
    return $r;
}

/**
 * Optimistic autosave: a version conflict NEVER overwrites the newer answer.
 * One original assessment item/selected original option per revision.
 * A null selected option explicitly clears a formerly selected answer.
 */
function jrExamAttemptSave(PDO $pdo,string $account,array $request,int $at): array {
    $attemptId=jrExamAttemptUuid($request['attemptId']??null);
    $itemId=jrExamAttemptUuid($request['itemId']??null);
    $selected=$request['selectedOptionId']??null;
    $revision=$request['expectedResponseRevision']??null;
    if($selected!==null)$selected=jrExamAttemptUuid($selected);
    if(!is_int($revision)||$revision<0||$revision>1000000||
       ($request['confirmation']??null)!=='SAVE_EXAM_RESPONSE')
        throw new InvalidArgumentException('invalid_autosave_request');
    $pdo->beginTransaction();
    try{
        $attempt=jrExamLockedAttempt($pdo,$account,$attemptId);
        if($attempt['attempt_state']!=='IN_PROGRESS'||
           $attempt['session_state']!=='IN_PROGRESS'||
           $attempt['offering_state']!=='PUBLISHED'||
           $attempt['product_state']!=='PUBLISHED'||
           time()>=(int)$attempt['deadline_at'])
            throw new DomainException('exam_not_accepting_responses');
        jrExamTrustedEntitlement($pdo,$account,$attempt['offering_id'],time());
        $latestConsent=jrExamAdultSubjectConsent($pdo,$account,$attempt['subject_id']);
        if($attempt['consent_id']!==$latestConsent)
            throw new DomainException('original_exam_consent_superseded');
        $storedRevision=(int)$attempt['response_revision'];
        if($storedRevision!==$revision)
            throw new DomainException('exam_response_revision_conflict');
        $q=$pdo->prepare('SELECT item_type FROM eco_assessment_items
          WHERE id=? AND instrument_version_id=? LIMIT 1');
        $q->execute([$itemId,$attempt['instrument_version_id']]);
        if($q->fetchColumn()!=='SINGLE_CHOICE')
            throw new InvalidArgumentException('item_not_in_this_exam');
        if($selected!==null){
            $q=$pdo->prepare('SELECT 1 FROM eco_assessment_options
              WHERE id=? AND item_id=? LIMIT 1');
            $q->execute([$selected,$itemId]);
            if($q->fetchColumn()===false)
                throw new InvalidArgumentException('option_not_in_item');
            $q=$pdo->prepare('INSERT INTO eco_assessment_responses
              (id,session_id,item_id,selected_option_id,recorded_at)
              VALUES (?,?,?,?,FROM_UNIXTIME(?))
              ON DUPLICATE KEY UPDATE selected_option_id=VALUES(selected_option_id),
                response_object_id=NULL,response_numeric=NULL,
                recorded_at=VALUES(recorded_at)');
            $q->execute([uuidv4(),$attempt['assessment_session_id'],$itemId,
              $selected,$at]);
        }else{
            $q=$pdo->prepare('DELETE FROM eco_assessment_responses
              WHERE session_id=? AND item_id=?');
            $q->execute([$attempt['assessment_session_id'],$itemId]);
        }
        $q=$pdo->prepare('UPDATE jrei_exam_commercial_attempts
          SET response_revision=response_revision+1,revision=revision+1,
            last_saved_at=?,updated_at=?
          WHERE attempt_id=? AND response_revision=? AND attempt_state=?');
        $q->execute([$at,$at,$attemptId,$revision,'IN_PROGRESS']);
        if($q->rowCount()!==1)
            throw new DomainException('exam_response_revision_conflict');
        $pdo->commit();
        return [
          'ok'=>true,'attemptId'=>$attemptId,'savedItemId'=>$itemId,
          'responseRevision'=>$revision+1,'savedAt'=>$at,
          'scoringPerformed'=>false,'answersPublished'=>false
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/**
 * Idempotent final submission: submit the entire server-persisted answer
 * snapshot, not a client-provided score or a last-second uncommitted form.
 * The actual score run is an original eco_score_runs row, still UNREVIEWED.
 */
function jrExamAttemptSubmit(PDO $pdo,string $account,array $request,int $at): array {
    $attemptId=jrExamAttemptUuid($request['attemptId']??null);
    $revision=$request['expectedResponseRevision']??null;
    if(!is_int($revision)||$revision<0||$revision>1000000||
       ($request['confirmation']??null)!=='FINAL_SUBMIT_EXAM')
        throw new InvalidArgumentException('invalid_final_submission');
    $pdo->beginTransaction();
    try{
        $a=jrExamLockedAttempt($pdo,$account,$attemptId);
        if(in_array($a['attempt_state'],['SUBMITTED','TIMED_OUT'],true)){
            $pdo->commit();
            return ['ok'=>true,'attemptId'=>$attemptId,
              'state'=>$a['attempt_state'],'idempotentReplay'=>true,
              'submissionDigest'=>$a['submission_digest'],
              'reportPublished'=>false];
        }
        if($a['attempt_state']!=='IN_PROGRESS'||
           $a['session_state']!=='IN_PROGRESS'||
           $a['offering_state']!=='PUBLISHED'||
           $a['product_state']!=='PUBLISHED'||
           !validUuid((string)$a['scoring_model_id']))
            throw new DomainException('exam_submission_state_conflict');
        if((int)$a['response_revision']!==$revision)
            throw new DomainException('exam_response_revision_conflict');
        // Offline clients may FINALIZE answers already saved before the
        // deadline during a small bounded grace, but may not save new answers.
        // Never accept a stale request timestamp after transaction lock waits
        // or treat a months-late submit as a valid timed-out submission.
        $at=time();
        $deadline=(int)$a['deadline_at'];
        if($deadline<1||$at>$deadline+120)
            throw new DomainException('exam_finalization_window_closed');
        $effectiveAt=min($at,max(1,$deadline-1));
        jrExamTrustedEntitlement($pdo,$account,$a['offering_id'],$effectiveAt);
        $latestConsent=jrExamAdultSubjectConsent($pdo,$account,$a['subject_id']);
        if($a['consent_id']!==$latestConsent)
            throw new DomainException('original_exam_consent_superseded');
        $context=jrExamVerifiedMcqContext($pdo,$a['instrument_version_id'],
          $a['scoring_model_id']);
        $q=$pdo->prepare("SELECT r.item_id,r.selected_option_id
          FROM eco_assessment_responses r
          WHERE r.session_id=? ORDER BY r.item_id ASC FOR UPDATE");
        $q->execute([$a['assessment_session_id']]);
        $answers=[];
        foreach($q as $row){
            $id=(string)$row['item_id'];
            if(isset($answers[$id])||$row['selected_option_id']===null)
                throw new DomainException('exam_response_storage_conflict');
            $answers[$id]=(string)$row['selected_option_id'];
        }
        $grade=jrExamDeterministicRawGrade($context,$answers);
        ksort($answers,SORT_STRING);
        $source=json_encode([
          $a['assessment_session_id'],$context['instrumentVersionId'],
          $context['scoringModelId'],$context['policySha256'],$answers
        ],JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        $digest=hash('sha256',$source);
        $output=json_encode($grade,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        $outputDigest=hash('sha256',$output);
        $scoreId=uuidv4();
        $q=$pdo->prepare("INSERT INTO eco_score_runs
          (id,session_id,scoring_model_id,input_sha256,output_sha256,
            state,executed_at,human_review_required)
          VALUES (?,?,?,?,?,'UNREVIEWED',FROM_UNIXTIME(?),1)");
        $q->execute([$scoreId,$a['assessment_session_id'],
            $a['scoring_model_id'],$digest,$outputDigest,$at]);
        // Materialise the exact deterministic output in the same original
        // mother-DB transaction as the canonical eco_score_runs evidence.
        // This permits durable private report reconstruction while keeping
        // option choices, answer keys and identifying learner data ONLY in
        // their original authoritative tables.
        $q=$pdo->prepare("INSERT INTO jrei_exam_preliminary_grade_snapshots
          (attempt_id,score_run_id,assessment_session_id,scoring_model_id,
            scoring_policy_sha256,submission_sha256,output_sha256,
            question_count,correct_count,incorrect_count,unanswered_count,
            raw_score_millipoints,maximum_millipoints,status,recorded_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'PRELIMINARY_UNREVIEWED',?)");
        $q->execute([$attemptId,$scoreId,$a['assessment_session_id'],
          $a['scoring_model_id'],$context['policySha256'],$digest,
          $outputDigest,$grade['questionCount'],$grade['correctCount'],
          $grade['incorrectCount'],$grade['unansweredCount'],
          $grade['rawScoreMillipoints'],$grade['maximumMillipoints'],$at]);
        if($q->rowCount()!==1)
            throw new DomainException('preliminary_grade_snapshot_write_failed');
        $timedOut=$at>(int)$a['deadline_at'];
        $state=$timedOut?'TIMED_OUT':'SUBMITTED';
        $q=$pdo->prepare('UPDATE jrei_exam_commercial_attempts
          SET attempt_state=?,submitted_at=?,submission_digest=?,
            score_run_id=?,updated_at=?,revision=revision+1
          WHERE attempt_id=? AND attempt_state=? AND response_revision=?');
        $q->execute([$state,$at,$digest,$scoreId,$at,$attemptId,
            'IN_PROGRESS',$revision]);
        if($q->rowCount()!==1)
            throw new DomainException('exam_submission_race');
        $q=$pdo->prepare("UPDATE eco_assessment_sessions
          SET status='SUBMITTED',submitted_at=FROM_UNIXTIME(?)
          WHERE id=? AND status='IN_PROGRESS'");
        $q->execute([$at,$a['assessment_session_id']]);
        if($q->rowCount()!==1)
            throw new DomainException('exam_assessment_session_race');
        $pdo->commit();
        // Results remain private, preliminary, and owner-reviewable;
        // they are not psychometric ranks, certificates or public scorecards.
        return [
          'ok'=>true,'attemptId'=>$attemptId,'state'=>$state,
          'idempotentReplay'=>false,'submissionDigest'=>$digest,
          'preliminaryRawGrade'=>$grade,'reportPublished'=>false
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}


/**
 * Candidate resume projection: only previously selected original option IDs,
 * never prompt objects, verified answer keys, solutions, source URLs or scores.
 * An expired/withdrawn exam cannot be continued through this read.
 */
function jrExamAttemptProgress(PDO $pdo,string $account,string $id): array {
    $attemptId=jrExamAttemptUuid($id);
    $q=$pdo->prepare("SELECT a.attempt_id,a.attempt_state,a.deadline_at,
      a.response_revision,a.starts_at,a.submitted_at,
      s.id AS session_id,s.subject_id,s.status AS session_state,
      s.consent_id,a.offering_id,o.offering_state,p.product_state
      FROM jrei_exam_commercial_attempts a
      JOIN eco_assessment_sessions s ON s.id=a.assessment_session_id
      JOIN eco_subjects sub ON sub.id=s.subject_id
      JOIN jrei_exam_commercial_offerings o ON o.offering_id=a.offering_id
      JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
      WHERE a.attempt_id=? AND a.account_id=? AND sub.owner_account_id=?
      LIMIT 1");
    $q->execute([$attemptId,$account,$account]);$a=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($a))throw new DomainException('exam_attempt_not_owned');
    $at=time();
    $canResume=$a['attempt_state']==='IN_PROGRESS'&&
        $a['session_state']==='IN_PROGRESS'&&
        $a['offering_state']==='PUBLISHED'&&
        $a['product_state']==='PUBLISHED'&&
        (int)$a['deadline_at']>$at;
    $responses=[];
    if($canResume){
        // Do not serve even the candidate's saved choices after scoped
        // consent is withdrawn. No sensitive data in exception messages.
        $consent=jrExamAdultSubjectConsent($pdo,$account,$a['subject_id']);
        if($consent!==$a['consent_id'])
            throw new DomainException('original_exam_consent_superseded');
        jrExamTrustedEntitlement($pdo,$account,$a['offering_id'],$at);
        $q=$pdo->prepare('SELECT r.item_id,r.selected_option_id
          FROM eco_assessment_responses r
          WHERE r.session_id=? ORDER BY r.item_id LIMIT 300');
        $q->execute([$a['session_id']]);
        foreach($q as $r)$responses[]=[
           'itemId'=>$r['item_id'],'selectedOptionId'=>$r['selected_option_id']
        ];
    }
    return ['ok'=>true,'schema'=>'jr.jrei.exam-progress.v1',
      'attemptId'=>$attemptId,'state'=>$a['attempt_state'],
      'deadlineAt'=>$a['deadline_at']===null?null:(int)$a['deadline_at'],
      'startedAt'=>$a['starts_at']===null?null:(int)$a['starts_at'],
      'submittedAt'=>$a['submitted_at']===null?null:(int)$a['submitted_at'],
      'responseRevision'=>(int)$a['response_revision'],
      'canResume'=>$canResume,'savedChoices'=>$responses,
      'verifiedKeyIncluded'=>false,'correctOptionIncluded'=>false,
      'paymentProofIncluded'=>false,'publishedReportIncluded'=>false];
}


/**
 * Candidate-private reproducible PRELIMINARY raw grade using ONLY original
 * eco_assessment_responses and eco_score_runs digests, plus the additive
 * original-mother-DB immutable numerical grade snapshot. No duplicated
 * learner answers, second key bank or model inference is required.
 * Any revoked key/version or changed response triggers an owner-review
 * blocker, never a revised/unverifiable grade presented as final.
 */
function jrExamCandidateResult(PDO $pdo,string $account,string $attempt): array {
    $id=jrExamAttemptUuid($attempt);
    $q=$pdo->prepare("SELECT a.attempt_id,a.attempt_state,
        a.assessment_session_id,a.score_run_id,a.submission_digest,
        s.subject_id,s.instrument_version_id,s.consent_id,
        p.scoring_model_id,p.product_state,o.offering_state,
        run.session_id AS scored_session_id,
        run.scoring_model_id AS scored_model_id,
        run.input_sha256,run.output_sha256,run.state AS score_state,
        g.score_run_id AS snapshot_run_id,
        g.assessment_session_id AS snapshot_session_id,
        g.scoring_model_id AS snapshot_model_id,
        g.scoring_policy_sha256,g.submission_sha256,
        g.output_sha256 AS snapshot_output_sha256,
        g.question_count,g.correct_count,g.incorrect_count,
        g.unanswered_count,g.raw_score_millipoints,
        g.maximum_millipoints,g.status AS snapshot_state
      FROM jrei_exam_commercial_attempts a
      JOIN eco_assessment_sessions s ON s.id=a.assessment_session_id
      JOIN eco_subjects sub ON sub.id=s.subject_id
      JOIN jrei_exam_commercial_offerings o ON o.offering_id=a.offering_id
      JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
      JOIN eco_score_runs run ON run.id=a.score_run_id
      JOIN jrei_exam_preliminary_grade_snapshots g
        ON g.attempt_id=a.attempt_id
      WHERE a.attempt_id=? AND a.account_id=? AND sub.owner_account_id=?
        AND a.attempt_state IN ('SUBMITTED','TIMED_OUT')
      LIMIT 1");
    $q->execute([$id,$account,$account]);$a=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($a)||
       $a['product_state']!=='PUBLISHED'||
       $a['offering_state']!=='PUBLISHED'||
       $a['assessment_session_id']!==$a['scored_session_id']||
       $a['scoring_model_id']!==$a['scored_model_id']||
       $a['score_run_id']!==$a['snapshot_run_id']||
       $a['assessment_session_id']!==$a['snapshot_session_id']||
       $a['scoring_model_id']!==$a['snapshot_model_id']||
       $a['snapshot_state']!=='PRELIMINARY_UNREVIEWED'||
       $a['score_state']!=='UNREVIEWED'||
       !is_string($a['submission_digest'])||
       !preg_match('/^[a-f0-9]{64}$/D',$a['submission_digest']))
        throw new DomainException('verified_exam_score_run_unavailable');
    $consent=jrExamAdultSubjectConsent($pdo,$account,$a['subject_id']);
    if($a['consent_id']!==$consent)
        throw new DomainException('original_exam_consent_superseded');
    $context=jrExamVerifiedMcqContext($pdo,
      $a['instrument_version_id'],$a['scoring_model_id']);
    $q=$pdo->prepare("SELECT item_id,selected_option_id
      FROM eco_assessment_responses
      WHERE session_id=? ORDER BY item_id ASC LIMIT 301");
    $q->execute([$a['assessment_session_id']]);
    $answers=[];
    foreach($q as $row){
        $key=(string)$row['item_id'];
        if(isset($answers[$key])||$row['selected_option_id']===null)
            throw new DomainException('scored_response_history_changed');
        $answers[$key]=(string)$row['selected_option_id'];
    }
    $grade=jrExamDeterministicRawGrade($context,$answers);
    ksort($answers,SORT_STRING);
    $payload=json_encode([
      $a['assessment_session_id'],$context['instrumentVersionId'],
      $context['scoringModelId'],$context['policySha256'],$answers
    ],JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $input=hash('sha256',$payload);
    $output=hash('sha256',json_encode($grade,
      JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
    if(!hash_equals($a['submission_digest'],$input)||
       !hash_equals((string)$a['input_sha256'],$input)||
       !hash_equals((string)$a['output_sha256'],$output)||
       !hash_equals((string)$a['submission_sha256'],$input)||
       !hash_equals((string)$a['snapshot_output_sha256'],$output)||
       !hash_equals((string)$a['scoring_policy_sha256'],
           (string)$context['policySha256'])||
       (int)$a['question_count']!==$grade['questionCount']||
       (int)$a['correct_count']!==$grade['correctCount']||
       (int)$a['incorrect_count']!==$grade['incorrectCount']||
       (int)$a['unanswered_count']!==$grade['unansweredCount']||
       (int)$a['raw_score_millipoints']!==$grade['rawScoreMillipoints']||
       (int)$a['maximum_millipoints']!==$grade['maximumMillipoints'])
        throw new DomainException('exam_score_evidence_changed_manual_review_required');
    return [
      'ok'=>true,'schema'=>'jr.jrei.candidate-preliminary-grade.v1',
      'attemptId'=>$id,'state'=>$a['attempt_state'],
      'resultStatus'=>'VERIFIED_RECOMPUTABLE_RAW_GRADE_NOT_VALIDATED',
      'scoreRunState'=>$a['score_state'],
      'grade'=>$grade,
      'sourceResponsesVerifiedByDigest'=>true,
      'originalScoreRunDigestMatched'=>true,
      'immutableSnapshotDigestMatched'=>true,
      'rawScorePersistedInMotherDatabase'=>true,
      'correctAnswersIncluded'=>false,
      'psychometricValidityEstablished'=>false,
      'admissionProbability'=>null,'percentile'=>null,
      'reportPublished'=>false
    ];
}
