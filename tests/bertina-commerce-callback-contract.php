<?php
declare(strict_types=1);

// Exercise the deployed commerce callback route in isolation with a fake DB and fake gateway.
// No network access, private credentials, real orders, or actual bank transactions.
final class CallbackRedirect extends RuntimeException {
    public function __construct(public string $destination) { parent::__construct('redirect'); }
}
final class CallbackFailure extends RuntimeException {
    public function __construct(public string $error) { parent::__construct($error); }
}
function commerceReturnToResult(string $id): never {
    throw new CallbackRedirect('/fa/shop/payment-result/?from=gateway&order='.rawurlencode($id));
}
function fail(string $error, int $status=400): never { throw new CallbackFailure($error); }
function validUuid(string $value): bool {
    return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/D',$value)===1;
}
function validEmail(string $value): bool { return false; }
function mailReady(): bool { return false; }

final class CallbackStatement {
    public function __construct(private string $sql) {}
    public function execute(array $params=[]): bool {
        // Real callback must never regress to non-atomic direct order updates.
        if(str_starts_with($this->sql,'UPDATE commerce_orders'))
            throw new RuntimeException('legacy_direct_payment_state_update');
        return true;
    }
    public function fetch(): array|false { return $GLOBALS['record']; }
    public function rowCount(): int { return 1; }
}
final class CallbackDb {
    public function prepare(string $sql): CallbackStatement { return new CallbackStatement($sql); }
}
function db(): CallbackDb { return new CallbackDb(); }

// This is the fake finalizer ONLY for the isolated callback-router contract.
// The real PDO transaction and its stock/claim/outbox/shipping behavior are
// independently exercised in stage09-commerce-atomic.php and stage09-mysql.php.
function stage9FinalizePayment(CallbackDb $pdo,string $orderId,string $idGet,
    string $trans,string $verifiedAmount,string $verifiedFactor): bool {
    $GLOBALS['finalizerCalls']++;
    $row=$GLOBALS['record'];
    if ($row['state']!=='pending'||(string)$row['provider_id_get']!==$idGet) return false;
    if ((string)$row['provider_amount']!==$verifiedAmount ||
        (string)$row['factor_id']!==$verifiedFactor)
        throw new RuntimeException('finalizer_received_unverified_values');
    if (!validUuid($orderId)||!preg_match('/^[1-9][0-9]*$/D',$trans))
        throw new RuntimeException('finalizer_received_invalid_transaction');
    $GLOBALS['record']['state']='paid';
    $GLOBALS['writes'][]='atomic_stage09_payment_finalization';
    return true;
}

function gatewayPost(string $endpoint,array $fields): string {
    $GLOBALS['gatewayCalls']++;
    if($GLOBALS['case']==='gateway_unavailable')throw new RuntimeException('provider unavailable');
    if($GLOBALS['case']==='invalid_gateway_json')return '{invalid-json';
    $value=[
      'status'=>$GLOBALS['case']==='cancelled'?-4:($GLOBALS['case']==='already_verified_response'?11:($GLOBALS['case']==='provider_failed'?0:1)),
      'amount'=>match($GLOBALS['case']){
        'wrong_amount'=>19999999,
        'fractional_amount'=>20000000.5,
        'text_amount'=>'20000000extra',
        'negative_amount'=>-20000000,
        default=>20000000,
      },
      'factorId'=>$GLOBALS['case']==='wrong_factor'?'not-our-factor':'987654321',
    ];
    return json_encode($value,JSON_THROW_ON_ERROR);
}

$source=file_get_contents(__DIR__.'/../api/index.php');
if(!is_string($source))throw new RuntimeException('Could not read API');
if(!str_contains($source,"function commerceReturnToResult(string \$orderId): never"))throw new RuntimeException('Missing production redirect helper');
if(!str_contains($source,"?from=gateway&order="))throw new RuntimeException('Missing receipt landing marker');
$stage9=(string)file_get_contents(__DIR__.'/../api/commerce-stage9.php');
if(!str_contains($stage9,'function stage9FinalizePayment(') ||
   !str_contains($stage9,'INSERT INTO commerce_payment_claims') ||
   !str_contains($stage9,'stage9CommitBooks($pdo,$orderId,$items)'))
    throw new RuntimeException('Atomic payment finalizer source contract missing');
$start=strpos($source,"if(\$path==='/commerce/callback'&&");
$end=strpos($source,"if(\$path==='/donations/health'",$start);
if($start===false||$end===false)throw new RuntimeException('Could not extract real callback route');
$route=substr($source,$start,$end-$start);
if(!str_contains($route,'stage9FinalizePayment($pdo,$id,$idGet,$trans,') ||
   str_contains($route,'UPDATE commerce_orders SET state='))
    throw new RuntimeException('Production callback bypasses atomic finalizer');

$id='11111111-1111-4111-8111-111111111111';
$scenarios=[
  'cancelled'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'wrong_amount'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'fractional_amount'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'text_amount'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'negative_amount'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'provider_failed'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'already_verified_response'=>['state'=>'paid','writes'=>1,'calls'=>1],
  'wrong_factor'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'invalid_gateway_json'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'gateway_unavailable'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'wrong_id_get'=>['state'=>'pending','writes'=>0,'calls'=>0],
  'missing_transaction'=>['state'=>'pending','writes'=>0,'calls'=>0],
  'already_paid'=>['state'=>'paid','writes'=>0,'calls'=>0],
  'valid_verified'=>['state'=>'paid','writes'=>1,'calls'=>1],
];
foreach($scenarios as $scenario=>$expected){
    $GLOBALS['case']=$scenario;
    $GLOBALS['writes']=[];
    $GLOBALS['gatewayCalls']=0;
    $GLOBALS['finalizerCalls']=0;
    $GLOBALS['record']=[
        'id'=>$id,
        'state'=>$scenario==='already_paid'?'paid':'pending',
        'provider_id_get'=>'123',
        'provider_amount'=>'20000000',
        'factor_id'=>'987654321',
        'customer_email'=>'',
        'items_json'=>'[]',
    ];
    $path='/commerce/callback';$verb='GET';
    $_GET=['order'=>$id,'id_get'=>$scenario==='wrong_id_get'?'666':'123',
           'trans_id'=>$scenario==='missing_transaction'?'':'456'];
    $_POST=[];
    try{
        eval($route);
        throw new RuntimeException('Callback did not redirect');
    }catch(CallbackRedirect $redirect){
        $want='/fa/shop/payment-result/?from=gateway&order='.$id;
        if($redirect->destination!==$want)throw new RuntimeException("$scenario redirected to incorrect URL");
        if($GLOBALS['record']['state']!==$expected['state'])throw new RuntimeException("$scenario changed order state incorrectly");
        if(count($GLOBALS['writes'])!==$expected['writes'])throw new RuntimeException("$scenario performed unexpected writes");
        if($GLOBALS['gatewayCalls']!==$expected['calls'])throw new RuntimeException("$scenario used the provider unexpectedly");
        if($GLOBALS['finalizerCalls']!==$expected['writes'])
            throw new RuntimeException("$scenario invoked atomic finalizer unexpectedly");
        echo "PASS $scenario\n";
    }
}
echo "Bertina callback contract: ".count($scenarios)." mock cases passed; no real payment.\n";
