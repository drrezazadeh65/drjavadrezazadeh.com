<?php
declare(strict_types=1);
/** One-use owner-authorized TOTP reuse; secret never leaves Bertina private configuration. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
function reply(int $status,array $result): never {
 http_response_code($status);
 echo json_encode($result,JSON_INVALID_UTF8_SUBSTITUTE|JSON_UNESCAPED_SLASHES);
 exit;
}
$token=(string)($_SERVER['HTTP_X_JR_OWNER_REUSE_TOKEN']??'');
if(!preg_match('/^[a-f0-9]{64}$/D',$token)
  || !hash_equals('__JR_REUSE_TOKEN_HASH__',hash('sha256',$token)))
 reply(403,['ok'=>false,'error'=>'forbidden']);
$method=(string)($_SERVER['REQUEST_METHOD']??'');
if(!in_array($method,['GET','POST'],true))reply(405,['ok'=>false,'error'=>'method_not_allowed']);
@set_time_limit(70);
umask(0077);
const EXPECTED_OWNER_ID='678d6b8d-3413-4a10-8f6c-72b92647fdbb';
const EXPECTED_OWNER_EMAIL='dr.rezazadeh65@gmail.com';
function validateOwner(PDO $db,array $config): array {
 $q=$db->prepare('SELECT id,status,email_verified_at FROM customer_accounts WHERE email_normalized=?');
 $q->execute([EXPECTED_OWNER_EMAIL]);$records=$q->fetchAll(PDO::FETCH_ASSOC);
 if(count($records)!==1 || !hash_equals(EXPECTED_OWNER_ID,(string)$records[0]['id'])
   || ($records[0]['status']??'')!=='active' || empty($records[0]['email_verified_at']))
  throw new RuntimeException('verified_owner_not_found');
 $admins=(int)$db->query('SELECT COUNT(*) FROM operations_admin_memberships')->fetchColumn();
 if($admins!==0)throw new RuntimeException('admin_membership_already_exists');
 $existing=$config['operations_admins']??null;
 if(!is_array($existing)||count($existing)!==1)throw new RuntimeException('expected_single_legacy_admin_missing');
 $legacyId=array_key_first($existing);
 $legacy=$existing[$legacyId];
 if(!is_string($legacyId)||$legacyId===EXPECTED_OWNER_ID
   || !preg_match('/^[a-f0-9-]{36}$/iD',$legacyId)
   || !is_array($legacy)||($legacy['role']??'')!=='SUPER_ADMIN'
   || !is_string($legacy['totp_secret']??null)
   || !preg_match('/^[A-Z2-7]{32,128}$/D',$legacy['totp_secret']))
  throw new RuntimeException('legacy_totp_mapping_invalid');
 $old=$db->prepare('SELECT COUNT(*) FROM customer_accounts WHERE id=?');
 $old->execute([$legacyId]);
 if((int)$old->fetchColumn()!==0)throw new RuntimeException('old_admin_account_still_present');
 return ['secret'=>$legacy['totp_secret']];
}
function run(): array {
 $configFile=__DIR__.'/config.local.php';
 if(!is_file($configFile)||!is_writable($configFile))throw new RuntimeException('private_config_not_writable');
 $cfg=require $configFile;
 if(!is_array($cfg)||!str_starts_with((string)($cfg['db_dsn']??''),'mysql:'))
  throw new RuntimeException('private_database_not_configured');
 $db=new PDO((string)$cfg['db_dsn'],(string)($cfg['db_user']??''),(string)($cfg['db_password']??''),[
  PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
  PDO::ATTR_EMULATE_PREPARES=>false
 ]);
 $locked=(int)$db->query("SELECT GET_LOCK('owner_reuse_totp_20261013',10)")->fetchColumn();
 if($locked!==1)throw new RuntimeException('admin_provision_lock_unavailable');
 try{
  $verified=validateOwner($db,$cfg);
  if(($_SERVER['REQUEST_METHOD']??'')==='GET')
    return ['ok'=>true,'phase'=>'preflight','verifiedAccount'=>true,
      'previousTotpAvailable'=>true,'adminMemberships'=>0];
  $siteRoot=realpath(dirname(__DIR__));$privateRoot=realpath(dirname(__DIR__,2));
  if(!$siteRoot||!$privateRoot||$privateRoot===$siteRoot
     ||str_starts_with($privateRoot.'/',$siteRoot.'/')||!is_writable($privateRoot))
    throw new RuntimeException('private_backup_location_unavailable');
  $original=file_get_contents($configFile);
  if(!is_string($original)||!str_starts_with(ltrim($original),'<?php'))
    throw new RuntimeException('config_read_failed');
  $dir=$privateRoot.'/jr-owner-config-recovery-'.bin2hex(random_bytes(12));
  if(!mkdir($dir,0700))throw new RuntimeException('private_backup_directory_failed');
  chmod($dir,0700);
  $backupFile=$dir.'/config.local.php.backup';
  if(file_put_contents($backupFile,$original,LOCK_EX)!==strlen($original))
    throw new RuntimeException('private_backup_write_failed');
  chmod($backupFile,0600);
  if(!hash_equals(hash('sha256',$original),hash('sha256',(string)file_get_contents($backupFile))))
    throw new RuntimeException('private_backup_readback_failed');
  $next=$cfg;
  $next['operations_admins']=[
    EXPECTED_OWNER_ID=>['role'=>'SUPER_ADMIN','totp_secret'=>$verified['secret']]
  ];
  $newText="<?php\nreturn ".var_export($next,true).";\n";
  $candidate=$configFile.'.owner-stage-'.bin2hex(random_bytes(8));
  if(file_put_contents($candidate,$newText,LOCK_EX)!==strlen($newText))
    throw new RuntimeException('config_stage_failed');
  chmod($candidate,0600);
  if(!hash_equals(hash('sha256',$newText),hash('sha256',(string)file_get_contents($candidate)))){
    @unlink($candidate);throw new RuntimeException('config_stage_integrity_failed');
  }
  $swapped=false;
  $db->beginTransaction();
  try{
    $db->prepare("INSERT INTO operations_admin_memberships (account_id,role,enabled,created_at) VALUES (?,'SUPER_ADMIN',1,?)")
      ->execute([EXPECTED_OWNER_ID,time()]);
    if(!rename($candidate,$configFile))throw new RuntimeException('config_atomic_swap_failed');
    $swapped=true;
    if(function_exists('opcache_invalidate'))@opcache_invalidate($configFile,true);
    $db->commit();
  }catch(Throwable $e){
    if($db->inTransaction())$db->rollBack();
    @unlink($candidate);
    if($swapped && hash_equals(hash('sha256',$newText),hash('sha256',(string)@file_get_contents($configFile)))){
      $restoreFile=$configFile.'.restore-'.bin2hex(random_bytes(8));
      if(file_put_contents($restoreFile,$original,LOCK_EX)===strlen($original)){
        chmod($restoreFile,0600);@rename($restoreFile,$configFile);
      }
    }
    throw $e;
  }
  $q=$db->prepare('SELECT role,enabled FROM operations_admin_memberships WHERE account_id=?');
  $q->execute([EXPECTED_OWNER_ID]);$grant=$q->fetch(PDO::FETCH_ASSOC);
  $disk=(string)@file_get_contents($configFile);
  if(!is_array($grant)||$grant['role']!=='SUPER_ADMIN'||(int)$grant['enabled']!==1
      ||!hash_equals(hash('sha256',$newText),hash('sha256',$disk)))
    throw new RuntimeException('admin_membership_postcheck_failed');
  return ['ok'=>true,'phase'=>'owner_admin_relinked',
    'ownerEmail'=>EXPECTED_OWNER_EMAIL,'role'=>'SUPER_ADMIN',
    'previousTotpSecretPreserved'=>true,'secretsReturned'=>false,
    'backupInPrivateHome'=>true,'requiresGoogleAuthenticatorCode'=>true];
 }finally{
  $db->query("SELECT RELEASE_LOCK('owner_reuse_totp_20261013')");
 }
}
try{
 $result=run();
 @unlink(__FILE__);
 reply(200,$result);
}catch(Throwable $e){
 @unlink(__FILE__);
 $allowed=['verified_owner_not_found','admin_membership_already_exists',
 'expected_single_legacy_admin_missing','legacy_totp_mapping_invalid',
 'old_admin_account_still_present','private_config_not_writable',
 'private_database_not_configured','admin_provision_lock_unavailable',
 'private_backup_location_unavailable','config_read_failed',
 'private_backup_directory_failed','private_backup_write_failed',
 'private_backup_readback_failed','config_stage_failed','config_stage_integrity_failed',
 'config_atomic_swap_failed','admin_membership_postcheck_failed'];
 reply(503,['ok'=>false,'phase'=>'blocked','reason'=>
    in_array($e->getMessage(),$allowed,true)?$e->getMessage():'unavailable']);
}
