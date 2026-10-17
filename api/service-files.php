<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Service-file custody v1: no public URLs, no plaintext persistence, no owner
 * uploads without MFA, no client downloads until owner-evidenced delivery.
 * Only PDF and macro-free DOCX. The existing commerce gateway is untouched.
 */
function jrServiceFilesSchemaReady(PDO $pdo): bool {
    try {
        $pdo->query('SELECT id,order_id,sku,kind,uploader_account_id,storage_name,file_extension,mime_type,plaintext_size,content_sha256,consent_version,subject_is_minor,guardian_acknowledged,created_at FROM commerce_service_files LIMIT 0');
        $s=$pdo->query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commerce_service_files' LIMIT 1");
        return strcasecmp((string)$s->fetchColumn(),'InnoDB')===0;
    } catch(Throwable $e){return false;}
}
function jrServiceFilesPrivateRoot(): ?string {
    $raw=(string)(cfg()['service_private_storage'] ?? (getenv('JR_SERVICE_PRIVATE_STORAGE') ?: ''));
    if($raw===''||$raw[0]!=='/'||is_link($raw))return null;
    $dir=realpath($raw);
    if($dir===false||!is_dir($dir)||!is_writable($dir))return null;
    $web=(string)($_SERVER['DOCUMENT_ROOT']??'');
    $www=$web!==''?realpath($web):false;
    if($www!==false&&($dir===$www||str_starts_with($dir,$www.'/')))return null;
    if(str_contains($dir,'/public_html/')||str_ends_with($dir,'/public_html'))return null;
    $perms=@fileperms($dir);
    if($perms===false||(($perms&0077)!==0))return null;
    // Do not claim readiness while the next bounded 12 MiB attachment
    // would leave the service below its encrypted-storage safety reserve.
    $free=@disk_free_space($dir);
    if($free===false||$free<50331648)return null;
    return $dir;
}
function jrServiceFilesAntivirus(): ?string {
    $bin=(string)(cfg()['service_antivirus_binary'] ?? (getenv('JR_SERVICE_AV_BINARY') ?: ''));
    return in_array($bin,['/usr/bin/clamscan','/usr/local/bin/clamscan'],true)
        &&is_executable($bin)&&function_exists('proc_open')?$bin:null;
}
function jrServicePhpUploadLimitsReady(): bool {
    $parse=static function(string $raw): int {
        $raw=trim($raw);
        if(!preg_match('/^(\d+)([KMG])?$/iD',$raw,$m))return 0;
        $size=(int)$m[1];$power=strtoupper((string)($m[2]??''));
        return $size*([''=>1,'K'=>1024,'M'=>1048576,'G'=>1073741824][$power]??1);
    };
    // Multipart body includes boundaries and metadata on top of file bytes.
    return $parse((string)ini_get('upload_max_filesize'))>=12582912
        &&$parse((string)ini_get('post_max_size'))>=12582912+65536;
}
function jrServicePhpMemoryReady(): bool {
    // This bounded v1 handler buffers the scanned plaintext and its sealed
    // AES-GCM envelope. PHP needs safe headroom for both plus application code.
    $raw=trim((string)ini_get('memory_limit'));
    if($raw==='-1')return true;
    if(!preg_match('/^([0-9]+)([KMG])?$/iD',$raw,$m))return false;
    $n=(int)$m[1];$suffix=strtoupper((string)($m[2]??''));
    $multiple=[''=>1,'K'=>1024,'M'=>1048576,'G'=>1073741824][$suffix]??0;
    if($multiple<=0||$n>intdiv(PHP_INT_MAX,$multiple))return false;
    return $n*$multiple>=100663296;
}
/**
 * 12-MiB uploaded documents are AV scanned before encryption. A default
 * 30-second web-request limit cannot be advertised as production ready.
 * 0 is the PHP setting for no execution-time limit. Operational limits and
 * reverse-proxy timeouts must still be tested on the real hosting stack.
 */
function jrServicePhpExecutionReady(): bool {
    $raw=trim((string)ini_get('max_execution_time'));
    if(!preg_match('/^\d+$/D',$raw))return false;
    $seconds=(int)$raw;
    return $seconds===0||$seconds>=90;
}
/** Multipart parsing must have the same practical time budget as file processing.
 * An oversized request can otherwise expire before PHP populates $_FILES.
 */
function jrServicePhpInputTimeReady(): bool {
    $raw=trim((string)ini_get('max_input_time'));
    if(!preg_match('/^-?\\d+$/D',$raw))return false;
    $seconds=(int)$raw;
    return $seconds===-1||$seconds===0||$seconds>=90;
}
function jrServiceFilesReady(PDO $pdo): bool {
    return ((cfg()['service_files_enabled']??(getenv('JR_SERVICE_FILES_ENABLED')==='true'))===true)
        &&(cfg()['public_tls_confirmed']??false)===true
        &&stage9SchemaReady($pdo)&&jrServiceFilesSchemaReady($pdo)
        // A file intake without possible evidence-backed handover and
        // optional buyer receipt is a partial workflow, not ready to sell.
        &&function_exists('operationsServiceDeliveryEvidenceReady')
        &&operationsServiceDeliveryEvidenceReady($pdo)
        &&function_exists('jrServiceBuyerReceiptSchemaReady')
        &&jrServiceBuyerReceiptSchemaReady($pdo)
        &&jrServiceFilesPrivateRoot()!==null&&jrServiceFilesAntivirus()!==null
        &&function_exists('hash_hkdf')&&function_exists('openssl_encrypt')
        &&function_exists('openssl_decrypt')
        &&class_exists('ZipArchive')&&class_exists('finfo')
        &&jrServicePhpUploadLimitsReady()
        &&jrServicePhpMemoryReady()
        &&jrServicePhpExecutionReady()
        &&jrServicePhpInputTimeReady()
        &&strlen((string)(cfg()['auth_pepper']??''))>=32;
}
/**
 * Owner dashboard activation diagnostics: only booleans, never secrets,
 * filesystem paths, configuration values or customer records.
 * Missing optional receipt/delivery schema is reported separately from
 * the ability to ingest already-purchased service files.
 */
function jrServiceFilesActivationChecks(PDO $pdo): array {
    $safe=static function(callable $check): bool {
        try{return $check()===true;}catch(Throwable $e){return false;}
    };
    $config=cfg();
    return [
        'explicitlyEnabled'=>$safe(static fn(): bool =>
            ($config['service_files_enabled']??false)===true),
        'verifiedHttps'=>$safe(static fn(): bool =>
            ($config['public_tls_confirmed']??false)===true),
        'commerceSchema'=>$safe(static fn(): bool => stage9SchemaReady($pdo)),
        'privateFileSchema'=>$safe(static fn(): bool => jrServiceFilesSchemaReady($pdo)),
        'privateStorage'=>$safe(static fn(): bool => jrServiceFilesPrivateRoot()!==null),
        'antivirus'=>$safe(static fn(): bool => jrServiceFilesAntivirus()!==null),
        'cryptoAndKey'=>$safe(static fn(): bool =>
            function_exists('hash_hkdf')&&function_exists('openssl_encrypt')
            &&function_exists('openssl_decrypt')
            &&strlen((string)($config['auth_pepper']??''))>=32),
        'documentParsers'=>$safe(static fn(): bool =>
            class_exists('ZipArchive')&&class_exists('finfo')),
        'phpUploadCapacity'=>$safe(static fn(): bool => jrServicePhpUploadLimitsReady()),
        'phpMemoryCapacity'=>$safe(static fn(): bool => jrServicePhpMemoryReady()),
        'phpExecutionCapacity'=>$safe(static fn(): bool => jrServicePhpExecutionReady()),
        'phpInputTimeCapacity'=>$safe(static fn(): bool => jrServicePhpInputTimeReady()),
        'ownerDeliverySchema'=>$safe(static fn(): bool =>
            function_exists('operationsServiceDeliveryEvidenceReady')
            &&operationsServiceDeliveryEvidenceReady($pdo)),
        'buyerReceiptSchema'=>$safe(static fn(): bool =>
            function_exists('jrServiceBuyerReceiptSchemaReady')
            &&jrServiceBuyerReceiptSchemaReady($pdo))
    ];
}
function jrServiceFilesKey(): string {
    $pepper=(string)(cfg()['auth_pepper']??'');
    if(strlen($pepper)<32||!function_exists('hash_hkdf'))throw new RuntimeException('service_files_crypto_unavailable');
    return hash_hkdf('sha256',$pepper,32,'jr-private-service-file-aes256gcm-v1');
}
function jrServiceFileReference(string $order,string $sku): void {
    if(!validUuid($order)||!preg_match('/^(?:service|vip):[a-z0-9_-]{1,60}$/D',$sku))
        throw new InvalidArgumentException('invalid_service_file_reference');
}
function jrServiceFilePaidCase(PDO $pdo,string $order,string $sku,?string $ownerEmail,bool $lock=false): array {
    jrServiceFileReference($order,$sku);
    $query="SELECT o.state,o.currency,o.paid_at,o.provider_trans_id,o.provider_amount,
        c.transaction_id AS verified_transaction,c.verified_amount AS verified_amount,
        sc.status AS service_state
        FROM commerce_orders o
        JOIN commerce_service_cases sc ON sc.order_id=o.id AND sc.sku=?
        LEFT JOIN commerce_payment_claims c ON c.order_id=o.id AND c.provider='bitpay'
        WHERE o.id=?";
    $args=[$sku,$order];
    if($ownerEmail!==null){$query.=' AND o.customer_email=?';$args[]=$ownerEmail;}
    if($lock)$query.=' FOR UPDATE';
    $q=$pdo->prepare($query);$q->execute($args);$record=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($record)||$record['state']!=='paid'||$record['currency']!=='IRT'
        ||empty($record['paid_at'])||$record['verified_transaction']===null
        ||!hash_equals((string)$record['provider_trans_id'],(string)$record['verified_transaction'])
        ||(string)$record['provider_amount']!==(string)$record['verified_amount'])
        throw new DomainException('verified_paid_service_owner_required');
    return $record;
}
function jrServiceFileCheckFormat(string $filename,string $tmp): array {
    $ext=strtolower(pathinfo($filename,PATHINFO_EXTENSION));
    if(!in_array($ext,['pdf','docx'],true)||!is_file($tmp))throw new InvalidArgumentException('pdf_or_docx_only');
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    if($ext==='pdf'){
        $h=fopen($tmp,'rb');$magic=$h?fread($h,5):false;if($h)fclose($h);
        if($magic!=='%PDF-'||$mime!=='application/pdf')throw new InvalidArgumentException('invalid_pdf');
        return [$ext,'application/pdf'];
    }
    if(!class_exists('ZipArchive')||!in_array($mime,[
        'application/zip','application/octet-stream',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],true))throw new InvalidArgumentException('docx_zip_validation_required');
    $zip=new ZipArchive();
    if($zip->open($tmp)!==true)throw new InvalidArgumentException('invalid_docx');
    try{
        if($zip->numFiles<2||$zip->numFiles>1500)throw new InvalidArgumentException('invalid_docx_entries');
        $hasTypes=false;$hasDocument=false;$total=0;
        for($i=0;$i<$zip->numFiles;$i++){
            $s=$zip->statIndex($i);
            if(!is_array($s))throw new InvalidArgumentException('invalid_docx_entry');
            $entry=(string)$s['name'];$size=(int)$s['size'];
            if(str_contains($entry,'..')||str_starts_with($entry,'/')||
                str_contains($entry,'\\')||preg_match('/(?:vbaProject|activeX|embeddings|oleObject)/i',$entry))
                throw new InvalidArgumentException('disallowed_docx_content');
            if($size<0||$size>20000000)throw new InvalidArgumentException('docx_entry_size');
            $total+=$size;if($total>60000000)throw new InvalidArgumentException('docx_uncompressed_limit');
            if($entry==='[Content_Types].xml')$hasTypes=true;
            if($entry==='word/document.xml')$hasDocument=true;
        }
        if(!$hasTypes||!$hasDocument)throw new InvalidArgumentException('not_word_document');
    }finally{$zip->close();}
    return ['docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
}
function jrServiceFileScan(string $tmp,string $scanner): void {
    $pipes=[];
    $proc=@proc_open([$scanner,'--no-summary',$tmp],
        [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
    if(!is_resource($proc))throw new RuntimeException('antivirus_unavailable');
    fclose($pipes[0]);stream_get_contents($pipes[1],1024);fclose($pipes[1]);
    stream_get_contents($pipes[2],1024);fclose($pipes[2]);
    if(proc_close($proc)!==0)throw new RuntimeException('antivirus_not_clean');
}
function jrServiceFileEncrypt(string $plaintext,string $order,string $sku): string {
    $iv=random_bytes(12);$tag='';
    $cipher=openssl_encrypt($plaintext,'aes-256-gcm',jrServiceFilesKey(),
        OPENSSL_RAW_DATA,$iv,$tag,'jr-service-file-v1|'.$order.'|'.$sku,16);
    if(!is_string($cipher)||strlen($tag)!==16)throw new RuntimeException('service_file_encrypt_failed');
    return 'JRSF1'.$iv.$tag.$cipher;
}
function jrServiceFileDecrypt(string $sealed,string $order,string $sku): string {
    if(strlen($sealed)<34||substr($sealed,0,5)!=='JRSF1')throw new RuntimeException('sealed_file_invalid');
    $body=substr($sealed,5);
    $plain=openssl_decrypt(substr($body,28),'aes-256-gcm',jrServiceFilesKey(),
        OPENSSL_RAW_DATA,substr($body,0,12),substr($body,12,16),
        'jr-service-file-v1|'.$order.'|'.$sku);
    if(!is_string($plain))throw new RuntimeException('sealed_file_authentication_failed');
    return $plain;
}
function jrServiceFileUpload(PDO $pdo,string $order,string $sku,string $actor,
        ?string $buyerEmail,string $kind,array $upload,array $consent=[]): array {
    jrServiceFileReference($order,$sku);
    if(!validUuid($actor)||!in_array($kind,['client_source','professional_output'],true)
       ||($buyerEmail!==null&&!validEmail($buyerEmail))
       ||($buyerEmail===null&&$kind!=='professional_output')
       ||($buyerEmail!==null&&$kind!=='client_source'))
        throw new InvalidArgumentException('service_file_actor_or_role_invalid');
    if($buyerEmail===null){
        if($consent!==[])throw new InvalidArgumentException('admin_file_consent_contract');
        $consentVersion='OWNER_DELIVERABLE_V1';$minor=0;$guardian=0;
    }else{
        if(array_keys($consent)!==['privacyAcknowledged','isMinor','guardianAcknowledged']
          ||$consent['privacyAcknowledged']!=='1'
          ||!in_array($consent['isMinor'],['0','1'],true)
          ||!in_array($consent['guardianAcknowledged'],['0','1'],true)
          ||($consent['isMinor']==='1'&&$consent['guardianAcknowledged']!=='1'))
            throw new InvalidArgumentException('private_file_consent_or_guardian_required');
        $consentVersion='SERVICE_FILE_HANDLING_V1';
        $minor=(int)$consent['isMinor'];$guardian=(int)$consent['guardianAcknowledged'];
    }
    if(!jrServiceFilesReady($pdo))throw new RuntimeException('service_files_not_ready');
    // Fail before expensive malware scanning or disk access if this verified
    // account does not own a real provider-claim-matched paid service case.
    $preflight=jrServiceFilePaidCase($pdo,$order,$sku,$buyerEmail);
    if(!in_array((string)$preflight['service_state'],
        ['awaiting_contact','scheduling','booked','in_progress'],true)
       ||($kind==='professional_output'&&$preflight['service_state']!=='in_progress'))
        throw new DomainException('service_case_closed_to_upload');
    $tmp=$upload['tmp_name']??null;
    if(!is_string($tmp)||($upload['error']??-1)!==UPLOAD_ERR_OK||!is_uploaded_file($tmp))
        throw new InvalidArgumentException('actual_uploaded_file_required');
    $bytes=(int)($upload['size']??0);
    if($bytes<64||$bytes>12582912||!is_int($upload['size']))
        throw new InvalidArgumentException('file_size_limit');
    $name=$upload['name']??null;
    if(!is_string($name)||strlen($name)>180||preg_match('/[\x00-\x1f]/',$name)
       ||str_contains($name,'/')||str_contains($name,'\\'))
        throw new InvalidArgumentException('invalid_filename');
    [$extension,$mime]=jrServiceFileCheckFormat($name,$tmp);
    jrServiceFileScan($tmp,(string)jrServiceFilesAntivirus());
    $plain=file_get_contents($tmp);
    if(!is_string($plain)||strlen($plain)!==$bytes)throw new RuntimeException('file_read_failed');
    $digest=hash('sha256',$plain);
    $fileId=uuidv4();
    $sealed=jrServiceFileEncrypt($plain,$order,$sku);
    unset($plain);
    $name=bin2hex(random_bytes(24)).'.blob';
    $base=jrServiceFilesPrivateRoot();
    if($base===null)throw new RuntimeException('private_folder_lost');
    $target=$base.'/'.$name;
    $h=@fopen($target,'xb');
    if($h===false)throw new RuntimeException('encrypted_storage_unavailable');
    try{
        // A single fwrite() is not guaranteed to write all 12 MiB. Persist
        // every ciphertext byte or fail closed; never commit a partial blob.
        $remaining=strlen($sealed);$offset=0;
        while($offset<$remaining){
            $written=fwrite($h,substr($sealed,$offset,min(262144,$remaining-$offset)));
            if(!is_int($written)||$written<=0)
                throw new RuntimeException('encrypted_storage_incomplete');
            $offset+=$written;
        }
        if(!fflush($h))throw new RuntimeException('encrypted_storage_flush_failed');
        if(!fclose($h))throw new RuntimeException('encrypted_storage_close_failed');
        if(!chmod($target,0600))throw new RuntimeException('encrypted_storage_permissions_failed');
    }catch(Throwable $e){
        if(is_resource($h))fclose($h);
        @unlink($target);
        throw $e;
    }
    try{
        if(!$pdo->beginTransaction())throw new RuntimeException('service_file_transaction_required');
        $case=jrServiceFilePaidCase($pdo,$order,$sku,$buyerEmail,true);
        if(!in_array((string)$case['service_state'],
            ['awaiting_contact','scheduling','booked','in_progress'],true))
            throw new DomainException('service_case_closed_to_upload');
        if($kind==='professional_output'&&$case['service_state']!=='in_progress')
            throw new DomainException('professional_output_requires_in_progress');
        // Replays of an identical uploaded document are idempotent. Parent
        // row lock serialises every upload for this exact paid service case.
        $prior=$pdo->prepare('SELECT id,storage_name,plaintext_size,content_sha256
            FROM commerce_service_files
            WHERE order_id=? AND sku=? AND kind=? AND content_sha256=? LIMIT 1');
        $prior->execute([$order,$sku,$kind,$digest]);$previous=$prior->fetch(PDO::FETCH_ASSOC);
        $existing=is_array($previous)?(string)$previous['id']:null;
        if(is_string($existing)&&validUuid($existing)){
            // A duplicate acknowledgement must never refer to an already
            // missing, replaced or tampered private object. Repair and retry
            // require a separate audited recovery path, not invented success.
            $previousName=(string)$previous['storage_name'];
            if(!preg_match('/^[a-f0-9]{48}\.blob$/D',$previousName)
                ||(int)$previous['plaintext_size']!==$bytes
                ||!hash_equals((string)$previous['content_sha256'],$digest))
                throw new RuntimeException('prior_service_file_record_invalid');
            $priorPath=$base.'/'.$previousName;
            if(is_link($priorPath)||!is_file($priorPath))
                throw new RuntimeException('prior_service_file_storage_missing');
            $priorCipher=@file_get_contents($priorPath);
            if(!is_string($priorCipher)||strlen($priorCipher)>12583000)
                throw new RuntimeException('prior_service_file_cipher_unavailable');
            $priorPlain=jrServiceFileDecrypt($priorCipher,$order,$sku);
            if(strlen($priorPlain)!==$bytes
                ||!hash_equals($digest,hash('sha256',$priorPlain)))
                throw new RuntimeException('prior_service_file_integrity_mismatch');
            unset($priorPlain,$priorCipher);
            if(!$pdo->commit())throw new RuntimeException('service_file_idempotent_commit_failed');
            @unlink($target);
            return ['id'=>$existing,'orderId'=>$order,'sku'=>$sku,
                'kind'=>$kind,'format'=>$extension,'bytes'=>$bytes,
                'registered'=>true,'alreadyRecorded'=>true,
                'availableToBuyer'=>$kind==='client_source',
                'customerNotified'=>false,'deliveryProven'=>false];
        }
        $count=$pdo->prepare('SELECT COUNT(*) FROM commerce_service_files WHERE order_id=? AND sku=? AND kind=?');
        $count->execute([$order,$sku,$kind]);
        if((int)$count->fetchColumn()>=10)throw new DomainException('case_file_limit');
        $q=$pdo->prepare('INSERT INTO commerce_service_files
            (id,order_id,sku,kind,uploader_account_id,storage_name,
             file_extension,mime_type,plaintext_size,content_sha256,consent_version,
             subject_is_minor,guardian_acknowledged)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $q->execute([$fileId,$order,$sku,$kind,$actor,$name,$extension,$mime,$bytes,$digest,
            $consentVersion,$minor,$guardian]);
        if($buyerEmail===null)operationsAudit($pdo,$actor,'commerce_service_file_uploaded',$fileId);
        if(!$pdo->commit())throw new RuntimeException('service_file_commit_failed');
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        @unlink($target);throw $e;
    }
    return ['id'=>$fileId,'orderId'=>$order,'sku'=>$sku,
        'kind'=>$kind,'format'=>$extension,'bytes'=>$bytes,'registered'=>true,
        'availableToBuyer'=>$kind==='client_source',
        'customerNotified'=>false,'deliveryProven'=>false];
}
/**
 * The only customer-visible professional file is the exact output whose ID
 * the owner attested, not every draft stored in a completed service case.
 * Missing evidence table, session-only attestation and invalid proof all
 * fail closed. This is a release gate, not proof of buyer receipt.
 */
function jrServiceFileReleasedDigest(PDO $pdo,string $order,string $sku,string $state): ?string {
    if($state!=='delivered')return null;
    try {
        $q=$pdo->prepare('SELECT evidence_kind,evidence_reference_hmac
            FROM commerce_service_delivery_evidence WHERE order_id=? AND sku=? LIMIT 1');
        $q->execute([$order,$sku]);$proof=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($proof)||$proof['evidence_kind']!=='document_handed_over'
           ||!preg_match('/^[a-f0-9]{64}$/D',(string)$proof['evidence_reference_hmac']))
           return null;
        return (string)$proof['evidence_reference_hmac'];
    }catch(Throwable $e){return null;}
}
function jrServiceFileMatchesRelease(?string $digest,string $order,string $sku,string $id): bool {
    if($digest===null||!validUuid($id))return false;
    $pepper=(string)(cfg()['auth_pepper']??'');
    if(strlen($pepper)<32)return false;
    $candidate=hash_hmac('sha256',
        'jr-service-delivery-v1|'.$order.'|'.$sku.'|document_handed_over|'.$id,
        $pepper);
    return hash_equals($digest,$candidate);
}
function jrServiceFilesList(PDO $pdo,string $order,string $sku,?string $buyerEmail): array {
    if(!jrServiceFilesReady($pdo))throw new RuntimeException('service_files_not_ready');
    $case=jrServiceFilePaidCase($pdo,$order,$sku,$buyerEmail);
    $digest=jrServiceFileReleasedDigest($pdo,$order,$sku,(string)$case['service_state']);
    $q=$pdo->prepare('SELECT id,kind,file_extension,plaintext_size,created_at
        FROM commerce_service_files WHERE order_id=? AND sku=?
        ORDER BY created_at DESC,id DESC LIMIT 30');
    $q->execute([$order,$sku]);$all=$q->fetchAll(PDO::FETCH_ASSOC);
    $receiptReady=function_exists('jrServiceBuyerReceiptSchemaReady')
        &&jrServiceBuyerReceiptSchemaReady($pdo);
    $receipts=$receiptReady?jrServiceBuyerReceiptRows($pdo,$order,$sku):[];
    $released=false;$files=[];
    foreach($all as $file){
        $isOutput=$file['kind']==='professional_output';
        $isReleased=$isOutput&&jrServiceFileMatchesRelease($digest,$order,$sku,(string)$file['id']);
        if($isReleased)$released=true;
        if($buyerEmail===null||!$isOutput||$isReleased){
            $file['releasedToBuyer']=$isReleased;
            $confirmed=$isReleased&&isset($receipts[(string)$file['id']]);
            $file['buyerReceiptConfirmed']=$confirmed;
            $file['buyerReceiptConfirmedAt']=$confirmed?$receipts[(string)$file['id']]:null;
            $files[]=$file;
        }
    }
    return ['files'=>$files,'professionalOutputsReleasedToBuyer'=>$released,
        'buyerReceiptConfirmationAvailable'=>$receiptReady,
        'verifiedPaidServiceCase'=>true];
}
function jrServiceFileDownload(PDO $pdo,string $id,?string $buyerEmail): never {
    if(!validUuid($id)||!jrServiceFilesReady($pdo))
        throw new RuntimeException('file_download_unavailable');
    $q=$pdo->prepare('SELECT id,order_id,sku,kind,storage_name,file_extension,
         mime_type,plaintext_size,content_sha256 FROM commerce_service_files WHERE id=?');
    $q->execute([$id]);$f=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($f))throw new DomainException('file_not_found');
    $case=jrServiceFilePaidCase($pdo,(string)$f['order_id'],(string)$f['sku'],$buyerEmail);
    if($buyerEmail!==null&&$f['kind']==='professional_output'){
        $digest=jrServiceFileReleasedDigest($pdo,(string)$f['order_id'],(string)$f['sku'],
            (string)$case['service_state']);
        if(!jrServiceFileMatchesRelease($digest,(string)$f['order_id'],
            (string)$f['sku'],(string)$f['id']))
            throw new DomainException('professional_output_not_released');
    }
    if(!preg_match('/^[a-f0-9]{48}\.blob$/D',(string)$f['storage_name']))
        throw new RuntimeException('invalid_private_storage_name');
    $base=jrServiceFilesPrivateRoot();
    if($base===null)throw new RuntimeException('private_storage_missing');
    $path=$base.'/'.$f['storage_name'];
    if(is_link($path)||!is_file($path))throw new RuntimeException('private_file_missing');
    $sealed=@file_get_contents($path);
    if(!is_string($sealed)||strlen($sealed)>12583000)throw new RuntimeException('invalid_ciphertext_size');
    $plain=jrServiceFileDecrypt($sealed,(string)$f['order_id'],(string)$f['sku']);
    if(strlen($plain)!==(int)$f['plaintext_size']||
       !hash_equals((string)$f['content_sha256'],hash('sha256',$plain)))
       throw new RuntimeException('private_file_integrity_failed');
    $downloadName=$f['kind']==='professional_output'?'service-deliverable':'service-source';
    header('Cache-Control: private, no-store, max-age=0');
    header('Pragma: no-cache');header('X-Content-Type-Options: nosniff');
    header('Content-Security-Policy: sandbox');
    header('Content-Type: '.$f['mime_type']);header('Content-Length: '.strlen($plain));
    header('Content-Disposition: attachment; filename="'.$downloadName.'-'.substr($id,0,8).'.'.$f['file_extension'].'"');
    echo $plain;exit;
}
