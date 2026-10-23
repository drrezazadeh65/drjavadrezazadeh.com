<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Owner-facing queue diagnosis from the original mother DB.
 *
 * This is observational only: a stale lease is not evidence of failed model
 * execution. No query changes work state, expires jobs, retries inference,
 * or touches any customer, commerce, consent or publication table.
 */
function jrHybridOwnerQueueHealth(PDO $pdo,array $cfg,int $at): array {
    $out=[
        'schema'=>'jr.jrei.queue-health.v1',
        'observedAt'=>$at,'countsAvailable'=>false,
        'counts'=>[
          'readyQueued'=>null,'expiredQueuedUnreconciled'=>null,
          'activeLeased'=>null,'staleLeasedUnreconciled'=>null,
          'unknownOutcomeAwaitingOwner'=>null,
          'signedAggregateAwaitingReview'=>null,
          'aggregateReviewOverdue'=>null
        ],
        'reconciliationPolicyEnabled'=>($cfg['jrei_hybrid_reconciliation_enabled']??false)===true,
        'reconciliationCronRegistered'=>false,
        'reconciliationCronEnabled'=>false,
        'reconciliationNeedsOwnerReview'=>null,
        'reconciliationLastState'=>null,
        'reconciliationLastFinishedAt'=>null,
        'reconciliationVerified'=>false,
        'automaticReplayAllowed'=>false
    ];
    try{
        $q=$pdo->prepare("SELECT
            COALESCE(SUM(CASE WHEN status='QUEUED'
              AND expires_at>=? THEN 1 ELSE 0 END),0) ready_queued,
            COALESCE(SUM(CASE WHEN status='QUEUED'
              AND expires_at<? THEN 1 ELSE 0 END),0) expired_queued,
            COALESCE(SUM(CASE WHEN status='LEASED'
              AND lease_started_at IS NOT NULL
              AND lease_expires_at IS NOT NULL
              AND lease_expires_at>=?
              AND lease_started_at+?>=? THEN 1 ELSE 0 END),0) active_leased,
            COALESCE(SUM(CASE WHEN status='LEASED'
              AND (lease_expires_at<? OR lease_started_at+?<?)
              THEN 1 ELSE 0 END),0) stale_leased,
            COALESCE(SUM(CASE WHEN status='NEEDS_REVIEW'
              THEN 1 ELSE 0 END),0) unknown_outcomes,
            COALESCE(SUM(CASE WHEN status='REVIEW_REQUIRED'
              THEN 1 ELSE 0 END),0) review_required,
            COALESCE(SUM(CASE WHEN status='REVIEW_REQUIRED'
              AND completed_at IS NOT NULL
              AND completed_at<? THEN 1 ELSE 0 END),0) overdue
            FROM jrei_hybrid_jobs");
        $q->execute([
            $at,$at,$at,JR_HYBRID_MAX_LEASE_AGE,$at,
            $at,JR_HYBRID_MAX_LEASE_AGE,$at,$at-3600
        ]);
        $r=$q->fetch(PDO::FETCH_ASSOC);
        if(is_array($r)){
            $out['countsAvailable']=true;
            $out['counts']=[
                'readyQueued'=>(int)$r['ready_queued'],
                'expiredQueuedUnreconciled'=>(int)$r['expired_queued'],
                'activeLeased'=>(int)$r['active_leased'],
                'staleLeasedUnreconciled'=>(int)$r['stale_leased'],
                'unknownOutcomeAwaitingOwner'=>(int)$r['unknown_outcomes'],
                'signedAggregateAwaitingReview'=>(int)$r['review_required'],
                'aggregateReviewOverdue'=>(int)$r['overdue']
            ];
        }
    }catch(Throwable $e){} // Unavailable is UNKNOWN, never zero.
    try{
        $q=$pdo->prepare('SELECT enabled,last_finished_at,last_state,
            needs_owner_review FROM operations_cron_jobs WHERE job_id=?');
        $q->execute(['jrei_hybrid_lease_reconciliation']);
        $r=$q->fetch(PDO::FETCH_ASSOC);
        if(is_array($r)){
            $out['reconciliationCronRegistered']=true;
            $out['reconciliationCronEnabled']=(int)$r['enabled']===1;
            $out['reconciliationNeedsOwnerReview']=(int)$r['needs_owner_review']===1;
            $out['reconciliationLastState']=$r['last_state'];
            $out['reconciliationLastFinishedAt']=$r['last_finished_at']===null?
                null:(int)$r['last_finished_at'];
        }
    }catch(Throwable $e){}
    return $out;
}
