<?php
declare(strict_types=1);
/**
 * First-party JREI News RSS + Google News sitemap projection.
 * Runs after the ORIGINAL publication and bilingual search index.
 * It never changes existing feed.xml or sitemap-news.xml and does not
 * infer an announcement from an unverified queued editorial revision.
 * Only the private Cron caller may write the three dedicated XML assets.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsSyndicationXml(string $value):string{
    // XML 1.0 forbids most C0 controls even in otherwise valid UTF-8.
    $clean=preg_replace('/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/u','',$value);
    return htmlspecialchars(is_string($clean)?$clean:'',
        ENT_QUOTES|ENT_XML1|ENT_SUBSTITUTE,'UTF-8');
}
function jrNewsSyndicationReadVerified(PDO $pdo,string $siteRoot,int $now):array{
    if($now<=0)throw new InvalidArgumentException('news_syndication_time_invalid');
    $root=realpath($siteRoot);
    if($root===false||$root!==realpath(dirname(__DIR__,3))||
       is_link($siteRoot))
        throw new RuntimeException('news_syndication_original_site_root_invalid');
    // Both indexed languages, a standing owner policy, source-verified CMS
    // receipt and immutable on-disk published file hashes are compulsory.
    $statement=$pdo->prepare(
        "SELECT p.publication_id,p.published_at,p.fa_route,p.en_route,
                p.fa_content_sha256,p.en_content_sha256,
                p.publisher_receipt_reference,v.approval_digest,
                fa.title AS fa_title,fa.summary AS fa_summary,
                en.title AS en_title,en.summary AS en_summary
         FROM jrei_news_publications p
         JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
         JOIN jrei_news_search_documents fa ON fa.publication_id=p.publication_id
             AND fa.language_code='fa' AND fa.index_state='PUBLISHED'
             AND BINARY fa.public_route=BINARY p.fa_route
             AND BINARY fa.owner_approval_digest=BINARY v.approval_digest
             AND BINARY fa.content_sha256=BINARY p.fa_content_sha256
         JOIN jrei_news_search_documents en ON en.publication_id=p.publication_id
             AND en.language_code='en' AND en.index_state='PUBLISHED'
             AND BINARY en.public_route=BINARY p.en_route
             AND BINARY en.owner_approval_digest=BINARY v.approval_digest
             AND BINARY en.content_sha256=BINARY p.en_content_sha256
         WHERE p.publisher_state='PUBLISHED'
           AND p.approved_decision_id IS NULL
           AND p.standing_policy_id IS NOT NULL
           AND p.publisher_receipt_reference LIKE 'jrei-original-bilingual:%'
           AND p.published_at IS NOT NULL AND p.published_at<=?
         ORDER BY p.published_at DESC,p.publication_id DESC LIMIT 500"
    );
    $statement->execute([$now]);
    $verified=[];
    foreach($statement->fetchAll(PDO::FETCH_ASSOC) as $row){
        $pid=(string)$row['publication_id'];
        $fa=(string)$row['fa_route'];$en=(string)$row['en_route'];
        if(!preg_match('/^[a-f0-9-]{36}$/iD',$pid)||
           !preg_match('#^/fa/akhbar/[a-z0-9-]{5,100}/$#D',$fa)||
           !preg_match('#^/en/news-insights/[a-z0-9-]{5,100}/$#D',$en))
            continue;
        $digest=hash('sha256',implode('|',[$pid,$row['approval_digest'],
            $row['fa_content_sha256'],$row['en_content_sha256']]));
        if(!hash_equals('jrei-original-bilingual:'.$digest,
            (string)$row['publisher_receipt_reference']))continue;
        $valid=true;
        foreach(['fa'=>$fa,'en'=>$en] as $lang=>$route){
            $file=$root.DIRECTORY_SEPARATOR.
                str_replace('/',DIRECTORY_SEPARATOR,trim($route,'/')).
                DIRECTORY_SEPARATOR.'index.html';
            $real=realpath($file);
            if($real===false||$real!==$file||is_link($file)||
               !is_file($file)||!is_readable($file)||
               filesize($file)>450000||
               !preg_match('/^[a-f0-9]{64}$/D',
                   (string)$row[$lang.'_content_sha256'])||
               !hash_equals((string)$row[$lang.'_content_sha256'],
                   (string)hash_file('sha256',$file))){
                $valid=false;break;
            }
        }
        if(!$valid)continue;
        // A bilingual receipt must not yield a single orphan-language item.
        $textValid=true;
        foreach(['fa','en'] as $language){
            $title=trim((string)$row[$language.'_title']);
            $summary=trim((string)$row[$language.'_summary']);
            if($title===''||$summary===''||
               strlen($title)>1000||strlen($summary)>9000||
               preg_match('//u',$title)!==1||
               preg_match('//u',$summary)!==1)$textValid=false;
        }
        if(!$textValid)continue;
        foreach(['fa','en'] as $lang){
            $route=$lang==='fa'?$fa:$en;
            $title=trim((string)$row[$lang.'_title']);
            $summary=trim((string)$row[$lang.'_summary']);
            $verified[]=[
                'publicationId'=>$pid,'language'=>$lang,
                'url'=>'https://drjavadrezazadeh.com'.$route,
                'title'=>$title,'summary'=>$summary,
                'publishedAt'=>(int)$row['published_at']
            ];
        }
    }
    return $verified;
}
function jrNewsBuildSyndicationFiles(array $verified,int $now):array{
    if($now<=0||count($verified)>1000)
        throw new InvalidArgumentException('news_syndication_batch_invalid');
    $site='https://drjavadrezazadeh.com';
    $out=[];
    foreach(['fa','en'] as $lang){
        $items=array_values(array_filter($verified,
            static fn(array $a):bool=>($a['language']??null)===$lang));
        $items=array_slice($items,0,100);
        $root=$lang==='fa'?'/fa/akhbar/':'/en/news-insights/';
        $label=$lang==='fa'?'اخبار رسمی آموزشی JREI':
            'JREI Verified Education News';
        $xml='<?xml version="1.0" encoding="UTF-8"?>'."\n".
            '<!-- JREI-NEWS-OWNED v1; original authenticated CMS only -->'."\n".
            '<rss version="2.0"><channel><title>'.
            jrNewsSyndicationXml($label).'</title><link>'.$site.$root.'</link>'.
            '<description>Verified official educational news</description>'.
            '<language>'.$lang.'</language>';
        foreach($items as $item){
            $xml.='<item><title>'.jrNewsSyndicationXml($item['title']).
                '</title><link>'.jrNewsSyndicationXml($item['url']).
                '</link><guid isPermaLink="true">'.
                jrNewsSyndicationXml($item['url']).'</guid><pubDate>'.
                gmdate(DATE_RSS,$item['publishedAt']).'</pubDate>'.
                '<description>'.jrNewsSyndicationXml($item['summary']).
                '</description></item>';
        }
        $out[$lang==='fa'?'fa/akhbar/jrei-news.xml':
            'en/news-insights/jrei-news.xml']=$xml.'</channel></rss>';
    }
    $sitemap='<?xml version="1.0" encoding="UTF-8"?>'."\n".
        '<!-- JREI-NEWS-OWNED v1; original authenticated CMS only -->'."\n".
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '.
        'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">';
    $count=0;$seen=[];
    foreach($verified as $item){
        if($item['publishedAt']<$now-172800||$item['publishedAt']>$now||
           isset($seen[$item['url']]))continue;
        $seen[$item['url']]=true;$count++;
        $sitemap.='<url><loc>'.jrNewsSyndicationXml($item['url']).
            '</loc><news:news><news:publication><news:name>'.
            'JREI Education News</news:name><news:language>'.
            $item['language'].'</news:language></news:publication>'.
            '<news:publication_date>'.
            gmdate('Y-m-d\TH:i:s\Z',$item['publishedAt']).
            '</news:publication_date><news:title>'.
            jrNewsSyndicationXml($item['title']).
            '</news:title></news:news></url>';
    }
    $out['jrei-news-sitemap.xml']=$sitemap.'</urlset>';
    return ['files'=>$out,'verifiedArticleLanguages'=>count($verified),
        'recentSitemapEntries'=>$count,'existingSiteSitemapUntouched'=>true];
}
/** Safe to retry. No unknown files are overwritten. Each file atomic. */
function jrNewsWriteOriginalSyndication(
    PDO $pdo,string $siteRoot,int $now,array $privateGate
):array{
    if(($privateGate['source']??null)!=='ORIGINAL_JREI_PRIVATE_INDEX_WORKER'||
       ($privateGate['actualPublishedCmsReceiptsRequired']??null)!==true||
       ($privateGate['originalSyndicationActivated']??null)!==true)
        throw new RuntimeException('news_private_syndication_disabled');
    $root=realpath($siteRoot);
    if($root===false||$root!==realpath(dirname(__DIR__,3))||
       is_link($siteRoot))throw new RuntimeException('news_syndication_root_untrusted');
    $built=jrNewsBuildSyndicationFiles(
        jrNewsSyndicationReadVerified($pdo,$root,$now),$now);
    $written=0;
    foreach($built['files'] as $relative=>$xml){
        $filename=$root.DIRECTORY_SEPARATOR.
            str_replace('/',DIRECTORY_SEPARATOR,$relative);
        $folder=dirname($filename);
        if(!is_dir($folder)||is_link($folder)||realpath($folder)!==$folder||
           strlen($xml)>1250000||file_exists($filename)&&
            (!is_file($filename)||is_link($filename)||!is_readable($filename)||
             filesize($filename)>1250000||
             !str_contains((string)file_get_contents($filename),
                  '<!-- JREI-NEWS-OWNED v1; original authenticated CMS only -->')))
            throw new RuntimeException('news_syndication_existing_file_not_owned');
        $temp=tempnam($folder,'.jrei-news-');
        if(!is_string($temp))throw new RuntimeException('news_syndication_temp_failed');
        try{
            if(file_put_contents($temp,$xml,LOCK_EX)!==strlen($xml)||
               !chmod($temp,0644)||!rename($temp,$filename))
                throw new RuntimeException('news_syndication_atomic_write_failed');
            $written++;
        }finally{
            if(is_file($temp))unlink($temp);
        }
    }
    return ['schema'=>'jr.jrei.news-original-syndication-receipt.v1',
        'writtenAssets'=>$written,
        'verifiedArticleLanguages'=>$built['verifiedArticleLanguages'],
        'recentSitemapEntries'=>$built['recentSitemapEntries'],
        'legacyFeedAndSitemapPreserved'=>true,
        'googleSubmissionPerformed'=>false];
}
