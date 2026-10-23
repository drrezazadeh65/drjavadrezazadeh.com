<?php
declare(strict_types=1);
/**
 * JREI V5.1: safety-only lease expiry reconciler, existing mother DB.
 *
 * Source-only until final acceptance. CLI-only; separately disabled through
 * JR_JREI_HYBRID_RECONCILIATION_ENABLED and the original SUPER_ADMIN-owned
 * Cron registry. No replay, dispatch, mail, inference, model update or deletion.
 * A possibly completed lease is quarantined as NEEDS_REVIEW, NEVER retried.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-hybrid-worker.php';

try{
    $configuration=cfg();
    if(($configuration['jrei_hybrid_enabled']??false)!==true||
       ($configuration['jrei_hybrid_reconciliation_enabled']??false)!==true){
        fwrite(STDOUT,"JREI lease reconciliation is OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrHybridSchemaReady($pdo)){
        fwrite(STDERR,"JREI lease schema unavailable; no jobs changed.\n");
        exit(2);
    }
    $now=time();
    $pdo->beginTransaction();
    try{
        // Reuse the same monotonic transition code as the live signed
        // Worker poll. SELECT timestamps under the same transaction.
        // All transitions require the original status: a completion that
        // wins the row lock remains REVIEW_REQUIRED, not overwritten.
        $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_hybrid_jobs
            WHERE status='LEASED' AND (lease_expires_at IS NULL
              OR lease_started_at IS NULL OR lease_expires_at<?
              OR lease_started_at+?<?)");
        $q->execute([$now,JR_HYBRID_MAX_LEASE_AGE,$now]);
        $staleLeases=(int)$q->fetchColumn();
        $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_hybrid_jobs
            WHERE status='QUEUED' AND expires_at<?");
        $q->execute([$now]);
        $expiredQueued=(int)$q->fetchColumn();
        jrHybridRecoverOrphans($pdo,$now);
        $pdo->commit();
        // Counts are an observation at the start of the transaction and
        // are not proof every row changed; the transition is idempotent.
        fwrite(STDOUT,"JREI lease expiry pass recorded; previously stale leases=".
            $staleLeases."; expired queued=".$expiredQueued.".\n");
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}catch(Throwable $e){
    // Avoid printing database messages, node IDs, or exception traces.
    fwrite(STDERR,"JREI lease expiry review failed; no replay attempted.\n");
    exit(1);
}
