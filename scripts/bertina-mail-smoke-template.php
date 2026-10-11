<?php
declare(strict_types=1);

// This script is generated with an unguessable filename and token hash by a
// protected GitHub Actions run. It never becomes part of the public release.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, noarchive');
header('Referrer-Policy: no-referrer');
$given=(string)($_SERVER['HTTP_X_BERTINA_MAIL_SMOKE']??'');
if(!hash_equals('__TOKEN_SHA256__', hash('sha256',$given))){
    http_response_code(404);
    exit;
}
@unlink(__FILE__); // One invocation maximum even when SMTP fails.
ignore_user_abort(true);
define('BERTINA_MAIL_SMOKE_CONTEXT', true);
try {
    require __DIR__.'/api/index.php';
    $ready=mailReady();
    if(!$ready){
        http_response_code(503);
        echo json_encode(['ok'=>false,'failureStage'=>'transport_not_configured']);
        exit;
    }
    $sent=sendLocalMail(
       'dr.rezazadeh65@gmail.com',
       'Bertina transactional mail delivery smoke test',
       "Controlled SMTP delivery check from the official website.\nNo registration, order, password or payment was created.\n"
    );
    if(!$sent)http_response_code(502);
    $stage=($GLOBALS['bertina_smtp_last_failure_stage']??'mail_delivery_not_accepted');
    echo json_encode(['ok'=>$sent,'smtpAccepted'=>$sent,'failureStage'=>$sent?null:$stage]);
} catch(Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'failureStage'=>'server_exception']);
}
