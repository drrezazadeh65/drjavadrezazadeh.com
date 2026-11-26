<?php
declare(strict_types=1);
// Synthetic disposable database only. Never contact Ramzinex or transfer funds.
$dsn=(string)getenv('USDT_FIXTURE_DSN');
if(!preg_match('/^mysql:host=127\.0\.0\.1;port=3306;dbname=usdt_fixture;charset=utf8mb4$/D',$dsn))
    throw new RuntimeException('isolated_usdt_fixture_required');
$pdo=new PDO($dsn,'root','fixture-password',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
foreach(['docs/BERTINA_MYSQL_SCHEMA.sql','docs/migrations/20261012_stage09_commerce.sql','docs/migrations/20261126_usdt_bsc_mother_commerce.sql'] as $path)
    $pdo->exec((string)file_get_contents(__DIR__.'/../'.$path));
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/commerce-stage9.php';
require __DIR__.'/../api/usdt-commerce-v1.php';
function validUuid(string $id):bool{return preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/D',$id)===1;}
function uuidv4():string{$b=random_bytes(16);$b[6]=chr((ord($b[6])&15)|64);$b[8]=chr((ord($b[8])&63)|128);$h=bin2hex($b);return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20);}
function cfg():array{return ['usdt_bsc_rate_side'=>'sellIRR'];}
function rateAllowed(PDO $pdo,string $a,string $i,int $m,int $w):bool{return true;}
function fail(string $code,int $status=400):never{throw new RuntimeException($code);}
function normalizedCustomer(mixed $v):array{return $v;}
function normalizedServiceBuyer(mixed $v):array{return $v;}
function localCatalog():array{return [
 'book:fixture'=>['sku'=>'book:fixture','kind'=>'book','title'=>'Synthetic book','price'=>200000],
 'service:fixture'=>['sku'=>'service:fixture','kind'=>'service','title'=>'Synthetic consultation','price'=>6000000]
];}
function ck(bool $x,string $n):void{if(!$x)throw new RuntimeException('FAILED '.$n);echo "PASS $n\n";}
function rejects(callable $f,string $n):void{try{$f();}catch(Throwable $e){echo "PASS $n (rejected)\n";return;}throw new RuntimeException('unexpected acceptance '.$n);}
function scalar(PDO $p,string $s,array $a=[]):mixed{$q=$p->prepare($s);$q->execute($a);return $q->fetchColumn();}
function account(PDO $p,string $name):array{
 $id=uuidv4();$email=$name.'@example.test';$now=time();
 $p->prepare("INSERT INTO customer_accounts(id,email_normalized,password_hash,status,email_verified_at,created_at,updated_at) VALUES(?,?,?,'active',?,?,?)")->execute([$id,$email,'fixture-not-a-real-password',$now,$now,$now]);
 return ['id'=>$id,'email_normalized'=>$email,'status'=>'active','email_verified_at'=>$now];
}
function evidence(array $q,string $hash,string $credit):array{
 return ['orderId'=>$q['orderId'],'transactionHash'=>$hash,'action'=>'settle','note'=>'Synthetic independent evidence fixture only','creditReference'=>$credit,'transferredAt'=>$q['issuedAt'],'creditedAmountUsdt'=>$q['amountUsdt'],'exchangeCreditConfirmed'=>true,'senderOwnershipConfirmed'=>true,'chain56Confirmed'=>true,'tokenContractConfirmed'=>true,'receiverConfirmed'=>true,'finalityConfirmed'=>true];
}
ck(jrUsdtSchemaReady($pdo)&&stage9SchemaReady($pdo),'additive_schema_and_unique_ledgers');
ck(jrUsdtCalculate(500000,1000000,1000,1000)===5000000,'exact_toman_to_token');
rejects(fn()=>jrUsdtCalculate(1000,1000000,1000,1000),'below_deposit_floor');
rejects(fn()=>jrUsdtCalculate(500000,1000000,1000,1121),'stale_rate');
ck(jrUsdtParseAmount('0.100000')===100000,'decimal_parse');
rejects(fn()=>jrUsdtParseAmount('1e2'),'reject_scientific_notation');
$a=account($pdo,'a');$b=account($pdo,'b');$owner=account($pdo,'owner');
$rate=fn()=>['receivedAt'=>gmdate('c'),'sellIRR'=>1000000];
$req=['requestId'=>uuidv4(),'purpose'=>'donation','amountToman'=>500000,'focus'=>'general'];
$q=jrUsdtIssue($pdo,$a,$req,$rate);
ck($q['amountUsdt']==='5.000000'&&$q['mayTransfer']&&!$q['paymentVerified'],'server_bound_donation_quote');
ck(jrUsdtIssue($pdo,$a,$req,$rate)['orderId']===$q['orderId'],'idempotent_quote');
rejects(fn()=>jrUsdtIssue($pdo,$a,array_replace($req,['amountToman'=>600000]),$rate),'idempotency_payload_conflict');
rejects(fn()=>jrUsdtIssue($pdo,$a,array_replace($req,['requestId'=>uuidv4()]),$rate),'one_open_quote');
$hash='0x'.str_repeat('a',64);
rejects(fn()=>jrUsdtClaim($pdo,$b,['orderId'=>$q['orderId'],'transactionHash'=>$hash]),'foreign_account_claim_denied');
$c=jrUsdtClaim($pdo,$a,['orderId'=>$q['orderId'],'transactionHash'=>$hash]);
ck(!$c['paymentVerified']&&!$c['mayTransfer'],'hash_is_not_payment');
$e=evidence($q,$hash,'credit-fixture-1');
rejects(fn()=>jrUsdtSettlement($pdo,$owner['id'],array_replace($e,['exchangeCreditConfirmed'=>false])),'unconfirmed_exchange_credit');
rejects(fn()=>jrUsdtSettlement($pdo,$owner['id'],array_replace($e,['creditedAmountUsdt'=>'4.999999'])),'underpayment');
rejects(fn()=>jrUsdtSettlement($pdo,$owner['id'],array_replace($e,['transferredAt'=>$q['issuedAt']-1])),'out_of_window_transfer');
ck(scalar($pdo,'SELECT state FROM commerce_orders WHERE id=?',[$q['orderId']])==='pending','negative_checks_preserve_pending');
ck(jrUsdtSettlement($pdo,$owner['id'],$e),'settlement');
$paid=jrUsdtQuoteView(jrUsdtQuoteRow($pdo,$q['orderId'],$a['id']),false,$pdo);
ck($paid['paymentVerified']&&scalar($pdo,'SELECT state FROM commerce_orders WHERE id=?',[$q['orderId']])==='paid','verified_canonical_payment');
rejects(fn()=>jrUsdtSettlement($pdo,$owner['id'],$e),'settlement_replay');
$q2=jrUsdtIssue($pdo,$b,array_replace($req,['requestId'=>uuidv4()]),$rate);
jrUsdtClaim($pdo,$b,['orderId'=>$q2['orderId'],'transactionHash'=>$hash]);
rejects(fn()=>jrUsdtSettlement($pdo,$owner['id'],evidence($q2,$hash,'credit-fixture-2')),'cross_order_duplicate_transaction');
ck(scalar($pdo,'SELECT state FROM commerce_orders WHERE id=?',[$q2['orderId']])==='pending','duplicate_rolls_back');
$cancel=['orderId'=>$q2['orderId'],'action'=>'cancel','note'=>'Synthetic no credit cancellation','noCreditOrPendingTransferConfirmed'=>true];
ck(jrUsdtSettlement($pdo,$owner['id'],$cancel),'owner_cancel_uncredited_quote');
$pdo->exec("INSERT INTO commerce_book_stock(sku,physical_on_hand,reserved,reconciled_at) VALUES('book:fixture',2,0,NOW())");
$q3=jrUsdtIssue($pdo,$a,['requestId'=>uuidv4(),'purpose'=>'purchase','items'=>[['sku'=>'book:fixture','quantity'=>1,'price'=>1]],'customer'=>['name'=>'Synthetic customer','email'=>'untrusted@example.test']],$rate);
ck($q3['amountToman']===200000&&(int)scalar($pdo,"SELECT reserved FROM commerce_book_stock WHERE sku='book:fixture'")===1,'server_price_and_book_reservation');
$h3='0x'.str_repeat('b',64);jrUsdtClaim($pdo,$a,['orderId'=>$q3['orderId'],'transactionHash'=>$h3]);
ck(jrUsdtSettlement($pdo,$owner['id'],evidence($q3,$h3,'credit-fixture-3')),'book_settlement');
ck((int)scalar($pdo,"SELECT physical_on_hand FROM commerce_book_stock WHERE sku='book:fixture'")===1&&scalar($pdo,'SELECT state FROM commerce_parcels WHERE order_id=?',[$q3['orderId']])==='preparing','stock_commit_and_parcel');
$q4=jrUsdtIssue($pdo,$a,['requestId'=>uuidv4(),'purpose'=>'purchase','items'=>[['sku'=>'book:fixture','quantity'=>1]],'customer'=>['name'=>'Synthetic customer']],$rate);
ck(jrUsdtSettlement($pdo,$owner['id'],array_replace($cancel,['orderId'=>$q4['orderId']])),'cancel_book');
ck((int)scalar($pdo,"SELECT reserved FROM commerce_book_stock WHERE sku='book:fixture'")===0,'reservation_released');
$offer=uuidv4();$now=time();
$pdo->prepare('INSERT INTO commerce_usdt_authorized_offers(id,account_id,sku,title,amount_toman,invoice_reference,approved_by,approved_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)')->execute([$offer,$a['id'],'service:jrei_fixture','Synthetic contractual JREI',35000000,'FIXTURE-001',$owner['id'],$now,$now+3600]);
$offerReq=['requestId'=>uuidv4(),'purpose'=>'authorized','offerId'=>$offer,'amountToman'=>1,'customer'=>['name'=>'Synthetic customer']];
rejects(fn()=>jrUsdtIssue($pdo,$b,$offerReq,$rate),'foreign_contract_offer_denied');
$q5=jrUsdtIssue($pdo,$a,$offerReq,$rate);
ck($q5['amountToman']===35000000&&scalar($pdo,'SELECT consumed_order_id FROM commerce_usdt_authorized_offers WHERE id=?',[$offer])===$q5['orderId'],'contract_price_bound_and_consumed');
$h5='0x'.str_repeat('c',64);jrUsdtClaim($pdo,$a,['orderId'=>$q5['orderId'],'transactionHash'=>$h5]);
rejects(fn()=>jrUsdtSettlement($pdo,$owner['id'],evidence($q5,$h5,'credit-fixture-3')),'duplicate_exchange_credit_reference');
ck(jrUsdtSettlement($pdo,$owner['id'],evidence($q5,$h5,'credit-fixture-5')),'contract_settlement');
ck(scalar($pdo,'SELECT status FROM commerce_service_cases WHERE order_id=?',[$q5['orderId']])==='awaiting_contact','contract_service_case');
ck((int)scalar($pdo,"SELECT COUNT(*) FROM commerce_payment_claims WHERE provider='usdt_bsc'")===3,'exactly_three_verified_claims');
echo "USDT real disposable MySQL acceptance passed; no real payments or production migration.\n";
