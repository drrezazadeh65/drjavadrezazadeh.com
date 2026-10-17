<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/** Separate buyer attestation; never substitute for payment, seller handover or bank settlement. */
function jrServiceBuyerReceiptSchemaReady(PDO $pdo): bool {
    try {
        $pdo->query('SELECT file_id,order_id,sku,account_id,acknowledged_at FROM commerce_service_buyer_receipts LIMIT 0');
        $q=$pdo->query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME='commerce_service_buyer_receipts' LIMIT 1");
        return strcasecmp((string)$q->fetchColumn(),'InnoDB')===0;
    }catch(Throwable $e){return false;}
}
function jrServiceBuyerReceiptRows(PDO $pdo,string $order,string $sku): array {
    if(!jrServiceBuyerReceiptSchemaReady($pdo))return [];
    $q=$pdo->prepare('SELECT file_id,acknowledged_at FROM commerce_service_buyer_receipts
        WHERE order_id=? AND sku=? ORDER BY acknowledged_at');
    $q->execute([$order,$sku]);$rows=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
        if(validUuid((string)$row['file_id']))
            $rows[(string)$row['file_id']]=(string)$row['acknowledged_at'];
    }
    return $rows;
}
function jrServiceBuyerReceiptConfirm(PDO $pdo,string $actor,string $email,array $input): array {
    if(array_keys($input)!==['orderId','sku','fileId','received']
        ||!is_string($input['orderId'])||!is_string($input['sku'])
        ||!is_string($input['fileId'])||$input['received']!==true
        ||!validUuid($actor)||!validUuid($input['fileId'])||!validEmail($email))
        throw new InvalidArgumentException('exact_customer_receipt_acknowledgment_required');
    $order=$input['orderId'];$sku=$input['sku'];$id=$input['fileId'];
    jrServiceFileReference($order,$sku);
    if(!jrServiceBuyerReceiptSchemaReady($pdo)
      ||!jrServiceFilesSchemaReady($pdo))
        throw new RuntimeException('buyer_receipt_not_ready');
    if(!$pdo->beginTransaction())throw new RuntimeException('receipt_transaction_unavailable');
    try{
        $case=jrServiceFilePaidCase($pdo,$order,$sku,$email,true);
        if($case['service_state']!=='delivered')
            throw new DomainException('delivered_service_required_for_receipt');
        $q=$pdo->prepare("SELECT id,storage_name,plaintext_size,content_sha256
            FROM commerce_service_files
            WHERE id=? AND order_id=? AND sku=? AND kind='professional_output' FOR UPDATE");
        $q->execute([$id,$order,$sku]);
        $artifact=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($artifact)||(string)$artifact['id']!==$id)
            throw new DomainException('delivered_output_not_found');
        $digest=jrServiceFileReleasedDigest($pdo,$order,$sku,(string)$case['service_state']);
        if(!jrServiceFileMatchesRelease($digest,$order,$sku,$id))
            throw new DomainException('approved_exact_output_required');
        // Confirm the exact released file is still retrievable and intact.
        // A stale metadata row must never support a claimed customer receipt.
        if(!preg_match('/^[a-f0-9]{48}\\.blob$/D',(string)$artifact['storage_name']))
            throw new DomainException('receipt_artifact_name_invalid');
        $root=jrServiceFilesPrivateRoot();
        if($root===null)throw new RuntimeException('receipt_private_storage_unavailable');
        $blob=$root.'/'.$artifact['storage_name'];
        if(is_link($blob)||!is_file($blob))
            throw new DomainException('receipt_artifact_missing');
        $sealed=@file_get_contents($blob);
        if(!is_string($sealed)||strlen($sealed)>12583000)
            throw new DomainException('receipt_artifact_cipher_invalid');
        $plain=jrServiceFileDecrypt($sealed,$order,$sku);
        if(strlen($plain)!==(int)$artifact['plaintext_size']
           ||!hash_equals((string)$artifact['content_sha256'],hash('sha256',$plain)))
            throw new DomainException('receipt_artifact_integrity_invalid');
        unset($sealed,$plain);
        $insert=$pdo->prepare('INSERT INTO commerce_service_buyer_receipts
            (file_id,order_id,sku,account_id,acknowledged_at)
            VALUES(?,?,?,?,UTC_TIMESTAMP())
            ON DUPLICATE KEY UPDATE file_id=file_id');
        $insert->execute([$id,$order,$sku,$actor]);
        if(!$pdo->commit())throw new RuntimeException('receipt_commit_failed');
        return [
            'fileId'=>$id,'orderId'=>$order,'sku'=>$sku,
            'buyerSelfAcknowledgedReceipt'=>true,'ownerDeliveryEvidenceRequired'=>true,
            'buyerSatisfactionConfirmed'=>null,'actualDownloadIndependentlyProven'=>false,
            'providerBankSettlementVerified'=>null
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
