<?php
declare(strict_types=1);
/**
 * Bind a feed-discovered article URL to an independently approved ORIGINAL
 * JREI source registration. No source approval is granted by news itself.
 * No HTTP request, queue or public article is created by this function.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/owner-editorial.php';

function jrNewsBindOriginalApprovedArticleSource(
    PDO $pdo,array $ownerSession,string $discoveryId,
    string $approvedOriginalArticleSourceId,int $nowEpoch
): array {
    $owner=jrNewsOwnerAuthority($ownerSession);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$discoveryId) ||
        !preg_match('/^[a-f0-9-]{36}$/iD',$approvedOriginalArticleSourceId)||
        $nowEpoch<=0) {
        throw new InvalidArgumentException('news_article_source_binding_invalid');
    }
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT discovery_id,monitor_id,source_registry_id,
                    canonical_article_url,review_state,approved_article_source_id
             FROM jrei_news_discovered_urls
             WHERE discovery_id=? FOR UPDATE'
        );
        $q->execute([$discoveryId]);
        $candidate=$q->fetch(PDO::FETCH_ASSOC);
        if(!$candidate)throw new RuntimeException('news_discovered_url_missing');
        // Approving an article must not resurrect a feed monitor disabled
        // by the owner or a source policy revoked after feed discovery.
        // Bind to the same original source URL/hash and approved revision.
        $q=$pdo->prepare(
            "SELECT n.monitor_id FROM jrei_news_monitors n
             JOIN jrei_exam_sources s ON s.source_id=n.jrei_source_reference
             JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
             WHERE n.monitor_id=? AND n.jrei_source_reference=?
               AND n.enabled=1 AND n.policy_revision=p.revision
               AND n.source_url_sha256=SHA2(s.source_locator_uri,256)
               AND s.review_state='AUTHORITATIVE_REVIEWED'
               AND s.rights_state IN
                 ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
               AND s.is_revoked=0 AND s.is_superseded=0
               AND s.verified_at IS NOT NULL AND s.reviewer_account_id IS NOT NULL
               AND p.scheduling_state='APPROVED'
               AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
               AND p.transport_reviewed=1
               AND p.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
               AND p.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
               AND p.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
             LIMIT 1 FOR UPDATE"
        );
        $q->execute([$candidate['monitor_id'],$candidate['source_registry_id']]);
        if($q->fetchColumn()===false)
            throw new RuntimeException('news_discovered_feed_authority_revoked');
        $q=$pdo->prepare(
            'SELECT s.source_id,s.source_locator_uri,s.review_state,
                    s.rights_state,s.is_revoked,s.is_superseded,
                    s.verified_at,s.reviewer_account_id,
                    p.scheduling_state,p.revision,p.rights_reviewed,
                    p.robots_terms_reviewed,p.transport_reviewed,
                    p.rights_evidence_sha256,p.robots_terms_evidence_sha256,
                    p.transport_evidence_sha256
             FROM jrei_exam_sources s
             JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
             WHERE s.source_id=? FOR UPDATE'
        );
        $q->execute([$approvedOriginalArticleSourceId]);
        $registered=$q->fetch(PDO::FETCH_ASSOC);
        if(!$registered||
            $registered['source_locator_uri']!==$candidate['canonical_article_url']||
            $registered['review_state']!=='AUTHORITATIVE_REVIEWED'||
            !in_array($registered['rights_state'],[
                'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'
            ],true)||
            (int)$registered['is_revoked']!==0 ||
            (int)$registered['is_superseded']!==0 ||
            empty($registered['verified_at'])||
            empty($registered['reviewer_account_id'])||
            $registered['scheduling_state']!=='APPROVED'||
            (int)$registered['rights_reviewed']!==1||
            (int)$registered['robots_terms_reviewed']!==1||
            (int)$registered['transport_reviewed']!==1||
            preg_match('/^[a-f0-9]{64}$/D',
                (string)$registered['rights_evidence_sha256'])!==1||
            preg_match('/^[a-f0-9]{64}$/D',
                (string)$registered['robots_terms_evidence_sha256'])!==1||
            preg_match('/^[a-f0-9]{64}$/D',
                (string)$registered['transport_evidence_sha256'])!==1) {
            throw new RuntimeException('news_article_original_jrei_source_not_approved');
        }
        if ($candidate['review_state']==='ORIGINAL_JREI_ARTICLE_APPROVED') {
            if($candidate['approved_article_source_id']!==
                $approvedOriginalArticleSourceId)
                throw new RuntimeException('news_article_binding_conflict');
            $pdo->commit();
            return ['state'=>'ALREADY_BOUND','discoveryId'=>$discoveryId,
                'articleDownloaded'=>false];
        }
        if($candidate['review_state']!=='REQUIRES_ARTICLE_SOURCE_APPROVAL') {
            throw new RuntimeException('news_discovered_article_not_bindable');
        }
        $pdo->prepare(
            "UPDATE jrei_news_discovered_urls SET
               approved_article_source_id=?,
               review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
             WHERE discovery_id=? AND
               review_state='REQUIRES_ARTICLE_SOURCE_APPROVAL'"
        )->execute([$approvedOriginalArticleSourceId,$discoveryId]);
        if(function_exists('operationsAudit')) {
            operationsAudit($pdo,$owner['actor'],
                'jrei_news_article_source_bound',
                hash('sha256',$discoveryId.'|'.$approvedOriginalArticleSourceId));
        }
        $pdo->commit();
        return [
            'schema'=>'jr.jrei.news-original-article-source-bound.v1',
            'discoveryId'=>$discoveryId,
            'originalArticleSourceId'=>$approvedOriginalArticleSourceId,
            'sourceAuthorizationInheritedFromOriginalJrei'=>true,
            'articleDownloaded'=>false,
            'newsPublished'=>false
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
