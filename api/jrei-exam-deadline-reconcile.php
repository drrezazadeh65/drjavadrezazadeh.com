<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Monotonic, metadata-only reconciliation of abandoned exam attempts.
 * NEVER grades, auto-submits, deletes learner responses, moves money,
 * reopens a clock, issues access grants or creates a fake score run.
 *
 * Owner-authorized CLI only; the original MariaDB mother DB remains
 * authoritative. At most 100 review records per invocation.
 */
function jrExamReconcileAbandonedAttempts(PDO $pdo,array $cfg,int $at): array {
    if(($cfg['jrei_exam_deadline_reconciliation_enabled']??false)!==true||
       ($cfg['jrei_exam_commercial_enabled']??false)!==true)
        return ['status'=>'OFF','changed'=>0,'autoGraded'=>false];
    if(!jrExamAttemptRuntimeReady($pdo))
        throw new DomainException('exam_runtime_schema_unavailable');
    $pdo->beginTransaction();
    try{
        $grace=120;
        $q=$pdo->prepare("SELECT attempt_id,assessment_session_id
            FROM jrei_exam_commercial_attempts
            WHERE attempt_state='IN_PROGRESS'
              AND deadline_at IS NOT NULL AND deadline_at+?<?
            ORDER BY deadline_at ASC,attempt_id ASC
            LIMIT 100 FOR UPDATE");
        $q->execute([$grace,$at]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $transition=$pdo->prepare("UPDATE jrei_exam_commercial_attempts
            SET attempt_state='TIMED_OUT_PENDING_REVIEW',
              updated_at=?,revision=revision+1
            WHERE attempt_id=? AND attempt_state='IN_PROGRESS'
              AND deadline_at IS NOT NULL AND deadline_at+?<?");
        $session=$pdo->prepare("UPDATE eco_assessment_sessions
            SET status='EXPIRED' WHERE id=? AND status='IN_PROGRESS'");
        $changed=0;
        foreach($rows as $r){
            $transition->execute([$at,$r['attempt_id'],$grace,$at]);
            if($transition->rowCount()===1){
                $session->execute([$r['assessment_session_id']]);
                $changed++;
            }
        }
        $pdo->commit();
        return ['status'=>'REVIEW_QUARANTINED','changed'=>$changed,
            'autoGraded'=>false,'scoreRunsCreated'=>0,
            'learnerResponsesDeleted'=>0,'automaticallyRetried'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
