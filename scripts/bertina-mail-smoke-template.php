<?php
declare(strict_types=1);

// A token-guarded, self-deleting, one-time mail transport test.
// Never publish this PHP file as part of a website release or expose credentials.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private, max-age=0');
header('X-Robots-Tag: noindex, noarchive');
header('Referrer-Policy: no-referrer');

$token=(string)($_SERVER['HTTP_X_BERTINA_MAIL_SMOKE']??'');
if(!hash_equals('__TOKEN_SHA256__',hash('sha256',$token))){
    http_response_code(404);exit;
}
@unlink(__FILE__);
ignore_user_abort(true);

function result(string $stage,bool $accepted=false): never {
    http_response_code($accepted?200:502);
    echo json_encode(['ok'=>$accepted,'smtpAccepted'=>$accepted,'failureStage'=>$accepted?null:$stage]);
    exit;
}
function smtpReply($fp): int {
    while(($line=fgets($fp,2048))!==false){
        if(preg_match('/^(\\d{3})([ -])/',$line,$m)&&$m[2]===' ')return (int)$m[1];
    }
    return 0;
}
function smtpCommand($fp,string $cmd,array $expected):bool {
    if($cmd!=='' && @fwrite($fp,$cmd."\r\n")===false)return false;
    return in_array(smtpReply($fp),$expected,true);
}
try {
    $configFile=__DIR__.'/api/config.local.php';
    $cfg=is_file($configFile)?require $configFile:null;
    if(!is_array($cfg))result('private_config_missing');
    if(($cfg['mail_enabled']??false)!==true || ($cfg['smtp_enabled']??false)!==true)result('smtp_not_enabled');
    // Only nonsecret coordinates confirmed by Bertina ticket t833905.
    $host='drjavadrezazadeh.com';
    $port=465;
    $username='admin@drjavadrezazadeh.com';
    $password=(string)($cfg['smtp_password']??'');
    if($password==='')result('smtp_private_password_missing');
    $context=stream_context_create(['ssl'=>[
        'verify_peer'=>true,'verify_peer_name'=>true,'allow_self_signed'=>false,
        'peer_name'=>$host,'SNI_enabled'=>true
    ]]);
    $errno=0;$errstr='';
    $fp=@stream_socket_client('ssl://'.$host.':'.$port,$errno,$errstr,15,STREAM_CLIENT_CONNECT,$context);
    if(!is_resource($fp))result('connect_or_tls_failed');
    stream_set_timeout($fp,15);
    if(!smtpCommand($fp,'',[220]))result('greeting');
    if(!smtpCommand($fp,'EHLO drjavadrezazadeh.com',[250]))result('ehlo');
    if(!smtpCommand($fp,'AUTH LOGIN',[334]))result('auth_login');
    if(!smtpCommand($fp,base64_encode($username),[334]))result('auth_user');
    if(!smtpCommand($fp,base64_encode($password),[235]))result('auth_password');
    $from='admin@drjavadrezazadeh.com';
    $to='dr.rezazadeh65@gmail.com';
    if(!smtpCommand($fp,'MAIL FROM:<'.$from.'>',[250]))result('sender');
    if(!smtpCommand($fp,'RCPT TO:<'.$to.'>',[250,251]))result('recipient');
    if(!smtpCommand($fp,'DATA',[354]))result('data_start');
    $message="From: Site Account Mail <".$from.">\r\n".
       "To: <".$to.">\r\n".
       "Subject: Bertina one-time SMTP delivery check\r\n".
       "MIME-Version: 1.0\r\n".
       "Content-Type: text/plain; charset=UTF-8\r\n".
       "Date: ".gmdate('D, d M Y H:i:s')." +0000\r\n\r\n".
       "A non-sensitive mail delivery test for the account owner.\r\n".
       "No customer account, payment or verification token was created.";
    if(@fwrite($fp,$message."\r\n.\r\n")===false)result('data_write');
    if(smtpReply($fp)!==250)result('data_not_accepted');
    @fwrite($fp,"QUIT\r\n");
    @fclose($fp);
    result('smtp_accepted',true);
}catch(Throwable $e){result('server_exception');}
