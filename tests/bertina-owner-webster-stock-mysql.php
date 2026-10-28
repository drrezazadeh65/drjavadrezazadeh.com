<?php
declare(strict_types=1);
/**
 * Disposable MySQL 8 CI-only fixture. Hard-fails unless explicitly connected
 * to the GitHub Actions operations_fixture service at 127.0.0.1:3306.
 * This test MUST NEVER be pointed at live Bertina or a customer database.
 */
$dsn=(string)(getenv('OPERATIONS_TEST_DSN')?:'');
$user=(string)(getenv('OPERATIONS_TEST_USER')?:'');
$password=(string)(getenv('OPERATIONS_TEST_PASSWORD')?:'');
if(!str_contains($dsn,'host=127.0.0.1;port=3306;dbname=operations_fixture') ||
   $user!=='root' || $password!=='fixture-password')
    throw new RuntimeException('webster_test_requires_disposable_mysql_fixture');
$pdo=new PDO($dsn,$user,$password,[
 PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
 PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
 PDO::ATTR_EMULATE_PREPARES=>false,
]);
$pdo->exec('CREATE DATABASE IF NOT EXISTS drjavad1_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$pdo->exec('USE drjavad1_store');
$pdo->exec("CREATE TABLE IF NOT EXISTS commerce_orders (
 id CHAR(36) PRIMARY KEY,
 items_json LONGTEXT NOT NULL,
 currency VARCHAR(8) NOT NULL,
 state VARCHAR(25) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
require_once __DIR__.'/../scripts/bertina-owner-webster-stock-on-deploy.php';
function verify(bool $ok,string $message): void {
 if(!$ok)throw new RuntimeException('webster_mysql_fixture_failed: '.$message);
}
$first=drjrInstallOwnerWebsterSingleSet($pdo);
verify($first['stockState']==='one_set_seeded','first run must add one physical set');
verify(count($first['tablesCreated'])===8,'first run must create exactly eight missing Stage09 tables');
verify(count($first['columnsAdded'])===3,'first run must add missing legacy buyer columns');
$sku='book:websters-third-1981';
$read=$pdo->prepare('SELECT physical_on_hand,reserved,reconciled_at FROM commerce_book_stock WHERE sku=?');
$read->execute([$sku]);
$r=$read->fetch();
verify(is_array($r) && (int)$r['physical_on_hand']===1 &&
 (int)$r['reserved']===0 && !empty($r['reconciled_at']),'initial stock proof');
$repeat=drjrInstallOwnerWebsterSingleSet($pdo);
verify($repeat['stockState']==='existing_unchanged' &&
 $repeat['tablesCreated']===[] && $repeat['columnsAdded']===[],
 'repeat must not rewrite or re-create anything');
$pdo->prepare('UPDATE commerce_book_stock SET reserved=1 WHERE sku=?')->execute([$sku]);
$held=drjrInstallOwnerWebsterSingleSet($pdo);
$read->execute([$sku]);$r=$read->fetch();
verify($held['stockState']==='existing_unchanged' && (int)$r['reserved']===1,
 'pending/reserved stock must never be reset');
$pdo->prepare('UPDATE commerce_book_stock SET reserved=0,physical_on_hand=0 WHERE sku=?')
    ->execute([$sku]);
$sold=drjrInstallOwnerWebsterSingleSet($pdo);
$read->execute([$sku]);$r=$read->fetch();
verify($sold['stockState']==='existing_unchanged' &&
 (int)$r['physical_on_hand']===0,'sold zero stock must never restock');
$orderId='00000000-0000-4000-8000-000000000101';
$pdo->prepare('INSERT INTO commerce_orders(id,items_json,currency,state) VALUES(?,?,?,?)')
    ->execute([$orderId,'[{"sku":"book:websters-third-1981","quantity":1}]','IRT','paid']);
$pdo->prepare("INSERT INTO commerce_stock_movements(order_id,sku,reason,units) VALUES(?,?,'sale',-1)")
    ->execute([$orderId,$sku]);
$pdo->prepare('DELETE FROM commerce_book_stock WHERE sku=?')->execute([$sku]);
$historic=drjrInstallOwnerWebsterSingleSet($pdo);
verify($historic['stockState']==='historical_transaction_blocks_seed',
 'historic order and movement must block missing-row reseeding');
$read->execute([$sku]);
verify($read->fetch()===false,'lost stock row must not become new inventory');
echo "PASS Webster set: additive Stage09 tables, one seed, idempotent re-run, held/sold non-reset, historical sale block (disposable MySQL only)\n";
