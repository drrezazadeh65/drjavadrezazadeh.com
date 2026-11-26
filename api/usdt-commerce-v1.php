<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
// Owner's BSC deposit screen confirmed the receiver on 2026-11-26.
// These public addresses are not credentials; runtime readiness also checks
// the independently confirmed private host configuration.
const JR_USDT_BSC_RECEIVER='0x21f892a74949B82FF62fCDd0089C53fb145f17B5';
const JR_USDT_BSC_TOKEN='0x55d398326f99059ff775485246999027b3197955';
function jrUsdtAmount(int $micro): string {
    if($micro<0)throw new InvalidArgumentException('invalid_amount');
    return intdiv($micro,1000000).'.'.str_pad((string)($micro%1000000),6,'0',STR_PAD_LEFT);
}
function jrUsdtParseAmount(string $value): int {
    if(!preg_match('/^(0|[1-9][0-9]{0,9})\.([0-9]{6})$/D',$value,$m))
        throw new InvalidArgumentException('invalid_amount');
    return (int)$m[1]*1000000+(int)$m[2];
}
function jrUsdtCalculate(int $toman,int $rateIrr,int $observed,int $now): int {
    if(PHP_INT_SIZE!==8||$toman<1000||$toman>10000000000||$rateIrr<1000||$rateIrr>9999999999||
       $observed<1||$observed>$now||$now-$observed>120)
        throw new InvalidArgumentException('invalid_quote_inputs');
    $n=$toman*10000000;
    $micros=intdiv($n,$rateIrr)+(($n%$rateIrr)!==0?1:0);
    if($micros<100000)throw new InvalidArgumentException('below_exchange_minimum');
    return $micros;
}
function jrUsdtSchemaReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT id,account_id,sku,title,amount_toman,invoice_reference,approved_by,approved_at,expires_at,consumed_order_id FROM commerce_usdt_authorized_offers LIMIT 0');
        $pdo->query('SELECT order_id,account_id,request_id,request_digest,amount_toman,rate_irr,rate_side,amount_micros,receiver,token_contract,rate_observed_at,issued_at,expires_at,status,claimed_hash,settled_hash,credit_reference_hash,transferred_at,credited_micros,reviewer_id,reviewed_at,review_note FROM commerce_usdt_quotes LIMIT 0');
        $q=$pdo->query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('commerce_usdt_quotes','commerce_usdt_authorized_offers')");
        $engines=$q->fetchAll(PDO::FETCH_COLUMN);if(count($engines)!==2||count(array_filter($engines,fn($x)=>strcasecmp((string)$x,'InnoDB')===0))!==2)return false;
        $offerKeys=[];
        foreach($pdo->query('SHOW INDEX FROM commerce_usdt_authorized_offers')->fetchAll(PDO::FETCH_ASSOC) as $idx){if((int)$idx['Non_unique']===0)$offerKeys[$idx['Key_name']][(int)$idx['Seq_in_index']]=$idx['Column_name'];}
        foreach($offerKeys as &$k)ksort($k);unset($k);
        if(array_values($offerKeys['uq_usdt_offer_invoice']??[])!==['account_id','invoice_reference']||array_values($offerKeys['uq_usdt_offer_order']??[])!==['consumed_order_id'])return false;
        $keys=[];
        foreach($pdo->query('SHOW INDEX FROM commerce_usdt_quotes')->fetchAll(PDO::FETCH_ASSOC) as $idx){
            if((int)$idx['Non_unique']===0)$keys[$idx['Key_name']][(int)$idx['Seq_in_index']]=$idx['Column_name'];
        }
        foreach($keys as &$key)ksort($key);unset($key);
        return array_values($keys['PRIMARY']??[])===['order_id']
          &&array_values($keys['uq_usdt_request']??[])===['account_id','request_id']
          &&array_values($keys['uq_usdt_settled_hash']??[])===['settled_hash']
          &&array_values($keys['uq_usdt_credit_ref']??[])===['credit_reference_hash'];
    }catch(Throwable $e){return false;}
}
function jrUsdtReady(?PDO $pdo): bool {
    $c=cfg();
    return $pdo!==null&&($c['usdt_bsc_enabled']??false)===true
      &&($c['usdt_bsc_schema_approved']??false)===true
      &&($c['public_tls_confirmed']??false)===true
      &&($c['commerce_enabled']??false)===true
      &&($c['order_email_fulfilment_confirmed']??false)===true
      &&hash_equals(strtolower(JR_USDT_BSC_RECEIVER),strtolower((string)($c['usdt_bsc_receiver']??'')))
      &&hash_equals(strtolower(JR_USDT_BSC_TOKEN),strtolower((string)($c['usdt_bsc_contract']??'')))
      &&in_array($c['usdt_bsc_rate_side']??null,['buyIRR','sellIRR'],true)
      &&commerceSchemaReady()&&stage9SchemaReady($pdo)&&jrUsdtSchemaReady($pdo);
}
function jrUsdtAccount(PDO $pdo): array {
    $a=sessionAccount($pdo);
    if(!$a||($a['status']??'')!=='active'||empty($a['email_verified_at'])||
       !validUuid((string)$a['id'])||!validEmail((string)$a['email_normalized']))
        fail('verified_account_required',401);
    return $a;
}
function jrUsdtCustomerCsrf(array $a): string {
    $cookie=(string)($_COOKIE[SESSION_COOKIE]??'');
    $pepper=(string)(cfg()['auth_pepper']??'');
    if(strlen($pepper)<32||$cookie==='')fail('csrf_unavailable',503);
    return hash_hmac('sha256','usdt-commerce-v1|'.tokenHash($cookie).'|'.$a['id'],$pepper);
}
function jrUsdtCustomerMutation(array $a): void {
    requirePostOrigin();
    if(!hash_equals(jrUsdtCustomerCsrf($a),(string)($_SERVER['HTTP_X_JR_USDT_CSRF']??'')))
        fail('csrf_forbidden',403);
}
function jrUsdtQuoteRow(PDO $pdo,string $order,string $account): ?array {
    $q=$pdo->prepare('SELECT * FROM commerce_usdt_quotes WHERE order_id=? AND account_id=?');
    $q->execute([$order,$account]);$r=$q->fetch(PDO::FETCH_ASSOC);
    return is_array($r)?$r:null;
}
function jrUsdtQuoteView(array $r,bool $mayPay,?PDO $pdo=null): array {
    $available=$mayPay&&$r['status']==='issued'&&(int)$r['expires_at']>=time();
    $verified=false;
    if($pdo&&$r['status']==='settled'){
        $q=$pdo->prepare('SELECT state,paid_at,provider_id_get,provider_trans_id,provider_amount FROM commerce_orders WHERE id=?');
        $q->execute([$r['order_id']]);$order=$q->fetch(PDO::FETCH_ASSOC);
        $verified=is_array($order)&&jrUsdtVerifiedOrder($pdo,(string)$r['order_id'],$order);
    }
    return ['orderId'=>$r['order_id'],'status'=>$r['status'],'amountToman'=>(int)$r['amount_toman'],
      'amountUsdt'=>jrUsdtAmount((int)$r['amount_micros']),'rateIrr'=>(string)$r['rate_irr'],
      'rateSide'=>$r['rate_side'],'transferredAt'=>$r['transferred_at']===null?null:(int)$r['transferred_at'],'reviewedAt'=>$r['reviewed_at']===null?null:(int)$r['reviewed_at'],'issuedAt'=>(int)$r['issued_at'],'expiresAt'=>(int)$r['expires_at'],
      'mayTransfer'=>$available,'chainId'=>56,'network'=>'BSC / BEP20','tokenDecimals'=>18,
      'receiveAddress'=>$available?$r['receiver']:null,'tokenContract'=>$available?$r['token_contract']:null,
      'transactionHash'=>$r['claimed_hash'],'paymentVerified'=>$verified];
}
function jrUsdtProductLines(array $b,array $account,PDO $pdo): array {
    $email=(string)$account['email_normalized'];
    if(($b['purpose']??'')==='authorized'){
        $id=$b['offerId']??null;if(!is_string($id)||!validUuid($id))fail('invalid_offer');
        $q=$pdo->prepare('SELECT * FROM commerce_usdt_authorized_offers WHERE id=? AND account_id=? AND consumed_order_id IS NULL AND expires_at>=?');
        $q->execute([$id,$account['id'],time()]);$offer=$q->fetch(PDO::FETCH_ASSOC);
        if(!$offer||!preg_match('/^service:jrei_[a-z0-9_-]{1,40}$/D',(string)$offer['sku']))fail('offer_unavailable',409);
        $total=(int)$offer['amount_toman'];if($total<1000||$total>10000000000)fail('invalid_total');
        $raw=$b['customer']??null;if(!is_array($raw))fail('customer_required');$raw['email']=$email;
        return [[['sku'=>$offer['sku'],'title'=>$offer['title'],'kind'=>'service','quantity'=>1,
          'price'=>$total,'subtotal'=>$total,'approvedOfferId'=>$id,'invoiceReference'=>$offer['invoice_reference']]],
          $total,normalizedServiceBuyer($raw),$offer];
    }

    if(($b['purpose']??'')==='donation'){
        $amount=$b['amountToman']??null;$focus=(string)($b['focus']??'general');
        if(!is_int($amount)||$amount<1000||$amount>10000000||
          !in_array($focus,['general','scholarship','books','services','essentials'],true))
            fail('invalid_donation_amount');
        return [[['sku'=>'support:students','title'=>'Student educational support / حمایت تحصیلی',
          'kind'=>'donation','program'=>'talented-students-v1','focus'=>$focus,
          'allocation'=>'pending_verified_need','quantity'=>1,'price'=>$amount,'subtotal'=>$amount]],$amount,null,null];
    }
    $items=$b['items']??null;
    if(!is_array($items)||count($items)<1||count($items)>20)fail('invalid_items');
    $catalog=localCatalog();$counts=[];
    foreach($items as $item){
        $sku=$item['sku']??null;$n=$item['quantity']??null;
        if(!is_string($sku)||!isset($catalog[$sku])||!is_int($n)||$n<1||$n>20)fail('invalid_item');
        $counts[$sku]=($counts[$sku]??0)+$n;
    }
    $lines=[];$total=0;$book=false;$digital=false;
    foreach($counts as $sku=>$n){
        $x=$catalog[$sku];
        if(!in_array($x['kind'],['book','service','vip','digital'],true)||$n>20||
          ($x['kind']!=='book'&&$n!==1)||(($x['single_copy']??false)&&$n!==1))fail('invalid_quantity');
        if($x['kind']==='book'){$book=true;}
        if($x['kind']==='digital'){$digital=true;}
        if(($x['single_copy']??false)&&!stage9SingleCopyAvailable($pdo,$sku))fail('stock_unavailable',409);
        $sub=$x['price']*$n;$total+=$sub;$lines[]=array_merge($x,['quantity'=>$n,'subtotal'=>$sub]);
    }
    if($total<1000||$total>1000000000||($digital&&count($counts)!==1))fail('invalid_total');
    if($book&&!stage9BookStockReady($pdo)&&!(count($counts)===1&&isset($counts['book:websters-third-1981'])))
        fail('inventory_not_reconciled',503);
    $raw=$b['customer']??null;if(!is_array($raw))fail('customer_required');
    $raw['email']=$email;
    return [$lines,$total,$book?normalizedCustomer($raw):normalizedServiceBuyer($raw),null];
}
function jrUsdtIssue(PDO $pdo,array $a,array $b,?callable $fixtureRateReader=null): array {
    $request=$b['requestId']??null;
    if(!is_string($request)||!validUuid($request))fail('invalid_request_id');
    $account=(string)$a['id'];
    $digest=hash('sha256',json_encode($b,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE));
    $q=$pdo->prepare('SELECT * FROM commerce_usdt_quotes WHERE account_id=? AND request_id=?');
    $q->execute([$account,$request]);$old=$q->fetch(PDO::FETCH_ASSOC);
    if($old){if(!hash_equals($old['request_digest'],$digest))fail('idempotency_conflict',409);return jrUsdtQuoteView($old,true,$pdo);}
    if(!rateAllowed($pdo,'usdt_quote',$account,5,3600))fail('rate_limited',429);
    [$lines,$total,$customer,$offer]=jrUsdtProductLines($b,$a,$pdo);
    if($fixtureRateReader===null)require_once __DIR__.'/ramzinex-public-usdt-rate.php';
    $side=cfg()['usdt_bsc_rate_side'];
    try{
        $tick=$fixtureRateReader===null?jrReadPublicUsdtRate():$fixtureRateReader();$now=time();$observed=strtotime((string)$tick['receivedAt']);
        // The public reader normalizes exactly once to IRR. Only whole-rial
        // rate units are used; floor is disclosed and avoids underquoting.
        if($observed===false||!is_numeric($tick[$side]??null))throw new RuntimeException('rate_unavailable');
        $rate=(int)floor((float)$tick[$side]);
        $micros=jrUsdtCalculate($total,$rate,$observed,$now);
    }catch(InvalidArgumentException $e){fail($e->getMessage(),409);}
     catch(Throwable $e){fail('public_market_rate_unavailable',503);}
    $order=uuidv4();$factor=bin2hex(random_bytes(16));$expires=$now+900;
    $pdo->beginTransaction();
    try{
        // At most one open payment per account; serialize on the existing account row.
        $lock=$pdo->prepare('SELECT id FROM customer_accounts WHERE id=? FOR UPDATE');$lock->execute([$account]);
        if(!$lock->fetchColumn())throw new RuntimeException('account_missing');
        $q->execute([$account,$request]);$existing=$q->fetch(PDO::FETCH_ASSOC);
        if($existing){
            $pdo->commit();
            if(!hash_equals($existing['request_digest'],$digest))fail('idempotency_conflict',409);
            return jrUsdtQuoteView($existing,true,$pdo);
        }
        $open=$pdo->prepare("SELECT COUNT(*) FROM commerce_usdt_quotes WHERE account_id=? AND status IN ('issued','submitted')");
        $open->execute([$account]);if((int)$open->fetchColumn()>0)throw new RuntimeException('open_invoice_exists');
        if($offer!==null){
            $ol=$pdo->prepare('SELECT * FROM commerce_usdt_authorized_offers WHERE id=? AND account_id=? FOR UPDATE');
            $ol->execute([$offer['id'],$account]);$current=$ol->fetch(PDO::FETCH_ASSOC);
            if(!$current||$current['consumed_order_id']!==null||(int)$current['expires_at']<time()||
               $current['sku']!==$offer['sku']||$current['title']!==$offer['title']||
               (int)$current['amount_toman']!==$total||$current['invoice_reference']!==$offer['invoice_reference'])
                throw new RuntimeException('offer_changed');
        }
        stage9ReserveBooks($pdo,$order,$lines);
        $pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,customer_email,customer_json,items_json,state,provider_id_get) VALUES(?,?,?,?,'IRT',?,?,?,'pending',?)")
           ->execute([$order,$factor,$total,$total*10,$a['email_normalized'],$customer===null?null:json_encode($customer,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),json_encode($lines,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),'usdt:'.$order]);
        $pdo->prepare('INSERT INTO commerce_usdt_quotes(order_id,account_id,request_id,request_digest,amount_toman,rate_irr,rate_side,amount_micros,receiver,token_contract,rate_observed_at,issued_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
          ->execute([$order,$account,$request,$digest,$total,$rate,$side,$micros,JR_USDT_BSC_RECEIVER,JR_USDT_BSC_TOKEN,$observed,$now,$expires]);
        if($offer!==null){
            $u=$pdo->prepare('UPDATE commerce_usdt_authorized_offers SET consumed_order_id=? WHERE id=? AND consumed_order_id IS NULL');
            $u->execute([$order,$offer['id']]);if($u->rowCount()!==1)throw new RuntimeException('offer_consumption_conflict');
        }
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        fail($e->getMessage()==='open_invoice_exists'?'open_invoice_exists':'invoice_creation_failed',409);
    }
    $row=jrUsdtQuoteRow($pdo,$order,$account);
    if(!$row)fail('invoice_lookup_failed',503);
    return jrUsdtQuoteView($row,true,$pdo);
}
function jrUsdtClaim(PDO $pdo,array $a,array $b): array {
    $id=$b['orderId']??null;$hash=strtolower((string)($b['transactionHash']??''));
    if(!is_string($id)||!validUuid($id)||!preg_match('/^0x[a-f0-9]{64}$/D',$hash))fail('invalid_claim');
    if(!rateAllowed($pdo,'usdt_claim',(string)$a['id'],8,3600))fail('rate_limited',429);
    $q=$pdo->prepare("UPDATE commerce_usdt_quotes SET claimed_hash=?,status='submitted' WHERE order_id=? AND account_id=? AND status='issued'");
    $q->execute([$hash,$id,$a['id']]);
    $row=jrUsdtQuoteRow($pdo,$id,(string)$a['id']);
    if(!$row||!in_array($row['status'],['submitted','settled'],true)||!hash_equals((string)$row['claimed_hash'],$hash))
        fail('claim_conflict',409);
    // A submitted hash never establishes ownership, receipt, or settlement.
    return jrUsdtQuoteView($row,false,$pdo);
}
function jrUsdtRoute(string $path,string $verb): never {
    header('Cache-Control: private, no-store, max-age=0');
    $pdo=db();$ready=jrUsdtReady($pdo);
    if($path==='/crypto/usdt/options'&&$verb==='GET')
        respond(['ok'=>true,'enabled'=>$ready,'requiresVerifiedAccount'=>true,'manualCreditReview'=>true,'chainId'=>56,'minimumUsdt'=>'0.100000']);
    if(!$pdo||!jrUsdtSchemaReady($pdo))fail('usdt_schema_unavailable',503);
    $a=jrUsdtAccount($pdo);
    // Prior invoices and claims stay readable/submit-able if new quote creation is paused.
    if($path==='/crypto/usdt/invoices'&&$verb==='GET'){
        $q=$pdo->prepare('SELECT * FROM commerce_usdt_quotes WHERE account_id=? ORDER BY issued_at DESC LIMIT 30');
        $q->execute([$a['id']]);$rows=array_map(fn($r)=>jrUsdtQuoteView($r,$ready,$pdo),$q->fetchAll(PDO::FETCH_ASSOC));
        respond(['ok'=>true,'csrfToken'=>jrUsdtCustomerCsrf($a),'enabled'=>$ready,'invoices'=>$rows]);
    }
    if($path==='/crypto/usdt/claim'&&$verb==='POST'){jrUsdtCustomerMutation($a);respond(['ok'=>true,'invoice'=>jrUsdtClaim($pdo,$a,jsonBody())]);}
    if(!$ready)fail('usdt_checkout_disabled',503);
    if($path==='/crypto/usdt/catalog'&&$verb==='GET'){
        $items=[];foreach(localCatalog() as $x){if(in_array($x['kind'],['book','service','vip','digital'],true))
            $items[]=['sku'=>$x['sku'],'title'=>$x['title'],'kind'=>$x['kind'],'priceToman'=>$x['price']];}
        $q=$pdo->prepare('SELECT id,title,amount_toman,invoice_reference,expires_at FROM commerce_usdt_authorized_offers WHERE account_id=? AND consumed_order_id IS NULL AND expires_at>=? ORDER BY approved_at DESC LIMIT 30');
        $q->execute([$a['id'],time()]);
        respond(['ok'=>true,'items'=>$items,'approvedOffers'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
    }
    if($path==='/crypto/usdt/quote'&&$verb==='POST'){jrUsdtCustomerMutation($a);respond(['ok'=>true,'invoice'=>jrUsdtIssue($pdo,$a,jsonBody())],201);}
    fail('not_found',404);
}
/** Settlement is explicit owner reconciliation of the exchange credit, not
 * proof inferred from a submitted hash. No private exchange key, trading,
 * withdrawals, automatic refunds, or unsupervised settlement. */
function jrUsdtSettlement(PDO $pdo,string $actor,array $b): bool {
    $order=$b['orderId']??null;$hash=strtolower((string)($b['transactionHash']??''));
    $action=$b['action']??null;
    $note=trim((string)($b['note']??''));
    if(!is_string($order)||!validUuid($order)||!in_array($action,['settle','cancel'],true)||strlen($note)<12||strlen($note)>1000)
        throw new InvalidArgumentException('invalid_review');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT * FROM commerce_orders WHERE id=? FOR UPDATE');$q->execute([$order]);$o=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->prepare('SELECT * FROM commerce_usdt_quotes WHERE order_id=? FOR UPDATE');$q->execute([$order]);$r=$q->fetch(PDO::FETCH_ASSOC);
        if(!$o||!$r||$o['state']!=='pending'||$o['provider_id_get']!=='usdt:'.$order||
          (int)$o['amount_toman']!==(int)$r['amount_toman']||(int)$o['provider_amount']!==(int)$r['amount_toman']*10||
          !empty($o['provider_trans_id'])||!empty($o['paid_at']))throw new RuntimeException('order_conflict');
        if($action==='cancel'){
            if(!in_array($r['status'],['issued','submitted'],true)||($b['noCreditOrPendingTransferConfirmed']??false)!==true)
                throw new RuntimeException('cancellation_unverified');
            stage9ReleaseBooks($pdo,$order);
            $pdo->prepare("UPDATE commerce_orders SET state='cancelled',updated_at=NOW() WHERE id=? AND state='pending'")->execute([$order]);
            $pdo->prepare("UPDATE commerce_usdt_quotes SET status='cancelled',reviewer_id=?,reviewed_at=?,review_note=? WHERE order_id=?")->execute([$actor,time(),$note,$order]);
            $pdo->commit();return true;
        }
        if($r['status']!=='submitted'||!preg_match('/^0x[a-f0-9]{64}$/D',$hash)||!hash_equals((string)$r['claimed_hash'],$hash))
            throw new RuntimeException('claim_not_reviewable');
        foreach(['exchangeCreditConfirmed','senderOwnershipConfirmed','chain56Confirmed','tokenContractConfirmed','receiverConfirmed','finalityConfirmed'] as $field)
            if(($b[$field]??null)!==true)throw new RuntimeException('credit_evidence_incomplete');
        $credit=trim((string)($b['creditReference']??''));
        $at=$b['transferredAt']??null;
        $amount=jrUsdtParseAmount((string)($b['creditedAmountUsdt']??''));
        if(strlen($credit)<4||strlen($credit)>120||!is_int($at)||$at<(int)$r['issued_at']||$at>(int)$r['expires_at']||$at>time()||
           $amount!==(int)$r['amount_micros'])throw new RuntimeException('credit_amount_time_or_reference_mismatch');
        $items=json_decode((string)$o['items_json'],true,32,JSON_THROW_ON_ERROR);
        if(!is_array($items)||!$items)throw new RuntimeException('invalid_order_items');
        // Canonical IRT accounting value matches the immutable quote.
        // Actual token amount and independently credited exchange reference
        // are preserved in the USDT ledger, never confused with bank IRR.
        $pdo->prepare("INSERT INTO commerce_payment_claims(provider,transaction_id,order_id,verified_amount) VALUES('usdt_bsc',?,?,?)")
          ->execute([$hash,$order,(int)$o['provider_amount']]);
        stage9CommitBooks($pdo,$order,$items);
        $hasBooks=false;$hasDigital=false;$seen=[];
        $case=$pdo->prepare("INSERT INTO commerce_service_cases(order_id,sku,status) VALUES(?,?,'awaiting_contact')");
        foreach($items as $item){
            $kind=$item['kind']??null;$sku=(string)($item['sku']??'');
            if($kind==='book')$hasBooks=true;
            if($kind==='digital')$hasDigital=true;
            if(in_array($kind,['service','vip'],true)){
                if(isset($seen[$sku])||($item['quantity']??null)!==1||!preg_match('/^(?:service|vip):[a-z0-9_-]{1,60}$/D',$sku))
                    throw new RuntimeException('invalid_service_line');
                $seen[$sku]=true;$case->execute([$order,$sku]);
            }
        }
        if($hasBooks)$pdo->prepare("INSERT INTO commerce_parcels(order_id,state) VALUES(?,'preparing')")->execute([$order]);
        if($hasDigital)jrPubCommitVerifiedDigitalOrder($pdo,$order,$items);
        $u=$pdo->prepare("UPDATE commerce_orders SET state='paid',provider_trans_id=?,paid_at=NOW(),updated_at=NOW() WHERE id=? AND state='pending' AND provider_id_get=?");
        $u->execute([$hash,$order,'usdt:'.$order]);if($u->rowCount()!==1)throw new RuntimeException('state_conflict');
        $u=$pdo->prepare("UPDATE commerce_usdt_quotes SET status='settled',settled_hash=?,credit_reference_hash=?,transferred_at=?,credited_micros=?,reviewer_id=?,reviewed_at=?,review_note=? WHERE order_id=? AND status='submitted'");
        $u->execute([$hash,hash('sha256',strtolower($credit)),$at,$amount,$actor,time(),$note,$order]);
        if($u->rowCount()!==1)throw new RuntimeException('quote_conflict');
        $pdo->prepare("INSERT INTO commerce_outbox(event_key,order_id,event_type) VALUES(?,?,'order_paid')")->execute(['order_paid:'.$order,$order]);
        $pdo->commit();return true;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function jrUsdtAdmin(PDO $pdo,string $account,string $path,string $verb,string $csrf,array $cfg): never {
    header('Cache-Control: private, no-store, max-age=0');
    if(($cfg['operations_admins'][$account]['role']??'')!=='SUPER_ADMIN')fail('super_admin_required',403);
    if(!jrUsdtSchemaReady($pdo)||!stage9SchemaReady($pdo))fail('usdt_schema_unavailable',503);
    if($path==='/admin/operations/usdt/offer'&&$verb==='POST'){
        if(!jrUsdtReady($pdo))fail('usdt_checkout_disabled',503);
        if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))fail('csrf_forbidden',403);
        if(!rateAllowed($pdo,'usdt_admin_offer',$account,20,3600))fail('rate_limited',429);
        $b=jsonBody();$email=emailNorm($b['email']??'');$slug=(string)($b['serviceCode']??'');
        $title=trim((string)($b['title']??''));$amount=$b['amountToman']??null;$reference=trim((string)($b['invoiceReference']??''));
        if(($b['contractAndCapacityConfirmed']??false)!==true||!validEmail($email)||!preg_match('/^[a-z0-9_-]{1,40}$/D',$slug)||
          textLen($title)<3||textLen($title)>160||!is_int($amount)||$amount<1000||$amount>10000000000||
          !preg_match('/^[A-Za-z0-9._\/-]{4,100}$/D',$reference))fail('invalid_authorized_offer');
        $q=$pdo->prepare("SELECT id FROM customer_accounts WHERE email_normalized=? AND status='active' AND email_verified_at IS NOT NULL");
        $q->execute([$email]);$id=$q->fetchColumn();if(!$id)fail('verified_customer_required',409);
        $offer=uuidv4();$now=time();
        try{
            $pdo->prepare('INSERT INTO commerce_usdt_authorized_offers(id,account_id,sku,title,amount_toman,invoice_reference,approved_by,approved_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)')
              ->execute([$offer,$id,'service:jrei_'.$slug,$title,$amount,$reference,$account,$now,$now+604800]);
        }catch(Throwable $e){fail('authorized_offer_conflict',409);}
        respond(['ok'=>true,'offerId'=>$offer,'expiresAt'=>$now+604800,'paymentVerified'=>false],201);
    }
    if($path==='/admin/operations/usdt/invoices'&&$verb==='GET'){
        if(!rateAllowed($pdo,'usdt_admin_view',$account,20,300))fail('rate_limited',429);
        $q=$pdo->query("SELECT q.order_id,q.status,q.amount_toman,q.amount_micros,q.claimed_hash,q.receiver,q.token_contract,q.issued_at,q.expires_at,o.customer_email FROM commerce_usdt_quotes q JOIN commerce_orders o ON o.id=q.order_id WHERE q.status IN ('issued','submitted') ORDER BY q.issued_at ASC LIMIT 100");
        respond(['ok'=>true,'invoices'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
    }
    if($path==='/admin/operations/usdt/review'&&$verb==='POST'){
        if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))fail('csrf_forbidden',403);
        if(!rateAllowed($pdo,'usdt_admin_review',$account,20,3600))fail('rate_limited',429);
        try{$b=jsonBody();jrUsdtSettlement($pdo,$account,$b);}
        catch(Throwable $e){error_log('USDT reconciliation rejected: '.get_class($e));fail('usdt_review_rejected',409);}
        respond(['ok'=>true,'status'=>$b['action']==='settle'?'settled':'cancelled']);
    }
    fail('not_found',404);
}
/** For canonical customer history/receipt checks, preserve existing BitPay
 * verification and require the separate reconciled ledger for USDT. */
function jrUsdtVerifiedOrder(PDO $pdo,string $id,array $row): bool {
    if(($row['state']??null)!=='paid'||($row['provider_id_get']??'')!=='usdt:'.$id||
      empty($row['paid_at'])||!preg_match('/^0x[a-f0-9]{64}$/D',(string)($row['provider_trans_id']??'')))return false;
    try{
        $q=$pdo->prepare("SELECT 1 FROM commerce_usdt_quotes q JOIN commerce_payment_claims p ON p.order_id=q.order_id AND p.provider='usdt_bsc' AND p.transaction_id=q.settled_hash WHERE q.order_id=? AND q.status='settled' AND q.credited_micros=q.amount_micros AND q.credit_reference_hash IS NOT NULL AND q.reviewer_id IS NOT NULL AND q.settled_hash=? AND p.verified_amount=? AND q.amount_toman*10=p.verified_amount");
        $q->execute([$id,$row['provider_trans_id'],$row['provider_amount']]);return (bool)$q->fetchColumn();
    }catch(Throwable $e){return false;}
}

/** The aliases p and o are fixed by the two publishing queries. Use the
 * historical BitPay predicate when the additive USDT schema is absent. */
function jrUsdtPublishingClaimPredicate(PDO $pdo): string {
    if(!jrUsdtSchemaReady($pdo))return "p.provider='bitpay'";
    return "(p.provider='bitpay' OR (p.provider='usdt_bsc'
      AND o.provider_id_get=CONCAT('usdt:',o.id)
      AND EXISTS (SELECT 1 FROM commerce_usdt_quotes uq
       WHERE uq.order_id=o.id AND uq.status='settled'
        AND uq.settled_hash=p.transaction_id AND uq.credited_micros=uq.amount_micros
        AND uq.amount_toman*10=p.verified_amount AND uq.credit_reference_hash IS NOT NULL
        AND uq.reviewer_id IS NOT NULL)))";
}
