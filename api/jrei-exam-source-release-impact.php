<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Owner-only read-side impact of current recalled/unreviewed examination
 * source + answer-key metadata on products already marked PUBLISHED.
 *
 * This is not an automatic refund/suspension, forensic proof of authenticity
 * or a scientific evaluation. It exposes no candidate, reviewer identity,
 * answer choices, item prompts, order or bank details.
 */
function jrExamOwnerSourceReleaseImpact(PDO $pdo): array {
    $out=[
      'schema'=>'jr.jrei.exam-source-release-impact.v1',
      'available'=>false,'publishedProducts'=>null,
      'publishedProductsWithBlockers'=>null,
      'products'=>[],'truncated'=>false,
      'sourceRevocationAutomaticallyRemediated'=>false,
      'buyerObligationsAutomaticallyResolved'=>false,
      'completeContentRightsIndependentlyValidated'=>false
    ];
    // The private source registry remains authoritative and each item must
    // retain independent reviewed key/source metadata. A mere PUBLISHED row
    // does not establish legal or scientific readiness.
    $from=" FROM jrei_exam_commercial_products p
       LEFT JOIN eco_assessment_items i
         ON i.instrument_version_id=p.instrument_version_id
       LEFT JOIN eco_object_refs orig ON orig.id=i.prompt_object_id
       LEFT JOIN jrei_exam_item_metadata m
         ON m.canonical_assessment_item_id=i.id
       LEFT JOIN jrei_exam_reviewed_answer_keys k ON k.item_id=i.id
       LEFT JOIN jrei_exam_sources s ON s.source_id=m.source_id
       LEFT JOIN jrei_exam_sources ks ON ks.source_id=k.source_id
       WHERE p.product_state='PUBLISHED'";
    $badItem="i.id IS NULL OR
       i.item_type<>'SINGLE_CHOICE' OR i.is_sensitive<>0 OR
       orig.id IS NULL OR
       orig.storage_provider<>'JR_EXAM_PUBLISHED_ITEM' OR
       orig.mime_type<>'application/json' OR
       orig.data_class<>'PRIVATE' OR
       orig.malware_scan_status<>'CLEAN' OR
       orig.encryption_key_reference IS NOT NULL OR
       orig.byte_size<80 OR orig.byte_size>32768 OR
       orig.object_reference<>CONCAT(orig.content_sha256,'.json') OR
       orig.content_sha256<>m.item_content_digest OR
       m.canonical_assessment_item_id IS NULL OR
       m.provenance_digest IS NULL OR
       m.item_content_digest IS NULL OR
       m.answer_key_digest IS NULL OR
       k.key_digest IS NULL OR
       m.item_state<>'APPROVED' OR
       m.copyright_review_state<>'APPROVED' OR
       m.ambiguity_review_state<>'APPROVED' OR
       m.diagram_formula_integrity<>'APPROVED' OR
       m.reviewed_by_account_id IS NULL OR
       m.authored_by_account_id IS NULL OR
       m.reviewed_by_account_id=m.authored_by_account_id OR
       k.item_id IS NULL OR
       k.key_state<>'APPROVED' OR
       k.rights_review_state<>'APPROVED' OR
       k.reviewer_account_id IS NULL OR
       k.reviewed_at IS NULL OR
       k.reviewer_account_id=m.authored_by_account_id OR
       k.key_digest<>m.answer_key_digest OR
       m.source_id IS NULL OR
       k.source_id IS NULL OR
       NOT (m.source_id<=>k.source_id) OR
       s.source_id IS NULL OR ks.source_id IS NULL OR
       s.review_state<>'AUTHORITATIVE_REVIEWED' OR
       ks.review_state<>'AUTHORITATIVE_REVIEWED' OR
       s.rights_state<>'PERMITTED_REPRODUCTION' OR
       ks.rights_state<>'PERMITTED_REPRODUCTION' OR
       s.is_revoked<>0 OR ks.is_revoked<>0 OR
       s.is_superseded<>0 OR ks.is_superseded<>0";
    $recalled="s.is_revoked=1 OR ks.is_revoked=1 OR
       s.is_superseded=1 OR ks.is_superseded=1";
    $rights="s.rights_state<>'PERMITTED_REPRODUCTION' OR
       ks.rights_state<>'PERMITTED_REPRODUCTION'";
    $key="k.item_id IS NULL OR k.key_state<>'APPROVED' OR
       k.rights_review_state<>'APPROVED' OR
       k.reviewer_account_id IS NULL OR
       k.reviewed_at IS NULL OR m.source_id IS NULL OR
       k.source_id IS NULL OR NOT (m.source_id<=>k.source_id)";
    try{
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_exam_commercial_products
          WHERE product_state='PUBLISHED'");
        $out['publishedProducts']=(int)$q->fetchColumn();
        // Existence queries use the full canonical product relation, never
        // the 30-product sample. DISTINCT prevents multi-version inflation.
        $q=$pdo->query("SELECT COUNT(*) FROM (
          SELECT p.product_id $from GROUP BY p.product_id
          HAVING COUNT(DISTINCT CASE WHEN $badItem THEN
             COALESCE(i.id,p.product_id) END)>0
        ) AS affected");
        $out['publishedProductsWithBlockers']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT p.product_id,p.product_code,p.division,
          p.revision,p.updated_at,
          COUNT(DISTINCT i.id) AS recorded_item_count,
          COUNT(DISTINCT CASE WHEN $badItem THEN
            COALESCE(i.id,p.product_id) END) AS blocked_item_count,
          COUNT(DISTINCT CASE WHEN $recalled THEN i.id END) AS recalled_item_count,
          COUNT(DISTINCT CASE WHEN $rights THEN i.id END) AS rights_item_count,
          COUNT(DISTINCT CASE WHEN $key THEN i.id END) AS key_item_count
          $from GROUP BY p.product_id,p.product_code,p.division,p.revision,p.updated_at
          HAVING blocked_item_count>0
          ORDER BY blocked_item_count DESC,p.updated_at DESC,p.product_id ASC
          LIMIT 31");
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['truncated']=count($rows)>30;
        foreach(array_slice($rows,0,30) as $row){
            $out['products'][]=[
              'productId'=>(string)$row['product_id'],
              'code'=>(string)$row['product_code'],
              'division'=>(string)$row['division'],
              'revision'=>(int)$row['revision'],
              'recordedItemCount'=>(int)$row['recorded_item_count'],
              'blockedItemCount'=>(int)$row['blocked_item_count'],
              'recalledItemCount'=>(int)$row['recalled_item_count'],
              'rightsItemCount'=>(int)$row['rights_item_count'],
              'keyItemCount'=>(int)$row['key_item_count'],
              'publishedMetadataConflictsRequireOwnerReview'=>true,
              'legalRefundDecisionMade'=>false
            ];
        }
        $out['available']=true;
    }catch(Throwable $e){
        $out['publishedProducts']=null;
        $out['publishedProductsWithBlockers']=null;
        $out['products']=[];$out['truncated']=false;
    }
    return $out;
}
