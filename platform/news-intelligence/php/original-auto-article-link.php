<?php
declare(strict_types=1);
/**
 * ORIGINAL JREI registry-based auto-linker for official feed discoveries.
 * Current owner directive: do not ask the owner to approve every notice.
 * We only connect an exact article URL when the ORIGINAL JREI source registry
 * has already independently verified its issuer, per-URL rights, source
 * policy, and the approved parent feed. This CANNOT grant source permission.
 *
 * Private operations Cron only; no HTTP, LLM, crawling, consent change, or
 * CMS write here. Sources lacking verification remain genuine exceptions.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/candidate-intake.php';

function jrNewsAutoLinkOriginalVerifiedArticleSources(
    PDO $pdo,array $originalServerJobContext,int $nowEpoch,int $batchSize=40
): array {
    if(($originalServerJobContext['source']??null)!==
            'ORIGINAL_JREI_PRIVATE_NEWS_WORKER'||
       ($originalServerJobContext['originalServerSessionVerified']??null)!==true||
       ($originalServerJobContext['newsPipelineEnabled']??null)!==true||
       $nowEpoch<=0||$batchSize<1||$batchSize>100)
        throw new RuntimeException('news_auto_article_link_original_job_required');
    $out=['schema'=>'jr.jrei.news-original-auto-article-links.v1',
        'linked'=>0,'pending'=>0,'examined'=>0,
        'ownerPerArticleApprovalPerformed'=>false,
        'sourceRightsInvented'=>false,'networkRequests'=>0,'published'=>0];
    $q=$pdo->prepare(
        "SELECT d.discovery_id,d.canonical_article_url,
                d.monitor_id,d.source_registry_id,d.canonical_url_sha256
         FROM jrei_news_discovered_urls d
         JOIN jrei_news_monitors n ON n.monitor_id=d.monitor_id
         JOIN jrei_exam_sources f ON f.source_id=n.jrei_source_reference
         JOIN jrei_ka_source_policies fp ON fp.source_id=f.source_id
         WHERE d.review_state='REQUIRES_ARTICLE_SOURCE_APPROVAL'
           AND d.source_registry_id=n.jrei_source_reference
           AND n.enabled=1 AND n.policy_revision=fp.revision
           AND BINARY n.source_url_sha256=BINARY SHA2(f.source_locator_uri,256)
           AND f.review_state='AUTHORITATIVE_REVIEWED'
           AND f.is_revoked=0 AND f.is_superseded=0
           AND f.reviewer_account_id IS NOT NULL AND f.verified_at IS NOT NULL
           AND f.rights_state IN ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
           AND fp.scheduling_state='APPROVED'
           AND fp.rights_reviewed=1 AND fp.robots_terms_reviewed=1
           AND fp.transport_reviewed=1
           AND BINARY fp.rights_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
           AND BINARY fp.robots_terms_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
           AND BINARY fp.transport_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
         ORDER BY d.last_seen_at ASC,d.discovery_id ASC LIMIT ?");
    $q->bindValue(1,$batchSize,PDO::PARAM_INT);
    $q->execute();
    $items=$q->fetchAll(PDO::FETCH_ASSOC);
    foreach($items as $item){
        $out['examined']++;
        $url=(string)$item['canonical_article_url'];
        if(strlen($url)>1000||
           !hash_equals((string)$item['canonical_url_sha256'],
             hash('sha256',$url))){
            $out['pending']++;continue;
        }
        // Look up a pre-existing original registration; this method NEVER
        // inserts, updates or self-reviews a JREI-KA source.
        $src=$pdo->prepare(
            "SELECT a.source_id
             FROM jrei_exam_sources a
             JOIN jrei_ka_source_policies ap ON ap.source_id=a.source_id
             WHERE BINARY a.source_locator_uri=BINARY ?
               AND a.review_state='AUTHORITATIVE_REVIEWED'
               AND a.rights_state IN
                    ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
               AND a.is_revoked=0 AND a.is_superseded=0
               AND a.reviewer_account_id IS NOT NULL
               AND a.verified_at IS NOT NULL
               AND ap.scheduling_state='APPROVED'
               AND ap.rights_reviewed=1 AND ap.robots_terms_reviewed=1
               AND ap.transport_reviewed=1
               AND BINARY ap.rights_evidence_sha256
                    REGEXP BINARY '^[a-f0-9]{64}$'
               AND BINARY ap.robots_terms_evidence_sha256
                    REGEXP BINARY '^[a-f0-9]{64}$'
               AND BINARY ap.transport_evidence_sha256
                    REGEXP BINARY '^[a-f0-9]{64}$'
             ORDER BY a.source_id LIMIT 1"
        );
        $src->execute([$url]);
        $id=$src->fetchColumn();
        if(!is_string($id)||!preg_match('/^[a-f0-9-]{36}$/iD',$id)){
            $out['pending']++;continue;
        }
        $pdo->beginTransaction();
        try{
            $locked=$pdo->prepare(
                "SELECT d.discovery_id FROM jrei_news_discovered_urls d
                 JOIN jrei_news_monitors n ON n.monitor_id=d.monitor_id
                 JOIN jrei_exam_sources f ON f.source_id=n.jrei_source_reference
                 JOIN jrei_ka_source_policies fp ON fp.source_id=f.source_id
                 JOIN jrei_exam_sources a
                   ON BINARY a.source_locator_uri=BINARY d.canonical_article_url
                   AND a.source_id=?
                 JOIN jrei_ka_source_policies ap ON ap.source_id=a.source_id
                 WHERE d.discovery_id=?
                   AND d.review_state='REQUIRES_ARTICLE_SOURCE_APPROVAL'
                   AND n.enabled=1 AND n.policy_revision=fp.revision
                   AND BINARY n.source_url_sha256=BINARY SHA2(f.source_locator_uri,256)
                   AND f.review_state='AUTHORITATIVE_REVIEWED'
                   AND f.is_revoked=0 AND f.is_superseded=0
                   AND f.verified_at IS NOT NULL
                   AND f.reviewer_account_id IS NOT NULL
                   AND fp.scheduling_state='APPROVED'
                   AND fp.rights_reviewed=1 AND fp.robots_terms_reviewed=1
                   AND fp.transport_reviewed=1
                   AND a.review_state='AUTHORITATIVE_REVIEWED'
                   AND a.is_revoked=0 AND a.is_superseded=0
                   AND a.verified_at IS NOT NULL
                   AND a.reviewer_account_id IS NOT NULL
                   AND ap.scheduling_state='APPROVED'
                   AND ap.rights_reviewed=1 AND ap.robots_terms_reviewed=1
                   AND ap.transport_reviewed=1 LIMIT 1 FOR UPDATE"
            );
            $locked->execute([$id,$item['discovery_id']]);
            if($locked->fetchColumn()!==false){
                $update=$pdo->prepare(
                    "UPDATE jrei_news_discovered_urls
                     SET approved_article_source_id=?,
                         review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
                     WHERE discovery_id=?
                       AND review_state='REQUIRES_ARTICLE_SOURCE_APPROVAL'");
                $update->execute([$id,$item['discovery_id']]);
                $out['linked']+=$update->rowCount();
            }else{
                $out['pending']++;
            }
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }
    return $out;
}
