<?php
declare(strict_types=1);
// Isolated MySQL CI fixture only; no provider calls, customer email or real orders.
$dsn=(string)(getenv('OPERATIONS_TEST_DSN')?:'');
if(!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn))
    throw new RuntimeException('isolated_operations_fixture_required');
$pdo=new PDO($dsn,(string)(getenv('OPERATIONS_TEST_USER')?:''),
    (string)(getenv('OPERATIONS_TEST_PASSWORD')?:''),[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false
]);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/commerce-stage9.php';
require_once __DIR__.'/../api/operations-fulfilment.php';
function operationsAudit(PDO $pdo,?string $actor,string $action,string $reference): void {
    $q=$pdo->prepare("INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at)
      VALUES(?,?,?,?)");
    $q->execute([$actor,$action,time()]);
}
function checkService(bool $ok,string $name): void {
    if(!$ok)throw new RuntimeException('service_advance_failed_'.$name);
    echo "PASS ".$name."\n";
}
function refused(callable $fn,string $exception,string $name): void {
    try{$fn();throw new RuntimeException('unexpected_acceptance_'.$name);}
    catch(Throwable $e){
        if($e instanceof RuntimeException && str_starts_with($e->getMessage(),'unexpected_acceptance_'))
            throw $e;
        checkService($e instanceof $exception,$name);
    }
}
$pdo->exec(file_get_contents(__DIR__.'/../docs/BERTINA_MYSQL_SCHEMA.sql'));
$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261012_stage09_commerce.sql'));
$pdo->exec("CREATE TEMPORARY TABLE operations_audit (
  sequence_id BIGINT AUTO_INCREMENT PRIMARY KEY,actor_id CHAR(36) NULL,
  action VARCHAR(40) NOT NULL,reference_id VARCHAR(64) NOT NULL,occurred_at BIGINT NOT NULL
) ENGINE=InnoDB");
checkService(stage9SchemaReady($pdo),'isolated_innodb_schema');
$orderId='11111111-1111-4111-8111-111111111191';
$wrongId='11111111-1111-4111-8111-111111111192';
$actor='11111111-1111-4111-8111-111111111193';
$sku='service:academic_consult_60';
$items='[{"kind":"service","sku":"service:academic_consult_60","quantity":1,"price":1000000,"subtotal":1000000}]';
$orders=$pdo->prepare("INSERT INTO commerce_orders
 (id,factor_id,amount_toman,provider_amount,currency,items_json,state,
  provider_id_get,provider_trans_id,paid_at) VALUES
 (?, ?, 1000000,10000000,'IRT',?,'paid','001','77777',NOW())");
$orders->execute([$orderId,'test-valid',$items]);
$orders->execute([$wrongId,'test-legacy',$items]);
$pdo->prepare("INSERT INTO commerce_payment_claims
    (provider,transaction_id,order_id,verified_amount)
    VALUES('bitpay','77777',?,10000000)")->execute([$orderId]);
$case=$pdo->prepare("INSERT INTO commerce_service_cases(order_id,sku,status)
    VALUES(?,?,'awaiting_contact')");
$case->execute([$orderId,$sku]);$case->execute([$wrongId,$sku]);
$body=[
 'orderId'=>$orderId,'sku'=>$sku,'expectedState'=>'awaiting_contact',
 'nextState'=>'scheduling','bookingStart'=>null,'bookingEnd'=>null
];
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,array_merge($body,['unexpected'=>1])),
 InvalidArgumentException::class,'extra_field_denied');
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,array_merge($body,['nextState'=>'delivered'])),
 InvalidArgumentException::class,'delivery_cannot_be_fabricated');
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,array_merge($body,['orderId'=>$wrongId])),
 DomainException::class,'paid_state_without_unique_claim_denied');
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,array_merge($body,['sku'=>'service:../outside'])),
 InvalidArgumentException::class,'invalid_service_reference_denied');
$changed=operationsCommerceServiceAdvance($pdo,$actor,$body);
checkService($changed['state']==='scheduling'
    && $changed['serviceDelivered']===false && $changed['customerNotified']===false,
    'legitimate_operator_progress_without_delivery_or_notification');
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,$body),
 DomainException::class,'replay_rejected_by_expected_state');
$start=gmdate('Y-m-d H:i:s',time()+3600);
$end=gmdate('Y-m-d H:i:s',time()+7200);
$booked=array_merge($body,['expectedState'=>'scheduling','nextState'=>'booked',
   'bookingStart'=>$start,'bookingEnd'=>$end]);
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,array_merge($booked,['bookingEnd'=>'2026-02-30 10:00:00'])),
 InvalidArgumentException::class,'invalid_calendar_date_denied');
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,array_merge($booked,['bookingEnd'=>$start])),
 InvalidArgumentException::class,'invalid_booking_range_denied');
checkService(operationsCommerceServiceAdvance($pdo,$actor,$booked)['bookingScheduled']===true,
 'booking_times_must_be_explicit');
$observed=$pdo->prepare('SELECT status,booking_start,booking_end
 FROM commerce_service_cases WHERE order_id=? AND sku=?');
$observed->execute([$orderId,$sku]);$state=$observed->fetch();
checkService($state['status']==='booked'&&$state['booking_start']===$start
  &&$state['booking_end']===$end,'booking_recorded_on_server');
$progress=array_merge($body,['expectedState'=>'booked','nextState'=>'in_progress']);
checkService(operationsCommerceServiceAdvance($pdo,$actor,$progress)['state']==='in_progress',
  'human_confirmed_service_progress');
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,$progress),
 DomainException::class,'duplicate_progress_rejected');
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,array_merge($body,['expectedState'=>'in_progress','nextState'=>'delivered'])),
 InvalidArgumentException::class,'delivered_state_requires_future_independent_evidence');
$audit=$pdo->query("SELECT actor_id,action,reference_id FROM operations_audit")->fetchAll(PDO::FETCH_ASSOC);
checkService(count($audit)===3 && array_reduce($audit,fn($yes,$row)=>$yes
    &&$row['actor_id']===$actor
    &&$row['action']==='commerce_service_advance'
    &&strlen($row['reference_id'])<=64,true),
  'exactly_three_private_operator_audit_events');
$pdo->exec('DROP TEMPORARY TABLE operations_audit');
echo "Service advance MySQL fixture: no real money, appointments, email or entitlement granted.\n";
