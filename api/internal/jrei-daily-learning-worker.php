<?php
declare(strict_types=1);
/**
 * JREI V5 daily-learning metadata coordinator — ONE Bertina master Cron slot.
 *
 * Source-only until owner approval / single final QA. This is intentionally
 * NOT a model trainer or a private learner-data scraper. It records that the
 * daily readiness check happened, without claiming a model improved.
 *
 * Idempotent by UTC day. Offline Windows CPU inference continues to be
 * independent of the five-minute Bertina host schedule; its future reviewed
 * aggregate candidate assessments must come from authenticated worker routes.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-learning-operations.php';
require_once dirname(__DIR__).'/jrei-daily-review-observations.php';

try {
    $configuration=cfg();
    if(($configuration['jrei_learning_daily_enabled']??false)!==true) {
        fwrite(STDOUT,"JREI daily metadata review disabled by private policy.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrJreiLearningSchemaReady($pdo)){
        fwrite(STDERR,"JREI learning schema unavailable; no evaluation attempted.\n");
        exit(2);
    }
    $day=gmdate('Y-m-d');
    $at=time();
    // Actual independently accepted source/case metadata only. A missing
    // mother-DB review table means UNKNOWN; never create model scores.
    $readiness=jrJreiDailyReviewObservations($pdo);
    $pdo->beginTransaction();
    try {
        $q=$pdo->query('SELECT enabled,auto_promote_low_risk
          FROM jrei_learning_controls WHERE id=1 FOR UPDATE');
        $control=$q->fetch(PDO::FETCH_ASSOC);
        if(!$control||(int)$control['enabled']!==1){
            $pdo->commit();
            fwrite(STDOUT,"JREI daily learning not owner-enabled.\n");
            exit(0);
        }
        // Even a damaged DB flag cannot self-publish a policy or model.
        if((int)$control['auto_promote_low_risk']!==0){
            $pdo->prepare('UPDATE jrei_learning_controls
              SET auto_promote_low_risk=0,revision=revision+1,
                  updated_at=? WHERE id=1')->execute([$at]);
        }
        $q=$pdo->prepare('INSERT IGNORE INTO jrei_learning_daily_cycles
            (cycle_day,status,last_started_at,revision)
            VALUES(?,?,?,1)');
        $q->execute([$day,'NO_APPROVED_EVALUATION', $at]);
        $created=$q->rowCount()===1;
        if(!$created){
            $pdo->commit();
            fwrite(STDOUT,"JREI daily cycle already registered (no new learning claim).\n");
            exit(0);
        }
        $q=$pdo->prepare('SELECT COUNT(*) AS candidate_total,
              COALESCE(SUM(CASE WHEN review_state=\'APPROVED\' THEN 1 ELSE 0 END),0)
                 AS owner_approved_count
            FROM jrei_learning_proposals WHERE cycle_day=?');
        $q->execute([$day]);
        $counts=$q->fetch(PDO::FETCH_ASSOC);
        $proposed=(int)($counts['candidate_total']??0);
        $approved=(int)($counts['owner_approved_count']??0);
        $status=$proposed>0?'PROPOSAL_REVIEW_REQUIRED':'NO_APPROVED_EVALUATION';
        $sources=$readiness['available']===true?
            (int)$readiness['approvedReviewSourceCount']:0;
        $cases=$readiness['available']===true?
            (int)$readiness['approvedIndependentCaseCount']:0;
        // Approval of a proposal is not a certificate that a model learned
        // or that an experimental educational outcome was validated.
        $q=$pdo->prepare('UPDATE jrei_learning_daily_cycles
            SET status=?,reviewed_source_count=?,approved_holdout_case_count=?,
                candidate_count=?,accepted_candidate_count=?,
                last_finished_at=?,revision=revision+1 WHERE cycle_day=?');
        $q->execute([$status,$sources,$cases,$proposed,$approved,time(),$day]);
        $pdo->commit();
        fwrite(STDOUT,"JREI daily metadata cycle recorded; no model weights or scientific rules changed.\n");
        exit(0);
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}catch(Throwable $e){
    // Do not print private worker identifiers, user rows, SQL messages or DSNs.
    fwrite(STDERR,"JREI daily cycle unavailable. Owner review required.\n");
    exit(1);
}
