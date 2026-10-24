<?php
declare(strict_types=1);
/**
 * Unpublished owner-only article preview. NOT an open content endpoint.
 * Original operations MFA owner authentication is mandatory.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
function jrNewsPrivateOwnerPreview(PDO $pdo,array $session,
    string $revisionId): array {
    jrNewsOwnerAuthority($session);
    if (!preg_match('/^[0-9a-f-]{36}$/iD',$revisionId)) {
        throw new InvalidArgumentException('news_owner_preview_id_invalid');
    }
    $stmt=$pdo->prepare(
        "SELECT v.revision_id,v.revision_number,v.bilingual_editorial_json,
                v.approval_digest,v.approved_image_ref,v.editorial_state,
                c.source_url,c.headline,c.priority_code,c.content_sha256
         FROM jrei_news_editorial_versions v
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         JOIN jrei_news_evidence_reviews e
           ON e.review_id=v.evidence_review_id
         JOIN jrei_news_discovered_urls d
           ON d.monitor_id=c.monitor_id
          AND BINARY d.canonical_url_sha256=BINARY SHA2(c.source_url,256)
         WHERE v.revision_id=?
           AND v.editorial_state='PENDING_OWNER_APPROVAL'
           AND e.verification_state='APPROVED'
           AND e.issuer_verified=1 AND e.usage_rights_verified=1
           AND e.content_sha256=c.content_sha256
           AND d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
           AND d.approved_article_source_id IS NOT NULL
         LIMIT 1"
    );
    $stmt->execute([$revisionId]);
    $row=$stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || !is_string($row['bilingual_editorial_json']) ||
        strlen($row['bilingual_editorial_json'])>250000 ||
        !preg_match('/^[a-f0-9]{64}$/D',(string)$row['approval_digest'])) {
        throw new RuntimeException('news_owner_preview_not_available');
    }
    if (!hash_equals((string)$row['approval_digest'],
            hash('sha256',(string)$row['bilingual_editorial_json']))) {
        throw new RuntimeException('news_owner_preview_exact_digest_mismatch');
    }
    $draft=json_decode($row['bilingual_editorial_json'],true,24,
        JSON_THROW_ON_ERROR);
    if (!is_array($draft)) {
        throw new RuntimeException('news_editorial_json_invalid');
    }
    $clean=[];
    foreach (['fa','en'] as $language) {
        $text=$draft[$language]??null;
        if (!is_array($text)) {
            throw new RuntimeException('news_translation_not_ready');
        }
        foreach (['headline','summary','body','nextSteps'] as $key) {
            $value=$text[$key]??null;
            $maxBytes=['headline'=>720,'summary'=>4000,
                       'body'=>100000,'nextSteps'=>12000][$key];
            if (!is_string($value)||trim($value)===''||
                strlen($value)>$maxBytes||preg_match('//u',$value)!==1||
                ($key==='headline'&&
                    preg_match_all('/./us',$value)>240)) {
                throw new RuntimeException('news_translation_field_invalid');
            }
            $clean[$language][$key]=$value;
        }
    }
    $paths=$draft['routeProposal']??null;
    if(!is_array($paths) ||
        ($paths['schema']??null)!=='jr.jrei.news-bilingual-proposed-routes.v1' ||
        !is_string($paths['faPath']??null) ||
        !is_string($paths['enPath']??null) ||
        !preg_match('#^/fa/akhbar/[a-z0-9-]+/$#D',$paths['faPath']) ||
        !preg_match('#^/en/news-insights/[a-z0-9-]+/$#D',$paths['enPath'])) {
        throw new RuntimeException('news_owner_draft_route_proposal_not_reviewed');
    }
    $asset=$row['approved_image_ref']??null;
    if (is_string($asset) && str_starts_with($asset,'assets/images/')) {
        $asset='/'.$asset;
    }
    $safeImageUrl=is_string($asset) &&
      preg_match('#^/assets/images/[a-zA-Z0-9_./-]+\.(?:webp|png|jpg|jpeg|avif|svg)$#D',$asset) &&
      !str_contains($asset,'..') ? $asset : null;
    $related=[];
    if (is_array($draft['internalLinks']??null)) {
        foreach (array_slice($draft['internalLinks'],0,16) as $link) {
            if (!is_array($link))continue;
            $path=$link['path']??null;
            $anchor=$link['anchor']??null;
            if (is_string($path) &&
                preg_match('#^/(?:fa|en)/[a-z0-9/-]+/$#D',$path) &&
                is_string($anchor) && strlen($anchor)<=240) {
                $related[]=['path'=>$path,'anchor'=>$anchor];
            }
        }
    }
    return [
        'schema'=>'jr.jrei.news-owner-full-preview.v1',
        'revisionId'=>$row['revision_id'],
        'revisionNumber'=>(int)$row['revision_number'],
        'approvalDigest'=>$row['approval_digest'],
        'priority'=>$row['priority_code'],
        'sourceUrl'=>$row['source_url'],
        'evidenceSha256'=>$row['content_sha256'],
        'imageAssetReference'=>$row['approved_image_ref'],
        'proposedBilingualRoutes'=>[
            'fa'=>$paths['faPath'],'en'=>$paths['enPath']],
        'safeImagePreviewUrl'=>$safeImageUrl,
        'relatedInternalLinks'=>$related,
        'fa'=>$clean['fa'],'en'=>$clean['en'],
        'state'=>'PENDING_OWNER_APPROVAL',
        'publiclyPublished'=>false,
        'adminSessionOnly'=>true
    ];
}
