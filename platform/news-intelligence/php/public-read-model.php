<?php
declare(strict_types=1);
/**
 * JREI News Intelligence — isolated PHP 8.3 public read model.
 * NOT ROUTED OR ENABLED. Include only by the existing same-origin Bertina API
 * after owner-approved mother migration, reviewed auth and final acceptance.
 *
 * This file never sends emails, runs crawlers, calls models or changes DB rows.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
function jrNewsSafeQuery(string $q): string {
    $q=trim($q);
    if ($q==='' || strlen($q)>220 ||
        preg_match('/[\x00-\x1F\x7F]/', $q)) {
        throw new InvalidArgumentException('news_search_query_invalid');
    }
    return $q;
}
function jrNewsProjection(array $publication, string $locale): ?array {
    if (($publication['publisher_state']??'')!=='PUBLISHED' ||
        empty($publication['published_at']) ||
        !in_array($locale,['fa','en'],true)) return null;
    $raw=$publication['bilingual_editorial_json']??null;
    if (!is_string($raw) || strlen($raw)>250000) return null;
    $draft=json_decode($raw,true,32,JSON_INVALID_UTF8_SUBSTITUTE);
    if (!is_array($draft))return null;
    $localized=$draft[$locale]??null;
    if (!is_array($localized))return null;
    $route=$publication[$locale.'_route']??null;
    if (!is_string($route) ||
        !preg_match('#^/'.$locale.'/[a-z0-9/-]{3,240}/$#D',$route) ||
        str_contains($route,'//'))return null;
    $headline=$localized['headline']??null;
    $summary=$localized['summary']??null;
    if (!is_string($headline) || strlen($headline)>720 ||
        trim($headline)==='' || !is_string($summary) ||
        strlen($summary)>4000)return null;
    return [
        'url'=>'https://drjavadrezazadeh.com'.$route,
        'headline'=>$headline,
        'summary'=>$summary,
        'published_at'=>(int)$publication['published_at'],
        'language'=>$locale,
        'official_source_provided'=>true,
        'public_owner_approved'=>true
    ];
}
/**
 * Bounded search of published, owner-approved articles only. SQL queries
 * deliberately restrict to PUBLISHED rows, but authenticated publish
 * receipts must ALSO have been checked when setting that state.
 * Caller must impose IP/account request limits and cache public-only data.
 */
function jrNewsPublishedSearch(PDO $pdo,string $query,string $locale='fa',
    int $limit=20): array {
    $query=jrNewsSafeQuery($query);
    if (!in_array($locale,['fa','en'],true) ||
        $limit<1 || $limit>30) {
        throw new InvalidArgumentException('news_search_options_invalid');
    }
    $escaped=str_replace(['\\','%','_'],['\\\\','\\%','\\_'],$query);
    $statement=$pdo->prepare(
        "SELECT p.publisher_state,p.published_at,p.fa_route,p.en_route,
                v.bilingual_editorial_json
         FROM jrei_news_publications p
         JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
         JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id
         WHERE p.publisher_state='PUBLISHED'
           AND p.published_at IS NOT NULL
           AND d.action_code='APPROVE'
           AND p.fa_content_sha256 IS NOT NULL
           AND p.en_content_sha256 IS NOT NULL
           AND v.bilingual_editorial_json LIKE :phrase
         ORDER BY p.published_at DESC LIMIT 100"
    );
    $statement->execute([':phrase'=>'%'.$escaped.'%']);
    $results=[];
    foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $record=jrNewsProjection($row,$locale);
        if ($record===null)continue;
        $results[]=$record;
        if (count($results)>=$limit)break;
    }
    return [
        'schema'=>'jr.jrei.news-public-search.v1',
        'language'=>$locale,'query'=>$query,'results'=>$results,
        'result_count'=>count($results),
        'private_editorial_records_exposed'=>false,
        'requires_existing_api_route_and_rate_limits'=>true
    ];
}
