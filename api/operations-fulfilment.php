<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Stage09 service follow-up: a privileged, human-initiated state transition.
 * Owner session, recent TOTP, same-origin CSRF and rate limits are enforced by
 * operationsRoute BEFORE invoking this function. Neither API nor UI can create
 * an appointment, notify a customer or certify delivery automatically.
 */
function operationsCommerceServiceAdvance(PDO $pdo,string $actor,array $input): array {
    if(array_keys($input)!==['orderId','sku','expectedState','nextState','bookingStart','bookingEnd'])
        throw new InvalidArgumentException('exact_request_shape_required');
    foreach(['orderId','sku','expectedState','nextState'] as $key){
        if(!is_string($input[$key]))throw new InvalidArgumentException('invalid_field_type');
    }
    $orderId=$input['orderId'];$sku=$input['sku'];
    $expected=$input['expectedState'];$next=$input['nextState'];
    if(!validUuid($orderId)||!validUuid($actor)
        ||!preg_match('/^(?:service|vip):[a-z0-9_-]{1,60}$/D',$sku))
        throw new InvalidArgumentException('invalid_reference');
    $steps=['awaiting_contact'=>'scheduling','scheduling'=>'booked',
            'booked'=>'in_progress'];
    if(!array_key_exists($expected,$steps)||$steps[$expected]!==$next)
        throw new InvalidArgumentException('unsafe_service_transition');
    $start=$input['bookingStart'];$end=$input['bookingEnd'];
    if($next==='booked'){
        if(!is_string($start)||!is_string($end))throw new InvalidArgumentException('booking_time_required');
        $parse=static function(string $v): ?DateTimeImmutable {
            if(!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/D',$v))return null;
            $dt=DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',$v,new DateTimeZone('UTC'));
            return $dt instanceof DateTimeImmutable && $dt->format('Y-m-d H:i:s')===$v ? $dt : null;
        };
        $from=$parse($start);$to=$parse($end);
        if(!$from||!$to||$to<=$from||$from->getTimestamp()<=time()
            ||$to->getTimestamp()-$from->getTimestamp()>86400)
            throw new InvalidArgumentException('invalid_booking_range_utc');
    } elseif($start!==null||$end!==null) {
        throw new InvalidArgumentException('booking_time_not_allowed');
    }
    if(!function_exists('stage9SchemaReady')||!stage9SchemaReady($pdo))
        throw new RuntimeException('stage09_schema_unavailable');
    // Bertina Stage09 has no resource/consultant assignment column yet.
    // Until a per-consultant availability ledger is activated, all paid
    // consultation slots share one conservative owner calendar. Avoid
    // double-booking instead of inventing multi-provider capacity.
    $bookingLock=false;
    if($next==='booked'){
        $seconds=$to->getTimestamp()-$from->getTimestamp();
        if($seconds<15*60||$seconds>4*3600||$from->getTimestamp()>time()+90*86400)
            throw new InvalidArgumentException('booking_duration_or_horizon_invalid');
        $lock=$pdo->query("SELECT GET_LOCK('jr_stage09_owner_booking_v1',5)")->fetchColumn();
        if((int)$lock!==1)throw new DomainException('booking_calendar_busy');
        $bookingLock=true;
    }
    try {
        if(!$pdo->beginTransaction())throw new RuntimeException('commerce_transaction_required');
        // Row lock serialises overlapping attempts; the order's payment must
        // be independently matched to its immutable captured provider claim.
        $s=$pdo->prepare("SELECT o.state,o.currency,o.paid_at,o.provider_trans_id,o.provider_amount,
                c.transaction_id AS claim_transaction,c.verified_amount AS claim_amount
            FROM commerce_orders o
            LEFT JOIN commerce_payment_claims c
                ON c.order_id=o.id AND c.provider='bitpay'
            WHERE o.id=? FOR UPDATE");
        $s->execute([$orderId]);$order=$s->fetch(PDO::FETCH_ASSOC);
        if(!is_array($order)||$order['state']!=='paid'||$order['currency']!=='IRT'
            ||empty($order['paid_at'])||$order['claim_transaction']===null
            ||!hash_equals((string)$order['provider_trans_id'],(string)$order['claim_transaction'])
            ||(string)$order['provider_amount']!==(string)$order['claim_amount'])
            throw new DomainException('paid_provider_claim_required');
        $s=$pdo->prepare("SELECT status,booking_start,booking_end
            FROM commerce_service_cases WHERE order_id=? AND sku=? FOR UPDATE");
        $s->execute([$orderId,$sku]);$case=$s->fetch(PDO::FETCH_ASSOC);
        if(!is_array($case)||$case['status']!==$expected)
            throw new DomainException('service_state_conflict');
        if($expected==='booked' && (empty($case['booking_start'])||empty($case['booking_end'])))
            throw new DomainException('verified_booking_window_required');
        if($next==='booked'){
            if(!commerceConsultationPreferenceSchemaReady($pdo))
                throw new RuntimeException('consultation_preference_schema_required');
            $choice=$pdo->prepare('SELECT delivery_mode,meeting_city
                FROM commerce_consultation_preferences
                WHERE order_id=? AND sku=? FOR UPDATE');
            $choice->execute([$orderId,$sku]);
            $selected=$choice->fetch(PDO::FETCH_ASSOC);
            if(!is_array($selected)
                ||!commerceConsultationValidChoice($sku,(string)$selected['delivery_mode'],
                    $selected['meeting_city']===null?null:(string)$selected['meeting_city']))
                throw new DomainException('customer_delivery_choice_required');
            // Explicit owner-authored internal capacity is mandatory, never
            // inferred from a gap between bookings or an external calendar.
            if (!function_exists('operationsConsultationWithinCapacity')
                ||!operationsConsultationWithinCapacity($pdo,$start,$end))
                throw new DomainException('verified_owner_capacity_required');
            // Lock serialises reservation attempts across different orders.
            // Half-open UTC intervals permit back-to-back appointments but
            // reject any overlap, including another SKU of the same order.
            $conflict=$pdo->prepare("SELECT order_id FROM commerce_service_cases
                WHERE status IN ('booked','in_progress')
                  AND booking_start<? AND booking_end>? LIMIT 1");
            $conflict->execute([$end,$start]);
            if($conflict->fetchColumn()!==false)
                throw new DomainException('booking_time_conflict');
            $q=$pdo->prepare("UPDATE commerce_service_cases
                SET status='booked',booking_start=?,booking_end=?
                WHERE order_id=? AND sku=? AND status='scheduling'");
            $q->execute([$start,$end,$orderId,$sku]);
        }else{
            $q=$pdo->prepare('UPDATE commerce_service_cases SET status=?
                WHERE order_id=? AND sku=? AND status=?');
            $q->execute([$next,$orderId,$sku,$expected]);
        }
        if($q->rowCount()!==1)throw new DomainException('service_state_conflict');
        // Audit contains no customer PII, appointment data or notes. Its
        // bounded reference binds order+SKU+before/after without leaking SKU.
        $reference=$orderId.'-'.substr(hash('sha256',$sku.'|'.$expected.'|'.$next),0,20);
        operationsAudit($pdo,$actor,'commerce_service_advance',$reference);
        if(!$pdo->commit())throw new RuntimeException('commerce_commit_failed');
        return ['orderId'=>$orderId,'sku'=>$sku,'previousState'=>$expected,
            'state'=>$next,'bookingScheduled'=>$next==='booked',
            'customerDeliveryPreferenceVerified'=>$next==='booked',
            'serviceDelivered'=>false,'customerNotified'=>false,
            'providerBankSettlementVerified'=>null,'readOnly'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }finally{
        if($bookingLock){
            // Advisory lock is connection-scoped, not transaction-scoped.
            $released=$pdo->query("SELECT RELEASE_LOCK('jr_stage09_owner_booking_v1')");
            if($released!==false)$released->fetchColumn();
        }
    }
}
