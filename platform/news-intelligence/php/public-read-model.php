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
require_once __DIR__.'/standing-official-publication.php';
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
    try{$draft=json_decode($raw,true,32,JSON_THROW_ON_ERROR);}
    catch(Throwable $e){return null;}
    if (!is_array($draft))return null;
    $localized=$draft[$locale]??null;
    if (!is_array($localized))return null;
    $route=$publication[$locale.'_route']??null;
    if (!is_string($route) ||
        !preg_match('#^'.($locale==='fa'?'/fa/akhbar/':'/en/news-insights/').'[a-z0-9-]+/$#D',$route))return null;
    $headline=$localized['headline']??null;
    $summary=$localized['summary']??null;
    if (!is_string($headline) || strlen($headline)>720 ||
        trim($headline)==='' || !is_string($summary) ||
        strlen($summary)>4000 ||
        preg_match('//u',$headline)!==1 ||
        preg_match('//u',$summary)!==1 ||
        (int)$publication['published_at']>time())return null;
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
/**
 * Searches the approved public-only index, not private editorial draft JSON.
 * Fulltext is used when populated; a bounded title/summary LIKE fallback
 * supports shorter/Persian vocabulary under differing MariaDB tokenizers.
 * Caller MUST enforce original site public search rate limits.
 */
function jrNewsPublishedSearch(PDO $pdo,string $query,string $locale='fa',
    int $limit=20,array $filters=[]): array {
    // Category browsing does not require inventing a keyword. An empty query
    // is permitted ONLY with one of the seven original controlled taxonomies.
    // Every browse result still satisfies the exact published authority joins.
    $query=trim($query);
    $browseCategory=($query==='' && isset($filters['category']));
    if (!$browseCategory) $query=jrNewsSafeQuery($query);
    if (!in_array($locale,['fa','en'],true)||$limit<1||$limit>30 ||
        !is_array($filters)) {
        throw new InvalidArgumentException('news_search_options_invalid');
    }
    $where=[
        "s.index_state='PUBLISHED'",
        "s.language_code=:lang",
        "p.publisher_state='PUBLISHED'",
        "p.published_at IS NOT NULL",
        "p.published_at<=UNIX_TIMESTAMP()",
        "s.published_at<=UNIX_TIMESTAMP()",
        "p.publisher_receipt_reference IS NOT NULL",
        "s.owner_approval_digest=v.approval_digest",
        "s.public_route=IF(s.language_code='fa',p.fa_route,p.en_route)",
        "s.content_sha256=IF(s.language_code='fa',p.fa_content_sha256,p.en_content_sha256)"
    ];
    $args=[':lang'=>$locale];
    if (isset($filters['category'])) {
        $category=$filters['category'];
        if (!is_string($category) ||
            !in_array($category,['school','examinations','universities',
                'employment','language','international','research'],true)) {
            throw new InvalidArgumentException('news_search_category_invalid');
        }
        $where[]='s.category_code=:category';
        $args[':category']=$category;
    }
    if (isset($filters['country'])) {
        $country=$filters['country'];
        if (!is_string($country) ||
            !preg_match('/^[A-Z]{2}$/D',$country)) {
            throw new InvalidArgumentException('news_search_country_invalid');
        }
        $where[]='s.country_code=:country';
        $args[':country']=$country;
    }
    foreach (['after'=>'after','before'=>'before'] as $key=>$bind) {
        if (!isset($filters[$key]))continue;
        $value=$filters[$key];
        if (!is_int($value) || $value<0) {
            throw new InvalidArgumentException('news_search_date_invalid');
        }
        $where[]='s.published_at'.($key==='after'?'>=':'<=').':'.$bind;
        $args[':'.$bind]=$value;
    }
    $standing=jrNewsStandingPublicSchemaInstalled($pdo);
    $where[]=jrNewsPublicationAuthorityPredicate($standing);
    $joins=" FROM jrei_news_search_documents s
       JOIN jrei_news_publications p ON p.publication_id=s.publication_id
       JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
       ".($standing?
          'LEFT JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id
           LEFT JOIN jrei_news_standing_policies pol ON pol.policy_id=p.standing_policy_id'
         :'JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id').
       " WHERE ".implode(' AND ',$where);
    $rowLimit=min($limit*3,90);
    $querySql='SELECT s.public_route,s.title,s.summary,s.published_at,'.
        ' MATCH(s.title,s.summary,s.searchable_body) AGAINST(:phrase IN NATURAL LANGUAGE MODE) AS relevance'.
        $joins.' AND MATCH(s.title,s.summary,s.searchable_body) AGAINST(:matched IN NATURAL LANGUAGE MODE)>0'.
        ' ORDER BY relevance DESC,s.published_at DESC LIMIT :row_limit';
    $rows=[];
    if ($browseCategory) {
        // No search terms are fabricated: browse the newest authenticated
        // published category rows, bounded by the same limit and filters.
        $browseSql='SELECT s.public_route,s.title,s.summary,s.published_at'.
            $joins.' ORDER BY s.published_at DESC LIMIT :row_limit';
        $browse=$pdo->prepare($browseSql);
        foreach ($args as $key=>$value) $browse->bindValue($key,$value,
            is_int($value)?PDO::PARAM_INT:PDO::PARAM_STR);
        $browse->bindValue(':row_limit',$rowLimit,PDO::PARAM_INT);
        $browse->execute();
        $rows=$browse->fetchAll(PDO::FETCH_ASSOC);
    } else try {
        $statement=$pdo->prepare($querySql);
        foreach ($args as $key=>$value) $statement->bindValue($key,$value,
            is_int($value)?PDO::PARAM_INT:PDO::PARAM_STR);
        $statement->bindValue(':phrase',$query,PDO::PARAM_STR);
        $statement->bindValue(':matched',$query,PDO::PARAM_STR);
        $statement->bindValue(':row_limit',$rowLimit,PDO::PARAM_INT);
        $statement->execute();
        $rows=$statement->fetchAll(PDO::FETCH_ASSOC);
    }catch(PDOException $e) {
        // InnoDB FULLTEXT may be unavailable after a partial migration or
        // on some MariaDB search configurations. The existing bounded,
        // escaped exact-text fallback remains safe for Persian queries.
        // Never expose schema or query errors to a public search client.
        $rows=[];
    }
    if (!$rows && !$browseCategory) {
        $literal=str_replace(['!','%','_'],['!!','!%','!_'],$query);
        $sql='SELECT s.public_route,s.title,s.summary,s.published_at'.
          $joins." AND (s.title LIKE :title ESCAPE '!'".
          " OR s.summary LIKE :summary ESCAPE '!')".
          ' ORDER BY s.published_at DESC LIMIT :row_limit';
        $fallback=$pdo->prepare($sql);
        foreach ($args as $key=>$value) $fallback->bindValue($key,$value,
            is_int($value)?PDO::PARAM_INT:PDO::PARAM_STR);
        $fallback->bindValue(':title','%'.$literal.'%',PDO::PARAM_STR);
        $fallback->bindValue(':summary','%'.$literal.'%',PDO::PARAM_STR);
        $fallback->bindValue(':row_limit',$rowLimit,PDO::PARAM_INT);
        $fallback->execute();
        $rows=$fallback->fetchAll(PDO::FETCH_ASSOC);
    }
    $results=[];
    foreach($rows as $item){
        $path=$item['public_route']??null;
        $expectedPrefix=$locale==='fa'?'/fa/akhbar/':'/en/news-insights/';
        if (!is_string($path) ||
            !str_starts_with($path,$expectedPrefix) ||
            !preg_match('#^'.preg_quote($expectedPrefix,'#').
                '[a-z0-9-]+/$#D',$path))continue;
        $headline=$item['title']??null;
        $summary=$item['summary']??null;
        $timestamp=(int)($item['published_at']??0);
        if(!is_string($headline)||trim($headline)===''||
           strlen($headline)>720||preg_match('//u',$headline)!==1||
           preg_match_all('/./us',$headline)>240||
           !is_string($summary)||strlen($summary)>4000||
           preg_match('//u',$summary)!==1||$timestamp<=0)continue;
        $results[]=[
            'url'=>'https://drjavadrezazadeh.com'.$path,
            'headline'=>$headline,
            'summary'=>$summary,
            'published_at'=>$timestamp,
            'language'=>$locale
        ];
        if(count($results)>=$limit)break;
    }
    return [
        'schema'=>'jr.jrei.news-public-search.v1','language'=>$locale,
        'query'=>$query,'filters'=>$filters,'results'=>$results,
        'result_count'=>count($results),
        'onlyOwnerApprovedPublishedContent'=>true,
        'standingOwnerPolicySupported'=>$standing,
        'verifiedOriginalPublisherReceiptRequired'=>true,
        'privateEditorialRecordsExposed'=>false
    ];
}
