<?php
declare(strict_types=1);
/**
 * Bertina CLI Cron only, recommended once per minute.
 * Nothing is fetched during an admin page view. A manual request is queued
 * for the next run; daily/weekly preferences are enforced by MySQL policy.
 * Fixed-origin HEAD probes, no redirect following or visitor data.
 */
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
define('BERTINA_MAIL_SMOKE_CONTEXT', true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/operations-source-controls.php';
require_once dirname(__DIR__).'/operations-response-monitor.php';
try {
    $pdo=db();
    if(!$pdo){fwrite(STDERR,"Response monitor unified database unavailable.\n");exit(1);}
    $result=operationsResponseMonitorCollect($pdo,time());
    fwrite(STDOUT,"Response integrity: ".$result['status']."; probes=".$result['checked']."\n");
    if(!in_array($result['status'],['nothing_due','observed','partial','regression','busy'],true))exit(1);
} catch(Throwable $e) {
    fwrite(STDERR,"Response monitor could not complete; production routes were not changed.\n");
    exit(1);
}
