<?php
declare(strict_types=1);
/**
 * ORIGINAL read-only public News RSS and Google News XML endpoints.
 * No new public storage or sitemap overwrite. Every item must have a
 * live first-party bilingual CMS page matching immutable content hash,
 * an authenticated receipt and one valid original publication authority.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
function jrNewsPublicXmlText(string $v):string{
    return htmlspecialchars($v,ENT_QUOTES|ENT_XML1|ENT_SUBSTITUTE,'UTF-8');
}
function jrNewsOriginalPublishedSyndication(PDO $pdo,string $siteRoot,
    int $now,int $limit=100):array {
    if($now<=0||$limit<1||$limit>100)
        throw new InvalidArgumentException('news_feed_read_invalid');
    require_once __DIR__.'/internal/jrei-news/standing-official-publication.php';
    $standing=jrNewsStandingPublicSchemaInstalled($pdo);
    $proof=jrNewsPublicationAuthorityPredicate($standing);
    $join=$standing?
       'LEFT JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id
        LEFT JOIN jrei_news_standing_policies pol ON pol.policy_id=p.standing_policy_id':
       'JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id';
    $q=$pdo->prepare(
        "SELECT s.language_code,s.public_route,s.title,s.summary,s.published_at,
                s.content_sha256,s.category_code,s.event_code,c.priority_code,p.publisher_receipt_reference,
                p.fa_content_sha256,p.en_content_sha256
         FROM jrei_news_search_documents s
         JOIN jrei_news_publications p ON p.publication_id=s.publication_id
         JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         ".$join."
         WHERE p.publisher_state='PUBLISHED' AND s.index_state='PUBLISHED'
           AND p.published_at IS NOT NULL AND p.published_at<=?
           AND p.publisher_receipt_reference IS NOT NULL
           AND s.content_sha256=IF(s.language_code='fa',
             p.fa_content_sha256,p.en_content_sha256)
           AND ".$proof."
         ORDER BY s.published_at DESC,s.document_id DESC LIMIT ?");
    $q->bindValue(1,$now,PDO::PARAM_INT);
    $q->bindValue(2,$limit,PDO::PARAM_INT);
    $q->execute();
    $root=realpath($siteRoot);
    if($root===false)throw new RuntimeException('news_original_public_root_unavailable');
    $out=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
        $lang=$row['language_code'];
        $prefix=$lang==='fa'?'/fa/akhbar/':'/en/news-insights/';
        $route=(string)$row['public_route'];
        if(!in_array($lang,['fa','en'],true)||
           !preg_match('#^'.preg_quote($prefix,'#').'[a-z0-9-]+/$#D',$route)||
           !preg_match('/^[a-f0-9]{64}$/D',(string)$row['content_sha256'])||
           !is_string($row['publisher_receipt_reference'])||
           strlen($row['publisher_receipt_reference'])<8)
            continue;
        $path=$root.DIRECTORY_SEPARATOR.
          str_replace('/',DIRECTORY_SEPARATOR,trim($route,'/')).
          DIRECTORY_SEPARATOR.'index.html';
        if(is_link($path)||!is_file($path)||!is_readable($path)||
           filesize($path)>450000)continue;
        $actual=@hash_file('sha256',$path);
        if(!is_string($actual)||
           !hash_equals((string)$row['content_sha256'],$actual))
            continue;
        $out[]=[
            'language'=>$lang,'url'=>'https://drjavadrezazadeh.com'.$route,
            'title'=>(string)$row['title'],'summary'=>(string)$row['summary'],
            'publishedAt'=>(int)$row['published_at'],
            'category'=>in_array((string)$row['category_code'],
                ['school','examinations','universities','employment',
                 'language','international','research'],true)?
                (string)$row['category_code']:'unclassified',
            'event'=>preg_match('/^[a-z0-9_-]{2,64}$/D',(string)$row['event_code'])===1?
                (string)$row['event_code']:'general',
            'priority'=>in_array((string)$row['priority_code'],['P0','P1','P2'],true)?
                (string)$row['priority_code']:'P2'
        ];
    }
    return $out;
}
function jrNewsPublicXmlResponse(array $stories,string $kind,string $lang,int $now):string{
    $prefix='<?xml version="1.0" encoding="UTF-8"?>'."\n";
    if($kind==='rss'){
        $title=$lang==='fa'?'اخبار معتبر آموزش و آزمون‌ها | JREI':
            'JREI Education News & Intelligence';
        $home=$lang==='fa'?
            'https://drjavadrezazadeh.com/fa/akhbar/':
            'https://drjavadrezazadeh.com/en/news-insights/';
        $items='';
        foreach($stories as $r){
            if($r['language']!==$lang)continue;
            $items.='<item><title>'.jrNewsPublicXmlText($r['title']).'</title>'.
                '<link>'.jrNewsPublicXmlText($r['url']).'</link>'.
                '<guid isPermaLink="true">'.jrNewsPublicXmlText($r['url']).'</guid>'.
                '<description>'.jrNewsPublicXmlText($r['summary']).'</description>'.
                '<category domain="jrei-news-topic">'.
                  jrNewsPublicXmlText($r['category']).'</category>'.
                '<category domain="jrei-news-event">'.
                  jrNewsPublicXmlText($r['event']).'</category>'.
                '<category>.(($r['priority']==='P0'&&
                  $now-$r['publishedAt']>=0&&$now-$r['publishedAt']<=48*3600)?
                    'BREAKING':'NEWS').'</category>'.
                '<pubDate>'.gmdate(DATE_RSS,$r['publishedAt']).'</pubDate></item>';
        }
        return $prefix.'<rss version="2.0"><channel><title>'.
          jrNewsPublicXmlText($title).'</title><link>'.
          jrNewsPublicXmlText($home).'</link><description>'.
          'Official source-verified educational news and deadlines'.
          '</description><language>'.$lang.'</language>'.$items.
          '</channel></rss>';
    }
    if($kind!=='google-news')
        throw new InvalidArgumentException('news_xml_unknown_type');
    $items='';
    foreach($stories as $r){
        if($now-$r['publishedAt']>48*3600)continue;
        $language=$r['language'];
        $items.='<url><loc>'.jrNewsPublicXmlText($r['url']).'</loc>'.
          '<news:news><news:publication><news:name>'.
          'JREI Education News &amp; Intelligence'.
          '</news:name><news:language>'.$language.
          '</news:language></news:publication><news:publication_date>'.
          gmdate('Y-m-d\TH:i:s\Z',$r['publishedAt']).
          '</news:publication_date><news:title>'.
          jrNewsPublicXmlText($r['title']).'</news:title></news:news></url>';
    }
    return $prefix.
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '.
      'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">'.
      $items.'</urlset>';
}
function jrNewsPublicFeedRoute(string $kind,string $method):never{
    header('X-Content-Type-Options: nosniff');
    if($method!=='GET')fail('method_not_allowed',405);
    $cfg=cfg();
    if(($cfg['jrei_news_search_enabled']??false)!==true||
       ($cfg['jrei_news_publisher_receipts_accepted']??false)!==true)
        fail('news_feeds_not_active',503);
    if($kind==='rss'){
        if(array_keys($_GET)!==['language']||
           !is_string($_GET['language']??null)||
           !in_array($_GET['language'],['fa','en'],true))
            fail('news_feed_locale_invalid',400);
        $lang=$_GET['language'];
    }else{
        if($_GET!==[])fail('news_feed_query_invalid',400);
        $lang='fa';
    }
    $pdo=db();
    if(!$pdo instanceof PDO)fail('news_feed_database_unavailable',503);
    try{
        $stories=jrNewsOriginalPublishedSyndication(
            $pdo,dirname(__DIR__),time(),100);
        $xml=jrNewsPublicXmlResponse($stories,$kind,$lang,time());
    }catch(Throwable $e){
        error_log('JREI News public XML unavailable: '.get_class($e));
        fail('news_feeds_unavailable',503);
    }
    header('Content-Type: '.($kind==='rss'?
        'application/rss+xml':'application/xml').'; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    echo $xml;
    exit;
}
