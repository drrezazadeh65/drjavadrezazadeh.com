<?php
declare(strict_types=1);

// Execute the REAL production callback and receipt route against CI-only MySQL.
// Provider responses, redirects and email are mocked; no BitPay credentials or live payments.
$dsn=(string)getenv('OPERATIONS_TEST_DSN');
if (!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn)) {
    throw new RuntimeException('isolated_fixture_database_required');
}
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),(string)getenv('OPERATIONS_TEST_PASSWORD'),[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false
]);
$pdo->exec((string)file_get_contents(__DIR__.'/../docs/BERTINA_MYSQL_SCHEMA.sql'));

final class CommerceReturn extends RuntimeException {
    public function __construct(public string $destination) { parent::__construct('return'); }
}
final class CommerceResult extends RuntimeException {
    public function __construct(public array $body, public int $status) { parent::__construct('response'); }
}
function db(): ?PDO { return $GLOBALS['mysql']; }
function validUuid(string $id): bool {
    return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/D',$id)===1;
}
function validEmail(string $email): bool { return false; }
function mailReady(): bool { return false; }
function commerceReceiptAuthorized(string $id): bool { return $GLOBALS['receiptAccessAllowed']??false; }
function commerceReturnToResult(string $orderId): never {
    throw new CommerceReturn('/fa/shop/payment-result/?from=gateway&order='.$orderId);
}
function respond(array $body,int $status=200): never { throw new CommerceResult($body,$status); }
function fail(string $error,int $status=400): never { respond(['ok'=>false,'error'=>$error],$status); }
function gatewayPost(string $endpoint,array $fields): string {
    if ($endpoint!=='gateway-result-second') throw new RuntimeException('unexpected_provider_endpoint');
    $GLOBALS['gatewayCalls']++;
    if (($GLOBALS['gatewayCase']??'')==='timeout') throw new RuntimeException('simulated_provider_outage');
    $status=($GLOBALS['gatewayCase']??'')==='cancelled'?-4:1;
    $amount=($GLOBALS['gatewayCase']??'')==='mismatch'?'19999999':'20000000';
    return json_encode(['status'=>$status,'amount'=>$amount,'factorId'=>'123456789987'],JSON_THROW_ON_ERROR);
}
function verify(bool $valid,string $case): void {
    if (!$valid) throw new RuntimeException('mysql_commerce_contract_failed: '.$case);
    echo "PASS ".$case."\n";
}
$source=(string)file_get_contents(__DIR__.'/../api/index.php');
$callbackStart=strpos($source,"if(\$path==='/commerce/callback'&&");
$callbackEnd=strpos($source,"if(\$path==='/donations/health'",$callbackStart===false?0:$callbackStart);
$statusStart=strpos($source,"if(\$path==='/commerce/status'&&");
if ($callbackStart===false||$callbackEnd===false||$statusStart===false) throw new RuntimeException('missing_production_routes');
$callbackRoute=substr($source,$callbackStart,$callbackEnd-$callbackStart);
$statusRoute=substr($source,$statusStart,$callbackStart-$statusStart);

$GLOBALS['mysql']=$pdo;
$order='11111111-1111-4111-8111-111111111117';
$items=[['sku'=>'book:roshanaei','title'=>'کتاب آزمون','price'=>2000000,'quantity'=>1,'subtotal'=>2000000]];
$pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$order]);
$insert=$pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,customer_email,items_json,state,provider_id_get) VALUES(?,?,2000000,20000000,'IRT',NULL,?,'pending','123')");
$insert->execute([$order,'123456789987',json_encode($items,JSON_UNESCAPED_UNICODE)]);
$load=$pdo->prepare('SELECT state,provider_trans_id,paid_at FROM commerce_orders WHERE id=?');

function invokeCallback(string $order, string $case, bool $post=false, ?string $providerId=null): void {
    $GLOBALS['gatewayCalls']=0;
    $GLOBALS['gatewayCase']=$case;
    $path='/commerce/callback';$verb=$post?'POST':'GET';
    $_GET=['order'=>$order];
    if (!$post) $_GET['id_get']=$providerId??'123';
    if (!$post) $_GET['trans_id']='456';
    $_POST=$post?['id_get'=>$providerId??'123','trans_id'=>'456']:[];
    try {
        eval($GLOBALS['callbackRoute']);
        throw new RuntimeException('callback_did_not_redirect');
    } catch(CommerceReturn $returned) {
        verify($returned->destination==='/fa/shop/payment-result/?from=gateway&order='.$order,'callback_to_status_page');
    }
}
function currentOrder(string $id): array {
    $query=$GLOBALS['mysql']->prepare('SELECT state,provider_trans_id,paid_at FROM commerce_orders WHERE id=?');
    $query->execute([$id]);return $query->fetch()?:[];
}
function statusFor(string $order): array {
    $path='/commerce/status';$verb='GET';$_GET=['order'=>$order];$_POST=[];
    try { eval($GLOBALS['statusRoute']); throw new RuntimeException('status_did_not_respond'); }
    catch(CommerceResult $result) {
        verify($result->status===200,'status_route_http_200');
        return $result->body;
    }
}
$GLOBALS['callbackRoute']=$callbackRoute;
$GLOBALS['statusRoute']=$statusRoute;
try {
    foreach(['cancelled','timeout','mismatch'] as $case) {
        invokeCallback($order,$case);
        $row=currentOrder($order);
        verify($row['state']==='pending'&&$row['paid_at']===null&&$row['provider_trans_id']===null,'no_paid_state_on_'.$case);
        verify($GLOBALS['gatewayCalls']===1,'provider_checked_on_'.$case);
    }
    invokeCallback($order,'success',false,'999');
    verify($GLOBALS['gatewayCalls']===0,'foreign_gateway_id_rejected_before_provider');
    verify(currentOrder($order)['state']==='pending','foreign_gateway_id_no_write');

    invokeCallback($order,'success',true);
    $row=currentOrder($order);
    verify($row['state']==='paid'&&$row['provider_trans_id']==='456'&&is_string($row['paid_at']),'verified_provider_writes_exactly_one_paid_order');
    verify($GLOBALS['gatewayCalls']===1,'success_verified_once');
    $firstPaidAt=$row['paid_at'];

    $GLOBALS['receiptAccessAllowed']=true;
    $receipt=statusFor($order);
    verify(($receipt['ok']??false)===true&&($receipt['state']??'')==='paid','real_mysql_status_reports_paid');
    verify(($receipt['receipt']['amountToman']??0)===2000000&&
        ($receipt['receipt']['items'][0]['subtotalToman']??0)===2000000,'receipt_total_matches_persisted_lines');
    verify(!isset($receipt['receipt']['provider_trans_id'])&&!isset($receipt['receipt']['customer_json']),'no_private_provider_details_in_receipt');

    invokeCallback($order,'success',true);
    $later=currentOrder($order);
    verify($GLOBALS['gatewayCalls']===0,'duplicate_callback_skips_provider');
    verify($later['state']==='paid'&&$later['provider_trans_id']==='456'&&$later['paid_at']===$firstPaidAt,'duplicate_callback_cannot_rewrite_paid_record');
    echo "Real MySQL commerce callback/receipt integration passed; all provider actions mocked.\n";
} finally {
    $pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$order]);
}
