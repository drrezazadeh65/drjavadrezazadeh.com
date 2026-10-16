<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Private service intake: authenticated buyer email -> real paid service case.
 * The browser never controls paid status or amount; no documents are uploaded
 * and no data in this table is ever publicly indexed or delivered by email.
 */
function jrServiceIntakeSchemaReady(PDO $pdo): bool {
    try {
        $pdo->query('SELECT order_id,sku,payload_ciphertext,revision,consent_version,consented_at,updated_at FROM commerce_service_intakes LIMIT 0');
        $q=$pdo->query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
            AND TABLE_NAME='commerce_service_intakes' LIMIT 1");
        return strcasecmp((string)$q->fetchColumn(),'InnoDB')===0;
    }catch(Throwable $e){return false;}
}
function jrServiceIntakeKey(): string {
    $pepper=(string)(cfg()['auth_pepper']??'');
    if(strlen($pepper)<32||!function_exists('hash_hkdf')||!function_exists('openssl_encrypt'))
        throw new RuntimeException('service_intake_crypto_not_ready');
    return hash_hkdf('sha256',$pepper,32,'jr-service-intake-aead-v1');
}
function jrServiceIntakeEncode(string $order,string $sku,array $fields): string {
    $plain=json_encode($fields,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $iv=random_bytes(12);$tag='';
    $cipher=openssl_encrypt($plain,'aes-256-gcm',jrServiceIntakeKey(),
        OPENSSL_RAW_DATA,$iv,$tag,'jr-service-intake-v1|'.$order.'|'.$sku,16);
    if(!is_string($cipher)||strlen($tag)!==16)throw new RuntimeException('service_intake_encrypt_failed');
    return base64_encode($iv.$tag.$cipher);
}
function jrServiceIntakeDecode(string $order,string $sku,string $stored): array {
    $raw=base64_decode($stored,true);
    if(!is_string($raw)||strlen($raw)<30)throw new RuntimeException('service_intake_corrupt');
    $iv=substr($raw,0,12);$tag=substr($raw,12,16);$cipher=substr($raw,28);
    $plain=openssl_decrypt($cipher,'aes-256-gcm',jrServiceIntakeKey(),
        OPENSSL_RAW_DATA,$iv,$tag,'jr-service-intake-v1|'.$order.'|'.$sku);
    if(!is_string($plain))throw new RuntimeException('service_intake_integrity_failed');
    $data=json_decode($plain,true,16,JSON_THROW_ON_ERROR);
    if(!is_array($data)||array_keys($data)!==['subject','background','objectives','isMinor'])
        throw new RuntimeException('service_intake_payload_invalid');
    return $data;
}
function jrServiceIntakeReference(string $order,string $sku): void {
    if(!validUuid($order)||!preg_match('/^(?:service|vip):[a-z0-9_-]{1,60}$/D',$sku))
        throw new InvalidArgumentException('invalid_service_reference');
}
function jrServiceIntakeOwned(PDO $pdo,string $order,string $sku,string $verifiedEmail): bool {
    $q=$pdo->prepare("SELECT 1 FROM commerce_orders o
        JOIN commerce_service_cases sc ON sc.order_id=o.id AND sc.sku=?
        WHERE o.id=? AND o.customer_email=? LIMIT 1");
    $q->execute([$sku,$order,$verifiedEmail]);
    return $q->fetchColumn()!==false;
}
function jrServiceIntakeRead(PDO $pdo,string $order,string $sku): array {
    jrServiceIntakeReference($order,$sku);
    if(!jrServiceIntakeSchemaReady($pdo))throw new RuntimeException('intake_storage_not_ready');
    $q=$pdo->prepare('SELECT payload_ciphertext,revision,consent_version,guardian_acknowledged,
            consented_at,updated_at FROM commerce_service_intakes
        WHERE order_id=? AND sku=? LIMIT 1');
    $q->execute([$order,$sku]);$row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row))return ['intake'=>null,'revision'=>0,'scope'=>'verified_private_service_case'];
    return ['intake'=>jrServiceIntakeDecode($order,$sku,(string)$row['payload_ciphertext']),
        'revision'=>(int)$row['revision'],
        'consentVersion'=>(string)$row['consent_version'],
        'guardianAcknowledged'=>(int)$row['guardian_acknowledged']===1,
        'consentedAt'=>(string)$row['consented_at'],
        'updatedAt'=>(string)$row['updated_at'],
        'scope'=>'verified_private_service_case'];
}
function jrServiceIntakeValidate(array $body): array {
    if(array_keys($body)!==['orderId','sku','expectedRevision','subject','background',
        'objectives','isMinor','guardianAcknowledged','privacyAcknowledged'])
        throw new InvalidArgumentException('exact_intake_request_required');
    foreach(['orderId','sku','subject','background','objectives'] as $key)
        if(!is_string($body[$key]))throw new InvalidArgumentException('intake_field_type');
    $revision=$body['expectedRevision'];
    if(!is_int($revision)||$revision<0||$revision>10000
        ||!is_bool($body['isMinor'])||!is_bool($body['guardianAcknowledged'])
        ||$body['privacyAcknowledged']!==true)
        throw new InvalidArgumentException('intake_consent_or_version');
    if($body['isMinor']===true && $body['guardianAcknowledged']!==true)
        throw new InvalidArgumentException('guardian_acknowledgment_required');
    $fields=[];
    foreach(['subject'=>[8,180],'background'=>[20,3500],'objectives'=>[20,3000]] as $key=>$limits){
        $value=trim($body[$key]);
        if(textLen($value)<$limits[0]||textLen($value)>$limits[1]||
            !preg_match('//u',$value)||preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u',$value))
            throw new InvalidArgumentException('invalid_intake_text_'.$key);
        $fields[$key]=$value;
    }
    $fields['isMinor']=$body['isMinor'];
    return ['fields'=>$fields,'version'=>$revision];
}
function jrServiceIntakeSave(PDO $pdo,string $verifiedEmail,string $actor,array $body): array {
    $normalized=jrServiceIntakeValidate($body);
    $order=$body['orderId'];$sku=$body['sku'];jrServiceIntakeReference($order,$sku);
    if(!validUuid($actor)||!validEmail($verifiedEmail)
        ||!stage9SchemaReady($pdo)||!jrServiceIntakeSchemaReady($pdo))
        throw new RuntimeException('service_intake_unavailable');
    $cipher=jrServiceIntakeEncode($order,$sku,$normalized['fields']);
    if(!$pdo->beginTransaction())throw new RuntimeException('intake_transaction_required');
    try{
        // Row ownership and immutable Bitpay amount evidence checked under lock.
        $q=$pdo->prepare("SELECT o.state,o.currency,o.paid_at,o.provider_trans_id,o.provider_amount,
                c.transaction_id AS claim_transaction,c.verified_amount AS claim_amount
            FROM commerce_orders o LEFT JOIN commerce_payment_claims c
              ON c.order_id=o.id AND c.provider='bitpay'
            WHERE o.id=? AND o.customer_email=? FOR UPDATE");
        $q->execute([$order,$verifiedEmail]);$paid=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($paid))throw new DomainException('order_not_owned_by_verified_account');
        if($paid['state']!=='paid'||$paid['currency']!=='IRT'||empty($paid['paid_at'])
            ||$paid['claim_transaction']===null
            ||!hash_equals((string)$paid['provider_trans_id'],(string)$paid['claim_transaction'])
            ||(string)$paid['provider_amount']!==(string)$paid['claim_amount'])
            throw new DomainException('verified_provider_payment_required');
        $c=$pdo->prepare('SELECT status FROM commerce_service_cases WHERE order_id=? AND sku=? FOR UPDATE');
        $c->execute([$order,$sku]);$row=$c->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||!in_array((string)$row['status'],
            ['awaiting_contact','scheduling','booked','in_progress'],true))
            throw new DomainException('service_intake_window_closed');
        $q=$pdo->prepare('SELECT revision FROM commerce_service_intakes WHERE order_id=? AND sku=? FOR UPDATE');
        $q->execute([$order,$sku]);$before=$q->fetchColumn();
        $current=$before===false?0:(int)$before;
        if($normalized['version']!==$current)throw new DomainException('intake_revision_conflict');
        $next=$current+1;
        if($current===0){
            $q=$pdo->prepare("INSERT INTO commerce_service_intakes
                (order_id,sku,payload_ciphertext,revision,consent_version,guardian_acknowledged,
                 last_updated_by,consented_at,created_at,updated_at)
                VALUES(?,?,?,1,'SERVICE_COORDINATION_V1',?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP(),UTC_TIMESTAMP())");
            $q->execute([$order,$sku,$cipher,$body['guardianAcknowledged']?1:0,$actor]);
        }else{
            $q=$pdo->prepare("UPDATE commerce_service_intakes SET
                payload_ciphertext=?,revision=?,consent_version='SERVICE_COORDINATION_V1',
                guardian_acknowledged=?,last_updated_by=?,consented_at=UTC_TIMESTAMP(),
                updated_at=UTC_TIMESTAMP() WHERE order_id=? AND sku=? AND revision=?");
            $q->execute([$cipher,$next,$body['guardianAcknowledged']?1:0,$actor,$order,$sku,$current]);
            if($q->rowCount()!==1)throw new DomainException('intake_revision_conflict');
        }
        if(!$pdo->commit())throw new RuntimeException('intake_commit_failed');
        return ['saved'=>true,'revision'=>$next,
            'scope'=>'verified_paid_service_case','customerNotified'=>false,
            'independentGuardianVerification'=>false,
            'filesUploaded'=>false];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
