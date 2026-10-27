<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Read-only JREI claim→source reconciliation in the EXISTING mother database.
 * Only the original MFA SUPER_ADMIN operations router may call this module.
 * This is a review queue, NOT a source licence, crawler, publisher, or result
 * of a worker mission. No raw document bodies, learner details, or URLs leave.
 *
 * The optional knowledge ledger is additive; absent tables fail closed.
 * The ORIGINAL jrei_exam_sources is always re-read to determine current rights,
 * revocation, version, issuer/scientific review, and canonical content digest.
 */
function jrKnowledgeEvidenceReconciliation(PDO $db,int $now,int $limit=60): array {
    if ($limit<1 || $limit>100) {
        throw new InvalidArgumentException('jrei_knowledge_review_limit_invalid');
    }
    $response=[
        'ok'=>true,
        'schema'=>'jr.jrei.knowledge-reconciliation.v1',
        'available'=>false,
        'checkedAt'=>$now,
        'items'=>[],
        'truncated'=>false,
        'hasVerifiedSourceRights'=>false,
        'sourcePermissionGrantedByThisRoute'=>false,
        'citationTextRetrieved'=>false,
        'publicContentPublished'=>false,
        'sourceAcquisitionTriggered'=>false,
        'learningOrModelPromoted'=>false,
    ];
    try {
        foreach ([
            'jrei_knowledge_claims',
            'jrei_knowledge_claim_versions',
            'jrei_knowledge_citation_edges',
            'jrei_exam_sources',
            'jrei_ka_source_policies'
        ] as $name) {
            // Table names are compile-time local constants, never user input.
            $db->query('SELECT 1 FROM '.$name.' LIMIT 0');
        }
    } catch (Throwable $e) {
        return $response;
    }
    $sql="SELECT c.claim_id,c.claim_subject,c.language_code,c.claim_status,
             v.version_id AS claim_version_id,v.scientific_review_state,
             v.published_at,v.revoked_at AS claim_revoked_at,
             e.edge_id,e.source_id,e.source_version_id,e.source_content_sha256,
             e.excerpt_sha256,e.citation_anchor,e.supporting_role,
             e.invalidated_at,s.source_version AS live_source_version,
             s.original_sha256 AS live_source_sha256,s.rights_state,
             s.review_state,s.is_revoked AS source_revoked,
             s.is_superseded AS source_superseded,
             s.verified_at AS source_verified_at,
             p.scheduling_state,p.rights_reviewed,p.robots_terms_reviewed,
             p.transport_reviewed,p.revision AS source_policy_revision
          FROM jrei_knowledge_citation_edges e
          JOIN jrei_knowledge_claim_versions v ON v.version_id=e.claim_version_id
          JOIN jrei_knowledge_claims c ON c.claim_id=v.claim_id
          JOIN jrei_exam_sources s ON s.source_id=e.source_id
          LEFT JOIN jrei_ka_source_policies p ON p.source_id=e.source_id
          ORDER BY c.updated_at DESC,c.claim_id,e.edge_id
          LIMIT ".($limit+1);
    $rows=$db->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    $response['available']=true;
    $response['truncated']=count($rows)>$limit;
    foreach (array_slice($rows,0,$limit) as $r) {
        $reason=[];
        if ($r['claim_revoked_at']!==null) {
            $reason[]='CLAIM_REVISION_REVOKED';
        }
        if ($r['invalidated_at']!==null) {
            $reason[]='CITATION_EDGE_ALREADY_INVALIDATED';
        }
        if ((int)$r['source_revoked']===1 || (int)$r['source_superseded']===1) {
            $reason[]='ORIGINAL_SOURCE_REVOKED_OR_SUPERSEDED';
        }
        if ($r['rights_state']!=='PERMITTED_PRIVATE_ANALYSIS') {
            $reason[]='ORIGINAL_SOURCE_PRIVATE_ANALYSIS_RIGHTS_NOT_PERMITTED';
        }
        if ($r['review_state']!=='AUTHORITATIVE_REVIEWED') {
            $reason[]='ORIGINAL_SOURCE_INDEPENDENT_REVIEW_ABSENT';
        }
        if (!is_string($r['live_source_sha256']) ||
            !hash_equals((string)$r['source_content_sha256'],(string)$r['live_source_sha256'])) {
            $reason[]='ORIGINAL_SOURCE_DIGEST_MISMATCH';
        }
        if (!is_string($r['live_source_version']) ||
            $r['source_version_id']!==$r['live_source_version']) {
            $reason[]='ORIGINAL_SOURCE_VERSION_MISMATCH';
        }
        if ($r['source_verified_at']===null) {
            $reason[]='SOURCE_VERIFICATION_RECEIPT_MISSING';
        }
        if ($r['claim_status']!=='INDEPENDENTLY_APPROVED' ||
            $r['scientific_review_state']!=='INDEPENDENTLY_APPROVED') {
            $reason[]='CLAIM_INDEPENDENT_REVIEW_NOT_COMPLETE';
        }
        // This is intentionally stricter than the private-use source approval:
        // retrieval or future refresh requires separate robots/transport grant.
        if ($r['scheduling_state']!=='APPROVED' ||
            (int)($r['rights_reviewed']??0)!==1 ||
            (int)($r['robots_terms_reviewed']??0)!==1 ||
            (int)($r['transport_reviewed']??0)!==1) {
            $reason[]='AUTOMATED_SOURCE_ACCESS_POLICY_NOT_COMPLETE';
        }
        $response['items'][]=[
            'claimId'=>(string)$r['claim_id'],
            'claimVersionId'=>(string)$r['claim_version_id'],
            'sourceId'=>(string)$r['source_id'],
            'sourceVersion'=>(string)$r['source_version_id'],
            'sourceSha256'=>(string)$r['source_content_sha256'],
            'citationAnchor'=>(string)$r['citation_anchor'],
            'citationRole'=>(string)$r['supporting_role'],
            'edgeId'=>(string)$r['edge_id'],
            'sourcePolicyRevision'=>$r['source_policy_revision']===null
                ?null:(int)$r['source_policy_revision'],
            'reviewRequired'=>count($reason)>0,
            'reasonCodes'=>$reason!==[]?$reason:['MOTHER_DB_REVIEW_METADATA_ONLY_NOT_INDEPENDENT_SCIENTIFIC_CERTIFICATION'],
        ];
    }
    return $response;
}
