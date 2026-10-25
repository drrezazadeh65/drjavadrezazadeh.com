<?php
declare(strict_types=1);
/**
 * Reconciliable post-CMS FA/EN public indexer. Only original signed CMS
 * pages verified against the actual on-disk SHA and same mother-DB source.
 * Safe to retry after interrupted publication; no per-article MFA decision.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/public-search-indexer.php';
require_once __DIR__.'/official-auto-handoff.php';

function jrNewsOriginalIndexVerifiedPublishedPages(
    PDO $pdo,string $siteRoot,int $nowEpoch,int $maxPages=16
):array {
    if($nowEpoch<=0||$maxPages<1||$maxPages>50)
        throw new InvalidArgumentException('news_original_index_batch_invalid');
    $q=$pdo->prepare(
        "SELECT p.publication_id,p.publisher_receipt_reference,
                p.fa_content_sha256,p.en_content_sha256,
                v.approval_digest,c.source_url,c.content_sha256,c.monitor_id,
                p.fa_route,p.en_route
         FROM jrei_news_publications p
         JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         WHERE p.publisher_state='PUBLISHED'
           AND p.publisher_receipt_reference LIKE 'jrei-original-bilingual:%'
           AND p.approved_decision_id IS NULL
           AND p.standing_policy_id IS NOT NULL
           AND (SELECT COUNT(*) FROM jrei_news_search_documents d
                WHERE d.publication_id=p.publication_id
                  AND d.index_state='PUBLISHED')<2
         ORDER BY p.published_at ASC,p.publication_id ASC LIMIT ?");
    $q->bindValue(1,$maxPages,PDO::PARAM_INT);
    $q->execute();
    $root=realpath($siteRoot);
    if($root===false)
        throw new RuntimeException('news_index_original_public_root_missing');
    $summary=['schema'=>'jr.jrei.news-original-index-reconcile.v1',
        'examined'=>0,'indexedLanguages'=>0,'invalidOriginalCmsProofs'=>0,
        'publicWritesPerformed'=>0];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $p){
        $summary['examined']++;
        $pub=$p['publication_id'];
        $expectedReference='jrei-original-bilingual:'.hash('sha256',
            implode('|',[$pub,$p['approval_digest'],
                $p['fa_content_sha256'],$p['en_content_sha256']]));
        if(!hash_equals($expectedReference,(string)$p['publisher_receipt_reference'])){
            $summary['invalidOriginalCmsProofs']++;continue;
        }
        $cmsReceipt=static function(string $ref,string $route,
            string $expectedSha)use($p,$root,$expectedReference):array {
            $locale=$route===$p['fa_route']?'fa':
                ($route===$p['en_route']?'en':null);
            if($locale===null||$ref!==$expectedReference||
               $expectedSha!==$p[$locale.'_content_sha256']||
               !preg_match('#^/(?:fa/akhbar|en/news-insights)/[a-z0-9-]+/$#D',$route))
                throw new RuntimeException('news_index_unmatched_original_cms_receipt');
            $path=$root.DIRECTORY_SEPARATOR.
                str_replace('/',DIRECTORY_SEPARATOR,trim($route,'/')).
                DIRECTORY_SEPARATOR.'index.html';
            if(is_link($path)||!is_file($path)||!is_readable($path)||
               filesize($path)>450000)
                throw new RuntimeException('news_index_original_cms_file_missing');
            $sha=hash_file('sha256',$path);
            if(!is_string($sha)||!hash_equals($expectedSha,$sha))
                throw new RuntimeException('news_index_original_cms_content_changed');
            return ['source'=>'ORIGINAL_AUTHENTICATED_CMS','verified'=>true,
                'route'=>$route,'contentSha256'=>$sha,
                'ownerApprovalDigest'=>$p['approval_digest']];
        };
        $country=static function(string $url,string $sha,
            string $publication)use($pdo,$p):array{
            if($publication!==$p['publication_id']||
               $url!==$p['source_url']||$sha!==$p['content_sha256'])
                throw new RuntimeException('news_index_article_source_mismatch');
            $source=jrNewsPrivateArticleOriginalSourceIdByUrl(
                $pdo,$p['monitor_id'],$url);
            if(!is_array($source))
                throw new RuntimeException('news_index_original_source_not_current');
            $proof=jrNewsOriginalOfficialSourceSnapshot(
                $pdo,$source['source_id'],$url);
            if($proof['registryState']!=='AUTHORITATIVE_REVIEWED'||
               $proof['notRevoked']!==true||
               $proof['rightsForPublicNews']!==true||
               $proof['exactSourceUrlApproved']!==true)
                throw new RuntimeException('news_index_original_source_rights_changed');
            return ['source'=>'ORIGINAL_JREI_REVIEWED_SOURCE_REGISTRY',
                'current'=>true,'contentSha256'=>$sha,
                'countryCode'=>$source['country_code']];
        };
        foreach(['fa','en'] as $language){
            $result=jrNewsIndexApprovedPublication($pdo,$pub,$language,
                $cmsReceipt,$country,$nowEpoch);
            if(($result['publicSearchEligible']??null)!==true)
                throw new RuntimeException('news_original_index_receipt_unexpected');
            $summary['indexedLanguages']++;
        }
    }
    return $summary;
}
function jrNewsPrivateArticleOriginalSourceIdByUrl(
    PDO $pdo,string $monitorId,string $url
):?array {
    $q=$pdo->prepare(
        "SELECT s.source_id,s.country_code
         FROM jrei_news_discovered_urls d
         JOIN jrei_exam_sources s ON s.source_id=d.approved_article_source_id
           AND BINARY s.source_locator_uri=BINARY d.canonical_article_url
         WHERE d.monitor_id=? AND BINARY d.canonical_article_url=BINARY ?
           AND d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
           AND s.is_revoked=0 AND s.is_superseded=0 LIMIT 1");
    $q->execute([$monitorId,$url]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)||
       !preg_match('/^[A-Z]{2}$/D',(string)$row['country_code']))
        return null;
    return $row;
}
