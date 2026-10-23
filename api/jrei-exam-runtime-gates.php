<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Every commercial attempt MUST have the original verified customer identity,
 * a current explicitly scoped consent, approved content and a trusted original
 * provider claim. No browser redirect, payment reference or local Worker state
 * can grant access. Currently accepts ADULT self-owned subjects only; guardian
 * admission is reserved for a separately reviewed safeguarding implementation.
 */
function jrExamAdultSubjectConsent(PDO $pdo,string $account,string $subject): string {
    if(!validUuid($account)||!validUuid($subject))
        throw new InvalidArgumentException('invalid_subject');
    $q=$pdo->prepare("SELECT owner_account_id,guardian_account_id,age_band,
        status,subject_type FROM eco_subjects WHERE id=? FOR UPDATE");
    $q->execute([$subject]);$s=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($s)||$s['owner_account_id']!==$account||
       $s['guardian_account_id']!==null||
       !in_array($s['age_band'],['ADULT','18_PLUS'],true)||
       $s['status']!=='ACTIVE'||$s['subject_type']!=='LEARNER')
        throw new DomainException('adult_self_owned_subject_required');
    // Latest explicit decision wins; historical GRANTED consent cannot
    // override a more recent withdrawal or a retired notice.
    $q=$pdo->prepare("SELECT c.id,c.decision,c.withdrawn_at,
        n.effective_at,n.retired_at,n.notice_sha256
        FROM eco_consent_records c
        JOIN eco_consent_notices n ON n.id=c.notice_id
        WHERE c.subject_id=? AND c.account_id=?
          AND n.purpose_code='JREI_EXAM_PARTICIPATION'
        ORDER BY c.granted_at DESC,c.id DESC LIMIT 1 FOR UPDATE");
    $q->execute([$subject,$account]);$r=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($r)||$r['decision']!=='GRANTED'||
       $r['withdrawn_at']!==null||$r['retired_at']!==null||
       $r['effective_at']===null||
       strtotime((string)$r['effective_at'])>time()||
       !preg_match('/^[a-f0-9]{64}$/Di',(string)$r['notice_sha256']))
        throw new DomainException('current_exam_purpose_consent_required');
    return (string)$r['id'];
}

function jrExamVerifiedOrderClaim(PDO $pdo,string $account,
    string $orderId,string $offeringId): bool {
    if(!validUuid($account)||!validUuid($orderId)||!validUuid($offeringId))
        return false;
    $q=$pdo->prepare("SELECT o.state,o.customer_email,o.currency,
      o.items_json,o.provider_trans_id,o.provider_amount,
      a.email_normalized,c.transaction_id,c.verified_amount
      FROM commerce_orders o
      JOIN customer_accounts a ON a.id=?
      JOIN commerce_payment_claims c
        ON c.order_id=o.id AND c.provider='bitpay'
      WHERE o.id=? FOR UPDATE");
    $q->execute([$account,$orderId]);$r=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($r)||$r['state']!=='paid'||$r['currency']!=='IRT'||
       !is_string($r['provider_trans_id'])||$r['provider_trans_id']===''||
       !hash_equals($r['provider_trans_id'],(string)$r['transaction_id'])||
       (string)$r['provider_amount']!==(string)$r['verified_amount']||
       (int)$r['verified_amount']<=0||
       !is_string($r['customer_email'])||
       !hash_equals(strtolower(trim($r['customer_email'])),
           (string)$r['email_normalized']))
        return false;
    $items=json_decode((string)$r['items_json'],true);
    if(!is_array($items)||count($items)<1||count($items)>30)return false;
    $matches=0;
    foreach($items as $item) {
        if(!is_array($item))return false;
        if(($item['sku']??null)==='exam:'.$offeringId&&
           ($item['kind']??null)==='exam'&&
           is_int($item['quantity']??null)&&$item['quantity']===1)$matches++;
    }
    return $matches===1;
}

function jrExamTrustedEntitlement(PDO $pdo,string $account,
    string $offering,int $now): array {
    $q=$pdo->prepare("SELECT e.entitlement_id,e.verified_order_id,
      e.granted_by_account_id,e.grant_reason,e.state,e.begins_at,
      e.expires_at,e.revoked_at FROM jrei_exam_commercial_entitlements e
      WHERE e.account_id=? AND e.offering_id=? AND e.state='ACTIVE'
      AND e.begins_at<=? AND e.expires_at>=? AND e.revoked_at IS NULL
      ORDER BY e.created_at ASC,e.entitlement_id ASC LIMIT 3 FOR UPDATE");
    $q->execute([$account,$offering,$now,$now]);
    $rows=$q->fetchAll(PDO::FETCH_ASSOC);
    if(count($rows)!==1)throw new DomainException('unique_active_exam_entitlement_required');
    $e=$rows[0];
    if($e['grant_reason']==='VERIFIED_ORDER'){
        if(!is_string($e['verified_order_id'])||
           !jrExamVerifiedOrderClaim($pdo,$account,$e['verified_order_id'],$offering))
            throw new DomainException('verified_exam_payment_claim_required');
    }elseif($e['grant_reason']==='OWNER_APPROVED_FREE'){
        // The original account/MFA owner audit is authoritative for free
        // grants, never an unverified browser-selected entitlement.
        if($e['verified_order_id']!==null||
           !is_string($e['granted_by_account_id'])||
           !validUuid($e['granted_by_account_id']))
            throw new DomainException('owner_free_grant_missing');
    }else throw new DomainException('exam_access_not_authorized');
    return $e;
}
