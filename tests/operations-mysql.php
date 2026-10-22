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
foreach(['index.php','commerce-stage9.php','publishing.php','publishing-onboarding.php','consultation-delivery.php','consultation-availability.php','operations.php','operations-jhela.php','jhela-native-editorial.php','jhela-intake.php','operations-commerce.php','operations-book-expiration.php','operations-donation-recovery.php','operations-fulfilment.php','operations-schema.php','operations-reporting.php','operations-ai-visibility.php','operations-gsc-direct.php','operations-action-runs.php','operations-social.php','social-review.php','social-queue.php','social-admin-settings.php','operations-github-audits.php','operations-github-dispatch.php','operations-collection.php',
'operations-provider-inventory.php','admin-resource-inventory-normalizer.php','operations-source-directory.php',
'operations-source-controls.php','operations-page-quality.php','operations-alerts.php','operations-activation.php',
'operations-http-log.php','operations-response-monitor.php','operations-database-health.php','operations-existing-features.php','operations-editor.php',
'smtp-body.php','service-intake.php','service-files.php','service-buyer-receipt.php','ramzinex-public-usdt-rate.php','newsletter-preferences.php','community.php','growth-stage14.php','golden-talent.php','student-support.php','operations-service-delivery.php'] as $file){
    if(!copy(__DIR__.'/../api/'.$file,$folder.'/api/'.$file))
        throw new RuntimeException('isolated_router_dependency_missing_'.$file);
}
foreach(['jr-publishing-digital.php','jr-publishing-allocation-policy.php','jr-publishing-contract-draft.php','jr-publishing-notifications.php','jr-publishing-mailer.php'] as $helper) {
    if(!copy(__DIR__.'/../api/internal/'.$helper,$folder.'/api/internal/'.$helper))
      throw new RuntimeException('missing_publishing_private_runtime_'.$helper);
}
copy(__DIR__.'/../api/internal/operations-registry.json',$folder.'/api/internal/operations-registry.json');
copy(__DIR__.'/../api/internal/operations-gsc-observation.json',$folder.'/api/internal/operations-gsc-observation.json');
copy(__DIR__.'/../api/internal/ai-search-visibility-baseline-20261020.json',$folder.'/api/internal/ai-search-visibility-baseline-20261020.json');
mkdir($folder.'/assets',0700);mkdir($folder.'/assets/data',0700);
foreach(['book-catalog.json','service-catalog.json','vip-catalog.json'] as $catalog)copy(__DIR__.'/../assets/data/'.$catalog,$folder.'/assets/data/'.$catalog);
// Private test fixture only: atomic config rotation avoids incomplete reads
// while the local PHP router services security assertions.
function writeConfig():void {
 $dir=$GLOBALS['folder'].'/api';
 $target=$dir.'/config.local.php';
 $temporary=tempnam($dir,'config-fixture-');
 if($temporary===false)throw new RuntimeException('fixture_config_temp_failed');
 try{
  if(file_put_contents($temporary,'<?php return '.var_export($GLOBALS['configuration'],true).';',LOCK_EX)===false)
   throw new RuntimeException('fixture_config_write_failed');
  chmod($temporary,0600);
  if(!rename($temporary,$target))throw new RuntimeException('fixture_config_replace_failed');
 }finally{if(is_file($temporary))unlink($temporary);}
}
writeConfig();file_put_contents($folder.'/router.php','<?php $p=parse_url($_SERVER["REQUEST_URI"],PHP_URL_PATH);if(is_file(__DIR__.$p))return false;require __DIR__."/api/index.php";');
$socket=stream_socket_server('tcp://127.0.0.1:0',$errno,$err);if(!$socket)throw new RuntimeException('test_socket_unavailable');$address=stream_socket_get_name($socket,false);fclose($socket);$port=(int)substr(strrchr($address,':'),1);
// The test rotates a TOTP credential during one long-running router fixture.
 // Disable CLI-server OPcache so a cached config.local.php cannot permit a
 // stale admin session for its revalidation interval (typically two seconds).
 // Keep the credential-hash revocation assertion; never loosen expected 403.
$process=proc_open([PHP_BINARY,'-d','opcache.enable=0','-d','opcache.enable_cli=0','-S','127.0.0.1:'.$port,'-t',$folder,$folder.'/router.php'],[0=>['pipe','r'],1=>['file',$folder.'/server.log','a'],2=>['file',$folder.'/server.log','a']],$pipes,$folder);
if(!is_resource($process))throw new RuntimeException('test_server_failed');
function request(string $path,int $expected,string $method='GET',?array $body=null,array $extra=[],bool $cookie=true):array {
 global $port,$raw;
 $headers=['Content-Type: application/json'];if($cookie)$headers[]='Cookie: drjr_session='.$raw;foreach($extra as $key=>$value)$headers[]=$key.': '.$value;
 $context=stream_context_create(['http'=>['method'=>$method,'header'=>implode("\r\n",$headers),'content'=>$body===null?'':json_encode($body),'ignore_errors'=>true,'timeout'=>5]]);
 $data=file_get_contents('http://127.0.0.1:'.$port.$path,false,$context);$status=(int)explode(' ',$http_response_header[0])[1];if($status!==$expected){$log=(string)@file_get_contents($GLOBALS['folder'].'/server.log');$errors=array_values(array_filter(explode("\n",$log),fn($line)=>str_contains($line,'Fatal error')||str_contains($line,'Uncaught Error')||str_contains($line,'Failed opening required')));throw new RuntimeException($path.' HTTP '.$status.' expected '.$expected.'; fixture PHP diagnostic: '.substr(implode(' | ',array_slice($errors,-3)),0,1500));}
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
 request('/api/admin/operations/commerce',401,'GET',null,[],false);
 request('/api/admin/operations/ai-visibility',401,'GET',null,[],false);
 request('/api/admin/operations/gsc-direct',401,'GET',null,[],false);
 request('/api/admin/operations/search-intelligence',401,'GET',null,[],false);
 request('/api/admin/operations/commerce/donation-reconcile',401,'POST',
    ['orderId'=>'11111111-1111-4111-8111-111111111185'],[],false);
 request('/api/admin/operations/commerce/book-expire',401,'POST',
    ['orderId'=>'11111111-1111-4111-8111-111111111185'],[],false);
 request('/api/admin/operations/social/settings',401,'GET',null,[],false);
 request('/api/admin/operations/social/account-intents',401,'POST',['provider'=>'telegram','publicHandle'=>'demo'],[],false);
 request('/api/admin/operations/github-audits',401,'GET',null,[],false);
 request('/api/admin/operations/github-audits/dispatch',401,'POST',['actionId'=>'ENG-01.ACT-001','requestKey'=>str_repeat('b',32),'approval'=>'APPROVE_READONLY_AUDIT'],[],false);
 request('/api/admin/operations?role=SUPER_ADMIN',403);
 $session=request('/api/admin/operations/session',200);check($session['mfaRequired']===true,'MFA not required');
 request('/api/admin/operations/ai-visibility',403);
 request('/api/admin/operations/gsc-direct',403);
 request('/api/admin/operations/search-intelligence',403);
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
 // A regular verified ADMIN is never allowed to reconcile provider payments
 // or cancel book holds; SUPER_ADMIN + fresh MFA/CSRF is required.
 request('/api/admin/operations/commerce/donation-reconcile',403,'POST',[
    'orderId'=>'11111111-1111-4111-8111-111111111185',
    'gatewayId'=>'987654','transactionId'=>'606060',
    'ownerConfirmedPanelTransaction'=>true
 ],$headers);
 request('/api/admin/operations/commerce/book-expire',403,'POST',[
    'orderId'=>'11111111-1111-4111-8111-111111111185',
    'gatewayId'=>'987654','providerStatus'=>'failed',
    'ownerVerifiedGateway'=>true,'acknowledgeLatePaymentRisk'=>true
 ],$headers);
 // Synthetic SUPER_ADMIN fixture tests must fail before any BitPay call.
 // Upgrade the same isolated account temporarily (private registry + DB must agree).
 $configuration['operations_admins'][$id]['role']='SUPER_ADMIN';writeConfig();
 $pdo->prepare("UPDATE operations_admin_memberships SET role='SUPER_ADMIN' WHERE account_id=?")->execute([$id]);
 // Installing the unified schema must not switch on alert emails or
 // the response probe; defaults are explicit owner-off policies.
 check((int)$pdo->query('SELECT enabled FROM operations_alert_settings WHERE singleton_id=1')->fetchColumn()===0
     && (int)$pdo->query('SELECT COALESCE(MAX(enabled),0) FROM operations_alert_rules')->fetchColumn()===0
     && (int)$pdo->query('SELECT enabled FROM operations_response_probe_settings WHERE singleton_id=1')->fetchColumn()===0,
     'schema installation unexpectedly enabled alert emails or response probes');
 // Scheduled work must remain OFF even with per-source rows enabled;
 // all activity and deletion below uses the isolated operations_fixture DB.
 $masterOff=request('/api/admin/operations/collection-settings',200);
 check(($masterOff['automaticCollection']['enabled']??true)===false
     && array_key_exists('installedCronVerified',$masterOff['automaticCollection']??[])
     && $masterOff['automaticCollection']['installedCronVerified']===null,
     'collector master switch falsely reported on or Cron verified');
 $noMasterCsrf=$headers;unset($noMasterCsrf['X-CSRF-Token']);
 request('/api/admin/operations/collection-automatic',403,'POST',[
     'enabled'=>true,'confirmation'=>'ENABLE SCHEDULED COLLECTION'
 ],$noMasterCsrf);
 $paused=operationsCollectorRefresh($pdo,'scheduled',$now);
 check(($paused['status']??null)==='paused_by_owner'
     && ($paused['attempted']??-1)===0,
     'scheduled collector ran despite owner-disabled master switch');
 request('/api/admin/operations/collection-automatic',400,'POST',[
     'enabled'=>true,'confirmation'=>'not-owner-approval'
 ],$headers);
 $pdo->prepare('INSERT INTO operations_collection_cache
     (scope_key,fetched_at,expires_at,body_json) VALUES (?,?,?,?)')
     ->execute(['governance:repository',$now-120,$now-30,'{}']);
 $pdo->prepare("INSERT INTO operations_collection_attempts
     (scope_key,attempted_at,result,failure_code) VALUES (?,?,'failed',NULL)")
     ->execute(['governance:repository',$now-90]);
 $pdo->prepare("INSERT INTO operations_source_metric_samples
     (source_id,metric_key,metric_value,unit,observed_at,expires_at,evidence_type,created_at)
     VALUES (?,?,0,'boolean',?,?,'internal_event',?)")
     ->execute(['collector:governance:repository','fetch_success',$now-90,$now-30,$now-90]);
 $preview=request('/api/admin/operations/collection-data-preview?scope=governance%3Arepository',200);
 check(($preview['countsBounded']['cacheRows']??null)===1
     && ($preview['countsBounded']['attemptRows']??null)===1
     && ($preview['countsBounded']['metricRows']??null)===1,
     'owner-scoped diagnostic deletion preview was inaccurate');
 request('/api/admin/operations/collection-data-delete',400,'POST',[
     'scope'=>'governance:repository','confirmation'=>'incorrect'
 ],$headers);
 $deleted=request('/api/admin/operations/collection-data-delete',200,'POST',[
     'scope'=>'governance:repository',
     'confirmation'=>'DELETE SOURCE DIAGNOSTICS:governance:repository'
 ],$headers);
 check(($deleted['deleted']??null)===['cacheRows'=>1,'attemptRows'=>1,'metricRows'=>1]
     && (int)$pdo->query("SELECT COUNT(*) FROM operations_collection_cache WHERE scope_key='governance:repository'")->fetchColumn()===0,
     'source cleanup failed to stay bounded to disposable diagnostic records');
 $auditDeleted=(int)$pdo->query("SELECT COUNT(*) FROM operations_audit WHERE action='collector_data_purged'")->fetchColumn();
 check($auditDeleted===1,'diagnostic data deletion was not recorded in immutable audit log');
 // Database-health capability is owner-only, off-by-default and read-only until requested.
 $initialDbHealth=request('/api/admin/operations/database-health',200);
 check(($initialDbHealth['schema']??null)==='operations-database-health-v1'
     && ($initialDbHealth['mode']??null)==='manual_readonly'
     && ($initialDbHealth['settings']['monitoringEnabled']??true)===false
     && ($initialDbHealth['settings']['errorLoggingEnabled']??true)===false
     && ($initialDbHealth['automaticRepairEnabled']??true)===false,
     'database health was automatically activated or lacked initial safeguards');
 check(($initialDbHealth['inventory']['operationsTableCount']??0)>=24
     && ($initialDbHealth['connection']??'')==='available',
     'isolated database inventory was not observed');
 $noDbCsrf=$headers;unset($noDbCsrf['X-CSRF-Token']);
 request('/api/admin/operations/database-health/settings',403,'POST',[
     'monitoringEnabled'=>true,'errorLoggingEnabled'=>true,
     'cadence'=>'daily','clockMinutes'=>210,'retentionDays'=>90
 ],$noDbCsrf);
 operationsDbHealthRecordError($pdo,'database_test',new PDOException('sensitive DSN in error'),$now);
 check((int)$pdo->query('SELECT COUNT(*) FROM operations_database_error_events')->fetchColumn()===0,
     'disabled database error logger wrote a record');
 $savedDbHealth=request('/api/admin/operations/database-health/settings',200,'POST',[
     'monitoringEnabled'=>false,'errorLoggingEnabled'=>true,
     'cadence'=>'manual','clockMinutes'=>210,'retentionDays'=>90
 ],$headers);
 check(($savedDbHealth['settings']['monitoringEnabled']??true)===false
     && ($savedDbHealth['settings']['errorLoggingEnabled']??false)===true,
     'owner-only database logging preference not saved correctly');
 $databaseException=new PDOException('secret password SQL query should never persist');
 $databaseException->errorInfo=['42000',1064,'Secret user data from driver'];
 operationsDbHealthRecordError($pdo,'database_test',$databaseException,$now-95*86400);
 check((int)$pdo->query('SELECT COUNT(*) FROM operations_database_error_events')->fetchColumn()===1,
     'explicit opt-in database error logging failed');
 $dbReport=request('/api/admin/operations/database-health',200);
 check(($dbReport['errors']['status']??null)==='available'
     && count($dbReport['errors']['rows']??[])===1
     && !str_contains(json_encode($dbReport['errors'],JSON_THROW_ON_ERROR),'secret'),
     'redacted error journal not available or exposed database exception text');
 $purgePreview=request('/api/admin/operations/database-health/purge-preview',200);
 check(($purgePreview['eligibleCount']??0)===1 && $purgePreview['previewOnly']===true,
     'old diagnostic row did not appear in bounded dry-run preview');
 request('/api/admin/operations/database-health/purge-expired',400,'POST',[
     'confirmation'=>'wrong value'
 ],$headers);
 $purgeResult=request('/api/admin/operations/database-health/purge-expired',200,'POST',[
     'confirmation'=>'DELETE EXPIRED DATABASE LOGS'
 ],$headers);
 check(($purgeResult['deleted']??null)===1
     && (int)$pdo->query('SELECT COUNT(*) FROM operations_database_error_events')->fetchColumn()===0,
     'owner-confirmed expired diagnostic purge did not respect its scope');
 // Tests are isolated; disable the logger again before further route fixtures.
 request('/api/admin/operations/database-health/settings',200,'POST',[
     'monitoringEnabled'=>false,'errorLoggingEnabled'=>false,
     'cadence'=>'manual','clockMinutes'=>210,'retentionDays'=>90
 ],$headers);
 // The same isolated account can now read the owner-only AI evidence.
 $joint=request('/api/admin/operations/search-intelligence',200);
 check(($joint['schema']??'')==='jr-owner-search-intelligence-v1'&&array_key_exists('activeUsers',$joint['ga4'])&&$joint['ga4']['activeUsers']===null
     &&($joint['tagManager']['containerId']??null)==='GTM-P6LWCLKM'
     &&($joint['tagManager']['productionCollectionVerified']??true)===false,'GTM prematurely certified or missing GA4 improperly treated as verified');
 check(($joint['clarity']['projectId']??null)==='z0mzp0dp74' && ($joint['clarity']['recordingVerified']??true)===false,'Clarity recording incorrectly certified');
 $gscDirect=request('/api/admin/operations/gsc-direct',200);
 check(($gscDirect['schema']??'')==='jr-owner-gsc-direct-v1'&&($gscDirect['status']??'')==='unavailable'
     &&array_key_exists('clicks',$gscDirect['metrics'])&&$gscDirect['metrics']['clicks']===null&&($gscDirect['apiLiveNow']??true)===false,
     'Direct GSC absent snapshot invented source or traffic');
 $aisv=request('/api/admin/operations/ai-visibility',200);
 check($aisv['status']==='provider_report_snapshot'&&$aisv['sampledAnswers']===5
     &&$aisv['brandMentions']===0&&(float)$aisv['brandPresencePercent']===0.0,
     'Ubersuggest sample must preserve observed zero without fabricated coverage');
 check(count($aisv['prompts'])===10&&$aisv['prompts'][5]['brandPresencePercent']===null
     &&$aisv['providers'][1]['sampledAnswers']===null,
     'missing provider and unsampled prompts incorrectly counted as zero');
 check($aisv['verifiedCitationCount']===null,'unverified citation count exposed');
 $noCsrf=$headers;unset($noCsrf['X-CSRF-Token']);
 request('/api/admin/operations/commerce/donation-reconcile',403,'POST',[
    'orderId'=>'11111111-1111-4111-8111-111111111185',
    'gatewayId'=>'987654','transactionId'=>'606060','ownerConfirmedPanelTransaction'=>true
 ],$noCsrf);
 request('/api/admin/operations/commerce/book-expire',403,'POST',[
    'orderId'=>'11111111-1111-4111-8111-111111111185',
    'gatewayId'=>'987654','providerStatus'=>'failed',
    'ownerVerifiedGateway'=>true,'acknowledgeLatePaymentRisk'=>true
 ],$noCsrf);
 // Required positive owner attestation is missing: reject without gateway I/O.
 request('/api/admin/operations/commerce/donation-reconcile',422,'POST',[
    'orderId'=>'11111111-1111-4111-8111-111111111185',
    'gatewayId'=>'987654','transactionId'=>'606060'
 ],$headers);
 request('/api/admin/operations/commerce/book-expire',422,'POST',[
    'orderId'=>'11111111-1111-4111-8111-111111111185',
    'gatewayId'=>'987654','providerStatus'=>'failed',
    'ownerVerifiedGateway'=>false,'acknowledgeLatePaymentRisk'=>true
 ],$headers);
 $configuration['operations_admins'][$id]['role']='ADMIN';writeConfig();
 $pdo->prepare("UPDATE operations_admin_memberships SET role='ADMIN' WHERE account_id=?")->execute([$id]);

 request('/api/admin/operations/mfa',403,'POST',['code'=>$code],$headers);
 
 $beforeCollections=(int)$pdo->query('SELECT COUNT(*) FROM operations_collection_policies')->fetchColumn();
 check($beforeCollections===22,'Thirteen engines, eight sources and disabled owner master switch were not seeded');
 $initial=request('/api/admin/operations/collection-settings',200);
 check(count($initial['rows'])===21 && $initial['timezone']==='Asia/Tehran',
     'Collector policy inventory missing');
 check(($initial['unmappedPolicies']['count']??null)===0,
     'canonical fixture unexpectedly contains unconsumed collector settings');
 check(($initial['scheduler']??null)==='external_bertina_cron_required',
     'private operations API falsely claimed Cron was installed');
 // A manually inserted log name is not a registered GitHub collector or cron job.
 $pdo->prepare("INSERT INTO operations_collection_policies
     (scope_key,enabled,cadence,clock_minutes,next_due,updated_at)
     VALUES (?,0,'manual',210,0,?)")->execute(['http_access_log',$now]);
 $withUnmapped=operationsCollectorStatus($pdo,$now);
 check(($withUnmapped['unmappedPolicies']['ids']??[])===['http_access_log']
     && ($withUnmapped['unmappedPolicies']['count']??null)===1
     && count($withUnmapped['rows'])===21,
     'orphan log policy was concealed or incorrectly activated as a GitHub collector');
 $pdo->prepare('DELETE FROM operations_collection_policies WHERE scope_key=?')
     ->execute(['http_access_log']); // Isolated CI fixture only.

 // A policy due date is intent, not proof of a cPanel cron installation.
 $collectionById=array_column($initial['rows'],null,'id');
 check($collectionById['ENG-01']['scheduleEvidence']==='engine_switch_only'
     && $collectionById['ENG-01']['executionEvidence']==='not_applicable',
     'engine switch was falsely treated as an independent scheduled worker');
 check($initial['attemptJournalStatus']==='available'
     && $collectionById['governance:repository']['executionEvidence']==='never_observed',
     'empty journal was mistaken for confirmed collector activity');
 check($collectionById['governance:repository']['scheduleEvidence']==='scheduled_unverified',
     'future due time was mistakenly treated as installed cron');
 $pdo->prepare('UPDATE operations_collection_policies SET next_due=? WHERE scope_key=?')
     ->execute([$now-120,'governance:repository']);
 $dueStatus=operationsCollectorStatus($pdo,$now);
 $dueById=array_column($dueStatus['rows'],null,'id');
 check($dueById['governance:repository']['scheduleEvidence']==='due_unverified',
     'overdue source policy falsely certified a worker execution');
 $pdo->prepare("INSERT INTO operations_collection_attempts
     (scope_key,attempted_at,result,failure_code) VALUES (?,?,'failed',?)")
     ->execute(['governance:repository',$now-90,'provider_result_unavailable']);
 $failedStatus=operationsCollectorStatus($pdo,$now);
 $failedById=array_column($failedStatus['rows'],null,'id');
 check($failedById['governance:repository']['executionEvidence']==='last_attempt_failed'
     && $failedById['governance:repository']['lastAttempt']['result']==='failed',
     'real recorded attempt failure was hidden or misclassified');
 $pdo->prepare("INSERT INTO operations_collection_attempts
     (scope_key,attempted_at,result,failure_code) VALUES (?,?,'succeeded',NULL)")
     ->execute(['governance:repository',$now-60]);
 $recordedStatus=operationsCollectorStatus($pdo,$now);
 $recordedById=array_column($recordedStatus['rows'],null,'id');
 check($recordedById['governance:repository']['executionEvidence']==='attempt_recorded'
     && $recordedById['governance:repository']['scheduleEvidence']==='due_unverified',
     'successful manual observation falsely proved cron installation');
 // Restore the seeded due time so later fixtures retain their initial assumptions.
 $pdo->prepare('UPDATE operations_collection_policies SET next_due=? WHERE scope_key=?')
     ->execute([operationsCollectorNextDue('hourly',20,$now),'governance:repository']);
 $cached=request('/api/admin/operations/github-audits',200);
 check(($cached['collection']['sourceStates']['governance:repository']['status']??null)==='missing',
     'Unfetched GitHub source was falsely presented as fresh');
 request('/api/admin/operations/collection-settings',403,'POST',[
  'key'=>'ENG-01','enabled'=>false,'cadence'=>'manual','clockMinutes'=>240
 ],$headers);
 request('/api/admin/operations/github-audits/refresh',400,'POST',[
  'scope'=>'malicious:provider'
 ],$headers);
 // Toggle logic in the same isolated mother database: never network fetch.
 operationsCollectorConfigure($pdo,'ENG-11',false,'manual',120,$id,$now);
 $disabled=operationsCollectorStatus($pdo,$now);
 check(count(array_filter($disabled['sourceStates'],
    static fn($state)=>$state['status']==='disabled'))>=4,
    'Disabling engine did not block inherited provider collectors');
 operationsCollectorConfigure($pdo,'ENG-11',true,'hourly',25,$id,$now);
 check(operationsCollectorNextDue('manual',120,$now)===0
    &&operationsCollectorNextDue('daily',300,$now)>$now,
    'Schedule computed an unsafe automatic execution');

 $social=request('/api/admin/operations/social/settings',200);
 check(count($social['catalogue'])===16,'social network catalogue incomplete');
 check($social['oauthExchangeAvailable']===false &&
       $social['automatedPublishingAvailable']===false,'provider automation falsely enabled');
 check($social['settings']===null,'uninstalled settings schema represented as configured');
 request('/api/admin/operations/social/settings',403,'POST',[
   'provider'=>'telegram','draftEnabled'=>true,'draftLocale'=>'both',
   'approvalMode'=>'review_required','dailyDraftLimit'=>1,
   'preferredLocalTime'=>'21:00','utmCampaign'=>'editorial'
 ]);
 request('/api/admin/operations/social/settings',503,'POST',[
   'provider'=>'telegram','draftEnabled'=>true,'draftLocale'=>'both',
   'approvalMode'=>'review_required','dailyDraftLimit'=>1,
   'preferredLocalTime'=>'21:00','utmCampaign'=>'editorial'
 ],$headers);
 request('/api/admin/operations/social/account-intents',503,'POST',
   ['provider'=>'telegram','publicHandle'=>'demo'],$headers);
 // Signed-in and freshly TOTP-elevated ADMIN can read the redacted monitor;
 // absent Stage09 schema must stay UNKNOWN, never zero orders or fake settlement.
 $commerce=request('/api/admin/operations/commerce',200);
 check($commerce['available']===false && $commerce['reason']==='stage09_schema_unavailable',
     'unmigrated commerce reported as fully operational');
 check($commerce['orders']===null && $commerce['providerBankSettlementVerified']===null,
     'unknown bank/commerce status turned into fictitious zero or success');
 check($commerce['customerDetailsExposed']===false,
     'admin commerce monitor exposed customer details');
 // Freshly MFA-verified ADMIN is not the owner: deny provider snapshots.
 request('/api/admin/operations/ai-visibility',403);
 $data=request('/api/admin/operations',200);check($data['dashboard']['measuredProgress']===75,'unexpected admin score');check($data['dashboard']['closed']===false,'unverified production admin closed');check(count($data['reports'])===36,'report count changed');
 check(count($data['reporting']['engines'])===13,'canonical engine count changed');
 check(count($data['reporting']['actionReports'])===52,'action inventory changed');
 check(count($data['reporting']['awoseDomainViews'])===36,'AWOSE domain views missing');
 check($data['reporting']['masterReport']['reportCount']===36,'administrative report double counted');

 // Backend contract: all 36 reports x 4 gates are explicitly unknown without current-release evidence.
 // The separately evaluated ADM-01 gates must never inflate the public 144-gate matrix.
 $matrix=$data['summary']['gateCoverage']??null;
 check(is_array($matrix)&&array_keys($matrix)===['code','tests','production','evidence'],
     'Backend did not expose the four canonical evidence axes');
 foreach($matrix as $axis=>$counts){
     check(array_keys($counts)===['pass','fail','blocked','stale','unknown'],
         'Unexpected gate-coverage states in '.$axis);
     check(array_sum($counts)===36 && $counts['unknown']===36,
         'Missing evidence wrongly promoted to accepted/failed production coverage in '.$axis);
 }
 check($data['summary']['verified']===0 && $data['summary']['measuredCoverage']===0,
     'ADM-only evidence leaked into 36-report completion');

 // Adversarial evidence precedence: future and other-release events must be ignored;
 // a same-time failure outranks a pass, and an expired pass stays stale.
 $record=operationsRegistry()['reports'][1]; // OP-02, independent of runtime blockers.
 $probe=[
     ['section_id'=>'OP-02','release_sha'=>$sha,'gate_id'=>'code','result'=>'pass',
      'checked_at'=>$now-4,'expires_at'=>$now+80],
     ['section_id'=>'OP-02','release_sha'=>$sha,'gate_id'=>'tests','result'=>'pass',
      'checked_at'=>$now-3,'expires_at'=>$now+80],
     ['section_id'=>'OP-02','release_sha'=>$sha,'gate_id'=>'tests','result'=>'fail',
      'checked_at'=>$now-3,'expires_at'=>$now+80],
     ['section_id'=>'OP-02','release_sha'=>$sha,'gate_id'=>'production','result'=>'blocked',
      'checked_at'=>$now-2,'expires_at'=>$now+80],
     ['section_id'=>'OP-02','release_sha'=>$sha,'gate_id'=>'evidence','result'=>'pass',
      'checked_at'=>$now-100,'expires_at'=>$now-1],
     ['section_id'=>'OP-02','release_sha'=>str_repeat('b',40),'gate_id'=>'code','result'=>'fail',
      'checked_at'=>$now-1,'expires_at'=>$now+80],
     ['section_id'=>'OP-02','release_sha'=>$sha,'gate_id'=>'code','result'=>'fail',
      'checked_at'=>$now+1,'expires_at'=>$now+80],
 ];
 $evaluated=operationsEvaluate($record,$probe,$sha,$now);
 check(array_column($evaluated['verifiedGates'],'state')===['pass','fail','blocked','stale'],
     'Evidence precedence incorrectly promoted stale/future/foreign-release records');
 check($evaluated['closed']===false && $evaluated['status']==='regressed'
     && $evaluated['measuredProgress']===25,
     'Mixed evidence states incorrectly certified report completion');


 // Read-only Action execution always requires the SAME admin session, fresh MFA and CSRF.
 $history=request('/api/admin/operations/action-runs',200);
 check($history['runs']===[],'unexpected pre-existing action journal records');
 request('/api/admin/operations/action-runs',403,'POST',['actionId'=>'ENG-11.ACT-009','requestKey'=>str_repeat('a',32)]);
 request('/api/admin/operations/action-runs',403,'POST',['actionId'=>'ENG-11.ACT-009','requestKey'=>str_repeat('a',32)],['Origin'=>'https://evil.example','X-CSRF-Token'=>$elevatedSession['csrfToken']]);
 request('/api/admin/operations/action-runs',400,'POST',['actionId'=>'ENG-11.ACT-009','requestKey'=>str_repeat('a',32),'unsafe'=>'payload'],$headers);
 request('/api/admin/operations/action-runs',403,'POST',['actionId'=>'ENG-05.ACT-002','requestKey'=>str_repeat('a',32)],$headers);
 // Ordinary ADMIN, even with fresh MFA, is not authorized to start CI workflows.
 request('/api/admin/operations/github-audits/dispatch',403,'POST',[
    'actionId'=>'ENG-01.ACT-001','requestKey'=>str_repeat('b',32),'approval'=>'APPROVE_READONLY_AUDIT'],$headers);
 $readonly=request('/api/admin/operations/action-runs',200,'POST',['actionId'=>'ENG-11.ACT-009','requestKey'=>str_repeat('a',32)],$headers);
 check($readonly['run']['status']==='succeeded','Release observation did not execute');
 check($readonly['run']['result']['freshSignalCount']===1,'Expected one real current release signal');
 check($readonly['run']['result']['signalIds']===['current_release'],'Unallowlisted signal escaped to action result');
 $beforeRunCount=(int)$pdo->query('SELECT COUNT(*) FROM operations_action_runs')->fetchColumn();
 $duplicate=request('/api/admin/operations/action-runs',200,'POST',['actionId'=>'ENG-11.ACT-009','requestKey'=>str_repeat('a',32)],$headers);
 check($duplicate['run']['runId']===$readonly['run']['runId'],'Idempotent request did not return original run');
 check((int)$pdo->query('SELECT COUNT(*) FROM operations_action_runs')->fetchColumn()===$beforeRunCount,'Idempotent retry duplicated the action');
 request('/api/admin/operations/action-runs',409,'POST',['actionId'=>'ENG-07.ACT-007','requestKey'=>str_repeat('a',32)],$headers);
 $history=request('/api/admin/operations/action-runs',200);
 check(count($history['runs'])===1 && $history['runs'][0]['actionId']==='ENG-11.ACT-009','Actor action history not persisted');
 check((int)$pdo->query('SELECT COUNT(*) FROM operations_evidence')->fetchColumn()===$before,'Read-only action fabricated acceptance evidence');
 check(!str_contains(json_encode($history),$secret)&&!str_contains(json_encode($history),$password),'Action result exposed secret');


 // Same Bertina MySQL journal: synthetic transport confirms only REQUEST acceptance (204),
 // never a fabricated GitHub job success or a high-risk Action closure.
 $auditRegistry=operationsRegistry();$auditConfig=['github_audit_dispatch_token'=>str_repeat('Z',48)];
 check(operationsGithubDispatchDefinition($auditRegistry,'ENG-01.ACT-001')!==null,'Valid non-deploying audit mapping rejected');
 check(operationsGithubDispatchDefinition($auditRegistry,'ENG-11.ACT-005')===null,'Critical backup action cannot be submitted');
 check(operationsGithubDispatchDefinition($auditRegistry,'ENG-05.ACT-002')===null,'Payment action cannot be submitted');
 $transportCalls=0;$tag=str_repeat('c',32);
 $transport=function($workflow,$requestKey,$token)use(&$transportCalls,$tag){
     $transportCalls++;
     check($workflow==='bertina-master-seo.yml','Wrong workflow dispatched');
     check($requestKey===$tag,'Request trace changed');
     check($token===str_repeat('Z',48),'Owner-only test transport token changed');
     return 204;
 };
 if(!function_exists('nowTs')){function nowTs():int{return time();}}
 $submitted=operationsGithubDispatchRun($pdo,$auditRegistry,$id,'ENG-01.ACT-001',
     $tag,'APPROVE_READONLY_AUDIT',$sha,$auditConfig,time(),$transport);
 check($submitted['status']==='awaiting_external_run_correlation','HTTP 204 must leave audit pending external result');
 check($submitted['result']['dispatchState']==='accepted_run_unconfirmed','Workflow start incorrectly claimed success');
 check($submitted['result']['githubRunId']===null,'Invented GitHub run ID');
 check($transportCalls===1,'Expected exactly one approved outbound dispatch');
 $lateActorHistory=operationsActionHistory($pdo,$id,time()+600);
 $lateRequest=array_column($lateActorHistory,null,'runId')[$submitted['runId']]??null;
 check(is_array($lateRequest)&&$lateRequest['status']==='awaiting_external_run_correlation',
    'Async GitHub provider audit was falsely marked as interrupted after local request timeout');
 $same=operationsGithubDispatchRun($pdo,$auditRegistry,$id,'ENG-01.ACT-001',
     $tag,'APPROVE_READONLY_AUDIT',$sha,$auditConfig,time(),$transport);
 check($same['runId']===$submitted['runId']&&$transportCalls===1,'Replay re-dispatched the workflow');
 try {
     operationsGithubDispatchRun($pdo,$auditRegistry,$id,'ENG-11.ACT-003',$tag,
         'APPROVE_READONLY_AUDIT',$sha,$auditConfig,time(),$transport);
     throw new RuntimeException('Cross-Action replay accepted');
 }catch(DomainException $e){check($e->getMessage()==='audit_idempotency_conflict','Cross-Action replay returned wrong failure');}
 $event=['id'=>38275309821,
     'html_url'=>'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38275309821',
     'head_sha'=>str_repeat('a',40),'status'=>'completed','conclusion'=>'success',
     'event'=>'workflow_dispatch','display_title'=>'Admin audit '.$tag,
     'created_at'=>'2026-10-12T16:09:21Z','updated_at'=>'2026-10-12T16:09:58Z'];
 $observed=operationsGithubAuditProject(['workflow_runs'=>[$event]],'bertina-master-seo.yml');
 check($observed[0]['requestKey']===$tag,'Provider run correlation was lost');
 $linked=operationsGithubCorrelatedRuns([['actionId'=>'ENG-01.ACT-001','runs'=>$observed]],
     operationsActionHistory($pdo,$id,time()));
 check(count($linked)===1&&$linked[0]['status']==='github_observed','Exact audit was not correlated');
 check($linked[0]['github']['conclusion']==='success','Provider conclusion missing');
 $event['display_title']='Admin audit '.str_repeat('e',32);
 $unrelated=operationsGithubCorrelatedRuns([['actionId'=>'ENG-01.ACT-001',
    'runs'=>operationsGithubAuditProject(['workflow_runs'=>[$event]],'bertina-master-seo.yml')]],
    operationsActionHistory($pdo,$id,time()));
 check(count($unrelated)===1&&$unrelated[0]['github']===null,'Unrelated GitHub audit spoofed correlation');

 $noMatch=operationsGithubReconcile($pdo,$id,[
    ['actionId'=>'ENG-01.ACT-001','runs'=>operationsGithubAuditProject(['workflow_runs'=>[$event]],'bertina-master-seo.yml')]
 ],time());
 check($noMatch['recorded']===0,'Wrong external trace fabricated a completed audit');
 $verified=operationsGithubReconcile($pdo,$id,[
    ['actionId'=>'ENG-01.ACT-001','runs'=>$observed]
 ],time());
 check($verified['recorded']===1,'Independently matched audit result not persisted');
 $afterVerified=array_column(operationsActionHistory($pdo,$id,time()),null,'runId')[$submitted['runId']]??null;
 check($afterVerified!==null&&$afterVerified['status']==='succeeded','Stored provider audit conclusion missing');
 check($afterVerified['result']['githubRunId']===38275309821,'Authenticated provider run ID mismatch');
 check($afterVerified['result']['verifiedByProvider']===true,'Provider provenance not recorded');
 $replay=operationsGithubReconcile($pdo,$id,[['actionId'=>'ENG-01.ACT-001','runs'=>$observed]],time());
 check($replay['recorded']===0,'Terminal provider result changed on duplicate review');

 check((int)$pdo->query('SELECT COUNT(*) FROM operations_evidence')->fetchColumn()===$before,
    'Synthetic audit dispatch fabricated acceptance evidence');

 $canonicalEngines=array_column($data['reporting']['engines'],null,'id');
 check($canonicalEngines['ENG-13']['reportIds']===[],'reporting engine acquired operational ownership');
 check($canonicalEngines['ENG-12']['metrics']['totalReports']===1,'admin report lost its owner');
 check($data['reporting']['masterReport']['ownerByReportId']['OP-07']==='ENG-05','commerce ownership mismatch');
 check($data['reporting']['executiveReport']['metrics']['measuredCompletion']===null,'unknown operational progress fabricated');
 $reports=array_column($data['reports'],null,'id');
 $identitySignals=array_column($reports['OP-05']['signals'],null,'id');
 check($identitySignals['auth_runtime']['value']===true&&$identitySignals['email_transport']['value']===false,'existing auth must remain available while email transport is blocked');
 check($reports['OP-05']['status']==='blocked'&&$reports['OP-05']['closed']===false,'missing email transport did not block identity');
 check($reports['OP-07']['status']==='blocked'&&$reports['OP-07']['closed']===false,'unconfigured checkout did not block commerce');
 $storeSignals=array_column($reports['OP-10']['signals'],null,'id');
 check($storeSignals['sellable_books']['value']===3,'server-authoritative book catalogue not connected');
 $gscSignals=array_column($reports['OP-14']['signals'],null,'id');
 check($gscSignals['sample_size']['value']===10&&$gscSignals['indexed_sample']['value']===8&&$gscSignals['unknown_sample']['value']===2,'Google sample incorrectly represented');
 check($reports['OP-14']['measuredProgress']===null&&$reports['OP-14']['closed']===false,'Google sample certified overall indexation');
 check(!str_contains(json_encode($data),$password)&&!str_contains(json_encode($data),$secret)&&!str_contains(json_encode($data),str_repeat('p',32)),'private configuration leaked through metrics');

 // Production-proof fixture: isolated MySQL + validated, release-matched 6/6
 // TLS matrix, not a real credential, real DNS probe, payment, or restoration.
 $tlsProof=['schema'=>'operations-tls-v1','ok'=>true,'commit'=>$sha,
    'runId'=>$run,'observer'=>'independent-runner-direct-tcp-and-public-dns',
    'checkedAt'=>$now-1,'checks'=>[],'certificates'=>[]];
 foreach(['drjavadrezazadeh.com','www.drjavadrezazadeh.com'] as $hostname){
    $tlsProof['certificates'][]=['host'=>$hostname,'expiresAt'=>$now+864000];
    $tlsProof['checks'][]=['name'=>$hostname.' origin CA-chain hostname and expiry','passed'=>true];
    foreach(['origin','public'] as $scope)$tlsProof['checks'][]=[
       'name'=>$hostname.' '.$scope.' HTTPS status and canonical destination','passed'=>true];
 }
 $httpsServer=['HTTPS'=>'on','HTTP_HOST'=>'drjavadrezazadeh.com'];
 $beforeTls=(int)$pdo->query('SELECT COUNT(*) FROM operations_evidence')->fetchColumn();
 $beforeSnapshot=$data; // Authenticated API snapshot, not a source-only fixture.
 check(operationsRecordVerifiedProduction($pdo,$beforeSnapshot,$id,$now,$httpsServer,$tlsProof),
    'Release-matched independent TLS matrix did not register');
 check((int)$pdo->query('SELECT COUNT(*) FROM operations_evidence')->fetchColumn()===$beforeTls+2,
    'TLS collection imported unexpected acceptance gates');
 check(operationsRecordVerifiedProduction($pdo,$beforeSnapshot,$id,$now,$httpsServer,$tlsProof),
    'Idempotent valid TLS observation unexpectedly failed');
 check((int)$pdo->query('SELECT COUNT(*) FROM operations_evidence')->fetchColumn()===$beforeTls+2,
    'Refreshing a five-minute TLS observation duplicated evidence');
 $postTls=request('/api/admin/operations',200); // Read persisted evidence through real PHP HTTP.
 $byTls=array_column($postTls['reports'],null,'id');
 $tlsStates=array_column($byTls['OP-03']['verifiedGates'],'state','id');
 check($tlsStates===['code'=>'unknown','tests'=>'unknown','production'=>'pass','evidence'=>'unknown'],
    'Narrow TLS check fabricated code/tests/evidence gate success');
 check($byTls['OP-03']['closed']===false && $byTls['OP-03']['measuredProgress']===25,
    'Single independent TLS gate was mistaken for OP-03 completion');
 check($postTls['summary']['gateCoverage']['production']['pass']===1
    && $postTls['summary']['verified']===0,
    'OP-03 TLS evidence inflated the 36-report completion count');
 foreach(['OP-02','OP-36'] as $unchanged){
    check($byTls[$unchanged]['closed']===false
      && array_column($byTls[$unchanged]['verifiedGates'],'state')===array_fill(0,4,'unknown'),
      $unchanged.' was falsely certified by a TLS-only observation');
 }
 $invalidTls=$tlsProof;$invalidTls['commit']=str_repeat('b',40);
 check(!operationsRecordVerifiedProduction($pdo,$beforeSnapshot,$id,$now,$httpsServer,$invalidTls),
    'Mismatched release TLS proof accepted for MySQL evidence');
 $invalidTls=$tlsProof;$invalidTls['checks'][0]['passed']=false;
 check(!operationsRecordVerifiedProduction($pdo,$beforeSnapshot,$id,$now,$httpsServer,$invalidTls),
    'Failed CA check accepted as verified TLS');
 check(!operationsRecordVerifiedProduction($pdo,$beforeSnapshot,$id,$now,
    ['HTTP_HOST'=>'drjavadrezazadeh.com','HTTP_X_FORWARDED_PROTO'=>'https'],$tlsProof),
    'Spoofed forwarded HTTPS generated production evidence');
 check((int)$pdo->query('SELECT COUNT(*) FROM operations_evidence')->fetchColumn()===$beforeTls+2,
    'Rejected TLS evidence mutated operations MySQL');

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
