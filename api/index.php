<?php
declare(strict_types=1);

const SITE_ORIGIN = 'https://drjavadrezazadeh.com';
const SESSION_COOKIE = 'drjr_session';
const SESSION_TTL = 604800;
const TOKEN_TTL = 900;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, noarchive, nosnippet');

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $code, int $status = 400): never {
    respond(['ok' => false, 'error' => $code], $status);
}
function cfg(): array {
    static $cfg = null;
    if (is_array($cfg)) return $cfg;
    $cfg = [
        'db_dsn' => (string)(getenv('JR_DB_DSN') ?: ''),
        'db_user' => (string)(getenv('JR_DB_USER') ?: ''),
        'db_password' => (string)(getenv('JR_DB_PASSWORD') ?: ''),
        'auth_pepper' => (string)(getenv('JR_AUTH_PEPPER') ?: ''),
        'mail_enabled' => getenv('JR_MAIL_ENABLED') === 'true',
        'mail_from' => (string)(getenv('JR_MAIL_FROM') ?: 'admin@drjavadrezazadeh.com'),
        'mail_reply_to' => (string)(getenv('JR_MAIL_REPLY_TO') ?: 'admin@drjavadrezazadeh.com'),
        'smtp_enabled' => getenv('JR_SMTP_ENABLED') === 'true',
        'smtp_host' => (string)(getenv('JR_SMTP_HOST') ?: ''),
        'smtp_port' => (int)(getenv('JR_SMTP_PORT') ?: 0),
        'smtp_security' => strtolower((string)(getenv('JR_SMTP_SECURITY') ?: '')),
        'smtp_user' => (string)(getenv('JR_SMTP_USER') ?: ''),
        'smtp_password' => (string)(getenv('JR_SMTP_PASSWORD') ?: ''),
        'smtp_verify_peer' => getenv('JR_SMTP_VERIFY_PEER') !== 'false',
        'commerce_enabled' => getenv('JR_COMMERCE_ENABLED') === 'true',
        'public_tls_confirmed' => getenv('JR_PUBLIC_TLS_CONFIRMED') === 'true',
        'bitpay_api_key' => (string)(getenv('JR_BITPAY_API_KEY') ?: ''),
        'bitpay_amount_multiplier' => (string)(getenv('JR_BITPAY_AMOUNT_MULTIPLIER') ?: ''),
        'order_email_fulfilment_confirmed' => getenv('JR_ORDER_EMAIL_FULFILMENT_CONFIRMED') === 'true',
        'service_booking_confirmed' => getenv('JR_SERVICE_BOOKING_CONFIRMED') === 'true',
        'vip_booking_confirmed' => getenv('JR_VIP_BOOKING_CONFIRMED') === 'true',
        'book_shipping_confirmed' => getenv('JR_BOOK_SHIPPING_CONFIRMED') === 'true',
        // Account UUID => ['role'=>'ADMIN', 'totp_secret'=>'...']; private provisioning only.
        'operations_admins' => [],
    ];
    $local = __DIR__ . '/config.local.php';
    if (is_file($local)) {
        $loaded = require $local;
        if (is_array($loaded)) $cfg = array_replace($cfg, $loaded);
    }
    return $cfg;
}
function db(): ?PDO {
    static $pdo = false;
    if ($pdo instanceof PDO) return $pdo;
    if ($pdo === null) return null;
    $c = cfg();
    if ($c['db_dsn'] === '' || $c['db_user'] === '') { $pdo = null; return null; }
    try {
        $pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    } catch (Throwable $e) {
        $pdo = null;
        return null;
    }
}
function dbReady(): bool {
    $pdo = db();
    if (!$pdo) return false;
    try { $pdo->query('SELECT 1'); return true; } catch (Throwable $e) { return false; }
}
function smtpConfigured(array $c): bool {
    return ($c['smtp_enabled'] ?? false) === true
        && is_string($c['smtp_host'] ?? null) && trim((string)$c['smtp_host']) !== ''
        && is_int($c['smtp_port'] ?? null) && (int)$c['smtp_port'] > 0 && (int)$c['smtp_port'] <= 65535
        && in_array((string)($c['smtp_security'] ?? ''), ['ssl','tls','none'], true)
        && filter_var((string)($c['mail_from'] ?? ''), FILTER_VALIDATE_EMAIL) !== false
        && function_exists('stream_socket_client');
}
function mailReady(): bool {
    $c = cfg();
    if (($c['mail_enabled'] ?? false) !== true) return false;
    if (smtpConfigured($c)) return true;
    return function_exists('mail') && filter_var((string)$c['mail_from'], FILTER_VALIDATE_EMAIL) !== false;
}
function smtpRead($fp): array {
    $lines=[];$code=0;
    while (($line=fgets($fp, 2048)) !== false) {
        $lines[]=$line;
        if (preg_match('/^(\\d{3})([ -])/', $line, $m)) {
            $code=(int)$m[1];
            if ($m[2]===' ') break;
        }
    }
    return [$code, implode('', $lines)];
}
function smtpCmd($fp, string $command, array $expected): bool {
    if ($command !== '') {
        if (@fwrite($fp, $command."\r\n") === false) return false;
    }
    [$code,] = smtpRead($fp);
    return in_array($code, $expected, true);
}
function smtpSend(string $to, string $subject, string $body): bool {
    $c=cfg();
    if (!smtpConfigured($c) || !filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $host=trim((string)$c['smtp_host']);$port=(int)$c['smtp_port'];$security=(string)$c['smtp_security'];
    $verify=($c['smtp_verify_peer'] ?? true) === true;
    $context=stream_context_create(['ssl'=>[
        'verify_peer'=>$verify,
        'verify_peer_name'=>$verify,
        'allow_self_signed'=>!$verify,
        'peer_name'=>$host,
        'SNI_enabled'=>true,
    ]]);
    $remote=($security==='ssl'?'ssl://':'tcp://').$host.':'.$port;
    $errno=0;$errstr='';
    $fp=@stream_socket_client($remote,$errno,$errstr,15,STREAM_CLIENT_CONNECT,$context);
    if(!is_resource($fp))return false;
    stream_set_timeout($fp,15);
    try{
        if(!smtpCmd($fp,'',[220]))return false;
        $hello=preg_replace('/[^A-Za-z0-9.-]/','',parse_url(SITE_ORIGIN,PHP_URL_HOST) ?: 'localhost');
        if(!smtpCmd($fp,'EHLO '.$hello,[250]))return false;
        if($security==='tls'){
            if(!smtpCmd($fp,'STARTTLS',[220]))return false;
            if(!@stream_socket_enable_crypto($fp,true,STREAM_CRYPTO_METHOD_TLS_CLIENT))return false;
            if(!smtpCmd($fp,'EHLO '.$hello,[250]))return false;
        }
        $user=(string)($c['smtp_user']??'');$pass=(string)($c['smtp_password']??'');
        if($user!==''||$pass!==''){
            if($user===''||$pass==='')return false;
            if(!smtpCmd($fp,'AUTH LOGIN',[334]))return false;
            if(!smtpCmd($fp,base64_encode($user),[334]))return false;
            if(!smtpCmd($fp,base64_encode($pass),[235]))return false;
        }
        $from=(string)$c['mail_from'];
        if(!smtpCmd($fp,'MAIL FROM:<'.$from.'>',[250]))return false;
        if(!smtpCmd($fp,'RCPT TO:<'.$to.'>',[250,251]))return false;
        if(!smtpCmd($fp,'DATA',[354]))return false;
        $encodedSubject='=?UTF-8?B?'.base64_encode($subject).'?=';
        $reply=(string)($c['mail_reply_to']??$from);
        $message="From: Dr. Javad Rezazadeh <".$from.">\r\n".
            "Reply-To: ".$reply."\r\n".
            "To: <".$to.">\r\n".
            "Subject: ".$encodedSubject."\r\n".
            "MIME-Version: 1.0\r\n".
            "Content-Type: text/plain; charset=UTF-8\r\n".
            "Content-Transfer-Encoding: 8bit\r\n".
            "Date: ".gmdate('D, d M Y H:i:s').' +0000'."\r\n".
            "Message-ID: <".bin2hex(random_bytes(12))."@drjavadrezazadeh.com>\r\n\r\n".
            str_replace(["\r\n","\r"],"\n",$body);
        $message=str_replace("\n","\r\n",$message);
        $message=preg_replace('/(?m)^\\./','..',$message);
        if(@fwrite($fp,$message."\r\n.\r\n")===false)return false;
        [$code,]=smtpRead($fp);
        if($code!==250)return false;
        @fwrite($fp,"QUIT\r\n");
        return true;
    } finally {
        @fclose($fp);
    }
}
function sendLocalMail(string $to, string $subject, string $body): bool {
    if (!mailReady() || !filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $c = cfg();
    if (smtpConfigured($c)) return smtpSend($to,$subject,$body);
    $headers = [
        'From: Dr. Javad Rezazadeh <'.$c['mail_from'].'>',
        'Reply-To: '.$c['mail_reply_to'],
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'X-Mailer: Bertina-PHP',
    ];
    $encodedSubject = '=?UTF-8?B?'.base64_encode($subject).'?=';
    return @mail($to, $encodedSubject, $body, implode("\r\n", $headers));
}
function route(): string {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/api/', PHP_URL_PATH) ?: '/api/';
    $path = preg_replace('#^/api/?#', '/', $path);
    return '/'.ltrim((string)$path, '/');
}
function method(): string { return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'); }
function jsonBody(): array {
    $type = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (!str_starts_with($type, 'application/json')) fail('content_type', 415);
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 65536) fail('invalid_body', 413);
    $data = json_decode($raw, true);
    if (!is_array($data)) fail('invalid_json');
    return $data;
}
function originOK(): bool {
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    return $origin === '' || $origin === SITE_ORIGIN;
}
function requirePostOrigin(): void {
    if (!originOK()) fail('origin_forbidden', 403);
}
function emailNorm(mixed $v): string { return strtolower(trim((string)$v)); }
function validEmail(string $v): bool { return strlen($v) <= 254 && filter_var($v, FILTER_VALIDATE_EMAIL) !== false; }
function validPassword(mixed $v): bool { return is_string($v) && strlen($v) >= 12 && strlen($v) <= 128; }
function textLen(string $v): int { return function_exists('mb_strlen') ? mb_strlen($v, 'UTF-8') : strlen($v); }
function commerceSchemaReady(): bool {
    $pdo=db(); if(!$pdo)return false;
    try{
        $need=['customer_email'=>false,'customer_json'=>false,'receipt_email_sent_at'=>false];
        $q=$pdo->query("SHOW COLUMNS FROM commerce_orders");
        foreach($q->fetchAll() as $row){$field=(string)($row['Field']??'');if(array_key_exists($field,$need))$need[$field]=true;}
        return !in_array(false,$need,true);
    }catch(Throwable $e){return false;}
}
function normalizedCustomer(mixed $input): array {
    if(!is_array($input))fail('customer_required');
    $name=trim((string)($input['name']??''));
    $email=emailNorm($input['email']??'');
    $address=trim((string)($input['address']??''));
    $postal=trim((string)($input['postal']??''));
    $phone=trim((string)($input['phone']??''));
    if(textLen($name)<2||textLen($name)>100)fail('invalid_customer_name');
    if(!validEmail($email))fail('invalid_customer_email');
    if(textLen($address)<10||textLen($address)>500)fail('invalid_delivery_address');
    if(!preg_match('/^[A-Za-z0-9۰-۹٠-٩\\- ]{4,20}$/u',$postal))fail('invalid_postal_code');
    if($phone!==''&&!preg_match('/^[0-9۰-۹٠-٩+() .\\-]{5,30}$/u',$phone))fail('invalid_delivery_phone');
    return ['name'=>$name,'email'=>$email,'address'=>$address,'postal'=>$postal,'phone'=>$phone];
}
function token(int $bytes = 32): string { return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '='); }
function tokenHash(string $raw): string { return hash('sha256', $raw); }
function nowTs(): int { return time(); }
function passwordDigest(string $password): string {
    $pepper = (string)(cfg()['auth_pepper'] ?? '');
    if (strlen($pepper) < 32) throw new RuntimeException('pepper_missing');
    $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    $hash = password_hash($password."\0".$pepper, $algo);
    if (!is_string($hash)) throw new RuntimeException('hash_failed');
    return $hash;
}
function passwordMatches(string $password, string $stored): bool {
    $pepper = (string)(cfg()['auth_pepper'] ?? '');
    return strlen($pepper) >= 32 && password_verify($password."\0".$pepper, $stored);
}
function authReady(): bool {
    $c = cfg();
    return dbReady() && mailReady() && strlen((string)$c['auth_pepper']) >= 32;
}
function cookieSet(string $raw, int $age): void {
    setcookie(SESSION_COOKIE, $raw, [
        'expires' => time() + $age,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}
function cookieClear(): void {
    setcookie(SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}
function accountByEmail(PDO $pdo, string $email): ?array {
    $s=$pdo->prepare('SELECT * FROM customer_accounts WHERE email_normalized=? LIMIT 1');$s->execute([$email]);
    $r=$s->fetch(); return is_array($r)?$r:null;
}
function accountById(PDO $pdo, string $id): ?array {
    $s=$pdo->prepare('SELECT * FROM customer_accounts WHERE id=? LIMIT 1');$s->execute([$id]);
    $r=$s->fetch(); return is_array($r)?$r:null;
}
function issueToken(PDO $pdo, string $accountId, string $purpose): string {
    $raw=token();$digest=tokenHash($raw);$now=nowTs();
    $pdo->prepare('UPDATE customer_auth_tokens SET consumed_at=? WHERE account_id=? AND purpose=? AND consumed_at IS NULL')
        ->execute([$now,$accountId,$purpose]);
    $pdo->prepare('INSERT INTO customer_auth_tokens(token_hash,account_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)')
        ->execute([$digest,$accountId,$purpose,$now+TOKEN_TTL,$now]);
    return $raw;
}
function consumeToken(PDO $pdo, string $raw, string $purpose): ?string {
    if (strlen($raw)<30 || strlen($raw)>120) return null;
    $digest=tokenHash($raw);$now=nowTs();
    $pdo->beginTransaction();
    try {
        $s=$pdo->prepare('SELECT account_id FROM customer_auth_tokens WHERE token_hash=? AND purpose=? AND consumed_at IS NULL AND expires_at>? FOR UPDATE');
        $s->execute([$digest,$purpose,$now]);$row=$s->fetch();
        if (!$row) { $pdo->rollBack(); return null; }
        $pdo->prepare('UPDATE customer_auth_tokens SET consumed_at=? WHERE token_hash=? AND consumed_at IS NULL')->execute([$now,$digest]);
        $pdo->commit(); return (string)$row['account_id'];
    } catch(Throwable $e) { if($pdo->inTransaction())$pdo->rollBack(); return null; }
}
function sessionAccount(PDO $pdo): ?array {
    $raw=(string)($_COOKIE[SESSION_COOKIE]??''); if($raw==='')return null;
    $s=$pdo->prepare('SELECT account_id FROM customer_auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>? LIMIT 1');
    $s->execute([tokenHash($raw),nowTs()]);$row=$s->fetch();
    return $row?accountById($pdo,(string)$row['account_id']):null;
}
function uuidv4(): string {
    $d=random_bytes(16);$d[6]=chr((ord($d[6])&0x0f)|0x40);$d[8]=chr((ord($d[8])&0x3f)|0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex($d),4));
}
function validUuid(string $v): bool { return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i',$v)===1; }
function clientIp(): string { return substr((string)($_SERVER['REMOTE_ADDR']??'unknown'),0,64); }
function rateAllowed(PDO $pdo,string $action,string $identity,int $max,int $window): bool {
    $bucket=hash('sha256',$action.'|'.$identity.'|'.clientIp());$now=nowTs();$reset=$now+$window;
    $pdo->beginTransaction();
    try{
        $s=$pdo->prepare('SELECT count,reset_at FROM customer_auth_rate_limits WHERE bucket=? FOR UPDATE');$s->execute([$bucket]);$row=$s->fetch();
        if(!$row){$pdo->prepare('INSERT INTO customer_auth_rate_limits(bucket,count,reset_at) VALUES(?,?,?)')->execute([$bucket,1,$reset]);$count=1;}
        elseif((int)$row['reset_at'] <= $now){$pdo->prepare('UPDATE customer_auth_rate_limits SET count=1,reset_at=? WHERE bucket=?')->execute([$reset,$bucket]);$count=1;}
        else{$count=(int)$row['count']+1;$pdo->prepare('UPDATE customer_auth_rate_limits SET count=? WHERE bucket=?')->execute([$count,$bucket]);}
        $pdo->commit();return $count<=$max;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();return false;}
}
function localCatalog(): array {
    $base=dirname(__DIR__).'/assets/data/';
    $read=function(string $file)use($base){$raw=@file_get_contents($base.$file);$d=$raw?json_decode($raw,true):null;return is_array($d)?$d:[];};
    $books=$read('book-catalog.json');$services=$read('service-catalog.json');$vip=$read('vip-catalog.json');
    $items=[];
    foreach(($books['books']??[]) as $b){$c=$b['commerce']??[];if(($c['sellable']??false)===true&&($c['inventory_state']??'')==='IN_STOCK'&&($c['currency']??'')==='IRT'&&is_int($c['price']??null)&&$c['price']>0){$items['book:'.$b['id']]=['sku'=>'book:'.$b['id'],'title'=>(string)($b['title_fa']??$b['id']),'price'=>$c['price'],'kind'=>'book'];}}
    foreach(($services['services']??[]) as $s){if(($s['sellable']??false)===true&&is_int($s['price']??null)&&$s['price']>0){$items['service:'.$s['id']]=['sku'=>'service:'.$s['id'],'title'=>(string)($s['title_fa']??$s['id']),'price'=>$s['price'],'kind'=>'service'];}}
    foreach(($vip['services']??[]) as $v){if(($v['sellable']??false)===true&&($v['checkout_enabled']??false)===true&&is_int($v['price']??null)&&$v['price']>0){$items['vip:'.$v['id']]=['sku'=>'vip:'.$v['id'],'title'=>(string)($v['title_fa']??$v['id']),'price'=>$v['price'],'kind'=>'vip'];}}
    return $items;
}
function commerceReady(): bool {
    $c=cfg();
    return dbReady() && commerceSchemaReady() && $c['public_tls_confirmed']===true && $c['commerce_enabled']===true && $c['bitpay_api_key']!=='' &&
        in_array((string)$c['bitpay_amount_multiplier'],['1','10'],true) &&
        $c['order_email_fulfilment_confirmed']===true;
}
function gatewayPost(string $endpoint,array $fields): string {
    $c=cfg(); if($c['bitpay_api_key']==='')throw new RuntimeException('gateway_unconfigured');
    if(!function_exists('curl_init'))throw new RuntimeException('curl_unavailable');
    $fields['api']=$c['bitpay_api_key'];
    $ch=curl_init('https://bitpay.ir/payment/'.$endpoint);
    curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>http_build_query($fields),CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2]);
    $out=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
    if(!is_string($out)||$code<200||$code>=300)throw new RuntimeException('gateway_http');
    return trim($out);
}

define('BERTINA_API_BOOTSTRAPPED', true);
require_once __DIR__.'/operations.php';
$path=route();$verb=method();
if (str_starts_with($path, '/admin/operations')) operationsRoute($path, $verb);

if ($path==='/health' && $verb==='GET') {
    $hc=cfg(); respond(['ok'=>true,'service'=>'bertina-api','hosting'=>'bertina','database'=>dbReady(),'mailTransport'=>mailReady()?(smtpConfigured($hc)?'bertina-smtp':'bertina-local'):'not-configured','mailConfigEnabled'=>$hc['mail_enabled']===true,'smtpConfigured'=>smtpConfigured($hc),'mailFunctionAvailable'=>function_exists('mail'),'mailFromValid'=>filter_var((string)$hc['mail_from'], FILTER_VALIDATE_EMAIL)!==false,'auth'=>authReady(),'commerce'=>commerceReady()]);
}

if ($path==='/auth/health' && $verb==='GET') {
    respond(['ok'=>true,'service'=>'auth','ready'=>authReady(),'database'=>dbReady(),'email'=>mailReady(),'passwordKdf'=>strlen((string)(cfg()['auth_pepper']??''))>=32]);
}
if (str_starts_with($path,'/auth/')) {
    if(!authReady())fail('auth_unavailable',503);
    $pdo=db(); if(!$pdo)fail('auth_unavailable',503);

    if($path==='/auth/register'&&$verb==='POST'){
        requirePostOrigin();$b=jsonBody();$email=emailNorm($b['email']??'');$password=$b['password']??null;$mobile=trim((string)($b['mobile']??''));$locale=($b['locale']??'')==='en'?'en':'fa';
        if(!validEmail($email)||!validPassword($password)||($mobile!==''&&!preg_match('/^\+[1-9][0-9]{7,14}$/',$mobile)))fail('invalid_registration');
        if(!rateAllowed($pdo,'register',$email,5,3600))fail('rate_limited',429);
        $a=accountByEmail($pdo,$email);
        if(!$a){
            $id=uuidv4();$now=nowTs();$hash=passwordDigest($password);
            $pdo->prepare('INSERT INTO customer_accounts(id,email_normalized,password_hash,mobile_e164,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
                ->execute([$id,$email,$hash,$mobile!==''?$mobile:null,'pending',$now,$now]);
            $a=accountById($pdo,$id);
        }
        if($a&&empty($a['email_verified_at'])&&($a['status']??'')!=='disabled'){
            $raw=issueToken($pdo,(string)$a['id'],'verify_email');
            $url=SITE_ORIGIN.($locale==='en'?'/en/login/':'/fa/login/').'?verify='.rawurlencode($raw);
            if(!sendLocalMail($email,$locale==='en'?'Verify your account':'تأیید حساب کاربری',"Verification link / لینک تأیید:\n".$url."\n\nThis link expires in 15 minutes."))fail('verification_email_failed',502);
        }
        respond(['ok'=>true,'message'=>'verification_if_applicable_sent'],202);
    }
    if($path==='/auth/verify-email'&&$verb==='POST'){
        requirePostOrigin();$b=jsonBody();$id=consumeToken($pdo,(string)($b['token']??''),'verify_email');if(!$id)fail('invalid_or_expired_token');
        $now=nowTs();$pdo->prepare("UPDATE customer_accounts SET email_verified_at=COALESCE(email_verified_at,?),status='active',updated_at=? WHERE id=? AND status!='disabled'")->execute([$now,$now,$id]);
        respond(['ok'=>true,'verified'=>true]);
    }
    if($path==='/auth/login'&&$verb==='POST'){
        requirePostOrigin();$b=jsonBody();$email=emailNorm($b['email']??'');$password=(string)($b['password']??'');
        if(!validEmail($email)||!rateAllowed($pdo,'login',$email,10,900))fail('invalid_credentials',401);
        $a=accountByEmail($pdo,$email);$valid=$a&&($a['status']??'')==='active'&&!empty($a['email_verified_at'])&&passwordMatches($password,(string)$a['password_hash']);
        if(!$valid)fail('invalid_credentials',401);
        $raw=token();$now=nowTs();$pdo->prepare('INSERT INTO customer_auth_sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)')->execute([tokenHash($raw),$a['id'],$now+SESSION_TTL,$now]);
        cookieSet($raw,SESSION_TTL);respond(['ok'=>true,'authenticated'=>true]);
    }
    if($path==='/auth/forgot-password'&&$verb==='POST'){
        requirePostOrigin();$b=jsonBody();$email=emailNorm($b['email']??'');$locale=($b['locale']??'')==='en'?'en':'fa';
        if(validEmail($email)&&rateAllowed($pdo,'recovery',$email,5,3600)){
            $a=accountByEmail($pdo,$email);
            if($a&&($a['status']??'')==='active'&&!empty($a['email_verified_at'])){
                $raw=issueToken($pdo,(string)$a['id'],'reset_password');$url=SITE_ORIGIN.($locale==='en'?'/en/recover/':'/fa/bazyabi-hesab/').'?token='.rawurlencode($raw);
                sendLocalMail($email,$locale==='en'?'Reset your password':'بازیابی رمز عبور',"Reset link / لینک بازیابی:\n".$url."\n\nThis link expires in 15 minutes.");
            }
        }
        respond(['ok'=>true,'message'=>'recovery_if_account_exists_sent'],202);
    }
    if($path==='/auth/reset-password'&&$verb==='POST'){
        requirePostOrigin();$b=jsonBody();if(!validPassword($b['password']??null))fail('invalid_password');
        $id=consumeToken($pdo,(string)($b['token']??''),'reset_password');if(!$id)fail('invalid_or_expired_token');
        $now=nowTs();$pdo->prepare('UPDATE customer_accounts SET password_hash=?,updated_at=? WHERE id=?')->execute([passwordDigest((string)$b['password']),$now,$id]);
        $pdo->prepare('UPDATE customer_auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL')->execute([$now,$id]);cookieClear();respond(['ok'=>true,'passwordReset'=>true]);
    }
    if($path==='/auth/me'&&$verb==='GET'){
        $a=sessionAccount($pdo);if(!$a)fail('unauthorized',401);respond(['ok'=>true,'user'=>['id'=>$a['id'],'email'=>$a['email_normalized'],'mobile'=>$a['mobile_e164']??null,'emailVerified'=>true]]);
    }
    if($path==='/auth/logout'&&$verb==='POST'){
        requirePostOrigin();$raw=(string)($_COOKIE[SESSION_COOKIE]??'');if($raw!=='')$pdo->prepare('UPDATE customer_auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL')->execute([nowTs(),tokenHash($raw)]);
        cookieClear();respond(['ok'=>true]);
    }
    fail('not_found',404);
}

if($path==='/commerce/health'&&$verb==='GET'){
    $c=cfg();$ready=commerceReady();
    respond(['ok'=>true,'service'=>'commerce','hardeningRevision'=>'tls-gate-v1','checkout'=>$ready,'orderCapture'=>commerceSchemaReady(),'requirements'=>[
        'database'=>dbReady(),
        'schema'=>commerceSchemaReady(),
        'publicTlsConfirmed'=>$c['public_tls_confirmed']===true,
        'commerceEnabled'=>$c['commerce_enabled']===true,
        'gatewayKeyConfigured'=>(string)$c['bitpay_api_key']!=='',
        'amountMultiplierValid'=>in_array((string)$c['bitpay_amount_multiplier'],['1','10'],true),
        'orderEmailFulfilmentConfirmed'=>$c['order_email_fulfilment_confirmed']===true,
        'bookShippingConfirmed'=>$c['book_shipping_confirmed']===true,
        'serviceBookingConfirmed'=>$c['service_booking_confirmed']===true,
        'vipBookingConfirmed'=>$c['vip_booking_confirmed']===true,
    ],'capabilities'=>[
        'services'=>$ready&&$c['service_booking_confirmed']===true,
        'vip'=>$ready&&$c['vip_booking_confirmed']===true,
        'books'=>$ready&&$c['book_shipping_confirmed']===true,
    ]]);
}
if($path==='/commerce/prepare'&&$verb==='POST'){
    requirePostOrigin();$pdo=db();if(!$pdo||!commerceSchemaReady())fail('order_capture_unavailable',503);
    $b=jsonBody();$items=$b['items']??null;if(!is_array($items)||count($items)<1||count($items)>20)fail('invalid_items');
    $inventory=localCatalog();$counts=[];
    foreach($items as $item){$sku=(string)($item['sku']??'');$q=$item['quantity']??null;if(!isset($inventory[$sku])||!is_int($q)||$q<1||$q>20)fail('invalid_item');$counts[$sku]=($counts[$sku]??0)+$q;}
    $lines=[];$total=0;
    foreach($counts as $sku=>$q){$x=$inventory[$sku];if(($x['kind']??'')!=='book')fail('book_order_only');$sub=$x['price']*$q;$total+=$sub;$lines[]=array_merge($x,['quantity'=>$q,'subtotal'=>$sub]);}
    if($total<1000||$total>1000000000)fail('amount_out_of_range');
    $customer=normalizedCustomer($b['customer']??null);$customerEmail=$customer['email'];$dryRun=($b['dryRun']??false)===true;
    if(!$dryRun&&!rateAllowed($pdo,'commerce_prepare',$customerEmail,5,3600))fail('rate_limited',429);
    $customerJson=json_encode($customer,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);if(!is_string($customerJson))fail('customer_encoding_failed',500);
    $itemsJson=json_encode($lines,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);if(!is_string($itemsJson))fail('items_encoding_failed',500);
    $cfg=cfg();$mul=in_array((string)$cfg['bitpay_amount_multiplier'],['1','10'],true)?(int)$cfg['bitpay_amount_multiplier']:10;
    $providerAmount=$total*$mul;$order=uuidv4();$factor=preg_replace('/[^0-9]/','',(string)hrtime(true));$factor=substr($factor,0,28);
    if($dryRun)$pdo->beginTransaction();
    try{
        $pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,customer_email,customer_json,items_json,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,NOW(),NOW())")
            ->execute([$order,$factor,$total,$providerAmount,'IRT',$customerEmail,$customerJson,$itemsJson,'created']);
        if($dryRun){$pdo->rollBack();respond(['ok'=>true,'dryRun'=>true,'orderCapture'=>true,'totalToman'=>$total,'currency'=>'IRT','paymentStarted'=>false]);}
    }catch(Throwable $e){if($dryRun&&$pdo->inTransaction())$pdo->rollBack();throw $e;}
    $summary=[];foreach($lines as $x){$summary[]='- '.(string)$x['title'].' × '.(int)$x['quantity'].' | '.number_format((int)$x['subtotal']).' تومان';}
    $bodyCustomer="درخواست سفارش کتاب شما در سرور ثبت شد. هنوز هیچ پرداختی انجام نشده است.\n\nشناسه سفارش: ".$order."\n\n".implode("\n",$summary)."\n\nجمع سفارش: ".number_format($total)." تومان\n\nپرداخت فقط پس از فعال‌شدن مسیر امن پرداخت و با اقدام صریح شما انجام خواهد شد.";
    $customerMail=mailReady()?sendLocalMail($customerEmail,'ثبت درخواست سفارش کتاب '.$order,$bodyCustomer):false;
    $admin=(string)($cfg['mail_from']??'');
    if(validEmail($admin)&&$admin!==$customerEmail&&mailReady()){
        $bodyAdmin="درخواست سفارش کتاب جدید ثبت شد.\n\nشناسه سفارش: ".$order."\nایمیل مشتری: ".$customerEmail."\nنام گیرنده: ".$customer['name']."\nکد پستی: ".$customer['postal']."\nنشانی: ".$customer['address']."\n\n".implode("\n",$summary)."\n\nجمع: ".number_format($total)." تومان\n\nوضعیت: ثبت اولیه؛ بدون پرداخت.";
        sendLocalMail($admin,'درخواست سفارش کتاب '.$order,$bodyAdmin);
    }
    respond(['ok'=>true,'orderId'=>$order,'state'=>'created','totalToman'=>$total,'currency'=>'IRT','paymentStarted'=>false,'emailSent'=>$customerMail],201);
}
if($path==='/commerce/create'&&$verb==='POST'){
    requirePostOrigin();if(!commerceReady())fail('checkout_disabled',503);$pdo=db();if(!$pdo)fail('database_unconfigured',503);
    $b=jsonBody();$items=$b['items']??null;if(!is_array($items)||count($items)<1||count($items)>20)fail('invalid_items');
    $inventory=localCatalog();$counts=[];
    foreach($items as $item){$sku=(string)($item['sku']??'');$q=$item['quantity']??null;if(!isset($inventory[$sku])||!is_int($q)||$q<1||$q>20)fail('invalid_item');$counts[$sku]=($counts[$sku]??0)+$q;}
    $lines=[];$total=0;$c=cfg();$hasBook=false;
    foreach($counts as $sku=>$q){$x=$inventory[$sku];if($x['kind']!=='book'&&$q!==1)fail('service_quantity_invalid');if($x['kind']==='book'){$hasBook=true;if($c['book_shipping_confirmed']!==true)fail('book_shipping_not_configured',503);}if($x['kind']==='service'&&$c['service_booking_confirmed']!==true)fail('service_booking_not_configured',503);if($x['kind']==='vip'&&$c['vip_booking_confirmed']!==true)fail('vip_booking_not_configured',503);$sub=$x['price']*$q;$total+=$sub;$lines[]=array_merge($x,['quantity'=>$q,'subtotal'=>$sub]);}
    if($total<1000||$total>1000000000)fail('amount_out_of_range');
    $customer=null;$customerEmail=null;$customerJson=null;
    if($hasBook){$customer=normalizedCustomer($b['customer']??null);$customerEmail=$customer['email'];$customerJson=json_encode($customer,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);if(!is_string($customerJson))fail('customer_encoding_failed',500);}
    $rateIdentity=$customerEmail?:implode(',',array_keys($counts));if(!rateAllowed($pdo,'commerce_create',$rateIdentity,5,900))fail('rate_limited',429);
    $mul=(int)$c['bitpay_amount_multiplier'];$providerAmount=$total*$mul;$order=uuidv4();$factor=preg_replace('/[^0-9]/','',(string)hrtime(true));$factor=substr($factor,0,28);
    $pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,customer_email,customer_json,items_json,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,? ,NOW(),NOW())")
        ->execute([$order,$factor,$total,$providerAmount,'IRT',$customerEmail,$customerJson,json_encode($lines,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),'created']);
    try{
        $callback=SITE_ORIGIN.'/api/commerce/callback?order='.rawurlencode($order);
        $raw=gatewayPost('gateway-send',['amount'=>(string)$providerAmount,'redirect'=>$callback,'factorId'=>$factor,'description'=>'Order '.$order]);
        if(!preg_match('/^[1-9][0-9]*$/',$raw))throw new RuntimeException('gateway_rejected');
        $pdo->prepare("UPDATE commerce_orders SET state='pending',provider_id_get=?,updated_at=NOW() WHERE id=? AND state='created'")->execute([$raw,$order]);
        respond(['ok'=>true,'orderId'=>$order,'totalToman'=>$total,'currency'=>'IRT','paymentUrl'=>SITE_ORIGIN.'/fa/shop/payment-start/?gateway='.rawurlencode('https://bitpay.ir/payment/gateway-'.$raw.'-get')]);
    }catch(Throwable $e){$pdo->prepare("UPDATE commerce_orders SET state='failed',updated_at=NOW() WHERE id=? AND state='created'")->execute([$order]);fail('gateway_rejected',502);}
}
if($path==='/commerce/status'&&$verb==='GET'){
    $id=(string)($_GET['order']??'');if(!validUuid($id))fail('invalid_order');$pdo=db();if(!$pdo)fail('database_unconfigured',503);
    $s=$pdo->prepare('SELECT state,amount_toman,currency,items_json,paid_at,provider_id_get,provider_trans_id FROM commerce_orders WHERE id=?');$s->execute([$id]);$row=$s->fetch();if(!$row)fail('order_not_found',404);
    if($row['state']!=='paid')respond(['ok'=>true,'state'=>$row['state']]);
    // A paid label alone is not verified receipt evidence.
    if(($row['currency']??null)!=='IRT'||!is_string($row['paid_at']??null)||strtotime($row['paid_at'])===false||
        !preg_match('/^[1-9][0-9]*$/D',(string)($row['provider_id_get']??''))||
        !preg_match('/^[1-9][0-9]*$/D',(string)($row['provider_trans_id']??'')))fail('receipt_unverified',409);
    $items=json_decode((string)$row['items_json'],true);if(!is_array($items))fail('receipt_unavailable',503);
    $lines=[];$total=0;foreach($items as $x){if(!is_array($x)||!is_int($x['quantity']??null)||!is_int($x['price']??null)||!is_int($x['subtotal']??null))fail('receipt_unverified',409);$q=(int)$x['quantity'];$price=(int)$x['price'];$sub=(int)$x['subtotal'];if($q<1||$price<1||$sub!==$q*$price)fail('receipt_unavailable',503);$total+=$sub;$lines[]=['sku'=>$x['sku'],'title'=>$x['title'],'quantity'=>$q,'unitToman'=>$price,'subtotalToman'=>$sub];}
    if($total!==(int)$row['amount_toman'])fail('receipt_amount_mismatch',409);
    respond(['ok'=>true,'state'=>'paid','receipt'=>['orderId'=>$id,'currency'=>'IRT','amountToman'=>$total,'paidAt'=>$row['paid_at'],'items'=>$lines,'kind'=>'payment_confirmation_not_tax_invoice']]);
}
if($path==='/commerce/callback'&&in_array($verb,['GET','POST'],true)){
    $id=(string)($_GET['order']??'');if(!validUuid($id))fail('invalid_order');$pdo=db();if(!$pdo)fail('database_unconfigured',503);
    $s=$pdo->prepare('SELECT * FROM commerce_orders WHERE id=?');$s->execute([$id]);$row=$s->fetch();if(!$row)fail('order_not_found',404);
    if($row['state']==='paid'){header('Location: '.SITE_ORIGIN.'/fa/shop/payment-result/?state=paid&order='.rawurlencode($id),true,303);exit;}
    if($row['state']!=='pending')fail('order_not_pending',409);
    $params=$_GET;if($verb==='POST')$params=array_merge($params,$_POST);$idGet=(string)($params['id_get']??'');$trans=(string)($params['trans_id']??'');
    if($idGet!==(string)$row['provider_id_get']||!preg_match('/^[1-9][0-9]*$/',$trans))fail('callback_mismatch');
    try{$raw=gatewayPost('gateway-result-second',['trans_id'=>$trans,'id_get'=>$idGet,'json'=>'1']);$d=json_decode($raw,true);if(!is_array($d)||!in_array((string)($d['status']??''),['1','11'],true)||(int)($d['amount']??0)!==(int)$row['provider_amount']||(string)($d['factorId']??'')!==(string)$row['factor_id'])fail('verification_mismatch',409);
        $u=$pdo->prepare("UPDATE commerce_orders SET state='paid',provider_trans_id=?,paid_at=NOW(),updated_at=NOW() WHERE id=? AND state='pending' AND provider_id_get=?");$u->execute([$trans,$id,$idGet]);if($u->rowCount()!==1)fail('concurrent_update',409);
        $customerEmail=(string)($row['customer_email']??'');
        if(validEmail($customerEmail)&&mailReady()){
            $items=json_decode((string)$row['items_json'],true);$summary=[];$sum=0;
            if(is_array($items)){foreach($items as $x){$qty=(int)($x['quantity']??0);$sub=(int)($x['subtotal']??0);$sum+=$sub;$summary[]='- '.(string)($x['title']??$x['sku']??'item').' × '.$qty.' | '.number_format($sub).' تومان';}}
            $body="سفارش شما با موفقیت پرداخت و در سرور ثبت شد.\n\nشناسه سفارش: ".$id."\n\n".implode("\n",$summary)."\n\nجمع پرداخت: ".number_format($sum)." تومان\n\nاین پیام تأیید پرداخت است و جایگزین فاکتور رسمی مالیاتی نیست.";
            if(sendLocalMail($customerEmail,'تأیید پرداخت سفارش '.$id,$body)){$pdo->prepare("UPDATE commerce_orders SET receipt_email_sent_at=NOW() WHERE id=?")->execute([$id]);}
        }
        header('Location: '.SITE_ORIGIN.'/fa/shop/payment-result/?state=paid&order='.rawurlencode($id),true,303);exit;
    }catch(Throwable $e){fail('verification_unavailable',502);}
}

if($path==='/donations/health'&&$verb==='GET')respond(['ok'=>true,'service'=>'donations','checkout'=>false]);
if(str_starts_with($path,'/donations/'))fail('donations_disabled',503);
if($path==='/assistant/v1/chat'&&$verb==='POST')fail('assistant_local_fallback',503);
if($path==='/assistant/v1/leads'&&$verb==='POST')fail('lead_capture_not_configured',503);
if($path==='/register-request'&&$verb==='POST')fail('registration_intake_not_configured',503);
if($path==='/callback')fail('legacy_payment_route_disabled',503);

fail('not_found',404);
