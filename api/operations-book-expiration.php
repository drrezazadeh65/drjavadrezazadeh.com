<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Stage09: cancel an overdue physical-book reservation only after a
 * privileged operator has independently verified the gateway's terminal
 * failed/cancelled status, including the matching id_get.
 *
 * This is NOT evidence that BitPay.ir provides a machine-readable unpaid
 * status endpoint. A missing callback, a 24-hour-old pending DB state, or
 * a missing payment claim must NEVER independently authorize cancellation.
 *
 * Caller: existing verified SUPER_ADMIN session + fresh TOTP + CSRF.
 * No new database and no writes outside the existing InnoDB transaction.
 */
function jrExpireVerifiedUnpaidBook(PDO $pdo, string $orderId, string $gatewayId,
    string $actorId, string $providerStatus): array {
    if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iD',$orderId)
        || !preg_match('/^[1-9][0-9]{0,79}$/D',$gatewayId)
        || !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iD',$actorId)
        || !in_array($providerStatus,['cancelled','failed'],true))
        throw new InvalidArgumentException('invalid_book_expiration_evidence');
    if (!function_exists('stage9SchemaReady')||!stage9SchemaReady($pdo)
        || !function_exists('stage9ReleaseBooks')
        || !function_exists('operationsAudit'))
        throw new RuntimeException('book_expiration_schema_unavailable');
    $pdo->beginTransaction();
    try {
        // Lock order first, exactly as stage9FinalizePayment does: callbacks
        // and owner cancellation cannot finalize the same pending order.
        $stmt=$pdo->prepare('SELECT state,provider_id_get,provider_trans_id,paid_at,items_json,
            TIMESTAMPDIFF(SECOND,created_at,NOW()) AS age_seconds
            FROM commerce_orders WHERE id=? FOR UPDATE');
        $stmt->execute([$orderId]);
        $order=$stmt->fetch(PDO::FETCH_ASSOC);
        if (!$order || $order['state']!=='pending') throw new DomainException('order_not_pending');
        if ((string)$order['provider_id_get']!==$gatewayId)
            throw new DomainException('gateway_reference_mismatch');
        if ((int)$order['age_seconds']<86400)
            throw new DomainException('payment_window_still_open');
        if ($order['provider_trans_id']!==null || $order['paid_at']!==null)
            throw new DomainException('payment_requires_reconciliation');
        $claims=$pdo->prepare('SELECT transaction_id FROM commerce_payment_claims WHERE order_id=? LIMIT 1 FOR UPDATE');
        $claims->execute([$orderId]);
        if ($claims->fetchColumn()!==false)
            throw new DomainException('provider_claim_already_exists');
        $items=json_decode((string)$order['items_json'],true);
        if (!is_array($items)||!$items
            || !array_filter($items,static fn($i): bool=>is_array($i)&&($i['kind']??null)==='book'))
            throw new DomainException('not_a_physical_book_order');
        $holds=$pdo->prepare("SELECT COUNT(*) FROM commerce_book_reservations
            WHERE order_id=? AND state='reserved'");
        $holds->execute([$orderId]);
        if ((int)$holds->fetchColumn()<1)throw new DomainException('no_active_book_reservation');
        stage9ReleaseBooks($pdo,$orderId);
        $update=$pdo->prepare("UPDATE commerce_orders
            SET state='cancelled',updated_at=NOW()
            WHERE id=? AND state='pending' AND provider_id_get=? AND paid_at IS NULL
              AND provider_trans_id IS NULL");
        $update->execute([$orderId,$gatewayId]);
        if ($update->rowCount()!==1)throw new RuntimeException('book_expiration_state_conflict');
        // Existing audited owner action. Never invent or store a provider
        // transaction ID, and never turn a pending donation into paid here.
        operationsAudit($pdo,$actorId,'book_expired_provider_'. $providerStatus,$orderId);
        $pdo->commit();
        return ['orderId'=>$orderId,'state'=>'cancelled','providerStatus'=>$providerStatus,
            'reserveReleased'=>true,'ageMinimumHours'=>24];
    } catch(Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
