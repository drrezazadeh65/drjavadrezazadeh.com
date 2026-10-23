<?php
declare(strict_types=1);
/**
 * Owner-only, independently disabled exam-deadline reconciliation Cron.
 * Marks unknown/abandoned work for review. No scores or refunds are made.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-exam-commercial-catalogue.php';
require_once dirname(__DIR__).'/jrei-exam-published-item-delivery.php';
require_once dirname(__DIR__).'/jrei-exam-attempt-runtime.php';
require_once dirname(__DIR__).'/jrei-exam-deadline-reconcile.php';
try{
    $config=cfg();
    if(($config['jrei_exam_deadline_reconciliation_enabled']??false)!==true||
       ($config['jrei_exam_commercial_enabled']??false)!==true){
        fwrite(STDOUT,"JREI examination deadline reconciliation is OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo)throw new RuntimeException('unavailable');
    $result=jrExamReconcileAbandonedAttempts($pdo,$config,time());
    fwrite(STDOUT,"JREI exam deadline pass: marked review pending=".
        $result['changed']."; auto-grading OFF.\n");
}catch(Throwable $e){
    fwrite(STDERR,"JREI exam deadline source cannot reconcile; no automated grading attempted.\n");
    exit(1);
}
