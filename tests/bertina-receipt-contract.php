<?php
declare(strict_types=1);

// Exercise only the actual commerce/status route with in-memory database rows.
// No hosting credentials, network, real database or payment provider is used.
final class ReceiptResponse extends RuntimeException {
    public function __construct(public array $data, public int $status) { parent::__construct('response'); }
}
function respond(array $data, int $status=200): never { throw new ReceiptResponse($data,$status); }
function fail(string $code, int $status=400): never { respond(['ok'=>false,'error'=>$code],$status); }
function validUuid(string $id): bool { return preg_match('/^[a-f0-9-]{36}$/D',$id)===1; }
final class ReceiptRows {
    public function prepare(string $sql): self { return $this; }
    public function execute(array $args): bool { return true; }
    public function fetch(): array { return $GLOBALS['fixture']; }
}
function db(): ReceiptRows { return new ReceiptRows(); }

$source=file_get_contents(__DIR__.'/../api/index.php');
$start=strpos($source,"if(\$path==='/commerce/status'&&\$verb==='GET')");
$end=strpos($source,"if(\$path==='/commerce/callback'",$start);
if($start===false||$end===false)throw new RuntimeException('Status route extraction failed');
$route=substr($source,$start,$end-$start);
$order='11111111-1111-4111-8111-111111111111';
$base=[
    'state'=>'paid','amount_toman'=>'2000000','currency'=>'IRT',
    'paid_at'=>'2026-10-10 10:00:00','provider_id_get'=>'123','provider_trans_id'=>'456',
    'items_json'=>json_encode([['sku'=>'book:roshanaei','title'=>'سپید','quantity'=>1,'price'=>2000000,'subtotal'=>2000000]])
];

function checkCase(string $name,array $row,int $expectedStatus,?string $expectedError=null): array {
    global $route,$order;
    $GLOBALS['fixture']=$row;
    $path='/commerce/status';$verb='GET';$_GET=['order'=>$order];
    try { eval($route); throw new RuntimeException('Route returned without response'); }
    catch(ReceiptResponse $response){
        if($response->status!==$expectedStatus)throw new RuntimeException($name.': unexpected HTTP '.$response->status);
        if($expectedError!==null&&($response->data['error']??null)!==$expectedError)throw new RuntimeException($name.': unexpected error');
        echo "PASS ".$name."\n";
        return $response->data;
    }
}

$paid=checkCase('valid verified receipt',$base,200);
if($paid['receipt']['amountToman']!==2000000||$paid['receipt']['orderId']!==$order)throw new RuntimeException('Receipt totals/identity changed');
foreach(['provider_id_get','provider_trans_id','customer_email','customer_json','factor_id'] as $private){
    if(str_contains(json_encode($paid),'"'.$private.'"'))throw new RuntimeException('Receipt exposes '.$private);
}
$unpaid=checkCase('unpaid order exposes state only',array_replace($base,['state'=>'created']),200);
if(isset($unpaid['receipt'])||array_keys($unpaid)!==['ok','state'])throw new RuntimeException('Unpaid receipt leakage');
foreach([
    'wrong currency'=>['currency'=>'IRR'],
    'missing payment timestamp'=>['paid_at'=>null],
    'invalid timestamp'=>['paid_at'=>'not a date'],
    'missing gateway evidence'=>['provider_id_get'=>''],
    'missing transaction evidence'=>['provider_trans_id'=>null]
] as $name=>$change)checkCase($name,array_replace($base,$change),409,'receipt_unverified');
checkCase('malformed lines',array_replace($base,['items_json'=>'broken']),503,'receipt_unavailable');
checkCase('fractional quantity',array_replace($base,['items_json'=>json_encode([['quantity'=>1.5,'price'=>2000000,'subtotal'=>2000000]])]),409,'receipt_unverified');
checkCase('incorrect line subtotal',array_replace($base,['items_json'=>json_encode([['quantity'=>1,'price'=>2000000,'subtotal'=>1000000]])]),503,'receipt_unavailable');
checkCase('incorrect stored total',array_replace($base,['amount_toman'=>'3000000']),409,'receipt_amount_mismatch');
echo "Bertina receipt route: 11 cases passed; no real payment or database access.\n";
