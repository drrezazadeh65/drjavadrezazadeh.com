<?php
declare(strict_types=1);
/**
 * One-shot, token-authenticated read-only inspection of CURRENT Bertina MySQL.
 * Not a permanent API. This file is rendered as a randomly named ephemeral
 * endpoint by GitHub Actions and deleted after use.
 * No SQL writes, schema changes, credentials or customer rows leave the server.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer');

function inventoryDeny(int $status, string $reason): never {
    http_response_code($status);
    echo json_encode(['ok'=>false,'error'=>$reason]);
    exit;
}
$expectedTokenDigest='__JR_INVENTORY_TOKEN_SHA256__';
$provided=(string)($_SERVER['HTTP_X_JR_INVENTORY_TOKEN']??'');
if (strlen($provided)!==64 || !preg_match('/^[a-f0-9]{64}$/D',$provided)
    || !hash_equals($expectedTokenDigest,hash('sha256',$provided)))
    inventoryDeny(403,'forbidden');
if (($_SERVER['REQUEST_METHOD']??'')!=='GET') inventoryDeny(405,'get_required');
if (PHP_SAPI==='cli') inventoryDeny(403,'web_runtime_only');
@set_time_limit(150);
try {
    $config=require __DIR__.'/config.local.php';
    if (!is_array($config)) throw new RuntimeException('config_unavailable');
    $dsn=(string)($config['db_dsn']??'');
    if (!str_starts_with($dsn,'mysql:')) throw new RuntimeException('mysql_required');
    $pdo=new PDO($dsn,(string)($config['db_user']??''),(string)($config['db_password']??''),[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES=>false
    ]);
    $engine=(string)$pdo->query('SELECT VERSION()')->fetchColumn();
    $pdo->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    $pdo->exec('START TRANSACTION READ ONLY');
    $tables=$pdo->query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")->fetchAll();
    if (count($tables)>500) throw new RuntimeException('table_limit_exceeded');
    $groups=[];
    $total=0;
    $nonEmpty=[];
    $baseline=[
      'customer_accounts','customer_auth_tokens','customer_auth_sessions','customer_auth_rate_limits','commerce_orders',
      'operations_admin_memberships','operations_session_mfa','operations_mfa_counters',
      'growth_lead_requests','growth_lead_consent_events'
    ];
    $baselineCounts=[];
    $existingTables=[];
    $onlyInnoDb=true;
    foreach ($tables as $row) {
        $name=(string)$row['TABLE_NAME'];
        if (!preg_match('/^[a-zA-Z0-9_]{1,64}$/D',$name)) throw new RuntimeException('unexpected_identifier');
        $existingTables[$name]=true;
        $onlyInnoDb = $onlyInnoDb && strcasecmp((string)$row['ENGINE'],'InnoDB')===0;
        $count=(int)$pdo->query('SELECT COUNT(*) FROM `'.$name.'`')->fetchColumn();
        $total += $count;
        if ($count>0) $nonEmpty[]=['table'=>$name,'rows'=>$count];
        if (in_array($name,$baseline,true)) $baselineCounts[$name]=$count;
        $group='other';
        foreach (['customer_','commerce_','operations_','growth_','student_support_','social_','eco_','journal_'] as $prefix) {
          if (str_starts_with($name,$prefix)) { $group=rtrim($prefix,'_'); break; }
        }
        if (!isset($groups[$group])) $groups[$group]=['tables'=>0,'rows'=>0];
        $groups[$group]['tables']++;
        $groups[$group]['rows'] += $count;
    }
    $constraints=(int)$pdo->query("SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL")->fetchColumn();
    $pdo->commit();
    // Intentionally reveal only table names and row counts; never row contents,
    // database username/password, customer emails or session credentials.
    echo json_encode([
       'ok'=>true,
       'schema'=>'bertina-unified-readonly-inventory-v1',
       'engineVersion'=>$engine,
       'tables'=>count($tables),
       'totalRows'=>$total,
       'allTablesEmpty'=>count($nonEmpty)===0,
       'nonEmptyTables'=>$nonEmpty,
       'groupCounts'=>$groups,
       'baselineCounts'=>$baselineCounts,
       'requiredBaselinePresent'=>isset($existingTables['customer_accounts'],$existingTables['commerce_orders']),
       'allTablesInnoDb'=>$onlyInnoDb,
       'foreignKeyReferences'=>$constraints,
       'scope'=>'SELECT ONLY; no SQL mutation or data export'
    ],JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
} catch(Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    inventoryDeny(503,'read_only_inventory_unavailable');
} finally {
    @unlink(__FILE__);
}
