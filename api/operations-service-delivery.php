<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Independent human service-delivery attestation, never a payment or settlement.
 * Only the owner+fresh MFA+same-origin CSRF route may call this function.
 * No private proof ID, customer PII, email, document or secret leaves this module.
 */
function operationsServiceDeliveryEvidenceReady(PDO $pdo): bool {
    try {
        $pdo->query('SELECT order_id,sku,evidence_kind,evidence_reference_hmac,owner_account_id,attested_at FROM commerce_service_delivery_evidence LIMIT 0');
        $s=$pdo->query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME='commerce_service_delivery_evidence' LIMIT 1");
        return strcasecmp((string)$s->fetchColumn(),'InnoDB')===0;
    } catch (Throwable $e) { return false; }
}

function operationsCommerceRecordDelivery(PDO $pdo,string $actor,array $request): array {
    if(array_keys($request)!==['orderId','sku','expectedState','evidenceKind','evidenceReference','ownerConfirmed'])
        throw new InvalidArgumentException('exact_delivery_request_required');
    foreach(['orderId','sku','expectedState','evidenceKind','evidenceReference'] as $key)
        if(!is_string($request[$key]))throw new InvalidArgumentException('invalid_delivery_field_type');
    $orderId=$request['orderId'];$sku=$request['sku'];$kind=$request['evidenceKind'];$reference=$request['evidenceReference'];
    if(!validUuid($actor)||!validUuid($orderId)
        ||!preg_match('/^(?:service|vip):[a-z0-9_-]{1,60}$/D',$sku)
        ||$request['expectedState']!=='in_progress'
        ||!in_array($kind,['session_completed','document_handed_over'],true)
        ||!preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}$/D',$reference)
        ||$request['ownerConfirmed']!==true)
        throw new InvalidArgumentException('invalid_delivery_attestation');
    $pepper=(string)(cfg()['auth_pepper']??'');
    if(strlen($pepper)<32||!stage9SchemaReady($pdo)||!operationsServiceDeliveryEvidenceReady($pdo))
        throw new RuntimeException('delivery_evidence_unavailable');

    if(!$pdo->beginTransaction())throw new RuntimeException('delivery_transaction_required');
    try {
        // Payment status is not a browser assertion. Require the immutable
        // verified provider claim to match the paid order under a row lock.
        $q=$pdo->prepare("SELECT o.state,o.currency,o.paid_at,o.provider_trans_id,o.provider_amount,
                c.transaction_id AS claim_transaction,c.verified_amount AS claim_amount
            FROM commerce_orders o LEFT JOIN commerce_payment_claims c
              ON c.order_id=o.id AND c.provider='bitpay'
            WHERE o.id=? FOR UPDATE");
        $q->execute([$orderId]);$order=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($order)||$order['state']!=='paid'||$order['currency']!=='IRT'
            ||empty($order['paid_at'])||$order['claim_transaction']===null
            ||!hash_equals((string)$order['provider_trans_id'],(string)$order['claim_transaction'])
            ||(string)$order['provider_amount']!==(string)$order['claim_amount'])
            throw new DomainException('matched_paid_order_required');

        $s=$pdo->prepare("SELECT status,booking_start,booking_end,
                CASE WHEN booking_end IS NOT NULL AND booking_end<=UTC_TIMESTAMP() THEN 1 ELSE 0 END AS booking_elapsed
            FROM commerce_service_cases WHERE order_id=? AND sku=? FOR UPDATE");
        $s->execute([$orderId,$sku]);$case=$s->fetch(PDO::FETCH_ASSOC);
        if(!is_array($case)||$case['status']!=='in_progress')throw new DomainException('service_not_in_progress');
        // A scheduled service cannot be marked delivered until its REAL
        // booked interval has elapsed, regardless of which evidence type
        // the owner selects. No calendar shortcut via document attestation.
        if(!empty($case['booking_start']) || !empty($case['booking_end'])){
            if(empty($case['booking_start'])||empty($case['booking_end'])
                ||(int)$case['booking_elapsed']!==1)
                throw new DomainException('booked_service_not_completed');
        } elseif($kind==='session_completed') {
            throw new DomainException('session_booking_evidence_required');
        }

        if($kind==='document_handed_over'){
            // The reference must identify a real, signed-at-upload encrypted
            // output for exactly this paid service case. No free-text claim is
            // accepted as document delivery evidence.
            if(!validUuid($reference)||!function_exists('jrServiceFilesSchemaReady')
                ||!jrServiceFilesSchemaReady($pdo))
                throw new DomainException('actual_document_evidence_required');
            $proof=$pdo->prepare("SELECT storage_name,plaintext_size,content_sha256
                FROM commerce_service_files
                WHERE id=? AND order_id=? AND sku=? AND kind='professional_output' FOR UPDATE");
            $proof->execute([$reference,$orderId,$sku]);
            $document=$proof->fetch(PDO::FETCH_ASSOC);
            if(!is_array($document)||
                !preg_match('/^[a-f0-9]{48}\.blob$/D',(string)$document['storage_name']))
                throw new DomainException('document_evidence_not_in_this_case');
            $root=jrServiceFilesPrivateRoot();
            if($root===null)throw new RuntimeException('document_evidence_storage_unavailable');
            $target=$root.'/'.$document['storage_name'];
            if(is_link($target)||!is_file($target))
                throw new DomainException('document_delivery_file_missing');
            $sealed=@file_get_contents($target);
            if(!is_string($sealed)||strlen($sealed)>12583000)
                throw new DomainException('document_delivery_cipher_invalid');
            $plain=jrServiceFileDecrypt($sealed,$orderId,$sku);
            if(strlen($plain)!==(int)$document['plaintext_size']||
               !hash_equals((string)$document['content_sha256'],hash('sha256',$plain)))
                throw new DomainException('document_delivery_integrity_invalid');
            unset($plain,$sealed);
        }

        // Reference is an opaque ID from the owner's real private delivery
        // evidence. HMAC protects even guessable IDs from disclosure in SQL.
        // The actual source document stays under existing private custody.
        $fingerprint=hash_hmac('sha256','jr-service-delivery-v1|'.$orderId.'|'.$sku.'|'.$kind.'|'.$reference,$pepper);
        $insert=$pdo->prepare('INSERT INTO commerce_service_delivery_evidence
            (order_id,sku,evidence_kind,evidence_reference_hmac,owner_account_id,attested_at)
            VALUES(?,?,?,?,?,UTC_TIMESTAMP())');
        $insert->execute([$orderId,$sku,$kind,$fingerprint,$actor]);

        $update=$pdo->prepare("UPDATE commerce_service_cases
            SET status='delivered',delivered_at=UTC_TIMESTAMP()
            WHERE order_id=? AND sku=? AND status='in_progress'");
        $update->execute([$orderId,$sku]);
        if($update->rowCount()!==1)throw new DomainException('delivery_state_changed');

        $auditRef=$orderId.'-'.substr(hash('sha256',$sku.'|'.$kind.'|'.$fingerprint),0,20);
        operationsAudit($pdo,$actor,'commerce_service_delivered',$auditRef);
        if(!$pdo->commit())throw new RuntimeException('delivery_commit_failed');
        return [
            'orderId'=>$orderId,'sku'=>$sku,'previousState'=>'in_progress',
            'state'=>'delivered','deliveryRecordedByOwner'=>true,
            'evidenceReferenceSecured'=>true,'evidenceKind'=>$kind,
            'customerReceiptIndependentlyConfirmed'=>false,
            'customerNotified'=>false,'providerBankSettlementVerified'=>null
        ];
    } catch(Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
