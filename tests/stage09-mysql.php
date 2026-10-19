<?php
declare(strict_types=1);
// Real concurrent InnoDB test in ISOLATED CI MySQL; NOT production Bertina.
// Reuses the established operations_fixture MySQL8 service and never touches live data.
$dsn=(string)getenv('OPERATIONS_TEST_DSN');
if(!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn))
    throw new RuntimeException('isolated_fixture_database_required');
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),(string)getenv('OPERATIONS_TEST_PASSWORD'),
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
define('BERTINA_API_BOOTSTRAPPED',true);
function localCatalog():array {
    $c=json_decode((string)file_get_contents(__DIR__.'/../assets/data/book-catalog.json'),true);
    $out=[];foreach($c['books']??[] as $b)$out['book:'.$b['id']]=['kind'=>'book'];
    return $out;
}
require __DIR__.'/../api/commerce-stage9.php';
require __DIR__.'/../api/operations-book-expiration.php';
require __DIR__.'/../api/operations-donation-recovery.php';
$GLOBALS['bookExpiryAudits']=[];
function operationsAudit(PDO $pdo, ?string $actor, string $action, string $reference): void {
    // Synthetic transaction-test recorder; production writes operations_audit.
    $GLOBALS['bookExpiryAudits'][]=[$actor,$action,$reference];
}

function checkStage9(bool $pass,string $name):void {
    if(!$pass)throw new RuntimeException('stage09_mysql_failed_'.$name);
    echo "PASS ".$name."\n";
}
function putStock(PDO $pdo,string $sku,int $onHand):void {
    $s=$pdo->prepare('INSERT INTO commerce_book_stock(sku,physical_on_hand,reserved,reconciled_at) VALUES(?,?,0,NOW()) ON DUPLICATE KEY UPDATE physical_on_hand=VALUES(physical_on_hand),reserved=0,reconciled_at=NOW()');
    $s->execute([$sku,$onHand]);
}
function pendingOrder(PDO $pdo,string $id,string $factor,string $sku):void {
    $isBook=str_starts_with($sku,'book:');
    $items=json_encode([['kind'=>$isBook?'book':'service','sku'=>$sku,'quantity'=>1,'price'=>2000000,'subtotal'=>2000000]]);
    $s=$pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,items_json,state,provider_id_get) VALUES(?,?,2000000,20000000,'IRT',?,'pending','111')");
    $s->execute([$id,$factor,$items]);
}
// Worker modes allow OS-level concurrency, separate PHP processes and separate MySQL sessions.
$mode=$argv[1]??null;
if($mode==='--reserve-worker'){
    $order=$argv[2];try{
        $pdo->beginTransaction();
        stage9ReserveBooks($pdo,$order,[['kind'=>'book','sku'=>'book:race','quantity'=>1]]);
        usleep(300000);$pdo->commit();echo "RESERVED\n";
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();echo "UNAVAILABLE\n";}
    exit;
}
if($mode==='--finalize-worker'){
    $order=$argv[2];
    try{$done=stage9FinalizePayment($pdo,$order,'111','909090','20000000','race-factor');
        echo $done?"FINALIZED\n":"REPLAY\n";
    }catch(Throwable $e){echo "ERROR\n";}exit;
}
$pdo->exec(file_get_contents(__DIR__.'/../docs/BERTINA_MYSQL_SCHEMA.sql'));
$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261012_stage09_commerce.sql'));
checkStage9(stage9SchemaReady($pdo),'additive_schema_present');
$pdo->exec('ALTER TABLE commerce_payment_claims DROP INDEX uq_payment_order');
checkStage9(!stage9SchemaReady($pdo),'missing_unique_claim_constraint_fails_closed');
$pdo->exec('ALTER TABLE commerce_payment_claims ADD UNIQUE KEY uq_payment_order(provider,order_id)');
checkStage9(stage9SchemaReady($pdo),'unique_claim_constraint_restored');
// Source runtime must fail closed if any financial table loses transactional
// row-lock/rollback semantics after an otherwise valid schema migration.
$pdo->exec('ALTER TABLE commerce_outbox ENGINE=MyISAM');
checkStage9(!stage9SchemaReady($pdo),'nontransactional_outbox_rejected');
$pdo->exec('ALTER TABLE commerce_outbox ENGINE=InnoDB');
checkStage9(stage9SchemaReady($pdo),'transactional_outbox_restored');
checkStage9(!stage9BookStockReady($pdo),'empty_live_stock_never_assumed');
foreach(['book:roshanaei'=>2,'book:tariki'=>0,'book:bonbast'=>0] as $sku=>$qty)putStock($pdo,$sku,$qty);
checkStage9(stage9BookStockReady($pdo),'all_three_reconciled_rows_required');
$a='11111111-1111-4111-8111-111111111171';$b='11111111-1111-4111-8111-111111111172';
$pdo->beginTransaction();stage9ReserveBooks($pdo,$a,[['kind'=>'book','sku'=>'book:roshanaei','quantity'=>1]]);pendingOrder($pdo,$a,'test-factor-1','book:roshanaei');$pdo->commit();
$pdo->beginTransaction();stage9ReserveBooks($pdo,$b,[['kind'=>'book','sku'=>'book:roshanaei','quantity'=>1]]);pendingOrder($pdo,$b,'test-factor-2','book:roshanaei');$pdo->commit();
checkStage9(stage9BookStockReady($pdo),'stock_matches_two_active_reservations');
$pdo->exec("UPDATE commerce_book_stock SET reserved=1 WHERE sku='book:roshanaei'");
checkStage9(!stage9BookStockReady($pdo),'stock_ledger_counter_understates_holds_rejected');
$pdo->exec("UPDATE commerce_book_stock SET reserved=2 WHERE sku='book:roshanaei'");
checkStage9(stage9BookStockReady($pdo),'restored_counter_matches_holds');
$pdo->prepare("UPDATE commerce_book_reservations SET quantity=2 WHERE order_id=? AND sku='book:roshanaei'")->execute([$b]);
checkStage9(!stage9BookStockReady($pdo),'reservation_ledger_overstates_counter_rejected');
$pdo->prepare("UPDATE commerce_book_reservations SET quantity=1 WHERE order_id=? AND sku='book:roshanaei'")->execute([$b]);
checkStage9(stage9BookStockReady($pdo),'reservation_ledger_repaired');
$pdo->beginTransaction();
try{stage9ReserveBooks($pdo,'no-stock',[['kind'=>'book','sku'=>'book:roshanaei','quantity'=>1]]);throw new RuntimeException('oversell_success');}
catch(RuntimeException $e){checkStage9($e->getMessage()==='stock_unavailable','no_oversell');$pdo->rollBack();}
checkStage9(stage9FinalizePayment($pdo,$a,'111','717171','20000000','test-factor-1'),'first_paid');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_parcels WHERE order_id='".$a."' AND state='preparing'")->fetchColumn()===1,
 'first_paid_book_creates_preparation_without_shipping_claim');
checkStage9(stage9BookStockReady($pdo),'stock_matches_remaining_reservation_after_payment');
checkStage9(stage9FinalizePayment($pdo,$a,'111','717171','20000000','test-factor-1')===false,'same_order_callback_replay');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_parcels WHERE order_id='".$a."'")->fetchColumn()===1,
 'repeated_payment_callback_never_duplicates_parcel');
try{stage9FinalizePayment($pdo,$b,'111','717171','20000000','test-factor-2');throw new RuntimeException('cross_order_replay_accepted');}
catch(PDOException $e){checkStage9(true,'cross_order_claim_unique');}
checkStage9(stage9FinalizePayment($pdo,$b,'111','727272','20000000','test-factor-2'),'second_unique_paid');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_parcels WHERE state='preparing'")->fetchColumn()===2,
 'two_distinct_paid_book_orders_two_unshipped_parcels');
$read=$pdo->query("SELECT physical_on_hand,reserved FROM commerce_book_stock WHERE sku='book:roshanaei'")->fetch();
checkStage9((int)$read['physical_on_hand']===0&&(int)$read['reserved']===0,'zero_remaining_nonnegative');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_payment_claims")->fetchColumn()===2,'claims_once');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_outbox")->fetchColumn()===2,'outbox_once');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_stock_movements WHERE reason='sale'")->fetchColumn()===2,'stock_movements_once');

function workers(array $commands):array {
    $tasks=[];
    foreach($commands as $args){
        $cmd=array_merge([PHP_BINARY,__FILE__],$args);
        $p=proc_open($cmd,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
        if(!is_resource($p))throw new RuntimeException('worker_creation_failed');
        fclose($pipes[0]);$tasks[]=[$p,$pipes];
    }
    $results=[];
    foreach($tasks as [$p,$pipes]){
        $out=trim(stream_get_contents($pipes[1]));$err=trim(stream_get_contents($pipes[2]));
        fclose($pipes[1]);fclose($pipes[2]);$code=proc_close($p);
        if($code!==0)throw new RuntimeException('worker_exit_'.$code.' '.$err);
        $results[]=$out;
    }
    return $results;
}
putStock($pdo,'book:race',1);
$result=workers([['--reserve-worker','race-a'],['--reserve-worker','race-b']]);
sort($result);
checkStage9($result===['RESERVED','UNAVAILABLE'],'two_process_atomic_stock_race');
$race=$pdo->query("SELECT physical_on_hand,reserved FROM commerce_book_stock WHERE sku='book:race'")->fetch();
checkStage9((int)$race['physical_on_hand']===1&&(int)$race['reserved']===1,'race_stock_conservation');
$id='11111111-1111-4111-8111-111111111179';
pendingOrder($pdo,$id,'race-factor','service:academic_consult_60');
$result=workers([['--finalize-worker',$id],['--finalize-worker',$id]]);
sort($result);checkStage9($result===['FINALIZED','REPLAY'],'two_process_callback_idempotency');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_outbox WHERE order_id='".$id."'")->fetchColumn()===1,'parallel_outbox_exactly_once');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_service_cases WHERE order_id='".$id."' AND status='awaiting_contact'")->fetchColumn()===1,'service_case_pending_only');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_parcels WHERE order_id='".$id."'")->fetchColumn()===0,
 'service_only_purchase_does_not_create_a_book_parcel');
// V5 owner-only operational oversight uses aggregated READ-ONLY MySQL facts
// and never leaks identifiers, email, delivery address or other customer PII.
require __DIR__.'/../api/operations-commerce.php';
$privateEmail='unpublished.customer.fixture@example.invalid';
$legacy='11111111-1111-4111-8111-111111111180';
pendingOrder($pdo,$legacy,'unreconciled-historical','service:academic_consult_60');
$pdo->prepare("UPDATE commerce_orders SET state='paid',provider_trans_id='191919',
 paid_at=NOW(),customer_email=? WHERE id=?")->execute([$privateEmail,$legacy]);
// An old paid-state row might have a fulfilment case without a matching
// authenticated Stage09 provider claim. Preserve the work item but flag it.
$pdo->prepare("INSERT INTO commerce_service_cases(order_id,sku,status)
 VALUES(?,'service:academic_consult_60','awaiting_contact')")->execute([$legacy]);
$beforeSnapshot=operationsCommerceSnapshot($pdo,time());
// Paid book worklist must be bounded, customer-private and clearly distinct
// from independently verified carrier delivery or bank settlement.
$parcelsOverview=$beforeSnapshot['fulfilment']??[];
checkStage9(($parcelsOverview['activeParcelCount']??0)===2
    && ($parcelsOverview['parcelQueueLimit']??0)===50
    && ($parcelsOverview['parcelQueueTruncated']??null)===false,
    'owner_parcel_worklist_bounded_and_complete_fixture');
checkStage9(count($parcelsOverview['parcelActionQueue']??[])===2
    && ($parcelsOverview['preparingOlderThan48Hours']??null)===0,
    'book_parcels_begin_in_preparing_state_without_false_overdue_flag');
foreach($parcelsOverview['parcelActionQueue']??[] as $parcel){
    checkStage9($parcel['providerClaimMatchesOrder']===true
        && $parcel['orderPaidState']===true
        && !array_key_exists('trackingCode',$parcel)
        && !array_key_exists('shippingAddress',$parcel)
        && !array_key_exists('customerEmail',$parcel),
        'parcel_queue_contains_paid_claim_evidence_without_customer_pii');
}
$pdo->prepare("UPDATE commerce_parcels
    SET updated_at=DATE_SUB(NOW(),INTERVAL 3 DAY) WHERE order_id=?")->execute([$a]);
$agedParcel=operationsCommerceSnapshot($pdo,time())['fulfilment'];
checkStage9(($agedParcel['preparingOlderThan48Hours']??null)===1,
    'stale_unshipped_book_requires_operator_followup');
$pdo->prepare("UPDATE commerce_parcels
    SET state='in_transit',updated_at=DATE_SUB(NOW(),INTERVAL 8 DAY)
    WHERE order_id=?")->execute([$a]);
$transit=operationsCommerceSnapshot($pdo,time())['fulfilment'];
checkStage9(($transit['inShippingOlderThan7Days']??null)===1
    && ($transit['preparingOlderThan48Hours']??null)===0,
    'stale_in_transit_book_is_distinguished_from_preparing');
$pdo->prepare("UPDATE commerce_parcels
    SET state='preparing',updated_at=NOW() WHERE order_id=?")->execute([$a]);

checkStage9($beforeSnapshot['available']===true&&$beforeSnapshot['providerBankSettlementVerified']===null,
 'owner_commerce_snapshot_readonly_no_bank_certification');
checkStage9(($beforeSnapshot['claims']['paidRowsRequiringIndependentProviderReconciliation']??null)===1,
 'historical_paid_row_without_claim_requires_review');
$pipeline=$beforeSnapshot['salesPipeline']??null;
checkStage9(is_array($pipeline)&&($pipeline['status']??'')==='INTERNAL_ORDER_LEDGER_ONLY',
 'owner_sales_pipeline_requires_readonly_ledger_evidence');
checkStage9(array_key_exists('verifiedNetRevenueToman',$pipeline) && $pipeline['verifiedNetRevenueToman']===null
 && array_key_exists('verifiedBankSettlementToman',$pipeline) && $pipeline['verifiedBankSettlementToman']===null
 && array_key_exists('verifiedRefundDisbursementsToman',$pipeline) && $pipeline['verifiedRefundDisbursementsToman']===null,
 'internal_gateway_claims_never_fabricate_settled_revenue');
checkStage9(($pipeline['currencyUnit']??'')==='toman'
 && ctype_digit((string)($pipeline['paidStateAmountToman']??''))
 && ctype_digit((string)($pipeline['providerClaimMatchedAmountToman']??'')),
 'internal_paid_amounts_are_nonnegative_decimal_strings');
checkStage9((int)$pipeline['paidStateAmountToman']>(int)$pipeline['providerClaimMatchedAmountToman']
 && (int)$pipeline['providerClaimMatchedOrderCount']>=1,
 'historical_unmatched_paid_order_excluded_from_provider_claim_amount');
checkStage9(($pipeline['paidStateOrdersLast30Days']??0)>=4
 && ($pipeline['refundRequestsAwaitingAction']??null)===0,
 'recent_paid_orders_do_not_imply_bank_settlement_or_refunds');
$pendingAge='11111111-1111-4111-8111-111111111181';
pendingOrder($pdo,$pendingAge,'ageing-test-factor','service:academic_consult_60');
$pdo->prepare("UPDATE commerce_orders SET created_at=DATE_SUB(NOW(),INTERVAL 8 DAY)
 WHERE id=?")->execute([$pendingAge]);
// Independent, synthetic stale book hold: never use live gateway credentials.
$staleBook='11111111-1111-4111-8111-111111111183';
putStock($pdo,'book:tariki',1);
$pdo->beginTransaction();
stage9ReserveBooks($pdo,$staleBook,[['kind'=>'book','sku'=>'book:tariki','quantity'=>1]]);
pendingOrder($pdo,$staleBook,'synthetic-stale-book-factor','book:tariki');
$pdo->commit();
$pdo->prepare("UPDATE commerce_orders SET created_at=DATE_SUB(NOW(),INTERVAL 2 DAY)
 WHERE id=?")->execute([$staleBook]);
$refundId='11111111-1111-4111-8111-111111111182';
$pdo->prepare("INSERT INTO commerce_refund_requests(id,order_id,requester_account_id,status,reason_code)
 VALUES(?,?,?,'requested','fixture_review')")->execute([$refundId,$legacy,$refundId]);
$aged=operationsCommerceSnapshot($pdo,time())['salesPipeline'];
checkStage9(($aged['pendingBookOrdersWithReservationsOlderThan24Hours']??null)===1
 && ($aged['pendingBookUnitsReservedOlderThan24Hours']??null)===1
 && ($aged['unpaidOrderBookUnitsReserved']??0)>=1,
 'stale_pending_book_hold_visible_without_bank_certification');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_book_reservations
 WHERE order_id='$staleBook' AND state='reserved'")->fetchColumn()===1,
 'read_only_audit_must_never_release_stale_book_hold');
checkStage9(($aged['pendingOlderThan24Hours']??0)>=1
 && ($aged['pendingOlderThan7Days']??0)>=1
 && ($aged['refundRequestsAwaitingAction']??null)===1,
 'old_pending_orders_and_refund_backlog_are_private_operational_signals');
$pdo->prepare('DELETE FROM commerce_refund_requests WHERE id=?')->execute([$refundId]);
$pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$pendingAge]);
// A payment callback and an administrative 24h cancellation lock the same
// order row and cannot both commit. No gateway call is mocked as real evidence.
$bookOwner='11111111-1111-4111-8111-111111111199';
$preCancelStock=$pdo->query("SELECT reserved FROM commerce_book_stock WHERE sku='book:tariki'")->fetchColumn();
checkStage9((int)$preCancelStock===1,'stale_book_held_before_operator_confirmation');
$wrongReference=false;
try{jrExpireVerifiedUnpaidBook($pdo,$staleBook,'222',$bookOwner,'cancelled');}
catch(DomainException $e){$wrongReference=$e->getMessage()==='gateway_reference_mismatch';}
checkStage9($wrongReference,'stale_book_gateway_reference_must_match');
checkStage9((int)$pdo->query("SELECT reserved FROM commerce_book_stock WHERE sku='book:tariki'")->fetchColumn()===1,
 'wrong_gateway_reference_cannot_release_stock');
$under24='11111111-1111-4111-8111-111111111184';
putStock($pdo,'book:bonbast',1);
$pdo->beginTransaction();
stage9ReserveBooks($pdo,$under24,[['kind'=>'book','sku'=>'book:bonbast','quantity'=>1]]);
pendingOrder($pdo,$under24,'recent-book-factor','book:bonbast');
$pdo->commit();
$tooEarly=false;
try{jrExpireVerifiedUnpaidBook($pdo,$under24,'111',$bookOwner,'cancelled');}
catch(DomainException $e){$tooEarly=$e->getMessage()==='payment_window_still_open';}
checkStage9($tooEarly,'book_cannot_expire_before_24_hours');
checkStage9((int)$pdo->query("SELECT reserved FROM commerce_book_stock WHERE sku='book:bonbast'")->fetchColumn()===1,
 'nonexpired_book_stock_still_held');
$bookExpired=jrExpireVerifiedUnpaidBook($pdo,$staleBook,'111',$bookOwner,'cancelled');
checkStage9(($bookExpired['state']??null)==='cancelled'
 &&($bookExpired['reserveReleased']??false)===true,
 'verified_terminally_failed_book_expires_after_24_hours');
checkStage9((int)$pdo->query("SELECT reserved FROM commerce_book_stock WHERE sku='book:tariki'")->fetchColumn()===0,
 'book_expiry_releases_exactly_one_reserved_unit');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_stock_movements WHERE order_id='$staleBook' AND reason='release'")->fetchColumn()===1,
 'book_expiry_records_one_release_movement');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_book_reservations WHERE order_id='$staleBook' AND state='released'")->fetchColumn()===1,
 'book_expiry_marks_the_reservation_released');
checkStage9((string)$pdo->query("SELECT state FROM commerce_orders WHERE id='$staleBook'")->fetchColumn()==='cancelled',
 'book_expiry_preserves_cancelled_order_history');
checkStage9(count($GLOBALS['bookExpiryAudits'])===1
 && $GLOBALS['bookExpiryAudits'][0][1]==='book_expired_provider_cancelled',
 'book_expiry_is_owner_audited_once');
$again=false;
try{jrExpireVerifiedUnpaidBook($pdo,$staleBook,'111',$bookOwner,'cancelled');}
catch(DomainException $e){$again=$e->getMessage()==='order_not_pending';}
checkStage9($again,'book_expiry_replay_rejected');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_stock_movements WHERE order_id='$staleBook' AND reason='release'")->fetchColumn()===1,
 'replay_never_releases_stock_twice');
$callbackLate=stage9FinalizePayment($pdo,$staleBook,'111','888888','20000000','synthetic-stale-book-factor');
checkStage9($callbackLate===false,'late_callback_cannot_resurrect_cancelled_order');
// Fixture cleanup only. NEVER write or delete real customer orders.
// Unexpired pending order remains HELD until its synthetic fixture cleanup;
// release its hold transactionally before removing fixture rows.
$pdo->beginTransaction();
stage9ReleaseBooks($pdo,$under24);
$pdo->commit();
$pdo->prepare('DELETE FROM commerce_book_reservations WHERE order_id IN (?,?)')
 ->execute([$staleBook,$under24]);
$pdo->prepare('DELETE FROM commerce_stock_movements WHERE order_id IN (?,?)')
 ->execute([$staleBook,$under24]);
$pdo->prepare('DELETE FROM commerce_orders WHERE id IN (?,?)')->execute([$staleBook,$under24]);
checkStage9(stage9BookStockReady($pdo),'fixture_cleanup_keeps_existing_stock_ledger_consistent');
checkStage9(($beforeSnapshot['stock']['ledgerDiscrepancies']??null)===0,
 'owner_commerce_snapshot_stock_consistent');
checkStage9(($beforeSnapshot['orders']['paidStateRecords']??0)>=4,
 'owner_commerce_snapshot_paid_counts_are_aggregate');
checkStage9(($beforeSnapshot['notifications']['paidOrderRowsWithoutReceiptEmailTimestamp']??0)>=1,
 'owner_commerce_snapshot_missing_mail_timestamp_is_not_delivery_claim');
$serialized=json_encode($beforeSnapshot);
checkStage9(is_string($serialized)&&!str_contains($serialized,$privateEmail)&&
 !str_contains($serialized,'customer_email')&&!str_contains($serialized,'customer_json'),
 'owner_commerce_snapshot_never_exposes_customer_personal_details');
$worklist=$beforeSnapshot['fulfilment'];
checkStage9(($worklist['activeServiceCaseCount']??0)===2 &&
 count($worklist['serviceActionQueue']??[])===2,
 'owner_service_worklist_shows_real_pending_cases');
$caseProof=[];
foreach($worklist['serviceActionQueue'] as $case)$caseProof[$case['orderId']]=$case['providerClaimMatchesOrder'];
checkStage9(($caseProof[$id]??false)===true &&
 ($caseProof[$legacy]??true)===false,
 'owner_service_worklist_distinguishes_claim_matched_from_legacy_unverified');
checkStage9(($worklist['queueTruncated']??true)===false &&
 ($worklist['queueLimit']??0)===50,
 'owner_service_worklist_bounded_metadata_reported');
$caseInsert=$pdo->prepare("INSERT INTO commerce_service_cases(order_id,sku,status)
 VALUES(?,?,'awaiting_contact')");
for($i=0;$i<54;$i++)$caseInsert->execute([$legacy,'service:test-'.str_pad((string)$i,2,'0',STR_PAD_LEFT)]);
$bounded=operationsCommerceSnapshot($pdo,time())['fulfilment'];
checkStage9(($bounded['activeServiceCaseCount']??null)===56 &&
 count($bounded['serviceActionQueue']??[])===50 && $bounded['queueTruncated']===true,
 'owner_service_worklist_caps_at_fifty_without_losing_count');
$pdo->exec("UPDATE commerce_book_stock SET reserved=0 WHERE sku='book:race'");
$driftSnapshot=operationsCommerceSnapshot($pdo,time());
checkStage9(($driftSnapshot['stock']['ledgerDiscrepancies']??null)===1,
 'owner_commerce_snapshot_flags_ledger_discrepancy');
$pdo->exec("UPDATE commerce_book_stock SET reserved=1 WHERE sku='book:race'");
checkStage9(stage9BookStockReady($pdo),
 'isolated_stock_restored_without_inventory_reseed');
$pdo->prepare('DELETE FROM commerce_service_cases WHERE order_id=?')->execute([$legacy]);
$pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$legacy]);
// Donation with interrupted callback: simulated gateway result only, never
// real payment, credential, outgoing BitPay request, or production customer.
$donationId='11111111-1111-4111-8111-111111111185';
$donationFactor='777777888888';
$donationItems=json_encode([['sku'=>'support:students','title'=>'Synthetic student support',
    'kind'=>'donation','quantity'=>1,'price'=>1000,'subtotal'=>1000]]);
$insertDonation=$pdo->prepare("INSERT INTO commerce_orders
 (id,factor_id,amount_toman,provider_amount,currency,items_json,state,provider_id_get)
 VALUES(?,?,1000,10000,'IRT',?,'pending','987654')");
$insertDonation->execute([$donationId,$donationFactor,$donationItems]);
$providerCalls=0;
$providerCheck=static function(string $transaction,string $idGet)use(&$providerCalls,$donationFactor):array{
    $providerCalls++;
    if($transaction!=='606060'||$idGet!=='987654')
        throw new RuntimeException('unexpected_synthetic_provider_identity');
    return ['status'=>1,'amount'=>10000,'factorId'=>$donationFactor];
};
$wrongGateway=false;
try{jrRecoverPendingVerifiedDonation($pdo,$donationId,'876543','606060',$providerCheck);}
catch(DomainException $e){$wrongGateway=$e->getMessage()==='donation_gateway_id_mismatch';}
checkStage9($wrongGateway && $providerCalls===0,
 'donation_recovery_rejects_wrong_gateway_before_network');
foreach([
    ['status'=>0,'amount'=>10000,'factorId'=>$donationFactor],
    ['status'=>1,'amount'=>11000,'factorId'=>$donationFactor],
    ['status'=>1,'amount'=>10000,'factorId'=>'99999999999'],
] as $invalid){
    $badProvider=false;
    try{jrRecoverPendingVerifiedDonation($pdo,$donationId,'987654','606060',
        static fn(string $t,string $g):array=>$invalid);}
    catch(DomainException $e){$badProvider=$e->getMessage()==='donation_provider_verification_failed';}
    checkStage9($badProvider,'donation_recovery_fails_closed_on_invalid_verified_values');
}
checkStage9((string)$pdo->query("SELECT state FROM commerce_orders WHERE id='$donationId'")->fetchColumn()==='pending'
 &&(int)$pdo->query("SELECT COUNT(*) FROM commerce_payment_claims WHERE order_id='$donationId'")->fetchColumn()===0,
 'rejected_donation_verification_never_writes_money');
$recovered=jrRecoverPendingVerifiedDonation($pdo,$donationId,'987654','606060',$providerCheck);
checkStage9(($recovered['state']??null)==='paid'
 &&($recovered['providerClaimRecorded']??false)===true
 &&($recovered['secondChargeInitiated']??true)===false && $providerCalls===1,
 'donation_recovery_only_records_genuine_provider_verified_callback');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_payment_claims WHERE order_id='$donationId'")->fetchColumn()===1
 &&(int)$pdo->query("SELECT COUNT(*) FROM commerce_outbox WHERE order_id='$donationId'")->fetchColumn()===1,
 'recovered_donation_creates_claim_and_outbox_exactly_once');
$donationReplay=false;
try{jrRecoverPendingVerifiedDonation($pdo,$donationId,'987654','606060',$providerCheck);}
catch(DomainException $e){$donationReplay=$e->getMessage()==='donation_order_not_pending';}
checkStage9($donationReplay && $providerCalls===1,
 'recovered_donation_replay_rejected_without_second_gateway_call');
checkStage9(stage9FinalizePayment($pdo,$donationId,'987654','606060','10000',$donationFactor)===false,
 'late_public_callback_after_recovery_is_idempotent');
$wrongType='11111111-1111-4111-8111-111111111186';
pendingOrder($pdo,$wrongType,'333333444444','service:academic_consult_60');
$rejectWrongType=false;
try{jrRecoverPendingVerifiedDonation($pdo,$wrongType,'111','123456',
    static fn(string $t,string $g):array=>['status'=>1,'amount'=>20000000,'factorId'=>'333333444444']);}
catch(DomainException $e){$rejectWrongType=$e->getMessage()==='donation_only_recovery';}
checkStage9($rejectWrongType,'donation_recovery_cannot_activate_service_orders');
$pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$wrongType]);
// Do not delete real financial records; all transactions above use isolated
// MySQL fixture data and should remain audited within the test output.
echo "Stage09 MySQL8 multi-process acceptance passed (CI only, no bank/physical inventory evidence).\n";
