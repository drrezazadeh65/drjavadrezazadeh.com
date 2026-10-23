<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Read-only mother-DB commercial service obligations for current source/key
 * risk. SUPER_ADMIN operations only. No learner PII, question, bank
 * transaction or order token leaves this projection.
 *
 * An entitlement exposure is an owner SERVICE-REVIEW obligation, not a
 * legally determined refund or admission to exam access.
 */
function jrExamOwnerAtRiskBuyerObligations(PDO $pdo): array {
    $out=[
      'schema'=>'jr.jrei.exam-source-buyer-obligations.v1',
      'available'=>false,
      'activeEntitlementsOnAtRiskPublishedProducts'=>null,
      'distinctBuyerAccountsAffected'=>null,
      'paidEntitlementsNeedingReview'=>null,
      'ownerFreeEntitlementsNeedingReview'=>null,
      'openAttemptsOnAtRiskProducts'=>null,
      'buyerIdentityIncluded'=>false,
      'providerOrOrderIdentifiersIncluded'=>false,
      'refundsCalculatedOrIssued'=>false,
      'buyerRemediesNeedIndependentReview'=>true
    ];
    // This is a complete-relation EXISTS test: neither the 30-product
    // source-risk preview nor any individual student's score is reused
    // to approximate the total.
    $itemBad="i.item_type<>'SINGLE_CHOICE' OR i.is_sensitive<>0 OR
      orig.id IS NULL OR
      orig.storage_provider<>'JR_EXAM_PUBLISHED_ITEM' OR
      orig.mime_type<>'application/json' OR
      orig.data_class<>'PRIVATE' OR
      orig.malware_scan_status<>'CLEAN' OR
      orig.encryption_key_reference IS NOT NULL OR
      orig.byte_size<80 OR orig.byte_size>32768 OR
      orig.object_reference<>CONCAT(orig.content_sha256,'.json') OR
      orig.content_sha256<>m.item_content_digest OR
      m.id IS NULL OR
      m.provenance_digest IS NULL OR
      m.item_content_digest IS NULL OR
      m.answer_key_digest IS NULL OR
      k.key_digest IS NULL OR
      m.item_state<>'APPROVED' OR
      m.reviewed_by_account_id IS NULL OR
      m.authored_by_account_id IS NULL OR
      m.reviewed_by_account_id=m.authored_by_account_id OR
      m.ambiguity_review_state<>'APPROVED' OR
      m.diagram_formula_integrity<>'APPROVED' OR
      m.copyright_review_state<>'APPROVED' OR
      k.item_id IS NULL OR k.key_state<>'APPROVED' OR
      k.rights_review_state<>'APPROVED' OR
      k.reviewer_account_id IS NULL OR k.reviewed_at IS NULL OR
      k.reviewer_account_id=m.authored_by_account_id OR
      k.key_digest<>m.answer_key_digest OR
      m.source_id IS NULL OR k.source_id IS NULL OR
      NOT (m.source_id<=>k.source_id) OR
      s.source_id IS NULL OR
      s.review_state<>'AUTHORITATIVE_REVIEWED' OR
      s.reviewer_account_id IS NULL OR
      s.verified_at IS NULL OR
      s.reviewer_account_id=m.authored_by_account_id OR
      s.rights_state<>'PERMITTED_REPRODUCTION' OR
      s.is_revoked<>0 OR s.is_superseded<>0";
    $sourceRisk="p.product_state='PUBLISHED' AND (
      NOT EXISTS (SELECT 1 FROM eco_assessment_items i
        WHERE i.instrument_version_id=p.instrument_version_id)
      OR EXISTS (
        SELECT 1 FROM eco_assessment_items i
        LEFT JOIN jrei_exam_item_metadata m
          ON m.canonical_assessment_item_id=i.id
        LEFT JOIN eco_object_refs orig ON orig.id=i.prompt_object_id
        LEFT JOIN jrei_exam_reviewed_answer_keys k ON k.item_id=i.id
        LEFT JOIN jrei_exam_sources s ON s.source_id=m.source_id
        WHERE i.instrument_version_id=p.instrument_version_id
          AND ($itemBad)
      ))";
    try{
        // An incomplete original schema is UNKNOWN, not reassuring zero.
        $q=$pdo->query("SELECT COUNT(DISTINCT e.entitlement_id) AS affected,
          COUNT(DISTINCT e.account_id) AS customers,
          COUNT(DISTINCT CASE WHEN e.grant_reason='VERIFIED_ORDER'
            THEN e.entitlement_id END) AS paid_grants,
          COUNT(DISTINCT CASE WHEN e.grant_reason='OWNER_APPROVED_FREE'
            THEN e.entitlement_id END) AS free_grants
          FROM jrei_exam_commercial_entitlements e
          JOIN jrei_exam_commercial_offerings o
            ON o.offering_id=e.offering_id
          JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
          WHERE e.state='ACTIVE' AND $sourceRisk");
        $a=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->query("SELECT COUNT(DISTINCT a.attempt_id)
          FROM jrei_exam_commercial_attempts a
          JOIN jrei_exam_commercial_offerings o
            ON o.offering_id=a.offering_id
          JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
          WHERE a.attempt_state='IN_PROGRESS' AND $sourceRisk");
        $out['activeEntitlementsOnAtRiskPublishedProducts']=(int)$a['affected'];
        $out['distinctBuyerAccountsAffected']=(int)$a['customers'];
        $out['paidEntitlementsNeedingReview']=(int)$a['paid_grants'];
        $out['ownerFreeEntitlementsNeedingReview']=(int)$a['free_grants'];
        $out['openAttemptsOnAtRiskProducts']=(int)$q->fetchColumn();
        $out['available']=true;
    }catch(Throwable $e){
        // No mutation; deliberately keep all totals unknown.
    }
    return $out;
}
