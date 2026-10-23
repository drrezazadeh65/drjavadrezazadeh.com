<?php
declare(strict_types=1);
/**
 * JREI V5.1 — read-only incident sensor with OPTIONAL existing alert outbox.
 *
 * Bertina CLI only, via original allowlisted operations cron dispatcher.
 * No user content, worker credentials, secret config, source corpora or model
 * output are read. The sensor never modifies node/job state or sends SMTP.
 * Both original site alerts and this worker default OFF until separately
 * authorized by existing SUPER_ADMIN policies and private config.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/operations-alerts.php';
require_once dirname(__DIR__).'/jrei-hybrid-worker.php';

try{
    $configuration=cfg();
    if(($configuration['jrei_hybrid_enabled']??false)!==true||
       ($configuration['jrei_hybrid_alerts_enabled']??false)!==true){
        fwrite(STDOUT,"JREI incidents sensor private opt-in is OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrHybridSchemaReady($pdo)||!operationsAlertAvailable($pdo)){
        fwrite(STDERR,"JREI incident data or existing operations alert schema unavailable.\n");
        exit(2);
    }
    $at=time();
    $observed=0;$alerted=0;$resolved=0;
    // Never label a never-connected node as an outage. Read disabled and
    // revoked nodes too, so an owner STOP can resolve an old offline alert.
    // Enabled nodes with stale signed heartbeat remain actionable regardless
    // of the outage duration; do not silently hide an old outage after 14d.
    $q=$pdo->prepare("SELECT node_id,status,revoked_at,last_seen_at
        FROM jrei_hybrid_nodes
        WHERE last_seen_at IS NOT NULL
        ORDER BY created_at DESC,node_id ASC LIMIT 20");
    $q->execute();
    foreach($q as $node){
        $id=(string)$node['node_id'];
        $last=(int)$node['last_seen_at'];
        $scope='jrei-node-'.substr(hash('sha256',$id),0,32);
        $observed++;
        if($node['status']==='ENABLED'&&$node['revoked_at']===null&&
           $last<$at-360){
            if(operationsAlertRecord($pdo,'jrei_worker_heartbeat_lost',
                $scope,$at))$alerted++;
        }elseif(operationsAlertResolve($pdo,'jrei_worker_heartbeat_lost',
            $scope,$at))$resolved++;
    }
    // A possibly completed lease must NEVER be repeated automatically.
    // The unresolved outcome is actionable even with both nodes online.
    // Never age-out an UNREVIEWED unknown outcome. A stale LEASED job
    // is also actionable even if the separate reconciliation Cron is OFF.
    $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_hybrid_jobs
         WHERE status='NEEDS_REVIEW' OR
           (status='LEASED' AND (lease_expires_at<?
             OR lease_started_at+?<?))");
    $q->execute([$at,JR_HYBRID_MAX_LEASE_AGE,$at]);
    $unknown=(int)$q->fetchColumn();
    if($unknown>0){
        if(operationsAlertRecord($pdo,'jrei_worker_outcome_unknown',
            'jrei-unknown-outcome',$at))$alerted++;
    }elseif(operationsAlertResolve($pdo,'jrei_worker_outcome_unknown',
         'jrei-unknown-outcome',$at))$resolved++;
    // A completed local evaluation remains evidence pending human review.
    // This is an actionable work queue, NOT a verified scientific result.
    // An owner-review item never ceases to exist merely because its
    // original queued timestamp falls outside an arbitrary 14-day window.
    $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_hybrid_jobs
        WHERE status='REVIEW_REQUIRED' AND completed_at IS NOT NULL
          AND completed_at<?");
    $q->execute([$at-3600]);
    $pending=(int)$q->fetchColumn();
    if($pending>0){
        if(operationsAlertRecord($pdo,'jrei_evaluation_review_overdue',
            'jrei-owner-review',$at))$alerted++;
    }elseif(operationsAlertResolve($pdo,'jrei_evaluation_review_overdue',
         'jrei-owner-review',$at))$resolved++;
    fwrite(STDOUT,"JREI alert sensor observed=".$observed.
        "; incident_records=".$alerted."; resolved=".$resolved.".\n");
}catch(Throwable $e){
    // Avoid private SQL paths, node IDs, keys and traces in cron stdout.
    fwrite(STDERR,"JREI incident sensor unavailable; no remediation performed.\n");
    exit(1);
}
