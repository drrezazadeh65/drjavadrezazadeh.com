<?php
declare(strict_types=1);
// Isolated MariaDB 10.11 fixture; never touch live Bertina orders, stock or money.
$dsn=(string)getenv('OPERATIONS_TEST_DSN');
if (!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn))
    throw new RuntimeException('isolated_fixture_database_required');
$user=(string)getenv('OPERATIONS_TEST_USER');
$password=(string)getenv('OPERATIONS_TEST_PASSWORD');
$options=[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false];
$admin=new PDO($dsn,$user,$password,$options);
$admin->exec('CREATE DATABASE IF NOT EXISTS owner_stock_fixture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$db=new PDO(str_replace('dbname=operations_fixture','dbname=owner_stock_fixture',$dsn),
    $user,$password,$options);
function ownerCheck(bool $ok,string $name):void{
    if(!$ok)throw new RuntimeException('owner_seed_failed_'.$name);
    echo "PASS ".$name."\n";
}
function applyVettedSql(PDO $db,string $file):void {
    $source=(string)file_get_contents($file);
    // Strip full-line SQL comments; this first-party fixture SQL contains no
    // string-embedded semicolons, so statement-split is unambiguous.
    $source=preg_replace('/^\h*--[^\r\n]*\r?\n/m','',$source);
    foreach(explode(';',$source) as $raw) {
        $statement=trim($raw);
        if($statement==='')continue;
        if(preg_match('/^SELECT\b/i',$statement)) {
            $db->query($statement)->fetchAll();
        }else{
            $db->exec($statement);
        }
    }
}
function localCatalog():array{
    $catalog=json_decode((string)file_get_contents(__DIR__.'/../assets/data/book-catalog.json'),true);
    $out=[];
    foreach($catalog['books']??[] as $book)$out['book:'.$book['id']]=['kind'=>'book'];
    return $out;
}
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/commerce-stage9.php';
applyVettedSql($db,__DIR__.'/../docs/BERTINA_MYSQL_SCHEMA.sql');
$oldPaid='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
$oldTest='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
$ins=$db->prepare("INSERT INTO commerce_orders
(id,factor_id,amount_toman,provider_amount,currency,items_json,state,provider_id_get,provider_trans_id)
VALUES(?,?,2000000,20000000,'IRT',?,?,?,?)");
$ins->execute([$oldPaid,'fixture-old-paid',
    '[{"kind":"service","sku":"service:academic_consult_60","quantity":1}]',
    'paid','414141','515151']);
$ins->execute([$oldTest,'fixture-self-test',
    '[{"kind":"book","sku":"book:roshanaei","quantity":1}]',
    'pending','616161',null]);
$before=$db->query('SELECT id,state,items_json,provider_id_get,provider_trans_id FROM commerce_orders ORDER BY id')->fetchAll();
$source=__DIR__.'/../docs/migrations/20261013_stage09_bertina_owner_approved.sql';
applyVettedSql($db,$source);
ownerCheck(stage9SchemaReady($db),'new_eight_tables_and_uniques_operational_in_mariadb');
ownerCheck(stage9BookStockReady($db),'three_owner_declared_stock_rows_enable_reconciled_checkout');
$rows=$db->query('SELECT sku,physical_on_hand,reserved,reconciled_by FROM commerce_book_stock ORDER BY sku')->fetchAll();
ownerCheck(count($rows)===3,'exactly_three_owner_books');
foreach($rows as $row) {
  ownerCheck((int)$row['physical_on_hand']===100
    && (int)$row['reserved']===0
    && (string)$row['reconciled_by']==='owner-declared-2026-10-13',
    'owner_stock_100_unreserved_'.$row['sku']);
}
ownerCheck($db->query('SELECT COUNT(*) FROM commerce_book_reservations')->fetchColumn()===0,
  'legacy_self_test_does_not_create_fake_reservation');
ownerCheck($db->query('SELECT COUNT(*) FROM commerce_payment_claims')->fetchColumn()===0,
  'legacy_paid_label_does_not_fabricate_gateway_claim');
ownerCheck($before===$db->query('SELECT id,state,items_json,provider_id_get,provider_trans_id FROM commerce_orders ORDER BY id')->fetchAll(),
  'historic_paid_and_pending_order_bytes_preserved');
$db->exec("UPDATE commerce_book_stock SET physical_on_hand=77 WHERE sku='book:bonbast'");
$db->exec("UPDATE commerce_book_stock SET reconciled_at=NULL WHERE sku='book:tariki'");
applyVettedSql($db,$source); // repeatable but must NOT reset preexisting stock
$test=$db->query("SELECT sku,physical_on_hand,reconciled_at FROM commerce_book_stock WHERE sku IN ('book:bonbast','book:tariki') ORDER BY sku")->fetchAll();
ownerCheck((int)$test[0]['physical_on_hand']===77,
  'repeated_migration_never_resets_existing_stock');
ownerCheck($test[1]['reconciled_at']===null,
  'repeated_migration_never_fakes_missing_reconciliation');
ownerCheck(!stage9BookStockReady($db),
  'live_checkout_fails_closed_when_inventory_reconciliation_missing');
ownerCheck($before===$db->query('SELECT id,state,items_json,provider_id_get,provider_trans_id FROM commerce_orders ORDER BY id')->fetchAll(),
  'repeated_migration_never_edits_legacy_orders');
echo "Bertina Stage09 owner-declared stock: isolated MariaDB integration checks passed. NO LIVE WRITE OR FINANCIAL CERTIFICATION.\n";
