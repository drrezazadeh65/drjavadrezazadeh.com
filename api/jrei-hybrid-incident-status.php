<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Read-only owner incident summary from the original operations centre.
 * No parallel alert DB, no background execution, no SMTP action.
 * A source file and Cron policy are NOT independent proof of monitor health.
 */
function jrHybridOwnerIncidentStatus(PDO $pdo,array $cfg): array {
    $out=[
      'schema'=>'jr.jrei.incident-monitor-status.v1',
      'privateOptIn'=>($cfg['jrei_hybrid_alerts_enabled']??false)===true,
      'sourceAvailable'=>is_file(__DIR__.'/internal/jrei-hybrid-incident-worker.php'),
      'monitorInstalledAndVerified'=>false,
      'cronRegistered'=>false,'cronEnabled'=>false,
      'cronNeedsReview'=>null,'cronLastFinishedAt'=>null,
      'cronLastState'=>null,
      'alertSchemaReady'=>false,'globalEmailEnabled'=>null,
      'featureEmailOptIn'=>false,
      'incidentCounts'=>['open'=>null,'critical'=>null,'warning'=>null],
      'emailDeliveryVerified'=>false
    ];
    try{
        $q=$pdo->prepare('SELECT enabled,last_finished_at,last_state,
            needs_owner_review FROM operations_cron_jobs WHERE job_id=?');
        $q->execute(['jrei_hybrid_incident_sensor']);
        $r=$q->fetch(PDO::FETCH_ASSOC);
        if(is_array($r)){
            $out['cronRegistered']=true;
            $out['cronEnabled']=(int)$r['enabled']===1;
            $out['cronNeedsReview']=(int)$r['needs_owner_review']===1;
            $out['cronLastFinishedAt']=$r['last_finished_at']===null?
                null:(int)$r['last_finished_at'];
            $out['cronLastState']=$r['last_state'];
        }
    }catch(Throwable $e){} // Missing schema is UNKNOWN, not a healthy state.
    try{
        foreach(['operations_alert_settings','operations_alert_rules',
                 'operations_alert_incidents','operations_alert_scope_policies'] as $name)
            $pdo->query('SELECT 1 FROM '.$name.' LIMIT 0');
        $out['alertSchemaReady']=true;
        $switch=$pdo->query('SELECT enabled FROM operations_alert_settings
            WHERE singleton_id=1')->fetchColumn();
        $out['globalEmailEnabled']=$switch!==false&&(int)$switch===1;
        $q=$pdo->prepare('SELECT enabled FROM operations_alert_scope_policies
            WHERE scope_id=?');
        $q->execute(['feature:jrei-hybrid-worker-alerts']);
        $pref=$q->fetchColumn();
        $out['featureEmailOptIn']=$pref!==false&&(int)$pref===1;
        $q=$pdo->query("SELECT severity,COUNT(*) AS n
            FROM operations_alert_incidents WHERE state='open'
              AND event_code IN ('jrei_worker_heartbeat_lost',
                'jrei_worker_outcome_unknown',
                'jrei_evaluation_review_overdue')
            GROUP BY severity");
        $out['incidentCounts']=['open'=>0,'critical'=>0,'warning'=>0];
        foreach($q as $row){
            if(in_array($row['severity'],['critical','warning'],true)){
                $amount=(int)$row['n'];
                $out['incidentCounts'][$row['severity']]+=$amount;
                $out['incidentCounts']['open']+=$amount;
            }
        }
    }catch(Throwable $e){
        $out['alertSchemaReady']=false;
        $out['globalEmailEnabled']=null;
        $out['featureEmailOptIn']=false;
        $out['incidentCounts']=['open'=>null,'critical'=>null,'warning'=>null];
    }
    return $out;
}
