<?php
declare(strict_types=1);
/* JR Manual USDT · BSC only · customer claims and owner-only attestation.
   No blockchain auto-verification or automatic commerce/assessment entitlement.
   Never enable until backup, private storage, SMTP, MFA and staging checks pass. */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
const JR_USDT_RECEIVER='0x21f892a74949B82FF62fCDd0089C53fb145f17B5';
const JR_USDT_CONTRACT='0x55d398326f99059ff775485246999027b3197955';
const JR_USDT_ADMIN_EMAIL='admin@drjavadrezazadeh.com';

function jrUsdtReady(PDO $pdo): bool {
    if(getenv('JR_MANUAL_USDT_ENABLED')!=='true' || getenv('JR_MANUAL_USDT_SCHEMA_APPROVED')!=='true')return false;
    try{$pdo->query('SELECT id FROM manual_usdt_claims LIMIT 0');$pdo->query('SELECT id FROM manual_usdt_audit LIMIT 0');return true;}
    catch(Throwable $e){return false;}
}
function jrUsdtAuth(PDO $pdo): array {
    $a=sessionAccount($pdo);
    if (!$a || ($a['status']??'')!=='active' || empty($a['email_verified_at'])) fail('verified_account_required',401);
    return $a;
}
function jrUsdtCsrf(array $account): string {
    $pepper=(string)(cfg()['auth_pepper']??'');
    $cookie=(string)($_COOKIE[SESSION_COOKIE]??'');
    if(strlen($pepper)<32 || !$cookie)fail('csrf_unavailable',503);
    return hash_hmac('sha256','manual-usdt-bsc-v1|'.tokenHash($cookie).'|'.$account['id'],$pepper);
}
function jrUsdtOriginGuard(array $account): void {
    $origin=(string)($_SERVER['HTTP_ORIGIN']??'');
    $site=(string)($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin');
    if($origin!==SITE_ORIGIN || !in_array($site,['same-origin','none'],true)) fail('origin_forbidden',403);
    $posted=(string)($_SERVER['HTTP_X_JR_USDT_CSRF']??'');
    if(strlen($posted)!==64 || !hash_equals(jrUsdtCsrf($account),$posted))fail('csrf_forbidden',403);
}
function jrUsdtReceiptDir(): string {
    $public=realpath(dirname(__DIR__));
    $home=realpath(dirname(dirname(__DIR__)));
    if(!$public || !$home || str_starts_with($home,$public.DIRECTORY_SEPARATOR)) throw new RuntimeException('private_storage_unavailable');
    $directory=$home.DIRECTORY_SEPARATOR.'.jr-usdt-receipts';
    if(!is_dir($directory) && !@mkdir($directory,0700,false))throw new RuntimeException('private_storage_unavailable');
    $real=realpath($directory);
    if(!$real || !str_starts_with($real,$home.DIRECTORY_SEPARATOR) || !is_writable($real))throw new RuntimeException('private_storage_unavailable');
    @chmod($real,0700);
    return $real;
}
function jrUsdtReceiptUpload(): ?array {
    if(!isset($_FILES['receipt']) || ($_FILES['receipt']['error']??UPLOAD_ERR_NO_FILE)===UPLOAD_ERR_NO_FILE)return null;
    $file=$_FILES['receipt'];$error=(int)($file['error']??UPLOAD_ERR_NO_FILE);
    if($error!==UPLOAD_ERR_OK)fail('invalid_receipt_upload',400);
    $size=(int)($file['size']??0);$temp=(string)($file['tmp_name']??'');
    if($size<=0 || $size>2097152 || !is_uploaded_file($temp))fail('invalid_receipt_upload',400);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($temp);
    $ext=['image/png'=>'png','image/jpeg'=>'jpg','application/pdf'=>'pdf'][$mime]??null;
    if(!$ext)fail('unsupported_receipt_type',415);
    if($mime==='image/jpeg'||$mime==='image/png'){
        $info=@getimagesize($temp);
        if(!is_array($info)||($info[0]??0)>7000||($info[1]??0)>7000)fail('invalid_receipt_image',400);
    }
    try{$dir=jrUsdtReceiptDir();}catch(Throwable $e){fail('private_storage_unavailable',503);}
    $name=bin2hex(random_bytes(20)).'.'.$ext;
    if(!move_uploaded_file($temp,$dir.DIRECTORY_SEPARATOR.$name))fail('receipt_storage_failed',503);
    @chmod($dir.DIRECTORY_SEPARATOR.$name,0600);
    return ['filename'=>$name,'mime'=>$mime,'bytes'=>$size];
}
function jrUsdtValidHash(string $s): bool {
    return preg_match('/^0x[a-fA-F0-9]{64}$/D',$s)===1;
}
function jrUsdtSubmit(PDO $pdo,array $account): never {
    jrUsdtOriginGuard($account);
    if(!rateAllowed($pdo,'manual_usdt_claim',(string)$account['id'],4,3600))fail('rate_limited',429);
    $maxBytes=(int)($_SERVER['CONTENT_LENGTH']??0);
    if($maxBytes<=0||$maxBytes>2300000)fail('payload_too_large',413);
    $purpose=(string)($_POST['purpose']??'');
    if(!in_array($purpose,['donation','bookstore','service','golden_talent','journal_invoice','other'],true))fail('invalid_purpose');
    // A journal payment is not accepted until legitimate manuscript acceptance
    // and finance workflow have been separately authorized.
    if($purpose==='journal_invoice' && (getenv('JR_JOURNAL_APC_OPEN')!=='true' || getenv('JR_JOURNAL_INVOICING_APPROVED')!=='true'))
        fail('journal_payments_not_open',409);
    $hash=trim((string)($_POST['transactionHash']??''));
    if($hash!=='' && !jrUsdtValidHash($hash))fail('invalid_tx_hash');
    $reference=trim((string)($_POST['invoiceReference']??''));
    if($reference!=='' && (strlen($reference)>80||!preg_match('/^[A-Za-z0-9._\-\/ ]{3,80}$/D',$reference)))fail('invalid_invoice_reference');
    $order=trim((string)($_POST['orderId']??''));
    if($order!==''&&!validUuid($order))fail('invalid_order_id');
    if($purpose!=='donation' && $reference==='' && $order==='')fail('official_order_or_invoice_required');
    if($order!==''){
        // Never allow guessing another customer's order UUID or reassignment of a paid BitPay order.
        $query=$pdo->prepare('SELECT state,currency,customer_email FROM commerce_orders WHERE id=? LIMIT 1');
        $query->execute([$order]);$existing=$query->fetch();
        if(!$existing || !hash_equals((string)$account['email_normalized'],(string)$existing['customer_email'])
           || $existing['state']==='paid')fail('order_not_eligible',403);
    }
    $amount=trim((string)($_POST['amountUSDT']??''));
    if($amount!=='' && (!preg_match('/^[0-9]{1,9}(?:\.[0-9]{1,6})?$/D',$amount)||(float)$amount<=0))fail('invalid_amount');
    $receipt=jrUsdtReceiptUpload();
    if($hash==='' && $receipt===null)fail('transaction_hash_or_receipt_required');
    $claim=uuidv4();$now=nowTs();$accountId=(string)$account['id'];
    try{
        $pdo->beginTransaction();
        $pdo->prepare("INSERT INTO manual_usdt_claims
         (id,account_id,purpose,order_id,invoice_reference,amount_claimed,tx_hash,receipt_filename,receipt_mime,receipt_bytes,status,submitted_at,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,'submitted',?,?)")
        ->execute([$claim,$accountId,$purpose,$order!==''?$order:null,$reference!==''?$reference:null,
                   $amount!==''?$amount:null,$hash!==''?strtolower($hash):null,$receipt['filename']??null,
                   $receipt['mime']??null,$receipt['bytes']??null,$now,$now]);
        $pdo->prepare("INSERT INTO manual_usdt_audit(id,claim_id,actor_id,action,at_ts) VALUES(?,?,?,'submitted',?)")
           ->execute([uuidv4(),$claim,$accountId,$now]);
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        if($receipt){try{@unlink(jrUsdtReceiptDir().DIRECTORY_SEPARATOR.$receipt['filename']);}catch(Throwable $ignored){}}
        if($e instanceof PDOException && (string)$e->getCode()==='23000')fail('duplicate_transaction_hash',409);
        error_log('USDT claim storage: '.get_class($e));fail('claim_storage_failed',503);
    }
    // Send a reference and tx hash by SMTP. Files stay outside document root,
    // retrievable only after the admin's fresh MFA, never in a public email URL.
    $mail="New manual BSC USDT claim awaiting review\nClaim: ".$claim."\nPurpose: ".$purpose.
          "\nVerified-account email: ".(string)$account['email_normalized']."\nInvoice/order: ".$reference.' / '.$order.
          "\nCustomer-declared USDT: ".($amount?:'not provided')."\nClaimed transaction: ".($hash?:'receipt submitted without hash').
          "\nPrivate receipt: ".($receipt?'yes, open owner MFA dashboard':'none').
          "\nVerification: inspect chain ID 56, token contract ".JR_USDT_CONTRACT.", recipient ".JR_USDT_RECEIVER.
          ", actual value and confirmations before approval.\nOpen: ".SITE_ORIGIN."/fa/app/admin/\nNever approve based on this email alone.";
    $sent=sendLocalMail(JR_USDT_ADMIN_EMAIL,'BSC USDT evidence for manager review · '.$claim,$mail);
    try{$pdo->prepare("UPDATE manual_usdt_claims SET email_notice_status=?,email_notice_at=? WHERE id=?")
        ->execute([$sent?'accepted':'failed',$sent?nowTs():null,$claim]);}catch(Throwable $e){}
    respond(['ok'=>true,'claimId'=>$claim,'status'=>'submitted','receiptStored'=>$receipt!==null,
        'managerEmailAcceptedBySMTP'=>$sent,'paymentVerified'=>false,'orderFulfilled'=>false],202);
}
function jrUsdtCustomerRoute(string $path,string $verb): never {
    $pdo=db();if(!$pdo||!jrUsdtReady($pdo))fail('manual_usdt_not_available',503);
    $account=jrUsdtAuth($pdo);
    if($path==='/crypto/usdt/csrf' && $verb==='GET')
        respond(['ok'=>true,'csrfToken'=>jrUsdtCsrf($account)]);
    if($path==='/crypto/usdt/claims' && $verb==='GET'){
        $q=$pdo->prepare("SELECT id,purpose,order_id,invoice_reference,amount_claimed,status,submitted_at,updated_at,email_notice_status
                         FROM manual_usdt_claims WHERE account_id=? ORDER BY submitted_at DESC,id DESC LIMIT 30");
        $q->execute([(string)$account['id']]);
        respond(['ok'=>true,'schema'=>'manual-usdt-claims-v1','claims'=>$q->fetchAll()]);
    }
    if($path==='/crypto/usdt/claim' && $verb==='POST')jrUsdtSubmit($pdo,$account);
    fail('not_found',404);
}
function jrUsdtAdminRoute(PDO $pdo,string $accountId,string $path,string $verb,string $csrf): never {
    if(!jrUsdtReady($pdo))fail('manual_usdt_not_available',503);
    if($path==='/admin/operations/crypto/usdt/claims' && $verb==='GET'){
        if(!rateAllowed($pdo,'manual_usdt_admin_view',$accountId,15,300))fail('rate_limited',429);
        $q=$pdo->query("SELECT id,purpose,order_id,invoice_reference,amount_claimed,quote_amount_usdt,tx_hash,
                          receipt_filename IS NOT NULL AS has_receipt,status,submitted_at,email_notice_status
                          FROM manual_usdt_claims ORDER BY submitted_at DESC,id DESC LIMIT 80");
        respond(['ok'=>true,'schema'=>'manual-usdt-admin-v1','claims'=>$q->fetchAll()]);
    }
    if($path==='/admin/operations/crypto/usdt/receipt' && $verb==='GET'){
        $id=(string)($_GET['id']??'');if(!validUuid($id))fail('invalid_claim');
        $q=$pdo->prepare('SELECT receipt_filename,receipt_mime FROM manual_usdt_claims WHERE id=? LIMIT 1');$q->execute([$id]);$row=$q->fetch();
        if(!$row||empty($row['receipt_filename']))fail('receipt_not_found',404);
        $filename=(string)$row['receipt_filename'];
        if(!preg_match('/^[a-f0-9]{40}\.(?:png|jpg|pdf)$/D',$filename))fail('receipt_not_found',404);
        try{$dir=jrUsdtReceiptDir();}catch(Throwable $e){fail('receipt_not_available',503);}
        $file=realpath($dir.DIRECTORY_SEPARATOR.$filename);
        if(!$file||!str_starts_with($file,$dir.DIRECTORY_SEPARATOR)||!is_file($file))fail('receipt_not_found',404);
        header('Content-Type: '.(string)$row['receipt_mime']);
        header('Content-Disposition: attachment; filename="payment-evidence-'.$id.'.'.pathinfo($filename,PATHINFO_EXTENSION).'"');
        header('X-Content-Type-Options: nosniff');header('Content-Security-Policy: sandbox');
        header('Cache-Control: private, no-store, max-age=0');
        header('Content-Length: '.(string)filesize($file));readfile($file);exit;
    }
    if($path==='/admin/operations/crypto/usdt/review' && $verb==='POST'){
        if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))fail('csrf_forbidden',403);
        if(!rateAllowed($pdo,'manual_usdt_admin_review',$accountId,20,3600))fail('rate_limited',429);
        $b=jsonBody();$id=$b['id']??'';$decision=$b['decision']??'';
        if(!is_string($id)||!validUuid($id)||!in_array($decision,['under_review','needs_information','approved','rejected','fulfilled'],true))fail('invalid_decision');
        $note=trim((string)($b['note']??''));if(textLen($note)<12||textLen($note)>1200)fail('review_note_required');
        if($decision==='approved'){
            // Deliberately require attested human chain evidence, not a user-submitted screenshot.
            foreach(['chain56Checked','tokenContractChecked','receiverChecked','amountChecked','confirmationsChecked'] as $field)
                if(($b[$field]??false)!==true)fail('chain_evidence_incomplete',409);
        }
        $at=nowTs();
        try{
            $pdo->beginTransaction();
            $q=$pdo->prepare('SELECT status,tx_hash,purpose,quote_amount_usdt,order_id FROM manual_usdt_claims WHERE id=? FOR UPDATE');
            $q->execute([$id]);$claim=$q->fetch();
            if(!$claim){$pdo->rollBack();fail('claim_not_found',404);}
            $state=(string)$claim['status'];
            $allowed=['submitted'=>['under_review','needs_information','rejected'],'under_review'=>['needs_information','approved','rejected'],
                      'needs_information'=>['under_review','rejected'],'approved'=>['fulfilled']];
            if(!in_array($decision,$allowed[$state]??[],true)){$pdo->rollBack();fail('invalid_state_transition',409);}
            if($decision==='approved'){
                if(!is_string($claim['tx_hash'])||!jrUsdtValidHash($claim['tx_hash'])){$pdo->rollBack();fail('onchain_hash_required',409);}
                if($claim['purpose']==='journal_invoice' && (getenv('JR_JOURNAL_APC_OPEN')!=='true' || getenv('JR_JOURNAL_INVOICING_APPROVED')!=='true')){
                    $pdo->rollBack();fail('journal_payments_not_open',409);
                }
                if($claim['order_id']!==null && $claim['quote_amount_usdt']===null){
                    $pdo->rollBack();fail('official_quote_required',409);
                }
            }
            $u=$pdo->prepare('UPDATE manual_usdt_claims SET status=?,reviewed_by=?,reviewed_at=?,updated_at=?,admin_note=? WHERE id=? AND status=?');
            $u->execute([$decision,$accountId,$at,$at,$note,$id,$state]);
            if($u->rowCount()!==1){$pdo->rollBack();fail('state_conflict',409);}
            $pdo->prepare("INSERT INTO manual_usdt_audit(id,claim_id,actor_id,action,note,at_ts) VALUES(?,?,?,?,?,?)")
                ->execute([uuidv4(),$id,$accountId,$decision,$note,$at]);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();if($e instanceof PDOException)fail('storage_unavailable',503);throw $e;}
        respond(['ok'=>true,'status'=>$decision,'manuallyReviewed'=>true,'providerSettlementVerified'=>false,
            'commerceOrderChanged'=>false,'serviceAccessAutomatic'=>false]);
    }
    fail('not_found',404);
}
