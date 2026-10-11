<?php
declare(strict_types=1);
// Actual HTTP requests against the production PHP router with an isolated CI MySQL database.
// This test never uses Bertina credentials, SMTP or a payment provider.
$dsn=(string)getenv('OPERATIONS_TEST_DSN');
if(!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn))throw new RuntimeException('isolated_fixture_database_required');
$user=(string)getenv('OPERATIONS_TEST_USER');$password=(string)getenv('OPERATIONS_TEST_PASSWORD');
$pdo=new PDO($dsn,$user,$password,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$pdo->exec(file_get_contents(__DIR__.'/../docs/BERTINA_MYSQL_SCHEMA.sql'));
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/operations.php';require __DIR__.'/../api/operations-schema.php';operationsInstall($pdo);
$id='11111111-1111-4111-8111-111111111111';$raw='isolated-fixture-session';$hash=hash('sha256',$raw);$now=time();$sha=str_repeat('a',40);$run='123456';
$secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
$configuration=['db_dsn'=>$dsn,'db_user'=>$user,'db_password'=>$password,'auth_pepper'=>str_repeat('p',32),'mail_enabled'=>false,'smtp_enabled'=>false,'operations_admins'=>[$id=>['role'=>'ADMIN','totp_secret'=>$secret]]];
$pdo->prepare("INSERT INTO customer_accounts(id,email_normalized,password_hash,status,email_verified_at,created_at,updated_at) VALUES(?,'administrator@example.invalid','fixture-only','active',?,?,?) ON DUPLICATE KEY UPDATE status='active',email_verified_at=VALUES(email_verified_at)")->execute([$id,$now,$now,$now]);
$pdo->prepare('INSERT INTO customer_auth_sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at),revoked_at=NULL')->execute([$hash,$id,$now+3600,$now]);
$pdo->prepare('DELETE FROM operations_mfa_counters WHERE account_id=?')->execute([$id]);
$pdo->prepare('DELETE FROM operations_session_mfa WHERE account_id=?')->execute([$id]);
$pdo->prepare('DELETE FROM operations_admin_memberships WHERE account_id=?')->execute([$id]);
$pdo->exec('DELETE FROM customer_auth_rate_limits'); // Isolated fixture only; repeatable local/CI runs.
$batch=['schema'=>'operations-release-v1','releaseSha'=>$sha,'runId'=>$run,'branch'=>'migration/bertina-linux6','workflow'=>'Deploy to Bertina','events'=>[]];
foreach(['code'=>'admin_release_checksum','tests'=>'admin_security_and_browser_suite'] as $gate=>$scope)$batch['events'][]=['sectionId'=>'ADM-01','gateId'=>$gate,'result'=>'pass','source'=>'github_actions','sourceUrl'=>'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/'.$run,'testName'=>'Isolated scope integration fixture','environment'=>'ci','checkedAt'=>$now,'expiresAt'=>$now+300,'details'=>['scope'=>$scope]];
$count=0;function check(bool $condition,string $message): void {if(!$condition)throw new RuntimeException($message);$GLOBALS['count']++;}
check(operationsImportRelease($pdo,$batch,$sha,$configuration,$run)===2,'initial import failed');
$before=(int)$pdo->query('SELECT COUNT(*) FROM operations_evidence')->fetchColumn();operationsImportRelease($pdo,$batch,$sha,$configuration,$run);
check((int)$pdo->query('SELECT COUNT(*) FROM operations_evidence')->fetchColumn()===$before,'identical evidence import duplicated');
$pdo->prepare('UPDATE operations_admin_memberships SET enabled=0 WHERE account_id=?')->execute([$id]);operationsImportRelease($pdo,$batch,$sha,$configuration,$run);
check((int)$pdo->query('SELECT enabled FROM operations_admin_memberships')->fetchColumn()===0,'release re-enabled revoked admin');
$pdo->prepare('UPDATE operations_admin_memberships SET enabled=1 WHERE account_id=?')->execute([$id]);
$fake=$batch;$fake['events'][0]['sectionId']='OP-09';$fake['events'][0]['gateId']='production';
try{operationsImportRelease($pdo,$fake,$sha,$configuration,$run);throw new RuntimeException('CI certified a real payment');}catch(RuntimeException $e){check($e->getMessage()==='invalid_evidence_event','wrong forged-payment error');}
$wrong=$batch;$wrong['runId']='654321';try{operationsImportRelease($pdo,$wrong,$sha,$configuration,$run);throw new RuntimeException('wrong run accepted');}catch(RuntimeException $e){check($e->getMessage()==='invalid_release_evidence','wrong run error');}
$work=dirname(__DIR__).'/work';if(!is_dir($work))mkdir($work,0700,true);$folder=$work.'/operations-http-'.bin2hex(random_bytes(5));mkdir($folder,0700);mkdir($folder.'/api',0700);mkdir($folder.'/api/internal',0700);
foreach(['index.php','operations.php','operations-schema.php'] as $file)copy(__DIR__.'/../api/'.$file,$folder.'/api/'.$file);
copy(__DIR__.'/../api/internal/operations-registry.json',$folder.'/api/internal/operations-registry.json');
copy(__DIR__.'/../api/internal/operations-gsc-observation.json',$folder.'/api/internal/operations-gsc-observation.json');
mkdir($folder.'/assets',0700);mkdir($folder.'/assets/data',0700);
foreach(['book-catalog.json','service-catalog.json','vip-catalog.json'] as $catalog)copy(__DIR__.'/../assets/data/'.$catalog,$folder.'/assets/data/'.$catalog);
function writeConfig():void {file_put_contents($GLOBALS['folder'].'/api/config.local.php','<?php return '.var_export($GLOBALS['configuration'],true).';');}
writeConfig();file_put_contents($folder.'/router.php','<?php $p=parse_url($_SERVER["REQUEST_URI"],PHP_URL_PATH);if(is_file(__DIR__.$p))return false;require __DIR__."/api/index.php";');
$socket=stream_socket_server('tcp://127.0.0.1:0',$errno,$err);if(!$socket)throw new RuntimeException('test_socket_unavailable');$address=stream_socket_get_name($socket,false);fclose($socket);$port=(int)substr(strrchr($address,':'),1);
$process=proc_open([PHP_BINARY,'-S','127.0.0.1:'.$port,'-t',$folder,$folder.'/router.php'],[0=>['pipe','r'],1=>['file',$folder.'/server.log','a'],2=>['file',$folder.'/server.log','a']],$pipes,$folder);
if(!is_resource($process))throw new RuntimeException('test_server_failed');
function request(string $path,int $expected,string $method='GET',?array $body=null,array $extra=[],bool $cookie=true):array {
 global $port,$raw;
 $headers=['Content-Type: application/json'];if($cookie)$headers[]='Cookie: drjr_session='.$raw;foreach($extra as $key=>$value)$headers[]=$key.': '.$value;
 $context=stream_context_create(['http'=>['method'=>$method,'header'=>implode("\r\n",$headers),'content'=>$body===null?'':json_encode($body),'ignore_errors'=>true,'timeout'=>5]]);
 $data=file_get_contents('http://127.0.0.1:'.$port.$path,false,$context);$status=(int)explode(' ',$http_response_header[0])[1];check($status===$expected,$path.' HTTP '.$status.' expected '.$expected);
 check((bool)array_filter($http_response_header,fn($h)=>stripos($h,'Cache-Control:')===0&&str_contains($h,'no-store')),'missing private cache header');
 $result=json_decode((string)$data,true)??[];
 foreach($http_response_header as $header)if(preg_match('/^Set-Cookie: drjr_session=([^;]+)/i',$header,$match)){
  check(str_contains(strtolower($header),'secure')&&str_contains(strtolower($header),'httponly')&&str_contains(strtolower($header),'samesite=lax'),'unsafe elevated cookie');
  $result['_sessionCookie']=rawurldecode($match[1]);
 }
 return $result;
}
try {
 for($i=0;$i<50;$i++){if(@fsockopen('127.0.0.1',$port,$errno,$err,0.1))break;usleep(100000);}
 request('/api/admin/operations',401,'GET',null,[],false);
 request('/api/admin/operations?role=SUPER_ADMIN',403);
 $session=request('/api/admin/operations/session',200);check($session['mfaRequired']===true,'MFA not required');
 request('/api/admin/operations/mfa',403,'POST',['code'=>'123456']);
 $at=time();$binary=hash_hmac('sha1',pack('N2',0,intdiv($at,30)),'12345678901234567890',true);$offset=ord($binary[19])&15;$number=unpack('N',substr($binary,$offset,4))[1]&0x7fffffff;$code=str_pad((string)($number%1000000),6,'0',STR_PAD_LEFT);
 $headers=['Origin'=>'https://drjavadrezazadeh.com','X-CSRF-Token'=>$session['csrfToken'],'Sec-Fetch-Site'=>'same-origin'];
 $elevated=request('/api/admin/operations/mfa',200,'POST',['code'=>$code],$headers);
 check(isset($elevated['_sessionCookie'])&&$elevated['_sessionCookie']!==$raw,'MFA did not rotate session');
 request('/api/admin/operations',401); // Old cookie must not inherit administrative access.
 $raw=$elevated['_sessionCookie'];$hash=hash('sha256',$raw);
 $elevatedSession=request('/api/admin/operations/session',200);
 check($elevatedSession['csrfToken']!==$session['csrfToken'],'CSRF token did not rotate');
 $headers['X-CSRF-Token']=$elevatedSession['csrfToken'];
 request('/api/admin/operations/mfa',403,'POST',['code'=>$code],$headers);
 $data=request('/api/admin/operations',200);check($data['dashboard']['measuredProgress']===75,'unexpected admin score');check($data['dashboard']['closed']===false,'unverified production admin closed');check(count($data['reports'])===36,'report count changed');
 $reports=array_column($data['reports'],null,'id');
 $identitySignals=array_column($reports['OP-05']['signals'],null,'id');
 check($identitySignals['auth_runtime']['value']===false&&$identitySignals['email_transport']['value']===false,'disabled fixture email incorrectly ready');
 check($reports['OP-05']['status']==='blocked'&&$reports['OP-05']['closed']===false,'missing email transport did not block identity');
 check($reports['OP-07']['status']==='blocked'&&$reports['OP-07']['closed']===false,'unconfigured checkout did not block commerce');
 $storeSignals=array_column($reports['OP-10']['signals'],null,'id');
 check($storeSignals['sellable_books']['value']===3,'server-authoritative book catalogue not connected');
 $gscSignals=array_column($reports['OP-14']['signals'],null,'id');
 check($gscSignals['sample_size']['value']===10&&$gscSignals['indexed_sample']['value']===8&&$gscSignals['unknown_sample']['value']===2,'Google sample incorrectly represented');
 check($reports['OP-14']['measuredProgress']===null&&$reports['OP-14']['closed']===false,'Google sample certified overall indexation');
 check(!str_contains(json_encode($data),$password)&&!str_contains(json_encode($data),$secret)&&!str_contains(json_encode($data),str_repeat('p',32)),'private configuration leaked through metrics');
 $remaining=request('/api/admin/operations/session',200);check($remaining['mfaExpiresIn']>0&&$remaining['mfaExpiresIn']<=600,'incorrect MFA expiry');
 $configuration['operations_admins'][$id]['totp_secret']=str_repeat('J',32);writeConfig();request('/api/admin/operations',403);
 $configuration['operations_admins'][$id]['totp_secret']=$secret;writeConfig();
 $pdo->prepare("UPDATE customer_accounts SET status='disabled' WHERE id=?")->execute([$id]);request('/api/admin/operations',403);
 $pdo->prepare("UPDATE customer_accounts SET status='active' WHERE id=?")->execute([$id]);
 $pdo->prepare('UPDATE customer_auth_sessions SET revoked_at=? WHERE token_hash=?')->execute([time(),$hash]);request('/api/admin/operations',401);
 echo 'PASS: '.$count.' real MySQL and PHP HTTP assertions; fixture-only database, no mail or money movement.'.PHP_EOL;
}finally{
 proc_terminate($process);proc_close($process);
 $files=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($folder,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($files as $file){if($file->isDir())rmdir($file->getPathname());else unlink($file->getPathname());}rmdir($folder);
}
