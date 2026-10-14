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
require_once __DIR__.'/../api/consultation-delivery.php';
require_once __DIR__.'/../api/consultation-availability.php';
require_once __DIR__.'/../api/operations-fulfilment.php';
require_once __DIR__.'/../api/operations-commerce.php';
// Catalogue stub is restricted to the one fictitious service used by this CI fixture.
function localCatalog(): array {
    return ['service:academic_consult_60'=>['kind'=>'service','price'=>1000000]];
}
function validUuid(string $v): bool {
    return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i',$v)===1;
}
function operationsAudit(PDO $pdo,?string $actor,string $action,string $reference): void {
    $q=$pdo->prepare("INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at)
      VALUES(?,?,?,?)");
    $q->execute([$actor,$action,$reference,time()]);
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
$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261014_consultation_preferences.sql'));
$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261014_consultation_availability.sql'));
if(!operationsConsultationAvailabilitySchemaReady($pdo))
    throw new RuntimeException('fixture_availability_schema_not_ready');
if(!commerceConsultationPreferenceSchemaReady($pdo))
    throw new RuntimeException('fixture_consultation_schema_not_ready');
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
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,$booked),
 DomainException::class,'booking_without_customer_delivery_preference_denied');
checkService(!commerceConsultationValidChoice($sku,'IN_PERSON','TEHRAN')
    && commerceConsultationValidChoice($sku,'PHONE',null)
    && commerceConsultationValidChoice($sku,'VIDEO',null),
    'ordinary_consultation_cannot_be_booked_in_person');
$pdo->prepare('INSERT INTO commerce_consultation_preferences(order_id,sku,delivery_mode,meeting_city)
    VALUES(?,?,\'PHONE\',NULL)')->execute([$orderId,$sku]);
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,$booked),
 DomainException::class,'booking_without_explicit_owner_capacity_denied');
// Start on a Tehran wall-clock hour and contain the synthetic booking.
$tehranZone=new DateTimeZone('Asia/Tehran');
$nextHour=(new DateTimeImmutable('now',$tehranZone))->modify('+1 hour');
$capacityLocalStart=$nextHour->setTime((int)$nextHour->format('H'),0,0);
$capacityUtcStart=gmdate('Y-m-d H:i:s',$capacityLocalStart->getTimestamp());
$capacityUtcEnd=gmdate('Y-m-d H:i:s',$capacityLocalStart->getTimestamp()+2*3600);
$pdo->prepare("INSERT INTO commerce_consultation_availability(id,start_utc,end_utc,state,created_by)
 VALUES(?,?,?,'OPEN',?)")->execute([
 '11111111-1111-4111-8111-111111111195',
 $capacityUtcStart,$capacityUtcEnd,$actor
 ]);
checkService(operationsCommerceServiceAdvance($pdo,$actor,$booked)['bookingScheduled']===true,
 'booking_times_must_be_explicit');
$observed=$pdo->prepare('SELECT status,booking_start,booking_end
 FROM commerce_service_cases WHERE order_id=? AND sku=?');
$observed->execute([$orderId,$sku]);$state=$observed->fetch();
checkService($state['status']==='booked'&&$state['booking_start']===$start
  &&$state['booking_end']===$end,'booking_recorded_on_server');
$ownerView=operationsCommerceSnapshot($pdo,time());
checkService($ownerView['available']===true
    &&($ownerView['fulfilment']['customerPreferenceSchemaReady']??false)===true,
    'owner_report_uses_verified_preference_table');
$matching=null;
foreach($ownerView['fulfilment']['serviceActionQueue'] as $row){
    if($row['orderId']===$orderId&&$row['sku']===$sku){$matching=$row;break;}
}
checkService(is_array($matching)&&$matching['customerPreferenceRecorded']===true
    &&$matching['deliveryMode']==='PHONE'&&$matching['meetingCity']===null
    &&$matching['bookingStart']===$start&&$matching['bookingEnd']===$end,
    'owner_sees_buyer_selected_mode_and_confirmed_utc_slot');
$slots=$ownerView['fulfilment']['internalCalendar'];
$matches=array_values(array_filter($slots['windows'],
    static fn($r)=>$r['startUtc']===$start&&$r['endUtc']===$end));
checkService($slots['scope']==='single_owner_internal_cases_only'
    &&$slots['externalAvailabilityConfirmed']===false
    &&$slots['timeZone']==='UTC'&&count($matches)===1,
    'owner_calendar_is_real_internal_ledger_and_does_not_claim_external_capacity');
$encodedOwner=json_encode($ownerView,JSON_UNESCAPED_SLASHES);
checkService(is_string($encodedOwner)&&!str_contains($encodedOwner,'customer_email')
    &&!str_contains($encodedOwner,'customer_json')
    &&!str_contains($encodedOwner,'buyer@example.invalid'),
    'owner_calendar_keeps_buyer_identifiers_private');
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
// Two different paid, valid consultation orders must NEVER occupy the same
// owner UTC interval; a PHP lock protects booking across concurrent requests.
$overlapId='11111111-1111-4111-8111-111111111194';
$orders->execute([$overlapId,'test-overlapping',$items]);
$pdo->prepare("UPDATE commerce_orders SET provider_trans_id='77778' WHERE id=?")->execute([$overlapId]);
$pdo->prepare("INSERT INTO commerce_payment_claims
    (provider,transaction_id,order_id,verified_amount)
    VALUES('bitpay','77778',?,10000000)")->execute([$overlapId]);
$case->execute([$overlapId,$sku]);
$pdo->prepare("INSERT INTO commerce_consultation_preferences(order_id,sku,delivery_mode)
    VALUES(?,?,'VIDEO')")->execute([$overlapId,$sku]);
$other=array_merge($body,['orderId'=>$overlapId]);
checkService(operationsCommerceServiceAdvance($pdo,$actor,$other)['state']==='scheduling',
    'second_paid_buyer_enters_scheduling_only');
$overlap=array_merge($booked,['orderId'=>$overlapId,
    'bookingStart'=>gmdate('Y-m-d H:i:s',time()+5400),
    'bookingEnd'=>gmdate('Y-m-d H:i:s',time()+9000)]);
refused(fn()=>operationsCommerceServiceAdvance($pdo,$actor,$overlap),
    DomainException::class,'overlapping_owner_appointment_rejected');
$otherCase=$pdo->prepare('SELECT status,booking_start,booking_end
    FROM commerce_service_cases WHERE order_id=? AND sku=?');
$otherCase->execute([$overlapId,$sku]);$observedOther=$otherCase->fetch();
checkService($observedOther['status']==='scheduling'
    &&$observedOther['booking_start']===null
    &&$observedOther['booking_end']===null,
    'conflicting_second_booking_never_commits');
$after=operationsCommerceSnapshot($pdo,time())['fulfilment']['internalCalendar'];
checkService(count(array_filter($after['windows'],
    static fn($slot)=>$slot['startUtc']===$start&&$slot['endUtc']===$end))===1,
    'overlap_denial_preserves_original_booking');
// Owner can selectively publish only real hours, with a strict Tehran-day
// aggregate max of four hours, and the public week exposes no private IDs.
$tomorrow=(new DateTimeImmutable('tomorrow 10:00:00',new DateTimeZone('Asia/Tehran')));
$u=static fn(DateTimeImmutable $d): string=>gmdate('Y-m-d H:i:s',$d->getTimestamp());
$open=static fn(DateTimeImmutable $start,int $hours): array=>[
  'action'=>'open','windowId'=>null,'startUtc'=>$u($start),
  'endUtc'=>$u($start->modify('+'.$hours.' hours'))
];
refused(fn()=>operationsConsultationAvailabilityChange($pdo,$actor,$open($tomorrow,5)),
 InvalidArgumentException::class,'single_window_over_four_hours_denied');
$first=operationsConsultationAvailabilityChange($pdo,$actor,$open($tomorrow,2));
checkService($first['state']==='OPEN'&&$first['appointmentConfirmed']===false,
 'owner_can_publish_two_genuine_hours_without_booking');
refused(fn()=>operationsConsultationAvailabilityChange($pdo,$actor,$open($tomorrow->modify('+1 hour'),1)),
 DomainException::class,'overlapping_owner_window_denied');
$second=operationsConsultationAvailabilityChange($pdo,$actor,$open($tomorrow->modify('+4 hours'),2));
checkService($second['state']==='OPEN','owner_can_publish_second_two_hour_window');
refused(fn()=>operationsConsultationAvailabilityChange($pdo,$actor,$open($tomorrow->modify('+7 hours'),1)),
 DomainException::class,'five_hours_on_same_tehran_day_denied');
$week=operationsConsultationWeeklySnapshot($pdo,time());
checkService($week['schema']==='consultation-week-v1'
 &&$week['maxPublishedDailyHours']===4 &&$week['slotMinutes']===60
 &&$week['customerReservationEnabled']===false
 &&$week['externalCalendarConfirmed']===false
 &&count($week['days'])===7,'public_week_contract_is_explicit_and_unbooked');
$tomorrowRows=array_values(array_filter($week['days'],
 static fn($day)=>$day['date']===$tomorrow->format('Y-m-d')));
checkService(count($tomorrowRows)===1
 &&$tomorrowRows[0]['totalSlots']===4
 &&$tomorrowRows[0]['remainingSlots']===4
 &&count(array_filter($tomorrowRows[0]['slots'],static fn($s)=>$s['status']==='AVAILABLE'))===4,
 'tehran_day_four_real_available_hours_displayed');
$json=json_encode($week,JSON_UNESCAPED_SLASHES);
checkService(is_string($json)
 &&!str_contains($json,$orderId)
 &&!str_contains($json,$first['windowId'])
 &&!str_contains($json,$actor)
 &&!str_contains($json,'customer_email'),
 'public_week_does_not_expose_owner_or_customer_identifiers');
$closed=operationsConsultationAvailabilityChange($pdo,$actor,[
 'action'=>'close','windowId'=>$first['windowId'],'startUtc'=>null,'endUtc'=>null
]);
checkService($closed['state']==='CLOSED','owner_can_close_unbooked_hours');
$less=operationsConsultationWeeklySnapshot($pdo,time());
$one=array_values(array_filter($less['days'],static fn($day)=>$day['date']===$tomorrow->format('Y-m-d')));
checkService(count($one)===1&&$one[0]['remainingSlots']===2,
 'closing_unbooked_owner_hours_reduces_public_week');
refused(fn()=>operationsConsultationAvailabilityChange($pdo,$actor,[
  'action'=>'close','windowId'=>'11111111-1111-4111-8111-111111111195',
  'startUtc'=>null,'endUtc'=>null
]),DomainException::class,'owner_cannot_close_window_containing_confirmed_booking');

$pdo->exec('DROP TEMPORARY TABLE operations_audit');
echo "Service advance MySQL fixture: no real money, appointments, email or entitlement granted.\n";
