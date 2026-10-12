<?php
declare(strict_types=1);
// Isolated authenticated history route fixtures: no production data, gateway or network.
final class HistoryResponse extends RuntimeException {
    public function __construct(public array $data, public int $status){parent::__construct('history_response');}
}
function respond(array $data,int $status=200): never { throw new HistoryResponse($data,$status); }
function fail(string $code,int $status=400): never { respond(['ok'=>false,'error'=>$code],$status); }
function commerceSchemaReady(): bool {return true;}
function emailNorm(mixed $value): string {return strtolower(trim((string)$value));}
function validEmail(string $value): bool {return filter_var($value,FILTER_VALIDATE_EMAIL)!==false;}
function sessionAccount($pdo): ?array {return $GLOBALS['account']??null;}
final class HistoryDb {
    public function prepare(string $sql): HistoryStatement {
        if(!str_contains($sql,'WHERE customer_email=?')||!str_contains($sql,'LIMIT 50'))
            throw new RuntimeException('history_query_missing_verified_email_filter_or_bound');
        return new HistoryStatement();
    }
}
final class HistoryStatement {
    private string $email='';
    public function execute(array $args): bool {$this->email=(string)($args[0]??'');return true;}
    public function fetchAll(): array {
        $rows=array_values(array_filter($GLOBALS['orders']??[],fn($row)=>$row['customer_email']===$this->email));
        return array_slice($rows,0,50);
    }
}
function db(): HistoryDb {return new HistoryDb();}
$source=file_get_contents(__DIR__.'/../api/index.php');
$start=strpos($source,"if(\$path==='/commerce/history'&&\$verb==='GET')");
$end=strpos($source,"if(\$path==='/commerce/health'&&\$verb==='GET')",$start);
if($start===false||$end===false||$end<=$start)throw new RuntimeException('history_route_not_found');
$route=substr($source,$start,$end-$start);
function runCase(?array $account): HistoryResponse {
    global $route;
    $GLOBALS['account']=$account;
    $path='/commerce/history';$verb='GET';
    try{eval($route);throw new RuntimeException('history_route_no_response');}
    catch(HistoryResponse $e){return $e;}
}
function check(bool $value,string $label): void {
    if(!$value)throw new RuntimeException('history_fixture_failed_'.$label);
    echo "PASS ".$label."\n";
}
$id='11111111-1111-4111-8111-111111111111';
$other='22222222-2222-4222-8222-222222222222';
$line=[['sku'=>'book:roshanaei','title'=>'سپید','quantity'=>1,'subtotal'=>2000000]];
$row=[
    'id'=>$id,'state'=>'paid','amount_toman'=>2000000,'currency'=>'IRT',
    'items_json'=>json_encode($line,JSON_UNESCAPED_UNICODE),'created_at'=>'2026-10-12 12:00:00',
    'paid_at'=>'2026-10-12 12:01:00','provider_id_get'=>'123','provider_trans_id'=>'456',
    'customer_email'=>'verified@example.test','customer_json'=>'{"address":"private-address"}'
];
$GLOBALS['orders']=[$row,array_replace($row,['id'=>$other,'customer_email'=>'another@example.test'])];
$valid=['email_normalized'=>'verified@example.test','status'=>'active','email_verified_at'=>123456];
check(runCase(null)->status===401,'guest_denied');
check(runCase(array_replace($valid,['status'=>'disabled']))->status===401,'disabled_denied');
check(runCase(array_replace($valid,['email_verified_at'=>null]))->status===401,'unverified_denied');
$ok=runCase($valid);
check($ok->status===200&&count($ok->data['orders'])===1,'verified_email_scoped');
$history=$ok->data['orders'][0];
check($history['id']===$id&&$history['paymentVerified']===true,'verified_payment_evidence_flag');
check($history['fulfilmentStatus']==='not_verified','no_fake_fulfilment');
$serialized=json_encode($ok->data);
foreach(['customer_email','customer_json','private-address','provider_id_get','provider_trans_id'] as $private)
    check(!str_contains($serialized,$private),'no_leak_'.$private);
$GLOBALS['orders']=[array_replace($row,['provider_trans_id'=>null])];
$incomplete=runCase($valid);
check($incomplete->data['orders'][0]['paymentVerified']===false,'incomplete_payment_evidence_not_verified');
$GLOBALS['orders']=[];
check(count(runCase($valid)->data['orders'])===0,'honest_empty_state');
echo "Verified order history fixtures passed; no real account, payment or deployment certified.\n";
