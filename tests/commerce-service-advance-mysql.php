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
require_once __DIR__.'/../api/operations-service-delivery.php';
require_once __DIR__.'/../api/service-files.php';
require_once __DIR__.'/../api/service-intake.php';
require_once __DIR__.'/../api/operations-commerce.php';
// Catalogue stub is restricted to the one fictitious service used by this CI fixture.
function localCatalog(): array {
    return ['service:academic_consult_60'=>['kind'=>'service','price'=>1000000]];
}
function cfg(): array { return ['auth_pepper'=>str_repeat('fixture-strong-pepper-',3)]; }
function validEmail(string $v): bool { return strlen($v)<=254 && filter_var($v,FILTER_VALIDATE_EMAIL)!==false; }
function textLen(string $v): int { return function_exists('mb_strlen')?mb_strlen($v,'UTF-8'):strlen($v); }
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
$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261016_owner_attested_service_delivery.sql'));
$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261017_private_service_files.sql'));

$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261016_private_service_intake.sql'));

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
    && commerceConsultationValidChoice($sku,'VIDEO',null)
     && commerceConsultationValidChoice($sku,'VOICE',null),
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
// Use the day after tomorrow: the earlier synthetic booking may cross Tehran midnight.
// Keep daily-budget tests independent of that separate booking fixture.
$tomorrow=(new DateTimeImmutable('tomorrow 10:00:00',new DateTimeZone('Asia/Tehran')))->modify('+1 day');
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
$nextBooked=array_merge($booked,[
 'orderId'=>$overlapId,
 'bookingStart'=>$u($tomorrow),
 'bookingEnd'=>$u($tomorrow->modify('+1 hour'))
]);
checkService(operationsCommerceServiceAdvance($pdo,$actor,$nextBooked)['bookingScheduled']===true,
 'paid_second_booking_inside_declared_owner_capacity');
$afterBooking=operationsConsultationWeeklySnapshot($pdo,time());
$afterRows=array_values(array_filter($afterBooking['days'],
 static fn($day)=>$day['date']===$tomorrow->format('Y-m-d')));
checkService(count($afterRows)===1
 &&$afterRows[0]['totalSlots']===4
 &&$afterRows[0]['remainingSlots']===3
 &&count(array_filter($afterRows[0]['slots'],static fn($s)=>$s['status']==='FULL'))===1,
 'genuine_one_hour_booking_turns_exactly_one_public_hour_red');
refused(fn()=>operationsConsultationAvailabilityChange($pdo,$actor,[
 'action'=>'close','windowId'=>$first['windowId'],'startUtc'=>null,'endUtc'=>null
]),DomainException::class,'owner_cannot_close_capacity_supporting_confirmed_booking');
$closed=operationsConsultationAvailabilityChange($pdo,$actor,[
 'action'=>'close','windowId'=>$second['windowId'],'startUtc'=>null,'endUtc'=>null
]);
checkService($closed['state']==='CLOSED','owner_can_close_unbooked_hours');
$less=operationsConsultationWeeklySnapshot($pdo,time());
$one=array_values(array_filter($less['days'],static fn($day)=>$day['date']===$tomorrow->format('Y-m-d')));
checkService(count($one)===1&&$one[0]['totalSlots']===2
 &&$one[0]['remainingSlots']===1,
 'closing_unbooked_owner_hours_updates_real_remaining_slot_count');
refused(fn()=>operationsConsultationAvailabilityChange($pdo,$actor,[
  'action'=>'close','windowId'=>'11111111-1111-4111-8111-111111111195',
  'startUtc'=>null,'endUtc'=>null
]),DomainException::class,'owner_cannot_close_window_containing_confirmed_booking');

// Additive, isolated source-integration exercise: owner attestation and
// matching provider claim, never a real gateway transaction or delivery.
checkService(operationsServiceDeliveryEvidenceReady($pdo),
 'owner_evidence_schema_innodb_ready');
$attestation=[
 'orderId'=>$orderId,'sku'=>$sku,'expectedState'=>'in_progress',
 'evidenceKind'=>'document_handed_over',
 'evidenceReference'=>'11111111-1111-4111-8111-111111111197','ownerConfirmed'=>true
];
refused(fn()=>operationsCommerceRecordDelivery($pdo,$actor,$attestation),
 DomainException::class,'booked_future_service_cannot_pretend_delivered');
refused(fn()=>operationsCommerceRecordDelivery($pdo,$actor,
 array_merge($attestation,['ownerConfirmed'=>false])),
 InvalidArgumentException::class,'no_owner_attestation_denied');
refused(fn()=>operationsCommerceRecordDelivery($pdo,$actor,
 array_merge($attestation,['evidenceReference'=>'abc'])),
 InvalidArgumentException::class,'evidence_reference_must_be_traceable');
$documentOrder='11111111-1111-4111-8111-111111111196';
$orders->execute([$documentOrder,'test-document-delivery',$items]);
$pdo->prepare("UPDATE commerce_orders SET provider_trans_id='77779' WHERE id=?")
 ->execute([$documentOrder]);
$pdo->prepare("INSERT INTO commerce_payment_claims
  (provider,transaction_id,order_id,verified_amount)
  VALUES('bitpay','77779',?,10000000)")->execute([$documentOrder]);
$pdo->prepare("INSERT INTO commerce_service_cases(order_id,sku,status)
 VALUES(?,?,'in_progress')")->execute([$documentOrder,$sku]);
$validDocument=array_merge($attestation,['orderId'=>$documentOrder]);
checkService(jrServiceFilesSchemaReady($pdo),'private_service_file_schema_ready');
refused(fn()=>operationsCommerceRecordDelivery($pdo,$actor,$validDocument),
 DomainException::class,'document_delivery_without_registered_file_denied');
$privateDir=sys_get_temp_dir().'/jr-service-fixture-'.bin2hex(random_bytes(7));
if(!mkdir($privateDir,0700)||!chmod($privateDir,0700))
    throw new RuntimeException('private_service_fixture_storage_unavailable');
putenv('JR_SERVICE_PRIVATE_STORAGE='.$privateDir);
$documentPlain='%PDF-1.7'.str_repeat(' private synthetic CI academic document',9);
$docCipher=jrServiceFileEncrypt($documentPlain,$documentOrder,$sku);
$storageName=str_repeat('a',48).'.blob';
if(file_put_contents($privateDir.'/'.$storageName,$docCipher,LOCK_EX)!==strlen($docCipher))
    throw new RuntimeException('private_doc_fixture_unwritable');
chmod($privateDir.'/'.$storageName,0600);
$pdo->prepare("INSERT INTO commerce_service_files
  (id,order_id,sku,kind,uploader_account_id,storage_name,file_extension,
  mime_type,plaintext_size,content_sha256,consent_version,subject_is_minor,guardian_acknowledged)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
 ->execute([$validDocument['evidenceReference'],$documentOrder,$sku,'professional_output',
  $actor,$storageName,'pdf','application/pdf',strlen($documentPlain),
  hash('sha256',$documentPlain),'OWNER_DELIVERABLE_V1',0,0]);
checkService(jrServiceFileDecrypt($docCipher,$documentOrder,$sku)===$documentPlain,
 'private_service_file_aead_roundtrip');
// An internal draft in the same case must NEVER be visible to the buyer
// merely because the owner attested delivery of another finished document.
$draftId='11111111-1111-4111-8111-111111111198';
$draftName=str_repeat('b',48).'.blob';
$draftPlain='%PDF-1.7'.str_repeat(' unapproved internal draft CI fixture',10);
$draftCipher=jrServiceFileEncrypt($draftPlain,$documentOrder,$sku);
if(file_put_contents($privateDir.'/'.$draftName,$draftCipher,LOCK_EX)!==strlen($draftCipher))
    throw new RuntimeException('private_draft_fixture_unwritable');
chmod($privateDir.'/'.$draftName,0600);
$pdo->prepare("INSERT INTO commerce_service_files
 (id,order_id,sku,kind,uploader_account_id,storage_name,file_extension,
 mime_type,plaintext_size,content_sha256,consent_version,subject_is_minor,guardian_acknowledged)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
 ->execute([$draftId,$documentOrder,$sku,'professional_output',$actor,
 $draftName,'pdf','application/pdf',strlen($draftPlain),hash('sha256',$draftPlain),
 'OWNER_DELIVERABLE_V1',0,0]);
refused(fn()=>jrServiceFileDecrypt($docCipher,$orderId,$sku),
 RuntimeException::class,'encrypted_document_cannot_be_reused_for_other_order');

$complete=operationsCommerceRecordDelivery($pdo,$actor,$validDocument);
$released=jrServiceFileReleasedDigest($pdo,$documentOrder,$sku,'delivered');
checkService(jrServiceFileMatchesRelease($released,$documentOrder,$sku,$validDocument['evidenceReference']),
 'only_document_attested_with_real_file_is_released');
checkService(!jrServiceFileMatchesRelease($released,$documentOrder,$sku,$draftId),
 'unapproved_draft_in_same_delivered_case_remains_private');
checkService(jrServiceFileReleasedDigest($pdo,$documentOrder,$sku,'in_progress')===null,
 'uncompleted_case_has_no_customer_release');
checkService(jrServiceFileReleasedDigest($pdo,$wrongId,$sku,'delivered')===null,
 'case_without_document_evidence_cannot_release_output');
checkService(($complete['state']??'')==='delivered'
 &&$complete['deliveryRecordedByOwner']===true
 &&$complete['customerNotified']===false
 &&$complete['providerBankSettlementVerified']===null,
 'verified_owner_can_record_actual_evidenced_document_handover');
$evidence=$pdo->query("SELECT evidence_kind,evidence_reference_hmac,owner_account_id
 FROM commerce_service_delivery_evidence WHERE order_id='".$documentOrder."'")->fetch();
checkService(is_array($evidence)
 &&$evidence['owner_account_id']===$actor
 &&$evidence['evidence_kind']==='document_handed_over'
 &&preg_match('/^[a-f0-9]{64}$/D',$evidence['evidence_reference_hmac'])===1
 &&$evidence['evidence_reference_hmac']!==$validDocument['evidenceReference'],
 'raw_evidence_reference_never_stored');
$state=$pdo->query("SELECT status,delivered_at FROM commerce_service_cases WHERE order_id='"
 .$documentOrder."'")->fetch();
checkService($state['status']==='delivered'&&!empty($state['delivered_at']),
 'customer_fulfilment_projection_sees_owner_attested_delivery');
refused(fn()=>operationsCommerceRecordDelivery($pdo,$actor,$validDocument),
 DomainException::class,'delivery_replay_cannot_change_completed_case');

// AES-256-GCM buyer service brief: verified account, immutable paid claim,
// optimistic version, real service case and operator-only source protection.
checkService(jrServiceIntakeSchemaReady($pdo),'service_intake_innodb_schema_ready');
$intakeEmail='buyer@example.invalid';
$pdo->prepare('UPDATE commerce_orders SET customer_email=? WHERE id=?')
    ->execute([$intakeEmail,$orderId]);
checkService(jrServiceIntakeOwned($pdo,$orderId,$sku,$intakeEmail),
    'verified_email_owns_exact_order_and_service');
checkService(!jrServiceIntakeOwned($pdo,$orderId,$sku,'outsider@example.invalid'),
    'other_customer_cannot_read_service_brief');
$brief=[
 'orderId'=>$orderId,'sku'=>$sku,'expectedRevision'=>0,
 'subject'=>'Language learning progress review',
 'background'=>'Current evidence includes classroom observations and dated learning activities.',
 'objectives'=>'Obtain an evidence-grounded set of actionable learning recommendations.',
 'isMinor'=>false,'guardianAcknowledged'=>false,'privacyAcknowledged'=>true
];
refused(fn()=>jrServiceIntakeSave($pdo,'outsider@example.invalid',$actor,$brief),
 DomainException::class,'client_cannot_save_to_other_email');
refused(fn()=>jrServiceIntakeSave($pdo,$intakeEmail,$actor,
    array_merge($brief,['isMinor'=>true])),InvalidArgumentException::class,
    'minor_requires_guardian_acknowledgment');
refused(fn()=>jrServiceIntakeSave($pdo,$intakeEmail,$actor,
    array_merge($brief,['privacyAcknowledged'=>false])),InvalidArgumentException::class,
    'no_consent_no_saved_service_brief');
refused(fn()=>jrServiceIntakeSave($pdo,$intakeEmail,$actor,
    array_merge($brief,['unexpected'=>true])),InvalidArgumentException::class,
    'service_intake_ignores_no_extra_fields');
$firstBrief=jrServiceIntakeSave($pdo,$intakeEmail,$actor,$brief);
checkService($firstBrief['saved']===true&&$firstBrief['revision']===1
    &&$firstBrief['filesUploaded']===false
    &&$firstBrief['customerNotified']===false,
    'paid_buyer_can_save_encrypted_service_brief');
$readBrief=jrServiceIntakeRead($pdo,$orderId,$sku);
checkService($readBrief['revision']===1
    &&$readBrief['intake']['subject']===$brief['subject']
    &&$readBrief['intake']['background']===$brief['background'],
    'authorised_private_intake_decrypt_roundtrip');
$stored=$pdo->prepare('SELECT payload_ciphertext FROM commerce_service_intakes
 WHERE order_id=? AND sku=?');$stored->execute([$orderId,$sku]);$encrypted=$stored->fetchColumn();
checkService(is_string($encrypted)&&$encrypted!==$brief['background']
    &&!str_contains($encrypted,'classroom observations')
    &&strlen($encrypted)>100,'database_holds_only_ciphertext');
refused(fn()=>jrServiceIntakeSave($pdo,$intakeEmail,$actor,$brief),
 DomainException::class,'stale_intake_revision_denied');
$brief2=array_merge($brief,['expectedRevision'=>1,
    'objectives'=>'Clarify the next learning steps with reflective and measurable criteria.']);
$secondBrief=jrServiceIntakeSave($pdo,$intakeEmail,$actor,$brief2);
checkService($secondBrief['revision']===2
    &&jrServiceIntakeRead($pdo,$orderId,$sku)['intake']['objectives']===$brief2['objectives'],
    'intake_edit_uses_revision_lock');
$stored->execute([$orderId,$sku]);
checkService($stored->fetchColumn()!==$encrypted,
    'aead_ciphertext_rotates_per_saved_revision');
$pdo->prepare('UPDATE commerce_orders SET customer_email=? WHERE id=?')
    ->execute([$intakeEmail,$documentOrder]);
refused(fn()=>jrServiceIntakeSave($pdo,$intakeEmail,$actor,
    array_merge($brief,['orderId'=>$documentOrder])),
 DomainException::class,'delivered_case_cannot_silently_replace_intake');

@unlink($privateDir.'/'.$storageName);@unlink($privateDir.'/'.$draftName);@rmdir($privateDir);
putenv('JR_SERVICE_PRIVATE_STORAGE');
$pdo->exec('DROP TEMPORARY TABLE operations_audit');
echo "Service advance MySQL fixture: no real money, appointments, email or entitlement granted.\n";
