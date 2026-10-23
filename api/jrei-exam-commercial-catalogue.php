<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-exam-product-readiness.php';
require_once __DIR__.'/jrei-exam-source-release-impact.php';
require_once __DIR__.'/jrei-exam-localization-owner.php';

/**
 * Commercial examination catalogue projections from the existing mother DB.
 *
 * This module never opens checkout, grants entitlement, serves items/keys,
 * starts an attempt, claims bank settlement or infers an official exam date.
 * Existing paid-checkout integrity and eco_assessment_* remain authoritative.
 * Missing unexecuted migration is UNKNOWN, never a fabricated empty shop.
 */
function jrExamCommercialSchemaReady(PDO $pdo): bool {
    try{
        foreach([
          'SELECT product_id,product_code,division,product_state FROM jrei_exam_commercial_products LIMIT 0',
          'SELECT offering_id,product_id,offering_state FROM jrei_exam_commercial_offerings LIMIT 0',
          'SELECT entitlement_id,account_id,verified_order_id FROM jrei_exam_commercial_entitlements LIMIT 0',
          'SELECT attempt_id,assessment_session_id,attempt_state FROM jrei_exam_commercial_attempts LIMIT 0'
        ] as $sql)$pdo->query($sql);
        return true;
    }catch(Throwable $e){return false;}
}
function jrExamCommercialCatalogue(PDO $pdo,array $cfg,int $at=0): array {
    if($at<=0)$at=time();
    $ready=jrExamCommercialSchemaReady($pdo);
    $out=[
      'schema'=>'jr.jrei.exam-commercial-catalogue.v1',
      'schemaReady'=>$ready,
      'checkedAt'=>$at,
      'scope'=>'PUBLIC_METADATA_ONLY',
      'items'=>[],
      'checkoutEnabled'=>false,
      'liveExaminationDeliveryVerified'=>false,
      'sourceRightsIndependentlyVerified'=>false,
      'availableForPurchase'=>false
    ];
    if(!$ready)return $out;
    // Public merchandising remains closed until independently accepted
    // immutable item delivery and server runtime are both explicitly on.
    // An accidentally marked PUBLISHED row never authorizes display alone.
    if(($cfg['jrei_exam_runtime_enabled']??false)!==true||
       ($cfg['jrei_exam_item_delivery_accepted']??false)!==true||
       !function_exists('jrExamPublishedItemDeliveryReady')||
       !jrExamPublishedItemDeliveryReady($pdo))
        return $out;
    // Only review- and explicitly published metadata, never an unreviewed
    // offering, its question text, a scoring key or a candidate session.
    $q=$pdo->prepare("SELECT
      p.product_code,p.division,p.title_fa,p.title_en,p.summary_fa,
      o.offering_id,o.stage_code,o.opens_at,o.closes_at,
      o.registration_closes_at,o.duration_seconds,o.max_attempts
      FROM jrei_exam_commercial_products p
      JOIN jrei_exam_commercial_offerings o ON o.product_id=p.product_id
      JOIN jrei_exam_blueprints b ON b.blueprint_id=p.blueprint_id
      JOIN eco_instrument_versions v ON v.id=p.instrument_version_id
      WHERE p.product_state='PUBLISHED'
        AND p.published_at IS NOT NULL AND p.approved_by_account_id IS NOT NULL
        AND p.content_rights_state='APPROVED'
        AND p.question_key_review_state='APPROVED'
        AND p.delivery_review_state='APPROVED'
        AND b.status='APPROVED' AND b.approved_by_account_id IS NOT NULL
        AND b.format_review_state='APPROVED'
        AND b.timing_review_state='APPROVED'
        AND b.scoring_review_state='APPROVED'
        AND v.status='PUBLISHED'
        AND o.offering_state='PUBLISHED'
        AND EXISTS (SELECT 1 FROM eco_assessment_items i
          WHERE i.instrument_version_id=p.instrument_version_id)
        AND NOT EXISTS (
          SELECT 1 FROM eco_assessment_items i
          LEFT JOIN jrei_exam_item_metadata meta
            ON meta.canonical_assessment_item_id=i.id
          LEFT JOIN jrei_exam_reviewed_answer_keys k ON k.item_id=i.id
          LEFT JOIN jrei_exam_sources source ON source.source_id=k.source_id
          LEFT JOIN eco_object_refs orig ON orig.id=i.prompt_object_id
          WHERE i.instrument_version_id=p.instrument_version_id
            AND (
              meta.id IS NULL OR meta.item_state<>'APPROVED' OR
              meta.reviewed_by_account_id IS NULL OR
              meta.authored_by_account_id IS NULL OR
              meta.reviewed_by_account_id=meta.authored_by_account_id OR
              meta.ambiguity_review_state<>'APPROVED' OR
              meta.diagram_formula_integrity<>'APPROVED' OR
              meta.copyright_review_state<>'APPROVED' OR
              i.item_type<>'SINGLE_CHOICE' OR i.is_sensitive<>0 OR
              orig.id IS NULL OR
              orig.content_sha256<>meta.item_content_digest OR
              meta.source_id IS NULL OR meta.source_id<>k.source_id OR
              k.item_id IS NULL OR k.key_state<>'APPROVED' OR
              k.rights_review_state<>'APPROVED' OR
              k.reviewer_account_id IS NULL OR
              k.reviewed_at IS NULL OR
              source.source_id IS NULL OR
              meta.provenance_digest IS NULL OR
              meta.item_content_digest IS NULL OR
              meta.answer_key_digest IS NULL OR
              k.key_digest IS NULL OR
              meta.answer_key_digest<>k.key_digest OR
              source.review_state<>'AUTHORITATIVE_REVIEWED' OR
              source.rights_state<>'PERMITTED_REPRODUCTION' OR
              source.is_revoked<>0 OR source.is_superseded<>0
            )
        )
        AND o.registration_closes_at>=?
        AND o.closes_at>=?
      ORDER BY o.opens_at ASC,p.division,p.product_code LIMIT 24");
    $q->execute([$at,$at]);
    foreach($q as $r)$out['items'][]=[
      'code'=>(string)$r['product_code'],
      'division'=>(string)$r['division'],
      'titleFa'=>(string)$r['title_fa'],
      'titleEn'=>$r['title_en'],
      'summaryFa'=>$r['summary_fa'],
      'offeringId'=>(string)$r['offering_id'],
      'stageCode'=>$r['stage_code'],
      'opensAt'=>(int)$r['opens_at'],
      'closesAt'=>(int)$r['closes_at'],
      'registrationClosesAt'=>(int)$r['registration_closes_at'],
      'durationSeconds'=>(int)$r['duration_seconds'],
      'maxAttempts'=>(int)$r['max_attempts'],
      'officialExamDateVerified'=>false,
      'candidateEligibilityVerified'=>false,
      'checkoutEnabled'=>false,
      'priceToman'=>null,
      'answerKeyAvailable'=>false
    ];
    // Commerce SKU, settlement and entitlement paths MUST be integrated
    // and accepted separately. Never expose a purchase button from mere SQL.
    return $out;
}
require_once __DIR__.'/jrei-exam-preliminary-grade-owner-audit.php';

function jrExamCommercialOwnerSnapshot(PDO $pdo,array $cfg): array {
    $ready=jrExamCommercialSchemaReady($pdo);
    $base=[
      'schema'=>'jr.jrei.exam-commercial-owner.v1',
      'motherDbSchemaReady'=>$ready,
      'privateEnabled'=>($cfg['jrei_exam_commercial_enabled']??false)===true,
      'productStates'=>null,'offeringStates'=>null,
      'entitlementStates'=>null,'attemptStates'=>null,
      'itemReviewCoverage'=>null,'itemReviewCoverageAvailable'=>false,
      'productRegistry'=>null,'offeringRegistry'=>null,
      'productReleaseGates'=>null,
      'sourceReleaseImpact'=>null,
      'localizedPromptReview'=>jrExamOwnerLocalizedPromptSnapshot($pdo),
      'preliminaryGradeEvidence'=>jrExamOwnerPreliminaryGradeEvidence($pdo),
      'entitlementGovernance'=>null,
      'operationalRisks'=>[
        'unknownExpiredAttempts'=>null,'unfinishedDeadlineReviews'=>null,
        'activeAccessOnSuspendedExams'=>null,
        'deadlineCronPolicyEnabled'=>($cfg['jrei_exam_deadline_reconciliation_enabled']??false)===true
      ],
      'verifiedPaymentIntegration'=>false,
      'secureAttemptDeliveryVerified'=>false,
      'officiallyReviewedItemsVerified'=>false,
      'safeToSell'=>false,'clientDataIncluded'=>false,
      'reviewRequired'=>true
    ];
    if(!$ready)return $base;
    foreach(['productStates','offeringStates','entitlementStates','attemptStates'] as $field)
        $base[$field]=[];
    foreach([
      'productStates'=>"SELECT division,product_state,COUNT(*) AS n FROM jrei_exam_commercial_products GROUP BY division,product_state ORDER BY division,product_state LIMIT 35",
      'offeringStates'=>"SELECT offering_state,COUNT(*) AS n FROM jrei_exam_commercial_offerings GROUP BY offering_state LIMIT 20",
      'entitlementStates'=>"SELECT state,COUNT(*) AS n FROM jrei_exam_commercial_entitlements GROUP BY state LIMIT 20",
      'attemptStates'=>"SELECT attempt_state,COUNT(*) AS n FROM jrei_exam_commercial_attempts GROUP BY attempt_state LIMIT 20"
    ] as $key=>$sql){
        $q=$pdo->query($sql);
        foreach($q as $r){
            $row=[];
            foreach($r as $field=>$value)
                if(is_string($field))$row[$field]=$field==='n'?(int)$value:$value;
            $base[$key][]=$row;
        }
    }
    // Bounded owner metadata only. No learner, payment token, answer content,
    // email, session answer or bank reference is included here.
    $q=$pdo->query("SELECT product_id,product_code,division,title_fa,title_en,
        blueprint_id,instrument_version_id,scoring_model_id,
        product_state,content_rights_state,question_key_review_state,
        delivery_review_state,revision,updated_at
        FROM jrei_exam_commercial_products
        ORDER BY updated_at DESC,product_id DESC LIMIT 40");
    $base['productRegistry']=[];
    foreach($q as $r)$base['productRegistry'][]=[
      'productId'=>$r['product_id'],'code'=>$r['product_code'],
      'division'=>$r['division'],'titleFa'=>$r['title_fa'],
      'titleEn'=>$r['title_en'],'blueprintId'=>$r['blueprint_id'],
      'instrumentVersionId'=>$r['instrument_version_id'],
      'scoringModelId'=>$r['scoring_model_id'],
      'state'=>$r['product_state'],
      'rightsState'=>$r['content_rights_state'],
      'keyReviewState'=>$r['question_key_review_state'],
      'deliveryReviewState'=>$r['delivery_review_state'],
      'revision'=>(int)$r['revision'],'updatedAt'=>(int)$r['updated_at']
    ];
    $q=$pdo->query("SELECT offering_id,product_id,stage_code,opens_at,
      closes_at,registration_closes_at,duration_seconds,max_attempts,
      offering_state,revision FROM jrei_exam_commercial_offerings
      ORDER BY opens_at DESC,offering_id DESC LIMIT 40");
    $base['offeringRegistry']=[];
    foreach($q as $r)$base['offeringRegistry'][]=[
      'offeringId'=>$r['offering_id'],'productId'=>$r['product_id'],
      'stageCode'=>$r['stage_code'],'opensAt'=>(int)$r['opens_at'],
      'closesAt'=>(int)$r['closes_at'],
      'registrationClosesAt'=>(int)$r['registration_closes_at'],
      'durationSeconds'=>(int)$r['duration_seconds'],
      'maxAttempts'=>(int)$r['max_attempts'],
      'state'=>$r['offering_state'],'revision'=>(int)$r['revision']
    ];
    try{
        $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_exam_commercial_attempts
           WHERE attempt_state='IN_PROGRESS' AND deadline_at+120<?");
        $q->execute([time()]);
        $base['operationalRisks']['unknownExpiredAttempts']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_exam_commercial_attempts
           WHERE attempt_state='TIMED_OUT_PENDING_REVIEW'");
        $base['operationalRisks']['unfinishedDeadlineReviews']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_exam_commercial_entitlements e
           JOIN jrei_exam_commercial_offerings o ON o.offering_id=e.offering_id
           JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
           WHERE e.state='ACTIVE' AND
             (o.offering_state='SUSPENDED' OR p.product_state='SUSPENDED')");
        $base['operationalRisks']['activeAccessOnSuspendedExams']=(int)$q->fetchColumn();
    }catch(Throwable $e){
        // Unknown is never converted to zero, because zero would conceal
        // owner financial and educational service duties.
    }
    // Display only aggregated scientific-review METADATA. An approved
    // source/key row is NOT a pass certificate without scientific QA.
    try{
        $q=$pdo->query("SELECT p.division,
          COUNT(DISTINCT i.id) AS item_count,
          COUNT(DISTINCT CASE WHEN meta.item_state='APPROVED'
             AND meta.reviewed_by_account_id IS NOT NULL
             AND meta.authored_by_account_id IS NOT NULL
             AND meta.reviewed_by_account_id<>meta.authored_by_account_id
             THEN i.id END) AS independently_reviewed_item_count,
          COUNT(DISTINCT CASE WHEN k.key_state='APPROVED'
             AND k.rights_review_state='APPROVED'
             AND k.reviewer_account_id IS NOT NULL
             THEN i.id END) AS key_reviewed_item_count
          FROM jrei_exam_commercial_products p
          LEFT JOIN eco_assessment_items i
            ON i.instrument_version_id=p.instrument_version_id
          LEFT JOIN jrei_exam_item_metadata meta
            ON meta.canonical_assessment_item_id=i.id
          LEFT JOIN jrei_exam_reviewed_answer_keys k ON k.item_id=i.id
          GROUP BY p.division ORDER BY p.division LIMIT 10");
        $base['itemReviewCoverage']=[];
        foreach($q as $r)$base['itemReviewCoverage'][]=[
          'division'=>(string)$r['division'],
          'recordedItemCount'=>(int)$r['item_count'],
          'independentlyReviewedItemCount'=>(int)$r['independently_reviewed_item_count'],
          'reviewedKeyCount'=>(int)$r['key_reviewed_item_count'],
          'contentVerifiedByActualFileRead'=>false,
          'subjectExpertValidationEstablished'=>false
        ];
        $base['itemReviewCoverageAvailable']=true;
    }catch(Throwable $e){
        $base['itemReviewCoverage']=null;
    }
    $base['productReleaseGates']=jrExamOwnerProductReadiness($pdo,$cfg);
    $base['sourceReleaseImpact']=jrExamOwnerSourceReleaseImpact($pdo);
    $base['preliminaryGradeEvidence']=jrExamOwnerPreliminaryGradeEvidence($pdo);
    $base['entitlementGovernance']=jrExamOwnerEntitlementExposure($pdo,$cfg);
    return $base;
}
