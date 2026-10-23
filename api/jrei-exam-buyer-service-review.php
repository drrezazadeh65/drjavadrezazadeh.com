<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Original owner-MFA operation only. Records human service follow-up without
 * changing learner answers, grades, entitlements, finance or notification.
 * It never processes a refund and does not certify consumer legal remedies.
 */
function jrExamOwnerBuyerServiceLog(PDO $pdo,string $actor,array $body): array {
    $id=$body['entitlementId']??null;
    $revision=$body['revision']??null;
    $reason=$body['reasonCode']??null;
    if(!is_string($id)||!validUuid($id)||
       !is_int($revision)||$revision<1||
       !in_array($reason,[
           'SOURCE_RIGHTS_RECHECK_REQUIRED',
           'BUYER_COMMUNICATION_REVIEW_REQUIRED',
           'FINANCE_TEAM_REMEDY_REVIEW_REQUIRED',
           'EDUCATIONAL_ACCESS_REMEDY_REVIEW_REQUIRED'
       ],true)||
       ($body['confirmation']??null)!==
           'RECORD_OWNER_REVIEW_NO_REFUND_OR_BUYER_NOTIFICATION')
        throw new InvalidArgumentException('invalid_exam_service_review_action');
    try{
        $pdo->query('SELECT review_id,entitlement_id,entitlement_revision
          FROM jrei_exam_buyer_service_review_log LIMIT 0');
    }catch(Throwable $e){
        throw new DomainException('exam_service_followup_migration_required',0,$e);
    }
    $pdo->beginTransaction();
    try{
        // Match original entitlement governance lock order: offering first,
        // entitlement second. This is NOT an external account lookup.
        $q=$pdo->prepare('SELECT offering_id
          FROM jrei_exam_commercial_entitlements WHERE entitlement_id=?');
        $q->execute([$id]);$offering=$q->fetchColumn();
        if(!is_string($offering)||!validUuid($offering))
            throw new DomainException('exam_entitlement_not_found');
        $q=$pdo->prepare('SELECT offering_id,offering_state,product_id
          FROM jrei_exam_commercial_offerings
          WHERE offering_id=? FOR UPDATE');
        $q->execute([$offering]);$offer=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($offer))
            throw new DomainException('exam_offering_not_found');
        $q=$pdo->prepare('SELECT product_state
          FROM jrei_exam_commercial_products WHERE product_id=?');
        $q->execute([$offer['product_id']]);$productState=$q->fetchColumn();
        if($offer['offering_state']!=='SUSPENDED'&&
           $productState!=='SUSPENDED')
            throw new DomainException('exam_owner_service_review_requires_suspension');
        $q=$pdo->prepare('SELECT entitlement_id,offering_id,revision,state,
          grant_reason FROM jrei_exam_commercial_entitlements
          WHERE entitlement_id=? FOR UPDATE');
        $q->execute([$id]);$ent=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($ent)||$ent['offering_id']!==$offering||
           (int)$ent['revision']!==$revision||
           !in_array($ent['state'],['ACTIVE','REVOKED'],true)||
           !in_array($ent['grant_reason'],
             ['VERIFIED_ORDER','OWNER_APPROVED_FREE'],true))
            throw new DomainException('exam_owner_service_followup_revision_conflict');
        $q=$pdo->prepare('INSERT INTO jrei_exam_buyer_service_review_log
          (review_id,entitlement_id,entitlement_revision,offering_id,
           reason_code,decision,recorded_by_account_id,created_at)
          VALUES(?,?,?,?,?,?,?,?)');
        $review=uuidv4();
        $q->execute([$review,$id,$revision,$offering,$reason,
            'HUMAN_FOLLOW_UP_REQUIRED',$actor,time()]);
        if($q->rowCount()!==1)
            throw new DomainException('exam_owner_followup_not_recorded');
        operationsAudit($pdo,$actor,'jrei_exam_buyer_followup_'.$reason,$id);
        $pdo->commit();
        return [
           'ok'=>true,'reviewId'=>$review,
           'decision'=>'HUMAN_FOLLOW_UP_REQUIRED',
           'originalEntitlementUnchanged'=>true,
           'learnerAnswersPreserved'=>true,
           'automaticBuyerNotificationSent'=>false,
           'automaticRefundIssued'=>false,
           'externalBankSettlementVerified'=>false
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

function jrExamOwnerBuyerServiceLedger(PDO $pdo): array {
    $out=['schema'=>'jr.jrei.exam-buyer-followup-ledger.v1',
      'available'=>false,'totalRecordedReviews'=>null,
      'paidOrderCases'=>null,'ownerFreeCases'=>null,
      'cases'=>[],'truncated'=>false,
      'financialRemediesVerified'=>false,
      'buyerNotificationsVerified'=>false,
      'learnerIdentityIncluded'=>false];
    try{
        $q=$pdo->query("SELECT COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN e.grant_reason='VERIFIED_ORDER'
            THEN 1 ELSE 0 END),0) AS paid,
          COALESCE(SUM(CASE WHEN e.grant_reason='OWNER_APPROVED_FREE'
            THEN 1 ELSE 0 END),0) AS free_count
          FROM jrei_exam_buyer_service_review_log l
          JOIN jrei_exam_commercial_entitlements e
            ON e.entitlement_id=l.entitlement_id");
        $row=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->query("SELECT l.review_id,l.entitlement_id,
          l.reason_code,l.decision,l.created_at,e.grant_reason,
          e.state AS current_entitlement_state
          FROM jrei_exam_buyer_service_review_log l
          JOIN jrei_exam_commercial_entitlements e
            ON e.entitlement_id=l.entitlement_id
          ORDER BY l.created_at DESC,l.review_id DESC LIMIT 31");
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['totalRecordedReviews']=(int)$row['total'];
        $out['paidOrderCases']=(int)$row['paid'];
        $out['ownerFreeCases']=(int)$row['free_count'];
        $out['truncated']=count($rows)>30;
        foreach(array_slice($rows,0,30) as $x)
            $out['cases'][]=[
              'reviewId'=>$x['review_id'],
              'entitlementId'=>$x['entitlement_id'],
              'reasonCode'=>$x['reason_code'],
              'decision'=>$x['decision'],
              'createdAt'=>(int)$x['created_at'],
              'grantReason'=>$x['grant_reason'],
              'entitlementState'=>$x['current_entitlement_state'],
              'financialActionVerified'=>false
            ];
        $out['available']=true;
    }catch(Throwable $e){
        // Missing staged schema is not evidence of zero affected buyers.
    }
    return $out;
}
