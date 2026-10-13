<?php
declare(strict_types=1);
/**
 * Owner-approved ONE-SHOT private administrator provisioning.
 * GitHub Actions renders a random nonced copy and calls it once over HTTPS.
 * It does not send passwords, TOTP seeds or config contents to GitHub.
 * Source template is never itself published.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');
function ownerResult(int $http,array $payload): never {
 http_response_code($http);
 echo json_encode($payload,JSON_UNESCAPED_SLASHES|JSON_INVALID_UTF8_SUBSTITUTE);
 exit;
}
$bearer=(string)($_SERVER['HTTP_X_JR_OWNER_PROVISION_TOKEN']??'');
if(($_SERVER['REQUEST_METHOD']??'')!=='POST'
 || !preg_match('/^[a-f0-9]{64}$/D',$bearer)
 || !hash_equals('__JR_OWNER_TOKEN_HASH__',hash('sha256',$bearer)))
 ownerResult(403,['ok'=>false,'status'=>'unauthorized']);
@set_time_limit(65);
umask(0077);

function base32Encode(string $raw): string {
 $alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';$bits='';$encoded='';
 for($i=0;$i<strlen($raw);$i++)$bits.=str_pad(decbin(ord($raw[$i])),8,'0',STR_PAD_LEFT);
 for($i=0;$i<strlen($bits);$i+=5)
   $encoded.=$alphabet[bindec(str_pad(substr($bits,$i,5),5,'0',STR_PAD_RIGHT))];
 return $encoded;
}
function ownerPreflight(PDO $db,array $config): array {
 if(strlen((string)($config['auth_pepper']??''))<32)
   throw new RuntimeException('private_auth_not_ready');
 $r=$db->prepare("SELECT id,email_normalized,status,email_verified_at FROM customer_accounts WHERE email_normalized=?");
 $r->execute(['dr.rezazadeh65@gmail.com']);$owners=$r->fetchAll(PDO::FETCH_ASSOC);
 if(count($owners)!==1 || ($owners[0]['status']??'')!=='active'
   || empty($owners[0]['email_verified_at']))
    throw new RuntimeException('verified_owner_account_not_found');
 $id=(string)$owners[0]['id'];
 if(!preg_match('/^[a-f0-9-]{36}$/iD',$id))
    throw new RuntimeException('invalid_account_uuid');
 $adminCount=(int)$db->query("SELECT COUNT(*) FROM operations_admin_memberships")->fetchColumn();
 if($adminCount!==0)throw new RuntimeException('admin_membership_already_exists');
 $members=$config['operations_admins']??[];
 if(!is_array($members))throw new RuntimeException('invalid_private_admin_config');
 // The old admin account was removed during the owner-approved clean reset.
 // Stale keys in private config must never re-grant an old account.
 return ['id'=>$id,'legacyPrivateMappings'=>count($members)];
}
function ownerProvision(): array {
 $configPath=__DIR__.'/config.local.php';
 if(!is_file($configPath)||!is_writable($configPath))
   throw new RuntimeException('private_config_not_writable');
 $config=require $configPath;
 if(!is_array($config)||!str_starts_with((string)($config['db_dsn']??''),'mysql:'))
   throw new RuntimeException('mysql_runtime_not_configured');
 $db=new PDO((string)$config['db_dsn'],(string)($config['db_user']??''),
      (string)($config['db_password']??''),[
   PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
   PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
   PDO::ATTR_EMULATE_PREPARES=>false]);
 $lock=(int)$db->query("SELECT GET_LOCK('jr_owner_admin_enrollment_v1',8)")->fetchColumn();
 if($lock!==1)throw new RuntimeException('owner_enrollment_lock_unavailable');
 try{
   $owner=ownerPreflight($db,$config);
   $webRoot=realpath(dirname(__DIR__));
   $privateHome=realpath(dirname(__DIR__,2));
   if(!$webRoot||!$privateHome||$webRoot===$privateHome
      ||str_starts_with($privateHome.'/',$webRoot.'/')
      ||!is_writable($privateHome))
     throw new RuntimeException('secure_private_home_unavailable');
   $dir=$privateHome.'/jr-owner-mfa-enrollment-'.bin2hex(random_bytes(10));
   if(!mkdir($dir,0700,false))throw new RuntimeException('private_enrollment_dir_failed');
   chmod($dir,0700);
   $original=file_get_contents($configPath);
   if(!is_string($original)||!str_starts_with(ltrim($original),'<?php'))
     throw new RuntimeException('private_config_read_failed');
   $secret=base32Encode(random_bytes(20));
   $url='otpauth://totp/'.rawurlencode('DrJavadRezazadeh:dr.rezazadeh65@gmail.com')
       .'?secret='.$secret.'&issuer='.rawurlencode('DrJavadRezazadeh')
       .'&algorithm=SHA1&digits=6&period=30';
   $guide="PRIVATE OWNER MFA SETUP — do not send this file or key over chat or email.\n".
          "Account: dr.rezazadeh65@gmail.com\n".
          "Google Authenticator > Add a code > Enter a setup key (time-based).\n".
          "Setup key: ".$secret."\n".
          "Label: DrJavadRezazadeh\n".
          "OTP URI (private): ".$url."\n".
          "After scanning, log in at https://drjavadrezazadeh.com/fa/app/admin/\n".
          "and enter the six-digit code. Then delete this setup guide from cPanel.\n";
   if(file_put_contents($dir.'/SETUP-KEY-PRIVATE.txt',$guide,LOCK_EX)!==strlen($guide))
     throw new RuntimeException('private_setup_guide_write_failed');
   chmod($dir.'/SETUP-KEY-PRIVATE.txt',0600);
   $guideReadback=file_get_contents($dir.'/SETUP-KEY-PRIVATE.txt');
   if(!is_string($guideReadback)||!hash_equals(hash('sha256',$guide),hash('sha256',$guideReadback)))
     throw new RuntimeException('private_setup_readback_failed');
   if(file_put_contents($dir.'/original-config.php.txt',$original,LOCK_EX)!==strlen($original))
     throw new RuntimeException('private_config_backup_failed');
   chmod($dir.'/original-config.php.txt',0600);
   // Never leak the secret into the GitHub build, URLs, JSON, logging or repository.
   $updated=$config;
   $updated['operations_admins']=[
     $owner['id']=>['role'=>'SUPER_ADMIN','totp_secret'=>$secret]
   ];
   $encoded="<?php\nreturn ".var_export($updated,true).";\n";
   $candidate=$configPath.'.pending-owner-'.bin2hex(random_bytes(8));
   if(file_put_contents($candidate,$encoded,LOCK_EX)!==strlen($encoded))
     throw new RuntimeException('candidate_config_write_failed');
   chmod($candidate,0600);
   // Validate the exact generated private PHP file before touching DB/config.
   $candidateCfg=require $candidate;
   if(!is_array($candidateCfg)||
      ($candidateCfg['operations_admins'][$owner['id']]['role']??'')!=='SUPER_ADMIN'||
      !hash_equals($secret,(string)($candidateCfg['operations_admins'][$owner['id']]['totp_secret']??'')))
     throw new RuntimeException('candidate_config_invalid');
   $db->beginTransaction();
   try{
     $q=$db->prepare("INSERT INTO operations_admin_memberships(account_id,role,enabled,created_at) VALUES(?,'SUPER_ADMIN',1,?)");
     $q->execute([$owner['id'],time()]);
     if(!rename($candidate,$configPath))
       throw new RuntimeException('private_config_atomic_swap_failed');
     $db->commit();
   }catch(Throwable $e){
     if($db->inTransaction())$db->rollBack();
     @unlink($candidate);
     // Recover private configuration, never overwrite a newly changed file if
     // this snapshot no longer matches the staged write.
     if(is_file($configPath)){
       $now=@file_get_contents($configPath);
       if(is_string($now)&&hash_equals(hash('sha256',$encoded),hash('sha256',$now))){
         $fix=$configPath.'.recovery-'.bin2hex(random_bytes(8));
         if(file_put_contents($fix,$original,LOCK_EX)===strlen($original)){
           chmod($fix,0600);rename($fix,$configPath);
         }
       }
     }
     throw $e;
   }
   $verify=$db->prepare("SELECT role,enabled FROM operations_admin_memberships WHERE account_id=?");
   $verify->execute([$owner['id']]);
   $row=$verify->fetch(PDO::FETCH_ASSOC);
   $configNow=require $configPath;
   if(($row['role']??'')!=='SUPER_ADMIN'||(int)($row['enabled']??0)!==1
      ||!hash_equals($secret,(string)($configNow['operations_admins'][$owner['id']]['totp_secret']??'')))
      throw new RuntimeException('admin_two_source_verification_failed');
   return [
     'ok'=>true,'stage'=>'owner_role_provisioned',
     'ownerEmail'=>'dr.rezazadeh65@gmail.com',
     'verifiedEmail'=>true,'role'=>'SUPER_ADMIN',
     'privateSetupFolder'=>basename($dir),
     'privateSetupFile'=>'SETUP-KEY-PRIVATE.txt',
     'secretsExposedToGitHub'=>false,
     'mfaUserVerificationStillRequired'=>true
   ];
 }finally{
   $db->query("SELECT RELEASE_LOCK('jr_owner_admin_enrollment_v1')");
 }
}
try{
 $result=ownerProvision();
 @unlink(__FILE__);
 ownerResult(200,$result);
}catch(Throwable $e){
 @unlink(__FILE__);
 $allowed=['private_config_not_writable','mysql_runtime_not_configured',
 'private_auth_not_ready','verified_owner_account_not_found',
 'admin_membership_already_exists','owner_enrollment_lock_unavailable',
 'secure_private_home_unavailable','private_enrollment_dir_failed',
 'private_config_read_failed','private_setup_guide_write_failed',
 'private_setup_readback_failed','private_config_backup_failed',
 'candidate_config_write_failed','candidate_config_invalid',
 'private_config_atomic_swap_failed','admin_two_source_verification_failed'];
 $error=in_array($e->getMessage(),$allowed,true)?$e->getMessage():'owner_provisioning_failed';
 ownerResult(503,['ok'=>false,'stage'=>'blocked','reason'=>$error]);
}
