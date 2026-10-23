<?php
declare(strict_types=1);
/**
 * JREI V5.1 bounded security-metadata housekeeping.
 *
 * CLI only, independently OFF via JR_JREI_HYBRID_RETENTION_ENABLED.
 * Executes only through original owner-managed Cron dispatcher. No learner
 * records, model prompts, source evidence, jobs, result aggregates, node
 * credentials, registration or audit tables are deleted or changed.
 *
 * Signed nonces accepted over 2 hours ago cannot pass the worker's original
 * 90s clock bound. Old signed corpus advertisements are non-authoritative
 * and are pruned only after 7 days (the dashboard displays fresh <=120s).
 * InnoDB batched LIMIT prevents large writes on shared Bertina hosting.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-hybrid-worker.php';

try{
    $configuration=cfg();
    if(($configuration['jrei_hybrid_retention_enabled']??false)!==true){
        fwrite(STDOUT,"JREI metadata retention is OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo||!jrHybridSchemaReady($pdo)){
        fwrite(STDERR,"JREI retention schema unavailable; no data removed.\n");
        exit(2);
    }
    $at=time();
    $prunedNonces=0;$prunedOffers=0;
    // This worker is registered with a single due Cron run and can only
    // remove ephemeral metadata older than cryptographic validity.
    $q=$pdo->prepare('DELETE FROM jrei_hybrid_node_nonces
        WHERE accepted_at<? LIMIT 500');
    $q->execute([$at-7200]);
    $prunedNonces=$q->rowCount();
    if(function_exists('jrHybridOffersReady')&&jrHybridOffersReady($pdo)){
        $q=$pdo->prepare('DELETE FROM jrei_hybrid_node_offers
            WHERE last_advertised_at<? LIMIT 500');
        $q->execute([$at-7*86400]);
        $prunedOffers=$q->rowCount();
    }
    fwrite(STDOUT,"JREI transient metadata pruned: nonces=".$prunedNonces.
        "; stale-offers=".$prunedOffers.".\n");
}catch(Throwable $e){
    // Never include SQL details, node UUIDs, confidential paths or keys.
    fwrite(STDERR,"JREI metadata retention unavailable; no jobs were changed.\n");
    exit(1);
}
