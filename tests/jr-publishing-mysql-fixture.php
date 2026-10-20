<?php
declare(strict_types=1);
/**
 * Independent disposable MySQL-8 integration fixture. NO provider call,
 * real buyer, production SQL mutation or SMTP. Use only operations_fixture
 * root credentials from the existing GitHub Actions fixture container.
 */
$dsn=(string)getenv('OPERATIONS_TEST_DSN');
if(!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn))
    throw new RuntimeException('isolated_test_database_required');
$user=(string)getenv('OPERATIONS_TEST_USER');
$pass=(string)getenv('OPERATIONS_TEST_PASSWORD');
$admin=new PDO($dsn,$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$admin->exec('CREATE DATABASE IF NOT EXISTS jr_publishing_fixture CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$fixtureDsn=str_replace('dbname=operations_fixture','dbname=jr_publishing_fixture',$dsn);
$pdo=new PDO($fixtureDsn,$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
foreach([
  'docs/BERTINA_MYSQL_SCHEMA.sql',
  'docs/migrations/20261012_stage09_commerce.sql',
  'docs/migrations/20261017_jr_future_publishing.sql',
  'docs/migrations/20261017_jr_publishing_contract_and_reserve.sql'
] as $path){
    $source=file_get_contents(__DIR__.'/../'.$path);
    if($source===false)throw new RuntimeException('missing_test_migration_'.$path);
    $pdo->exec($source);
}
function fixtureUuid():string {
 $h=bin2hex(random_bytes(16));
 return substr($h,0,8).'-'.substr($h,8,4).'-4'.substr($h,13,3).'-8'.substr($h,17,3).'-'.substr($h,20,12);
}
function uuidv4():string {return fixtureUuid();}
function cfg():array{return ['auth_pepper'=>str_repeat('test-fixture-secret-',4)];}
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/internal/jr-publishing-digital.php';
require_once __DIR__.'/../api/commerce-stage9.php';
function verifyPublishing(bool $ok,string $why):void {
 if(!$ok)throw new RuntimeException('publishing_mysql_fixture:'.$why);
}
$author=fixtureUuid();$work=fixtureUuid();$version=fixtureUuid();$offer=fixtureUuid();$account=fixtureUuid();
$pdo->prepare("INSERT INTO customer_accounts
(id,email_normalized,password_hash,status,email_verified_at,created_at,updated_at)
VALUES(?,'author@example.invalid','fixture-only','active',?,?,?)")
->execute([$account,time(),time(),time()]);
$pdo->prepare("INSERT INTO publishing_authors(id,slug,display_name_fa,display_name_en,status)
 VALUES(?,'fixture-author','مؤلف آزمایشی','Fixture author','approved')")->execute([$author]);
$pdo->prepare("INSERT INTO publishing_author_accounts(author_id,account_id,role,approved_at)
 VALUES(?,?,'author',NOW())")->execute([$author,$account]);
$pdo->prepare("INSERT INTO publishing_works(id,author_id,public_slug,title_fa,publication_status,
 scientific_review,rights_verified_at,display_approved_at)
 VALUES(?,?,'fixture-tefl-book','مجموعه آزمایشی','approved','under_review',NOW(),NOW())")->execute([$work,$author]);
$pdo->prepare("INSERT INTO publishing_work_versions
(id,work_id,version_number,content_sha256,review_state)
 VALUES(?,?,1,?,'under_review')")->execute([$version,$work,str_repeat('a',64)]);
$pdo->prepare("INSERT INTO publishing_offers
(id,work_id,sku,unit_price_toman,unit_author_toman,unit_fund_toman,checkout_enabled)
 VALUES(?,?,'digital:tefl-ma-exams-1370-1405',1000000,700000,300000,1)")
 ->execute([$offer,$work]);
foreach(['question_pdf','answer_pdf'] as $kind){
  $asset=fixtureUuid();
  $pdo->prepare("INSERT INTO publishing_private_assets(id,work_version_id,logical_kind,
     private_storage_name,sha256,byte_size,malware_scanned_at,encrypted_at_rest,approved_at)
    VALUES(?,?,?,?,?,200,NOW(),0,NOW())")
    ->execute([$asset,$version,$kind,'private-fixture-'.$kind.'.pdf',str_repeat('b',64)]);
}
$line=['sku'=>'digital:tefl-ma-exams-1370-1405','title'=>'مجموعه آزمایشی',
 'kind'=>'digital','quantity'=>1,'price'=>1000000,'subtotal'=>1000000,
 'offerId'=>$offer,'authorId'=>$author,'workVersionId'=>$version,
 'authorShare'=>700000,'fundShare'=>300000,'allocationPolicy'=>JR_PUB_CURRENT_POLICY];
function insertFakePending(PDO $pdo,string $id,string $factor,string $idGet,array $line):void {
 $pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,
 customer_email,customer_json,items_json,state,provider_id_get)
 VALUES(?,?,1000000,10000000,'IRT','buyer@example.invalid','{}',?,'pending',?)")
 ->execute([$id,$factor,json_encode([$line],JSON_UNESCAPED_UNICODE),$idGet]);
}
$order=fixtureUuid();
insertFakePending($pdo,$order,'888777','345678',$line);
verifyPublishing(stage9FinalizePayment($pdo,$order,'345678','998877','10000000','888777'),
 'first_paid_transition_must_be_true');
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM commerce_payment_claims")->fetchColumn()===1,'verified_provider_claim_once');
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM publishing_sale_allocation_entries")->fetchColumn()===2,'two_allocation_entries_only');
$totals=$pdo->query("SELECT entry_kind,SUM(amount_toman) value FROM publishing_sale_allocation_entries GROUP BY entry_kind")
 ->fetchAll(PDO::FETCH_KEY_PAIR);
verifyPublishing((int)($totals['author_share']??0)===700000,'700k_author_entitlement');
verifyPublishing((int)($totals['talent_fund']??0)===300000,'300k_talent_fund_earmark');
verifyPublishing((int)$pdo->query("SELECT SUM(reserve_amount_toman) FROM publishing_platform_cost_entries")->fetchColumn()===70000,'7pct_independent_reserve');
verifyPublishing((int)$pdo->query("SELECT COUNT(DISTINCT asset_id) FROM publishing_digital_access_grants")->fetchColumn()===2,'two_unique_pdf_assets');
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM publishing_notification_outbox")->fetchColumn()===2,'two_mail_outbox_events');
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM commerce_outbox")->fetchColumn()===1,'single_existing_commerce_event');
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM commerce_book_reservations")->fetchColumn()===0,'no_physical_stock_reservations');
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM commerce_service_cases")->fetchColumn()===0,'no_booking_service_case');
verifyPublishing(stage9FinalizePayment($pdo,$order,'345678','998877','10000000','888777')===false,
  'bank_replay_must_be_idempotent');
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM publishing_sale_allocation_entries")->fetchColumn()===2,
  'bank_replay_created_duplicate_share');
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM publishing_notification_outbox")->fetchColumn()===2,
  'bank_replay_created_duplicate_mail');
$bad=$line;$bad['fundShare']=400000;
$badOrder=fixtureUuid();insertFakePending($pdo,$badOrder,'888778','345679',$bad);
try{
 stage9FinalizePayment($pdo,$badOrder,'345679','998878','10000000','888778');
 throw new RuntimeException('unsafe_paid_price_snapshot_accepted');
}catch(RuntimeException $e){verifyPublishing($e->getMessage()==='digital_order_snapshot_invalid','unexpected_failed_payment_reason');}
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM commerce_payment_claims")->fetchColumn()===1,
  'bad_snapshot_created_provider_claim');
$s=$pdo->prepare('SELECT state FROM commerce_orders WHERE id=?');$s->execute([$badOrder]);
verifyPublishing($s->fetchColumn()==='pending','bad_snapshot_order_must_not_be_marked_paid');
// Preserve bank-verified, previously created orders under the original v1
// contract snapshot, without changing new v2 offers or historical ledger.
$legacyLine=$line;
unset($legacyLine['allocationPolicy']);
$legacyLine['authorShare']=600000;$legacyLine['fundShare']=400000;
$legacyOrder=fixtureUuid();
insertFakePending($pdo,$legacyOrder,'888779','345680',$legacyLine);
verifyPublishing(stage9FinalizePayment($pdo,$legacyOrder,'345680','998879','10000000','888779'),
 'historical_pending_order_v1_must_reconcile');
$oldStatement=$pdo->prepare("SELECT entry_kind,amount_toman
 FROM publishing_sale_allocation_entries WHERE order_id=? ORDER BY entry_kind");
$oldStatement->execute([$legacyOrder]);
$oldTotals=$oldStatement->fetchAll(PDO::FETCH_KEY_PAIR);
verifyPublishing((int)($oldTotals['author_share']??0)===600000
 &&(int)($oldTotals['talent_fund']??0)===400000,
 'existing_pending_sale_snapshot_must_not_be_repriced');
verifyPublishing(stage9FinalizePayment($pdo,$legacyOrder,'345680','998879','10000000','888779')===false,
 'legacy_replay_must_not_double_allocate');
verifyPublishing((int)$pdo->query("SELECT COUNT(*) FROM publishing_sale_allocation_entries")->fetchColumn()===4,
 'one_v2_and_one_legacy_pair_only');
$admin->exec('DROP DATABASE jr_publishing_fixture');
echo "JR Publishing MySQL 8: schema, paid ledger, 2 files, SMTP outbox, replay and rollback PASS. NO REAL PAYMENT.\n";
