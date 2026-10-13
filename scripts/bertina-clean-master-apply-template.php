<?php
declare(strict_types=1);
/** One-shot destructive owner-authorized cleanup; restored from private encrypted snapshot on error. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');
function rebuildReply(int $status,array $body): never {
 http_response_code($status);
 echo json_encode($body,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);
 exit;
}
$token=(string)($_SERVER['HTTP_X_JR_OWNER_REBUILD_TOKEN']??'');
if(strlen($token)!==64||!preg_match('/^[a-f0-9]{64}$/D',$token)
   ||!hash_equals('__JR_REBUILD_TOKEN_DIGEST__',hash('sha256',$token)))
  rebuildReply(403,['ok'=>false,'reason'=>'unauthorized']);
$method=$_SERVER['REQUEST_METHOD']??'';
if(!in_array($method,['GET','POST'],true))rebuildReply(405,['ok'=>false,'reason'=>'unsupported_method']);
if(PHP_SAPI==='cli')rebuildReply(403,['ok'=>false,'reason'=>'web_only']);
@set_time_limit(250);
@ignore_user_abort(true);
umask(0077);

const EXPECTED_ORIGINAL_TABLES=[
 'customer_accounts','customer_auth_tokens','customer_auth_sessions','customer_auth_rate_limits',
 'commerce_orders','commerce_book_stock','commerce_book_reservations','commerce_stock_movements',
 'commerce_payment_claims','commerce_outbox','commerce_service_cases','commerce_parcels',
 'commerce_refund_requests','operations_admin_memberships','operations_session_mfa',
 'operations_mfa_counters','operations_evidence','operations_audit','operations_release',
 'operations_action_runs'
];
function quotedName(string $name): string {
 if(!preg_match('/^[a-z][a-z0-9_]{0,63}$/D',$name))throw new RuntimeException('invalid_table_identifier');
 return chr(96).$name.chr(96);
}
function existingNames(PDO $db): array {
 $rows=$db->query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")->fetchAll(PDO::FETCH_ASSOC);
 if(count($rows)>250)throw new RuntimeException('unexpected_table_inventory');
 foreach($rows as $r)if(strcasecmp((string)$r['ENGINE'],'InnoDB')!==0)
  throw new RuntimeException('non_innodb_table');
 return array_column($rows,'TABLE_NAME');
}
function countRows(PDO $db,array $names): array {
 $counts=[];
 foreach($names as $name)$counts[$name]=(int)$db->query('SELECT COUNT(*) FROM '.quotedName($name))->fetchColumn();
 return $counts;
}
function verifiedPreflight(PDO $db): array {
 $names=existingNames($db);$required=EXPECTED_ORIGINAL_TABLES;sort($required,SORT_STRING);
 if($names!==$required)throw new RuntimeException('unexpected_existing_table_names');
 $counts=countRows($db,$names);
 foreach(['customer_accounts'=>2,'commerce_orders'=>2,'commerce_book_stock'=>3,'operations_admin_memberships'=>1] as $table=>$expected)
   if($counts[$table]!==$expected)throw new RuntimeException('critical_record_count_changed_'.$table);
 $total=array_sum($counts);
 if($total<278 || $total>380)throw new RuntimeException('unapproved_record_count_change');
 $paid=(int)$db->query("SELECT COUNT(*) FROM commerce_orders WHERE state='paid'")->fetchColumn();
 // The owner explicitly confirmed on 2026-10-13 that the ONE marked-paid
 // order is synthetic and approved its removal. Keep the count pinned so
 // newly appearing paid orders still block this one-time operation.
 if($paid!==1)throw new RuntimeException('approved_test_paid_order_count_changed');
 foreach(['commerce_payment_claims','commerce_book_reservations','commerce_stock_movements','commerce_parcels','commerce_refund_requests'] as $table)
   if($counts[$table]!==0)throw new RuntimeException('pending_financial_or_shipment_activity_'.$table);
 if((int)$db->query('SELECT COALESCE(SUM(reserved),0) FROM commerce_book_stock')->fetchColumn()!==0)
   throw new RuntimeException('active_stock_reservation');
 return ['originalTables'=>count($names),'originalRows'=>$total,'accounts'=>2,'orders'=>2,
  'adminMemberships'=>1,'bookStockRows'=>3,'paidOrders'=>$paid,
  'databaseVersion'=>(string)$db->query('SELECT VERSION()')->fetchColumn()];
}
function readSnapshot(PDO $db,array $names): array {
 $db->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
 $db->exec('START TRANSACTION READ ONLY');
 try{
  $all=[];
  foreach($names as $name){
    $ddl=$db->query('SHOW CREATE TABLE '.quotedName($name))->fetch(PDO::FETCH_NUM);
    if(!is_array($ddl)||!is_string($ddl[1]??null))throw new RuntimeException('missing_table_ddl');
    $all[]=['name'=>$name,'ddl'=>$ddl[1],'rows'=>$db->query('SELECT * FROM '.quotedName($name))->fetchAll(PDO::FETCH_ASSOC)];
  }
  $db->commit();return $all;
 }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
}
function preserveEncrypted(array $snapshot,array $counts): array {
 $home=realpath(dirname(__DIR__,2));
 $publicRoot=realpath(dirname(__DIR__));
 if(!$home||!$publicRoot||$home===$publicRoot||str_starts_with($home.'/',$publicRoot.'/')
   ||!is_writable($home)||(float)@disk_free_space($home)<67108864)
     throw new RuntimeException('private_recovery_storage_not_available');
 $backupId='jr-private-db-before-clean-'.bin2hex(random_bytes(12));
 $dir=$home.'/'.$backupId;
 if(!@mkdir($dir,0700,false))throw new RuntimeException('private_recovery_directory_failed');
 chmod($dir,0700);
 $plaintext=serialize(['schema'=>'private-db-snapshot-v1','release'=>'__JR_EXPECTED_LIVE_SHA__','counts'=>$counts,'tables'=>$snapshot]);
 $key=random_bytes(32);$nonce=random_bytes(12);$tag='';
 $cipher=openssl_encrypt($plaintext,'aes-256-gcm',$key,OPENSSL_RAW_DATA,$nonce,$tag);
 if(!is_string($cipher)||strlen($tag)!==16)throw new RuntimeException('recovery_encryption_failed');
 $encrypted=$nonce.$tag.$cipher;
 if(file_put_contents($dir.'/original.aes256gcm',$encrypted,LOCK_EX)!==strlen($encrypted)
 ||file_put_contents($dir.'/original.key',$key,LOCK_EX)!==strlen($key))
   throw new RuntimeException('recovery_write_failed');
 chmod($dir.'/original.aes256gcm',0600);chmod($dir.'/original.key',0600);
 $stored=file_get_contents($dir.'/original.aes256gcm');$storedKey=file_get_contents($dir.'/original.key');
 $decrypted=openssl_decrypt(substr($stored,28),'aes-256-gcm',$storedKey,OPENSSL_RAW_DATA,substr($stored,0,12),substr($stored,12,16));
 if(!is_string($decrypted)||!hash_equals(hash('sha256',$plaintext),hash('sha256',$decrypted)))
   throw new RuntimeException('encrypted_recovery_readback_failed');
 $meta=['schema'=>'private-db-snapshot-v1','sourceRelease'=>'__JR_EXPECTED_LIVE_SHA__',
  'sourceTables'=>count($snapshot),'sourceRows'=>$counts['originalRows'],
  'verifiedEncryptedReadback'=>true,'encryptedSha256'=>hash('sha256',$stored),'createdAt'=>gmdate('c')];
 if(file_put_contents($dir.'/metadata.json',json_encode($meta,JSON_UNESCAPED_SLASHES))===false)
   throw new RuntimeException('recovery_metadata_write_failed');
 chmod($dir.'/metadata.json',0600);
 return ['privateBackupId'=>$backupId,'sourceTables'=>count($snapshot),
  'sourceRows'=>$counts['originalRows'],'encryptedSha256'=>$meta['encryptedSha256'],
  'verifiedEncryptedReadback'=>true];
}
function runAdditiveSql(PDO $db,string $source): int {
 $clean=(string)preg_replace('/^[ \t]*--[^\r\n]*(?:\r?\n|$)/m','',$source);
 $chunks=preg_split('/;[ \t]*(?:\r?\n|$)/',$clean);
 if(!is_array($chunks))throw new RuntimeException('sql_parser_failure');
 $n=0;
 foreach($chunks as $sql){
  $sql=trim($sql);if($sql==='')continue;
  if(!preg_match('/^(?:CREATE TABLE IF NOT EXISTS [a-z][a-z0-9_]*\s*\(|SET NAMES utf8mb4|SET time_zone\s*=)/i',$sql))
    throw new RuntimeException('non_additive_sql_refused');
  $db->exec($sql);$n++;
 }
 return $n;
}
function installCleanMother(PDO $db): array {
 $packed=base64_decode('__JR_MASTER_BUNDLE_BASE64__',true);
 if(!is_string($packed))throw new RuntimeException('invalid_sql_bundle_encoding');
 $json=@gzuncompress($packed);
 if(!is_string($json)||!hash_equals('__JR_MASTER_BUNDLE_SHA256__',hash('sha256',$json)))
   throw new RuntimeException('sql_bundle_checksum_mismatch');
 $files=json_decode($json,true,512,JSON_THROW_ON_ERROR);
 if(!is_array($files)||count($files)!==19)throw new RuntimeException('sql_bundle_file_count');
 $n=0;$installedOps=false;
 foreach($files as $path=>$sql){
  if(!is_string($sql))throw new RuntimeException('sql_bundle_non_string');
  $n+=runAdditiveSql($db,$sql);
  if($path==='docs/migrations/20261012_stage09_commerce.sql'){
    if(!defined('BERTINA_API_BOOTSTRAPPED'))define('BERTINA_API_BOOTSTRAPPED',true);
    require_once __DIR__.'/operations-schema.php';
    operationsInstall($db);$installedOps=true;
  }
 }
 if(!$installedOps)throw new RuntimeException('missing_admin_compatibility_schema');
 $names=existingNames($db);
 $eco=array_filter($names,static fn($name)=>str_starts_with($name,'eco_'));
 if(count($names)!==220||count($eco)!==198)throw new RuntimeException('new_table_inventory_mismatch');
 $fks=(int)$db->query("SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL")->fetchColumn();
 if($fks!==407)throw new RuntimeException('foreign_key_inventory_mismatch');
 foreach(['customer_accounts','commerce_orders','operations_admin_memberships',
   'commerce_book_stock','growth_lead_requests'] as $name)
  if((int)$db->query('SELECT COUNT(*) FROM '.quotedName($name))->fetchColumn()!==0)
    throw new RuntimeException('new_schema_should_be_empty');
 return ['tables'=>220,'motherTables'=>198,'compatibleServiceTables'=>22,
  'foreignKeyReferences'=>$fks,'accounts'=>0,'orders'=>0,'adminMemberships'=>0,'stockRows'=>0,'growthConsentInstalled'=>true,
  'ddlStatements'=>$n];
}
function restoreOldTables(PDO $db,array $snapshot): bool {
 $db->exec('SET FOREIGN_KEY_CHECKS=0');
 try{
  foreach(existingNames($db) as $name)$db->exec('DROP TABLE IF EXISTS '.quotedName($name));
  foreach($snapshot as $item)$db->exec($item['ddl']);
  foreach($snapshot as $item){
    foreach($item['rows'] as $row){
      $names=array_keys($row);
      $sql='INSERT INTO '.quotedName($item['name']).' ('.implode(',',array_map('quotedName',$names)).
        ') VALUES ('.implode(',',array_fill(0,count($names),'?')).')';
      $db->prepare($sql)->execute(array_values($row));
    }
  }
 }finally{$db->exec('SET FOREIGN_KEY_CHECKS=1');}
 if(count(existingNames($db))!==count($snapshot))return false;
 foreach($snapshot as $item)
  if((int)$db->query('SELECT COUNT(*) FROM '.quotedName($item['name']))->fetchColumn()!==count($item['rows']))return false;
 return true;
}
try{
 $cfg=require __DIR__.'/config.local.php';
 if(!is_array($cfg)||!str_starts_with((string)($cfg['db_dsn']??''),'mysql:'))
   throw new RuntimeException('mysql_runtime_not_configured');
 $db=new PDO((string)$cfg['db_dsn'],(string)$cfg['db_user'],(string)$cfg['db_password'],[
  PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
  PDO::ATTR_EMULATE_PREPARES=>false]);
 $initial=verifiedPreflight($db);
 if($method==='GET')rebuildReply(200,['ok'=>true,'phase'=>'read_only_preflight','inventory'=>$initial]);
 $snapshot=null;$backup=null;$mutationStarted=false;
 try{
  $names=existingNames($db);
  $snapshot=readSnapshot($db,$names);
  $backup=preserveEncrypted($snapshot,$initial);
  $db->exec('SET FOREIGN_KEY_CHECKS=0');
  $mutationStarted=true;
  foreach($names as $name)$db->exec('DROP TABLE '.quotedName($name));
  $db->exec('SET FOREIGN_KEY_CHECKS=1');
  $new=installCleanMother($db);
  @unlink(__FILE__);
  rebuildReply(200,['ok'=>true,'phase'=>'new_master_active',
    'removed'=>$initial,'installed'=>$new,'privateRecovery'=>$backup,
    'adminAccountMustBeRecreated'=>true]);
 }catch(Throwable $e){
  if(!$mutationStarted)throw $e;
  try{
    $restored=restoreOldTables($db,$snapshot??[]);
    @unlink(__FILE__);
    rebuildReply(500,['ok'=>false,'phase'=>'automatic_recovery_attempted',
      'previousSchemaRestored'=>$restored,'encryptedSnapshotStored'=>$backup!==null,
      'manualInspectionRequired'=>true]);
  }catch(Throwable $r){
    @unlink(__FILE__);
    rebuildReply(500,['ok'=>false,'phase'=>'manual_recovery_required',
      'encryptedSnapshotStored'=>$backup!==null,'manualInspectionRequired'=>true]);
  }
 }
}catch(Throwable $e){
 @unlink(__FILE__);
 rebuildReply(503,['ok'=>false,'phase'=>'preflight_blocked',
   'reason'=>$e->getMessage(),'noDatabaseMutationClaimed'=>true]);
}
