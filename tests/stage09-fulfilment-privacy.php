<?php
declare(strict_types=1);
// Executes real fulfilment route on isolated PDO fixture (no live account/DB).
final class RouteAnswer extends RuntimeException {
    public function __construct(public array $body,public int $status){parent::__construct('route_answer');}
}
function respond(array $data,int $status=200): never {throw new RouteAnswer($data,$status);}
function fail(string $code,int $status=400): never {respond(['ok'=>false,'error'=>$code],$status);}
function commerceSchemaReady(): bool {return true;}
function stage9SchemaReady(PDO $pdo): bool {return true;}
function validUuid(string $s): bool {return preg_match('/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i',$s)===1;}
function emailNorm(mixed $s): string{return strtolower(trim((string)$s));}
function validEmail(string $s): bool{return filter_var($s,FILTER_VALIDATE_EMAIL)!==false;}
function sessionAccount(PDO $pdo): ?array{return $GLOBALS['identity']??null;}
final class DeliveryFixtureDb extends PDO {
    public function __construct(){}
    public function prepare(string $query,array $options=[]): PDOStatement|false {return new DeliveryFixtureStmt($query);}
}
final class DeliveryFixtureStmt extends PDOStatement {
    private array $rows=[];
    public function __construct(private string $sql){}
    public function execute(?array $params=null): bool {
        $p=$params??[];$this->rows=[];
        if(str_contains($this->sql,'FROM commerce_orders WHERE id=? AND customer_email=?')){
            if(($p[1]??null)==='alice@example.test'&&($p[0]??null)===$GLOBALS['ownOrder'])
                $this->rows=[['state'=>'paid','paid_at'=>'2026-10-12 15:00:00',
                    'provider_id_get'=>'111','provider_trans_id'=>'222','provider_amount'=>'20000000']];
        }elseif(str_contains($this->sql,'FROM commerce_payment_claims')){
            if(!empty($GLOBALS['claimValid']))$this->rows=[['transaction_id'=>'222','verified_amount'=>'20000000']];
        }elseif(str_contains($this->sql,'FROM commerce_service_cases')){
            $this->rows=$GLOBALS['cases']??[];
        }elseif(str_contains($this->sql,'FROM commerce_parcels')){
            $this->rows=$GLOBALS['parcel']??[];
        }else throw new RuntimeException('fixture_sql_missing: '.substr($this->sql,0,65));
        return true;
    }
    public function fetch(int $mode=PDO::FETCH_DEFAULT,int $cursorOrientation=PDO::FETCH_ORI_NEXT,int $cursorOffset=0): mixed{return array_shift($this->rows)?:false;}
    public function fetchAll(int $mode=PDO::FETCH_DEFAULT,mixed ...$args): array{return $this->rows;}
}
function db(): DeliveryFixtureDb {static $db=null;return $db??=new DeliveryFixtureDb();}
$s=file_get_contents(__DIR__.'/../api/index.php');
$from=strpos($s,"if(\$path==='/commerce/fulfilment'&&\$verb==='GET')");
$end=strpos($s,"if(\$path==='/commerce/health'&&\$verb==='GET')",$from);
if($from===false||$end===false||$end<=$from)throw new RuntimeException('route_not_found');
$route=substr($s,$from,$end-$from);
$GLOBALS['ownOrder']='11111111-1111-4111-8111-111111111111';
$GLOBALS['claimValid']=true;
$GLOBALS['cases']=[['sku'=>'service:academic_consult_60','status'=>'awaiting_contact','booking_start'=>null,'booking_end'=>null,'delivered_at'=>null]];
$GLOBALS['parcel']=[['carrier'=>'postal_service','tracking_code'=>'PRIVATE-CODE','state'=>'dispatched','dispatched_at'=>'2026-10-12','delivered_at'=>null]];
function runDelivery(?array $identity,string $order): RouteAnswer {
    global $route;
    $GLOBALS['identity']=$identity;$path='/commerce/fulfilment';$verb='GET';$_GET=['order'=>$order];
    try{eval($route);throw new RuntimeException('route_no_response');}
    catch(RouteAnswer $answer){return $answer;}
}
function checkDelivery(bool $ok,string $name):void {
    if(!$ok)throw new RuntimeException('fulfilment_case_failed_'.$name);
    echo "PASS ".$name."\n";
}
$alice=['status'=>'active','email_verified_at'=>100,'email_normalized'=>'alice@example.test'];
$bob=['status'=>'active','email_verified_at'=>100,'email_normalized'=>'bob@example.test'];
$id=$GLOBALS['ownOrder'];
checkDelivery(runDelivery(null,$id)->status===401,'guest_denied');
checkDelivery(runDelivery(array_replace($alice,['email_verified_at'=>null]),$id)->status===401,'unverified_denied');
checkDelivery(runDelivery($bob,$id)->status===404,'other_customer_order_denied');
checkDelivery(runDelivery($alice,'bad-id')->status===400,'malformed_id_denied');
$success=runDelivery($alice,$id);
checkDelivery($success->status===200,'own_paid_order_allowed');
checkDelivery($success->body['paymentRecord']==='provider_verified_not_bank_settlement','bank_settlement_not_claimed');
checkDelivery(count($success->body['serviceCases'])===1&&$success->body['serviceCases'][0]['status']==='awaiting_contact','real_service_status_only');
checkDelivery($success->body['parcel']['trackingCode']==='PRIVATE-CODE','owner_tracking_only');
$GLOBALS['claimValid']=false;
$unknown=runDelivery($alice,$id);
checkDelivery($unknown->body['paymentRecord']==='requires_reconciliation'&&$unknown->body['parcel']===null,'unclaimed_payment_no_tracking');
echo "Stage 09 fulfilment route isolation fixtures passed (not a live delivery).\n";
