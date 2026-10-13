<?php
declare(strict_types=1);
/** Disposable CI data; NEVER run against Bertina production. */
if (getenv('JR_MASTER_QA_DATABASE')!=='clean_master_qa') throw new RuntimeException('fixture_db_guard');
$db=new PDO('mysql:host=127.0.0.1;dbname=clean_master_qa;charset=utf8mb4','root','fixture-secret-only',
 [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
define('BERTINA_API_BOOTSTRAPPED',true);
require dirname(__DIR__).'/api/operations-schema.php';
operationsInstall($db);
$db->beginTransaction();
try {
  for($i=1;$i<=2;$i++){
    $id=sprintf('00000000-0000-4000-8000-%012d',$i);
    $q=$db->prepare("INSERT INTO customer_accounts (id,email_normalized,password_hash,status,email_verified_at,created_at,updated_at) VALUES (?,?,?,'active',1700000000,1700000000,1700000000)");
    $q->execute([$id,"synthetic-{$i}@example.test",'fixture-disabled-hash']);
    $order=sprintf('10000000-0000-4000-8000-%012d',$i);
    $q=$db->prepare("INSERT INTO commerce_orders (id,factor_id,amount_toman,provider_amount,currency,items_json,state) VALUES (?,?,1000,10000,'IRT','[]',?)");
    $q->execute([$order,"qa-factor-{$i}",$i===1?'paid':'cancelled']);
  }
  $admin=$db->prepare("INSERT INTO operations_admin_memberships (account_id,role,enabled,created_at) VALUES (?,'SUPER_ADMIN',1,1700000000)");
  $admin->execute(['00000000-0000-4000-8000-000000000001']);
  $stock=$db->prepare('INSERT INTO commerce_book_stock (sku,physical_on_hand,reserved) VALUES (?,0,0)');
  foreach(['qa-book-1','qa-book-2','qa-book-3'] as $sku)$stock->execute([$sku]);
  $rate=$db->prepare('INSERT INTO customer_auth_rate_limits (bucket,count,reset_at) VALUES (?,1,1700000000)');
  for($i=0;$i<270;$i++)$rate->execute([str_pad(dechex($i),64,'0',STR_PAD_LEFT)]);
  $db->commit();
} catch(Throwable $e){$db->rollBack();throw $e;}
$rows=0;
foreach($db->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'")->fetchAll(PDO::FETCH_COLUMN) as $name) {
  if(!preg_match('/^[a-z0-9_]+$/',$name))throw new RuntimeException('unsafe_fixture_name');
  $rows+=(int)$db->query('SELECT COUNT(*) FROM '.chr(96).$name.chr(96))->fetchColumn();
}
if($rows!==278)throw new RuntimeException("Unexpected fixture row count {$rows}");
echo "PASS: 278 synthetic fixture rows including exactly one paid order\n";
