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
        if(str_starts_with($this->sql,'UPDATE commerce_orders')){
            $GLOBALS['writes'][]=$this->sql;
            $GLOBALS['record']['state']='paid';
        }
        return true;
    }
    public function fetch(): array|false { return $GLOBALS['record']; }
    public function rowCount(): int { return 1; }
}
final class CallbackDb {
    public function prepare(string $sql): CallbackStatement { return new CallbackStatement($sql); }
}
function db(): CallbackDb { return new CallbackDb(); }

function gatewayPost(string $endpoint,array $fields): string {
    $GLOBALS['gatewayCalls']++;
    if($GLOBALS['case']==='gateway_unavailable')throw new RuntimeException('provider unavailable');
    if($GLOBALS['case']==='invalid_gateway_json')return '{invalid-json';
    $value=[
      'status'=>$GLOBALS['case']==='cancelled'?-4:1,
      'amount'=>$GLOBALS['case']==='wrong_amount'?19999999:20000000,
      'factorId'=>$GLOBALS['case']==='wrong_factor'?'not-our-factor':'987654321',
    ];
    return json_encode($value,JSON_THROW_ON_ERROR);
}

$source=file_get_contents(__DIR__.'/../api/index.php');
if(!is_string($source))throw new RuntimeException('Could not read API');
if(!str_contains($source,"function commerceReturnToResult(string \$orderId): never"))throw new RuntimeException('Missing production redirect helper');
if(!str_contains($source,"?from=gateway&order="))throw new RuntimeException('Missing receipt landing marker');
$start=strpos($source,"if(\$path==='/commerce/callback'&&");
$end=strpos($source,"if(\$path==='/donations/health'",$start);
if($start===false||$end===false)throw new RuntimeException('Could not extract real callback route');
$route=substr($source,$start,$end-$start);

$id='11111111-1111-4111-8111-111111111111';
$scenarios=[
  'cancelled'=>['state'=>'pending','writes'=>0,'calls'=>1],
  'wrong_amount'=>['state'=>'pending','writes'=>0,'calls'=>1],
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
        echo "PASS $scenario\n";
    }
}
echo "Bertina callback contract: ".count($scenarios)." mock cases passed; no real payment.\n";
