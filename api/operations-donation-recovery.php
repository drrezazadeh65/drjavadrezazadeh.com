<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Recover a donation paid at the Iranian bitpay.ir gateway whose normal
 * callback was interrupted. Reuse Stage09's atomic payment finalizer and the
 * exact second-stage BitPay verification contract. No second payment request,
 * no order creation, no manual 'paid' SQL, no browser-held API credentials.
 *
 * The caller alone supplies the provider verification closure. In production
 * it MUST call gatewayPost('gateway-result-second', [...]) with the existing
 * server-side BitPay secret. Passing a purported panel status is insufficient.
 */
function jrRecoverPendingVerifiedDonation(PDO $pdo,string $orderId,string $gatewayId,
    string $transactionId,callable $verify): array {
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iD',$orderId)
        || !preg_match('/^[1-9][0-9]{0,79}$/D',$gatewayId)
        || !preg_match('/^[1-9][0-9]{0,79}$/D',$transactionId))
        throw new InvalidArgumentException('invalid_donation_recovery_identity');
    if (!function_exists('stage9SchemaReady') || !stage9SchemaReady($pdo)
        || !function_exists('stage9FinalizePayment'))
        throw new RuntimeException('donation_recovery_schema_unavailable');
    $select=$pdo->prepare('SELECT state,provider_id_get,provider_amount,factor_id,
        items_json,provider_trans_id,paid_at FROM commerce_orders WHERE id=?');
    $select->execute([$orderId]);
    $row=$select->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['state']!=='pending' || $row['paid_at']!==null ||
        $row['provider_trans_id']!==null)
        throw new DomainException('donation_order_not_pending');
    if ((string)$row['provider_id_get']!==$gatewayId)
        throw new DomainException('donation_gateway_id_mismatch');
    $items=json_decode((string)$row['items_json'],true);
    if (!is_array($items)||count($items)!==1||!is_array($items[0])||
        ($items[0]['kind']??null)!=='donation' ||
        !in_array(($items[0]['sku']??null),['support:students','support:voluntary'],true)||
        ($items[0]['quantity']??null)!==1)
        throw new DomainException('donation_only_recovery');
    if (!preg_match('/^[1-9][0-9]*$/D',(string)$row['provider_amount']) ||
        !preg_match('/^[0-9]{1,40}$/D',(string)$row['factor_id']))
        throw new DomainException('invalid_donation_financial_identity');

    // Network verification takes place OUTSIDE a database transaction. The
    // finalizer locks and rechecks the row afterwards, preventing races.
    $verified=$verify($transactionId,$gatewayId);
    if (!is_array($verified) ||
        !in_array((string)($verified['status']??''),['1','11'],true) ||
        !is_scalar($verified['amount']??null)||
        !preg_match('/^[1-9][0-9]*$/D',(string)$verified['amount'])||
        (string)$verified['amount']!==(string)$row['provider_amount'] ||
        !is_scalar($verified['factorId']??null) ||
        (string)$verified['factorId']!==(string)$row['factor_id'])
        throw new DomainException('donation_provider_verification_failed');
    if (!stage9FinalizePayment($pdo,$orderId,$gatewayId,$transactionId,
        (string)$verified['amount'],(string)$verified['factorId']))
        throw new DomainException('donation_recovery_race_or_replay');
    // Outbox event is generated atomically by stage9FinalizePayment.
    // No assertion is made about SMTP delivery or final bank settlement.
    return ['orderId'=>$orderId,'state'=>'paid','providerClaimRecorded'=>true,
        'outboxRecorded'=>true,'smtpDeliveryVerified'=>false,
        'bankSettlementVerified'=>false,'secondChargeInitiated'=>false];
}
