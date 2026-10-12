<?php
declare(strict_types=1);
// Isolated route test: creates a review REQUEST, never a payment/refund.
final class RefundReply extends RuntimeException {
 public function __construct(public array $body,public int $status){parent::__construct('reply');}
}
function respond(array $data,int $status=200):never{throw new RefundReply($data,$status);}
function fail(string $error,int $status=400):never{respond(['ok'=>false,'error'=>$error],$status);}
function requirePostOrigin():void{}
function commerceSchemaReady():bool{return true;}
function stage9SchemaReady(PDO $pdo):bool{return true;}
function validUuid(string $id):bool{return preg_match('/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i',$id)===1;}
function emailNorm(mixed $e):string{return strtolower(trim((string)$e));}
function validEmail(string $email):bool{return filter_var($email,FILTER_VALIDATE_EMAIL)!==false;}
function rateAllowed(PDO $pdo,string $action,string $who,int $limit,int $secs):bool{return true;}
function uuidv4():string{return 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';}
function jsonBody():array{return $GLOBALS['input'];}
function sessionAccount(PDO $pdo):?array{return $GLOBALS['identity']??null;}
final class RefundDb extends PDO {
 public bool $inTx=false;public ?array $request=null;
 public function __construct(){}
 public function beginTransaction():bool{$this->inTx=true;return true;}
 public function commit():bool{$this->inTx=false;return true;}
 public function rollBack():bool{$this->inTx=false;return true;}
 public function inTransaction():bool{return $this->inTx;}
 public function prepare(string $sql,array $options=[]):PDOStatement|false{return new RefundStmt($this,$sql);}
}
final class RefundStmt extends PDOStatement {
 private array $rows=[];
 public function __construct(private RefundDb $db,private string $sql){}
 public function execute(?array $params=null):bool{
  $p=$params??[];$this->rows=[];
  if(str_contains($this->sql,'FROM commerce_orders WHERE id=? AND customer_email=?')){
   if(($p[0]??'')===$GLOBALS['orderId']&&($p[1]??'')==='alice@example.test')
    $this->rows=[['id'=>$p[0],'state'=>$GLOBALS['orderState']??'paid']];
  }elseif(str_contains($this->sql,'FROM commerce_refund_requests WHERE order_id=?')){
   if($this->db->request)$this->rows=[['id'=>$this->db->request['id'],'status'=>'requested']];
  }elseif(str_contains($this->sql,'INSERT INTO commerce_refund_requests')){
   $this->db->request=['id'=>$p[0],'order'=>$p[1],'requester'=>$p[2],'reason'=>$p[3]];
  }else throw new RuntimeException('fixture_unexpected_sql');
  return true;
 }
 public function fetch(int $mode=PDO::FETCH_DEFAULT,int $cursorOrientation=PDO::FETCH_ORI_NEXT,int $cursorOffset=0):mixed{return array_shift($this->rows)?:false;}
}
$GLOBALS['db']=new RefundDb();
function db():RefundDb{return $GLOBALS['db'];}
$text=file_get_contents(__DIR__.'/../api/index.php');
$a=strpos($text,"if(\$path==='/commerce/refund-request'&&\$verb==='POST')");
$b=strpos($text,"if(\$path==='/commerce/health'&&\$verb==='GET')",$a);
if($a===false||$b===false)throw new RuntimeException('refund_route_missing');
$route=substr($text,$a,$b-$a);
$GLOBALS['orderId']='11111111-1111-4111-8111-111111111111';
$alice=['id'=>'22222222-2222-4222-8222-222222222222','email_normalized'=>'alice@example.test','status'=>'active','email_verified_at'=>123];
$bob=array_replace($alice,['email_normalized'=>'bob@example.test']);
function checkR(bool $yes,string $case):void{if(!$yes)throw new RuntimeException('refund_case_failed_'.$case);echo "PASS ".$case."\n";}
function runR(?array $identity,array $input):RefundReply{
 global $route;$GLOBALS['identity']=$identity;$GLOBALS['input']=$input;
 $path='/commerce/refund-request';$verb='POST';
 try{eval($route);throw new RuntimeException('no_response');}catch(RefundReply $r){return $r;}
}
$input=['orderId'=>$GLOBALS['orderId'],'reasonCode'=>'book_not_received'];
checkR(runR(null,$input)->status===401,'anonymous_forbidden');
checkR(runR($bob,$input)->status===404,'foreign_order_forbidden');
checkR(runR($alice,array_replace($input,['reasonCode'=>'invalid']))->status===400,'reason_allowlist');
$GLOBALS['orderState']='created';
checkR(runR($alice,$input)->status===409,'unpaid_refund_denied');
$GLOBALS['orderState']='paid';
$first=runR($alice,$input);
checkR($first->status===202&&$first->body['bankRefundExecuted']===false,'review_only_no_reversal');
$again=runR($alice,$input);
checkR($again->status===200&&$again->body['requestId']===$first->body['requestId'],'idempotent_refund_request');
checkR($GLOBALS['db']->request['requester']===$alice['id'],'request_belongs_to_account');
echo "Refund request route privacy fixtures passed. Bank refund is neither executed nor claimed.\n";
