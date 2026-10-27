<?php
declare(strict_types=1);
/**
 * Published JREI News official-date calendar for the existing /fa/akhbar/
 * and /en/news-insights/ 21-section newsroom. No parallel calendar, tables,
 * scraper, crawler, unreviewed source, account session or publication path.
 *
 * Resolve the original JREI-KA source_ref against independently reviewed
 * mother-DB source and rights records at REQUEST TIME. Unknown, revoked or
 * amended source digests are hidden, never presented as official dates.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsOriginalPublicCalendarSource(
    PDO $pdo,string $sourceRef,string $digest
):array {
    $deny=['source'=>'ORIGINAL_JREI_SOURCE_REGISTRY',
        'issuerVerified'=>false,'current'=>false,'rightsCurrent'=>false,
        'contentSha256'=>null,'officialUrl'=>null];
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$sourceRef)||
       !preg_match('/^[a-f0-9]{64}$/D',$digest))return $deny;
    $q=$pdo->prepare(
       "SELECT s.source_id,s.source_locator_uri,s.source_locator_digest,
               s.original_sha256,s.review_state,s.rights_state,
               s.reviewer_account_id,s.verified_at,s.is_revoked,
               s.is_superseded,p.scheduling_state,p.rights_reviewed,
               p.robots_terms_reviewed,p.transport_reviewed,
               p.rights_evidence_sha256,p.robots_terms_evidence_sha256,
               p.transport_evidence_sha256
          FROM jrei_exam_sources s
          JOIN jrei_ka_source_policies p ON BINARY p.source_id=BINARY s.source_id
         WHERE s.source_id=? LIMIT 1");
    $q->execute([$sourceRef]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row))return $deny;
    $url=$row['source_locator_uri']??null;
    $sha=$row['original_sha256']??null;
    // sha is the exact ORIGINAL source content version, never metadata
    // supplied by an exam-calendar entry in isolation.
    if(!is_string($sha)||!hash_equals($digest,$sha)||
       !is_string($url)||strlen($url)>1000||
       !function_exists('jrNewsPublicOfficialSourceUrl')||
       !jrNewsPublicOfficialSourceUrl($url)||
       ($row['source_locator_digest']!==null &&
         !hash_equals((string)$row['source_locator_digest'],
                      hash('sha256',$url)))||
       $row['review_state']!=='AUTHORITATIVE_REVIEWED'||
       $row['rights_state']!=='PERMITTED_REPRODUCTION'||
       empty($row['reviewer_account_id'])||
       empty($row['verified_at'])||
       (int)$row['is_revoked']!==0||
       (int)$row['is_superseded']!==0||
       $row['scheduling_state']!=='APPROVED'||
       (int)$row['rights_reviewed']!==1||
       (int)$row['robots_terms_reviewed']!==1||
       (int)$row['transport_reviewed']!==1)
        return $deny;
    foreach(['rights_evidence_sha256','robots_terms_evidence_sha256',
             'transport_evidence_sha256'] as $field){
        if(!preg_match('/^[a-f0-9]{64}$/D',(string)($row[$field]??'')))
            return $deny;
    }
    return ['source'=>'ORIGINAL_JREI_SOURCE_REGISTRY',
        'issuerVerified'=>true,'current'=>true,'rightsCurrent'=>true,
        'contentSha256'=>$sha,'officialUrl'=>$url];
}

/** Invoked only by original Bertina API router after original bootstrap. */
function jrNewsOriginalPublicCalendarRoute(string $method):never {
    header('Cache-Control: no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    if($method!=='GET')fail('method_not_allowed',405);
    if($_GET!==[])fail('news_calendar_query_invalid',400);
    $cfg=cfg();
    if(($cfg['jrei_news_calendar_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['jrei_news_source_activation_accepted']??false)!==true)
        fail('news_calendar_not_enabled',503);
    $pdo=db();
    if(!$pdo instanceof PDO)fail('news_calendar_unavailable',503);
    if(!rateAllowed($pdo,'jrei_news_calendar_public','public',30,300))
        fail('news_calendar_rate_limited',429);
    // Deployment packs reviewed PHP modules in the HTTP-denied internal dir.
    // Never require a file from the public web or a second framework.
    require_once __DIR__.'/internal/jrei-news/calendar-read.php';
    try {
        $query=jrNewsApprovedExamCalendarSnapshot(
            $pdo,time(),
            static fn(string $id,string $sha):array =>
                jrNewsOriginalPublicCalendarSource($pdo,$id,$sha),
            100
        );
        respond($query);
    }catch(Throwable $e){
        error_log('JREI official calendar public projection unavailable: '.get_class($e));
        fail('news_calendar_unavailable',503);
    }
}
