<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Bounded scientific/governance gate inventory for original MFA operations.
 * Does not look at learner answers, payments or private PDF content.
 * Metadata prerequisites are necessary but NEVER scientific or financial
 * authorization to publish or sell an examination.
 */
function jrExamOwnerProductReadiness(PDO $pdo,array $cfg): array {
    $out=['schema'=>'jr.jrei.product-release-gates.v1',
        'available'=>false,'items'=>[],'truncated'=>false,
        'actualQuestionBytesVerified'=>false,
        'realPaymentEntitlementAccepted'=>false,
        'scientificValidationEstablished'=>false,
        'publicSaleAuthorized'=>false
    ];
    if(!jrExamCommercialSchemaReady($pdo))return $out;
    try{
        $q=$pdo->query("SELECT p.product_id,p.product_code,p.division,
            p.product_state,p.content_rights_state,
            p.question_key_review_state,p.delivery_review_state,
            p.approved_by_account_id,
            b.status AS blueprint_state,
            b.approved_by_account_id AS blueprint_reviewer,
            b.format_review_state,b.timing_review_state,
            b.scoring_review_state,
            v.status AS instrument_state,v.approved_by_account_id AS instrument_reviewer
          FROM jrei_exam_commercial_products p
          LEFT JOIN jrei_exam_blueprints b ON b.blueprint_id=p.blueprint_id
          LEFT JOIN eco_instrument_versions v ON v.id=p.instrument_version_id
          ORDER BY p.updated_at DESC,p.product_id DESC LIMIT 31");
        $products=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['available']=true;$out['truncated']=count($products)>30;
        foreach(array_slice($products,0,30) as $p){
            $problems=[];
            if($p['product_state']!=='PUBLISHED')
                $problems[]='PRODUCT_NOT_PUBLISHED';
            if($p['content_rights_state']!=='APPROVED')
                $problems[]='COMMERCIAL_REUSE_RIGHTS_NOT_APPROVED';
            if($p['question_key_review_state']!=='APPROVED')
                $problems[]='ANSWER_KEY_REVIEW_NOT_APPROVED';
            if($p['delivery_review_state']!=='APPROVED')
                $problems[]='IMMUTABLE_CONTENT_DELIVERY_NOT_APPROVED';
            if($p['approved_by_account_id']===null)
                $problems[]='PRODUCT_REVIEWER_MISSING';
            if($p['blueprint_state']!=='APPROVED'||
               $p['blueprint_reviewer']===null||
               $p['format_review_state']!=='APPROVED'||
               $p['timing_review_state']!=='APPROVED'||
               $p['scoring_review_state']!=='APPROVED')
                $problems[]='INDEPENDENT_BLUEPRINT_REVIEW_MISSING';
            if($p['instrument_state']!=='PUBLISHED'||
               $p['instrument_reviewer']===null)
                $problems[]='ORIGINAL_INSTRUMENT_VERSION_NOT_APPROVED';

            $q=$pdo->prepare("SELECT
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN
                    i.item_type='SINGLE_CHOICE'
                    AND i.is_sensitive=0
                    AND i.prompt_object_id IS NOT NULL
                    AND m.item_state='APPROVED'
                    AND m.authored_by_account_id IS NOT NULL
                    AND m.reviewed_by_account_id IS NOT NULL
                    AND m.authored_by_account_id<>m.reviewed_by_account_id
                    AND m.ambiguity_review_state='APPROVED'
                    AND m.copyright_review_state='APPROVED'
                    AND m.diagram_formula_integrity='APPROVED'
                    AND m.provenance_digest IS NOT NULL
                    AND m.item_content_digest IS NOT NULL
                    AND k.key_state='APPROVED'
                    AND k.rights_review_state='APPROVED'
                    AND k.reviewer_account_id IS NOT NULL
                    AND k.key_digest=m.answer_key_digest
                    AND src.source_id=m.source_id
                    AND src.review_state='AUTHORITATIVE_REVIEWED'
                    AND src.rights_state='PERMITTED_REPRODUCTION'
                    AND src.is_revoked=0 AND src.is_superseded=0
                    THEN 1 ELSE 0 END),0) AS eligible
              FROM eco_assessment_items i
              LEFT JOIN jrei_exam_item_metadata m
                ON m.canonical_assessment_item_id=i.id
              LEFT JOIN jrei_exam_reviewed_answer_keys k ON k.item_id=i.id
              LEFT JOIN jrei_exam_sources src ON src.source_id=k.source_id
              WHERE i.instrument_version_id=(
                SELECT instrument_version_id
                FROM jrei_exam_commercial_products WHERE product_id=?)");
            $q->execute([$p['product_id']]);
            $counts=$q->fetch(PDO::FETCH_ASSOC);
            $total=(int)($counts['total']??0);
            $eligible=(int)($counts['eligible']??0);
            if($total<1||$total>120)
                $problems[]='QUESTION_COUNT_NOT_ACCEPTED';
            if($eligible!==$total)
                $problems[]='INCOMPLETE_INDEPENDENT_ITEM_AND_KEY_REVIEW';
            if(($cfg['jrei_exam_runtime_enabled']??false)!==true||
               ($cfg['jrei_exam_item_delivery_accepted']??false)!==true)
                $problems[]='ORIGINAL_EXAM_DELIVERY_NOT_RELEASED';
            $problems[]='LIVE_PURCHASE_AND_END_TO_END_ACCEPTANCE_REQUIRED';

            $out['items'][]=[
              'productId'=>(string)$p['product_id'],
              'code'=>(string)$p['product_code'],
              'division'=>(string)$p['division'],
              'recordedItemCount'=>$total,
              'reviewedItemMetadataCount'=>$eligible,
              'blockers'=>array_values(array_unique($problems)),
              'status'=>'BLOCKED_PENDING_INDEPENDENT_ACCEPTANCE',
              'filesVerified'=>false,'checkoutVerified'=>false,
              'financialSaleAuthorized'=>false
            ];
        }
    }catch(Throwable $e){
        $out['available']=false;$out['items']=[];
    }
    return $out;
}
