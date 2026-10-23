<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-exam-deterministic-scoring.php';

/**
 * Original MFA SUPER_ADMIN entitlement governance, not a payment provider.
 *
 * Payment access may be materialised ONLY from an already finalised original
 * commerce order with the matching exam SKU and provider-confirmed claim.
 * No browser-controlled payment proof, manually typed transaction number,
 * free "paid" grant, automatic refund or unauthorised activation.
 */
function jrExamOwnerEntitlementPolicy(array $cfg): array {
    return [
        'schema'=>'jr.jrei.exam-entitlement-governance.v1',
        'grantSwitchEnabled'=>($cfg['jrei_exam_verified_entitlement_grants_enabled']??false)===true,
        'commercialSwitchEnabled'=>($cfg['jrei_exam_commercial_enabled']??false)===true,
        'checkoutBridgeOwnerOptIn'=>($cfg['jrei_exam_checkout_bridge_accepted']??false)===true,
        'liveCheckoutVerified'=>false,
        'paymentProviderIntegrationAccepted'=>false,
        'automaticEntitlementGrantEnabled'=>false,
        'automaticRefundEnabled'=>false,
        'explicitOwnerReviewRequired'=>true
    ];
}

/**
 * A limited administrative exception queue; never return learner name,
 * email, phone, actual order token, responses or a provider transaction.
 * Case IDs are opaque UUIDs usable only from the original MFA route.
 */
function jrExamOwnerEntitlementExposure(PDO $pdo,array $cfg): array {
    $out=jrExamOwnerEntitlementPolicy($cfg)+[
      'schemaReady'=>false,'exposureCount'=>null,
      'cases'=>[],'truncated'=>false,
      'ownerDispositionRequired'=>true
    ];
    if(!jrExamCommercialSchemaReady($pdo))return $out;
    try {
        $sql="SELECT e.entitlement_id,e.offering_id,
           e.grant_reason,e.state,e.revision,e.expires_at,
           o.offering_state,p.product_state,p.product_code,
           a.attempt_id,
           CASE WHEN a.attempt_state='IN_PROGRESS' THEN 1 ELSE 0 END AS active_attempt
          FROM jrei_exam_commercial_entitlements e
          JOIN jrei_exam_commercial_offerings o ON o.offering_id=e.offering_id
          JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
          LEFT JOIN jrei_exam_commercial_attempts a
            ON a.entitlement_id=e.entitlement_id AND a.attempt_state='IN_PROGRESS'
          WHERE e.state='ACTIVE' AND
            (o.offering_state='SUSPENDED' OR p.product_state='SUSPENDED')
          ORDER BY e.created_at ASC,e.entitlement_id ASC
          LIMIT 41";
        $rows=$pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        $out['schemaReady']=true;
        $out['truncated']=count($rows)>40;
        $seen=[];
        foreach(array_slice($rows,0,40) as $r) {
            if(isset($seen[$r['entitlement_id']]))continue;
            $seen[$r['entitlement_id']]=true;
            $out['cases'][]=[
              'entitlementId'=>(string)$r['entitlement_id'],
              'offeringId'=>(string)$r['offering_id'],
              'productCode'=>(string)$r['product_code'],
              'grantReason'=>(string)$r['grant_reason'],
              'entitlementState'=>(string)$r['state'],
              'offeringState'=>(string)$r['offering_state'],
              'productState'=>(string)$r['product_state'],
              'revision'=>(int)$r['revision'],
              'entitlementExpiresAt'=>(int)$r['expires_at'],
              'hasActiveAttempt'=>(int)$r['active_attempt']===1,
              'refundIssued'=>false,
              'customerIdentityIncluded'=>false
            ];
        }
        $q=$pdo->query("SELECT COUNT(DISTINCT e.entitlement_id)
           FROM jrei_exam_commercial_entitlements e
           JOIN jrei_exam_commercial_offerings o ON o.offering_id=e.offering_id
           JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
           WHERE e.state='ACTIVE' AND
             (o.offering_state='SUSPENDED' OR p.product_state='SUSPENDED')");
        $out['exposureCount']=(int)$q->fetchColumn();
    }catch(Throwable $e){
        $out['schemaReady']=false;$out['cases']=[];$out['exposureCount']=null;
    }
    return $out;
}

/**
 * Explicit revocation only, with reason and revision. Revocation does NOT
 * quietly release buyer obligations or delete saved assessment responses.
 */
function jrExamOwnerRevokeEntitlement(PDO $pdo,string $actor,array $body): array {
    if(!jrExamCommercialSchemaReady($pdo))
        throw new DomainException('exam_entitlement_schema_unavailable');
    $id=$body['entitlementId']??null;
    $rev=$body['revision']??null;
    $reason=$body['reasonCode']??null;
    if(!is_string($id)||!validUuid($id)||
       !is_int($rev)||$rev<1||
       !in_array($reason,[
         'CUSTOMER_REFUND_REVIEW_REQUIRED',
         'PAYMENT_REVERSAL_REVIEW_REQUIRED',
         'SOURCE_RIGHTS_REVOKED',
         'ASSESSMENT_ACCESS_SUSPENDED',
         'OWNER_SECURITY_HOLD'
       ],true)||
       ($body['confirmation']??null)!=='REVOKE_EXAM_ACCESS_KEEP_BUYER_RIGHTS')
        throw new InvalidArgumentException('invalid_exam_entitlement_revocation');
    $pdo->beginTransaction();
    try{
        $find=$pdo->prepare('SELECT offering_id FROM jrei_exam_commercial_entitlements WHERE entitlement_id=?');
        $find->execute([$id]);
        $offering=$find->fetchColumn();
        if(!is_string($offering))throw new DomainException('entitlement_not_found');
        $lock=$pdo->prepare('SELECT offering_id FROM jrei_exam_commercial_offerings WHERE offering_id=? FOR UPDATE');
        $lock->execute([$offering]);
        if($lock->fetchColumn()===false)throw new DomainException('offering_not_found');
        $q=$pdo->prepare("SELECT e.offering_id,e.revision,e.state,
             e.revoked_at,e.grant_reason,e.verified_order_id,
             o.offering_state,p.product_state
           FROM jrei_exam_commercial_entitlements e
           JOIN jrei_exam_commercial_offerings o ON o.offering_id=e.offering_id
           JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
           WHERE e.entitlement_id=? FOR UPDATE");
        $q->execute([$id]);$r=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($r)||$r['state']!=='ACTIVE'||
           $r['revoked_at']!==null||(int)$r['revision']!==$rev)
            throw new DomainException('exam_entitlement_revision_conflict');
        if(!in_array($reason,['OWNER_SECURITY_HOLD','CUSTOMER_REFUND_REVIEW_REQUIRED',
                   'PAYMENT_REVERSAL_REVIEW_REQUIRED'],true)&&
           $r['offering_state']!=='SUSPENDED'&&
           $r['product_state']!=='SUSPENDED')
            throw new DomainException('exam_entitlement_not_under_hold');
        // Refund/reversal reasons are attestations for owner audit, NOT
        // generated refunds or evidence of bank settlement. The original
        // commerce ledger remains the only financial authority.
        $q=$pdo->prepare("UPDATE jrei_exam_commercial_entitlements
             SET state='REVOKED',revoked_at=?,revision=revision+1
             WHERE entitlement_id=? AND revision=? AND state='ACTIVE'
               AND revoked_at IS NULL");
        $q->execute([time(),$id,$rev]);
        if($q->rowCount()!==1)
            throw new DomainException('exam_entitlement_revision_conflict');
        operationsAudit($pdo,$actor,'jrei_exam_entitlement_revoke_'.$reason,$id);
        $pdo->commit();
        return ['ok'=>true,'state'=>'REVOKED',
          'answerRowsDeleted'=>0,'paymentCaptured'=>false,
          'refundIssued'=>false,'buyerServiceFollowupRequired'=>true];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/**
 * Owner-requested attachment of a verified original BitPay exam order.
 * This function is not callable until the separate product checkout bridge
 * has been accepted and a real exam SKU exists in an immutable paid order.
 */
function jrExamOwnerGrantVerifiedOrder(PDO $pdo,array $cfg,
    string $actor,array $body): array {
    if(($cfg['jrei_exam_verified_entitlement_grants_enabled']??false)!==true||
       ($cfg['jrei_exam_commercial_enabled']??false)!==true||
       ($cfg['jrei_exam_checkout_bridge_accepted']??false)!==true)
        throw new DomainException('exam_verified_grants_not_authorized');
    if(!jrExamCommercialSchemaReady($pdo))
        throw new DomainException('exam_entitlement_schema_unavailable');
    $account=$body['accountId']??null;
    $offering=$body['offeringId']??null;
    $order=$body['verifiedOrderId']??null;
    if(!is_string($account)||!validUuid($account)||
       !is_string($offering)||!validUuid($offering)||
       !is_string($order)||!validUuid($order)||
       ($body['confirmation']??null)!=='ISSUE_ACCESS_ONLY_FOR_VERIFIED_EXAM_ORDER')
        throw new InvalidArgumentException('invalid_verified_exam_order_grant');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("SELECT o.offering_state,o.opens_at,o.closes_at,
            p.product_state,p.content_rights_state,
            p.question_key_review_state,p.delivery_review_state
          FROM jrei_exam_commercial_offerings o
          JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
          WHERE o.offering_id=? FOR UPDATE");
        $q->execute([$offering]);$o=$q->fetch(PDO::FETCH_ASSOC);
        $now=time();
        if(!is_array($o)||$o['offering_state']!=='PUBLISHED'||
           $o['product_state']!=='PUBLISHED'||
           $o['content_rights_state']!=='APPROVED'||
           $o['question_key_review_state']!=='APPROVED'||
           $o['delivery_review_state']!=='APPROVED'||
           (int)$o['closes_at']<=$now)
            throw new DomainException('exam_offering_not_safe_to_grant');
        $q=$pdo->prepare("SELECT entitlement_id,state,verified_order_id
            FROM jrei_exam_commercial_entitlements
            WHERE offering_id=? AND account_id=? FOR UPDATE");
        $q->execute([$offering,$account]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        foreach($rows as $e){
            if($e['state']==='ACTIVE')
                throw new DomainException('exam_active_entitlement_already_exists');
            if($e['verified_order_id']===$order)
                throw new DomainException('exam_order_grant_already_recorded');
        }
        if(!jrExamVerifiedOrderClaim($pdo,$account,$order,$offering))
            throw new DomainException('original_provider_claim_not_verified');
        $id=uuidv4();
        $q=$pdo->prepare("INSERT INTO jrei_exam_commercial_entitlements
            (entitlement_id,offering_id,account_id,verified_order_id,
             granted_by_account_id,grant_reason,state,begins_at,expires_at,
             created_at)
             VALUES (?,?,?,?,?,'VERIFIED_ORDER','ACTIVE',?,?,?)");
        $q->execute([$id,$offering,$account,$order,$actor,
          max($now,(int)$o['opens_at']-86400),(int)$o['closes_at'],$now]);
        operationsAudit($pdo,$actor,'jrei_exam_verified_order_entitlement_granted',$id);
        $pdo->commit();
        return ['ok'=>true,'entitlementId'=>$id,
          'state'=>'ACTIVE','existingOrderOnly'=>true,
          'newPaymentCreated'=>false,'bankAmountChanged'=>false,
          'automaticRefundIssued'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
