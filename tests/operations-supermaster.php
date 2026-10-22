<?php
declare(strict_types=1);

/**
 * Isolated-source acceptance for the P0-P6 additive operations extensions.
 * CI MySQL fixture only. Never run with Bertina credentials or production DSN.
 */
$dsn=(string)getenv('OPERATIONS_TEST_DSN');
if(!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/D',$dsn))
    throw new RuntimeException('isolated_fixture_database_required');
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),
    (string)getenv('OPERATIONS_TEST_PASSWORD'),
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
     PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
     PDO::ATTR_EMULATE_PREPARES=>false]);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/operations-activation.php';
require_once __DIR__.'/../api/operations-alerts.php';
require_once __DIR__.'/../api/operations-response-monitor.php';
require_once __DIR__.'/../api/operations-page-quality.php';
require_once __DIR__.'/../api/operations-commerce.php';

$count=0;
function verifySupermaster(bool $condition,string $reason): void {
    if(!$condition)throw new RuntimeException($reason);
    $GLOBALS['count']++;
}
verifySupermaster(count(operationsActivationRequiredTables())===24,'operations contract table count drift');
verifySupermaster(count(operationsActivationExpectedForeignKeys())===6,'foreign key source contract drift');
$before=(int)$pdo->query('SELECT COUNT(*) FROM operations_audit')->fetchColumn();
$report=operationsActivationReport($pdo,[
    'operations_alert_recipient'=>'','mail_enabled'=>false,'smtp_enabled'=>false
],time());
verifySupermaster($report['schema']==='operations-activation-readiness-v1','activation shape mismatch');
verifySupermaster($report['schemaInventory']['presentCount']===24,'fixture table presence mismatch');
verifySupermaster($report['schemaInventory']['structure']['state']==='source_structural_signature_matches',
    'information_schema source structure drift');
verifySupermaster($report['schemaInventory']['structure']['checkedColumns']===157,
    'column diagnostic coverage unexpectedly changed');
verifySupermaster($report['schemaInventory']['foreignKeysChecked']===true,
    'foreign key metadata was not read');
verifySupermaster($report['schemaInventory']['migrationExecuted']===false,
    'read-only preflight claimed to migrate');
foreach($report['workers'] as $worker)
    verifySupermaster($worker['cronInstalled']===null,
        'observation falsely certified installed cPanel Cron');
verifySupermaster((int)$pdo->query('SELECT COUNT(*) FROM operations_audit')->fetchColumn()===$before,
    'read-only structure preflight mutated operational audit');

$headers=[
    'x-content-type-options'=>'nosniff',
    'referrer-policy'=>'strict-origin-when-cross-origin',
    'permissions-policy'=>'geolocation=(), camera=()',
    'content-security-policy'=>"default-src 'self'; frame-ancestors 'none'; script-src 'self'"
];
$csp=operationsResponseEvaluate(['kind'=>'headers','expected'=>200],
    ['code'=>200,'headers'=>$headers]);
verifySupermaster($csp['result']==='pass','valid CSP frame-ancestors alternative rejected');
unset($headers['content-security-policy']);
$missing=operationsResponseEvaluate(['kind'=>'headers','expected'=>200],
    ['code'=>200,'headers'=>$headers]);
verifySupermaster($missing['result']==='fail',
    'absent XFO and frame-ancestors did not fail clickjacking protection');
$commercial=operationsQualityEditorialPriority([
    'route'=>'/fa/shop/books/','grades'=>['onPageSeo'=>['score'=>4]]],'onPageSeo');
$general=operationsQualityEditorialPriority([
    'route'=>'/fa/about/','grades'=>['onPageSeo'=>['score'=>4]]],'onPageSeo');
verifySupermaster($commercial['reviewOrderValue']>$general['reviewOrderValue'],
    'source-only editorial triage weights were lost');
verifySupermaster(operationsQualityEditorialPriority([
    'route'=>'/fa/shop/','grades'=>[]],'onPageSeo')===null,
    'unknown source grade must not be inferred');

try{
    operationsAlertHistory($pdo,['severity'=>'invalid'],time());
    throw new RuntimeException('invalid incident filters accepted');
}catch(InvalidArgumentException $e){
    verifySupermaster($e->getMessage()==='invalid_incident_history_filters',
        'incident filters rejected with unexpected error');
}
$history=operationsAlertHistory($pdo,
    ['severity'=>'all','state'=>'all','days'=>'30','page'=>'1'],time());
verifySupermaster($history['schema']==='operations-incident-history-v1',
    'incident-history endpoint has unexpected structure');
verifySupermaster(count($history['records'])<=50,
    'incident-history endpoint exceeded bounded page size');

$offers=operationsCommercePopularOffers($pdo);
verifySupermaster($offers['status']==='internal_provider_claim_matches_only',
    'MySQL 8 JSON_TABLE source-only popular-SKU projection unavailable');
verifySupermaster($offers['settlementVerified']===false,
    'claim-matched orders falsely certified settlement');
verifySupermaster(count($offers['offers'])<=15,'unbounded popularity rows');
echo 'PASS: '.$count.' isolated Super Master P0-P6 source/runtime assertions; no live host, payment or mail.'.PHP_EOL;
