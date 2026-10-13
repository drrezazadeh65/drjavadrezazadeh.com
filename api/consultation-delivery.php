<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Canonical service delivery policy (2026-10-14):
 * - ordinary counselling: telephone or online video, at buyer's choice;
 * - in-person ONLY an explicitly catalogued VIP or annual coaching product;
 * - in-person cities ONLY Tehran or Kashan; appointment subject to capacity.
 * This module is side-effect free except commerceConsultationSavePreference().
 */
function commerceConsultationModes(string $sku): array {
    if (!preg_match('/^(?:service|vip):[a-z0-9_-]{1,60}$/D',$sku))return [];
    if (!function_exists('localCatalog') || !isset(localCatalog()[$sku]))return [];
    $modes=['PHONE','VIDEO'];
    // Annual coaching has no published SKU yet. Never infer eligibility from
    // partial name matches, payment amount or marketing descriptions.
    if (str_starts_with($sku,'vip:') || $sku==='service:annual_coaching')
        $modes[]='IN_PERSON';
    return $modes;
}
function commerceConsultationValidChoice(string $sku,string $mode,?string $city): bool {
    if (!in_array($mode,commerceConsultationModes($sku),true))return false;
    return $mode==='IN_PERSON'
        ? in_array($city,['TEHRAN','KASHAN'],true)
        : $city===null;
}
function commerceConsultationPreferenceSchemaReady(?PDO $pdo): bool {
    if(!$pdo)return false;
    try {
        foreach ([
            'SELECT order_id,sku,delivery_mode,meeting_city,updated_at FROM commerce_consultation_preferences LIMIT 0',
            'SELECT event_id,order_id,sku,actor_account_id,previous_mode,next_mode,previous_city,next_city FROM commerce_consultation_preference_events LIMIT 0'
        ] as $sql)if($pdo->query($sql)===false)return false;
        return true;
    }catch(Throwable $e){return false;}
}
function commerceConsultationSavePreference(PDO $pdo,string $accountId,string $email,array $input): array {
    if(array_keys($input)!==['orderId','sku','mode','city']
        ||!is_string($input['orderId'])||!is_string($input['sku'])
        ||!is_string($input['mode'])
        ||!($input['city']===null||is_string($input['city'])))
        throw new InvalidArgumentException('invalid_preference_request_shape');
    $orderId=$input['orderId'];$sku=$input['sku'];
    $mode=$input['mode'];$city=$input['city'];
    if(!validUuid($orderId)||!validUuid($accountId)||
       !commerceConsultationValidChoice($sku,$mode,$city))
        throw new InvalidArgumentException('delivery_policy_forbidden');
    if(!commerceConsultationPreferenceSchemaReady($pdo)||!stage9SchemaReady($pdo))
        throw new RuntimeException('consultation_preference_schema_unavailable');
    if(!$pdo->beginTransaction())throw new RuntimeException('preference_transaction_unavailable');
    try {
        $q=$pdo->prepare("SELECT o.state,o.currency,o.paid_at,
                o.provider_amount,o.provider_trans_id,
                c.transaction_id AS claim_trans,c.verified_amount AS claim_amount,
                sc.status AS service_state
            FROM commerce_orders o
            JOIN commerce_service_cases sc ON sc.order_id=o.id AND sc.sku=?
            LEFT JOIN commerce_payment_claims c ON
                c.order_id=o.id AND c.provider='bitpay'
            WHERE o.id=? AND o.customer_email=?
            FOR UPDATE");
        $q->execute([$sku,$orderId,$email]);
        $item=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($item)||$item['state']!=='paid'||$item['currency']!=='IRT'
            ||empty($item['paid_at'])||$item['claim_trans']===null
            ||!hash_equals((string)$item['provider_trans_id'],(string)$item['claim_trans'])
            ||(string)$item['provider_amount']!==(string)$item['claim_amount'])
            throw new DomainException('paid_owned_service_required');
        if(!in_array($item['service_state'],['awaiting_contact','scheduling'],true))
            throw new DomainException('booking_locked_contact_team');
        $q=$pdo->prepare('SELECT delivery_mode,meeting_city FROM commerce_consultation_preferences WHERE order_id=? AND sku=? FOR UPDATE');
        $q->execute([$orderId,$sku]);$prior=$q->fetch(PDO::FETCH_ASSOC);
        $priorMode=$prior===false?null:(string)$prior['delivery_mode'];
        $priorCity=$prior===false?null:($prior['meeting_city']===null?null:(string)$prior['meeting_city']);
        if($priorMode!==$mode||$priorCity!==$city){
            $q=$pdo->prepare("INSERT INTO commerce_consultation_preferences
                (order_id,sku,delivery_mode,meeting_city)
                VALUES(?,?,?,?)
                ON DUPLICATE KEY UPDATE delivery_mode=VALUES(delivery_mode),
                    meeting_city=VALUES(meeting_city),updated_at=CURRENT_TIMESTAMP");
            $q->execute([$orderId,$sku,$mode,$city]);
            $q=$pdo->prepare("INSERT INTO commerce_consultation_preference_events
                (order_id,sku,actor_account_id,previous_mode,next_mode,previous_city,next_city)
                VALUES(?,?,?,?,?,?,?)");
            $q->execute([$orderId,$sku,$accountId,$priorMode,$mode,$priorCity,$city]);
        }
        if(!$pdo->commit())throw new RuntimeException('preference_commit_failed');
        return ['orderId'=>$orderId,'sku'=>$sku,'deliveryMode'=>$mode,
            'meetingCity'=>$city,'appointmentConfirmed'=>false,
            'customerSelected'=>true,'customerNotified'=>false,
            'note'=>'A mode preference is not a confirmed slot or professional service delivery.'];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
