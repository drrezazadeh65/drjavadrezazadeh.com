<?php
declare(strict_types=1);
/**
 * Bounded discoverer for an ALREADY acquired official university news page.
 * No HTTP requests, no redirects, no source approvals and no article body
 * extraction. HTML links are UNREVIEWED metadata, never publishing proof.
 * The original approved JREI-KA source policy and hashes are checked by
 * feed-discovery.php on both sides of the original observation read.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/official-feed-extractor.php';

function jrNewsSameHostOfficialHtmlUrl(
    string $href,string $observedSourceUrl,string $approvedHost
):?string{
    if(strlen($href)>900||
       preg_match('/[\\x00-\\x20\\x7F\\\\]/',$href)===1||
       str_contains($href,'#')||
       str_starts_with($href,'//')||
       preg_match('/%(?:00|0a|0d|2f|5c)/i',$href)===1)
        return null;
    if(preg_match('#^https://#i',$href)){
        return jrNewsFeedPublicUrl($href,$approvedHost);
    }
    if(str_contains($href,':')||str_starts_with($href,'?')||
       str_starts_with($href,'javascript'))return null;
    $parts=parse_url($observedSourceUrl);
    if(!is_array($parts)||($parts['scheme']??null)!=='https'||
       strtolower((string)($parts['host']??''))!==$approvedHost)return null;
    $base=(string)($parts['path']??'/');
    $path=str_starts_with($href,'/')?$href:
        rtrim(str_replace('\\','/',dirname($base)),'/').'/'.$href;
    if(str_contains($path,'..')||str_contains($path,'//'))return null;
    return jrNewsFeedPublicUrl('https://'.$approvedHost.$path,$approvedHost);
}
function jrNewsParseApprovedHtmlNoticeIndex(
    string $bytes,string $mime,string $approvedSourceUrl,
    string $sourceId,string $observedAt
):array{
    $type=strtolower(trim(explode(';',$mime)[0]));
    $host=strtolower((string)parse_url($approvedSourceUrl,PHP_URL_HOST));
    if($type!=='text/html'||strlen($bytes)<50||
       strlen($bytes)>2097152||
       !preg_match('/^[a-f0-9-]{36}$/iD',$sourceId)||
       !preg_match('/^\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\dZ$/D',$observedAt)||
       !preg_match('/^[a-z0-9.-]{4,253}$/D',$host)||
       !class_exists('DOMDocument'))
        throw new InvalidArgumentException('news_original_html_observation_unverified');
    // HTML5's ordinary <!doctype html> is safe and commonplace.
    // Reject only custom/external DTDs, entities and attacker-controlled
    // base URLs; XML does not share HTML's permissive doctype rule.
    $withoutSafeDoctype=preg_replace('/<!doctype\\s+html\\s*>/i','',$bytes);
    if(!is_string($withoutSafeDoctype)||
       stripos($withoutSafeDoctype,'<!DOCTYPE')!==false||
       stripos($bytes,'<!ENTITY')!==false||
       stripos($bytes,'<base')!==false)
        throw new RuntimeException('news_original_html_unsafe_markup');
    $old=libxml_use_internal_errors(true);
    try{
        $dom=new DOMDocument('1.0','UTF-8');
        $dom->resolveExternals=false;$dom->substituteEntities=false;
        $dom->validateOnParse=false;
        // No network, embedded script/style is never executed or emitted.
        if(!$dom->loadHTML('<?xml encoding="UTF-8"?>'.$bytes,
          LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING))
            throw new RuntimeException('news_original_html_parse_error');
        $xpath=new DOMXPath($dom);
        // Prioritize article/main/section content, not navigation or footer.
        $links=$xpath->query(
          '//main//a[@href] | //article//a[@href] | //section//a[@href]'.
          ' | //a[@href and (contains(@href,"/news/") '.
          'or contains(@href,"/akhbar/") '.
          'or contains(@href,"/notice/") '.
          'or contains(@href,"/announcement/"))]');
        if($links===false)throw new RuntimeException('news_original_html_links_missing');
        $candidates=[];$seen=[];
        foreach($links as $a){
            if(count($candidates)>=100)break;
            if(!$a instanceof DOMElement)continue;
            $text=trim(preg_replace('/\\s+/u',' ',$a->textContent)??'');
            if(strlen($text)<12||strlen($text)>720||
               preg_match('//u',$text)!==1||
               preg_match_all('/./us',$text)>240)continue;
            $url=jrNewsSameHostOfficialHtmlUrl(
                trim($a->getAttribute('href')),$approvedSourceUrl,$host);
            if($url===null||$url===$approvedSourceUrl||isset($seen[$url]))continue;
            $path=(string)parse_url($url,PHP_URL_PATH);
            if(strlen($path)<9||$path==='/'||
               preg_match('#/(?:login|signin|register|account|search|contact)(?:/|$)#i',
                  $path))continue;
            $seen[$url]=true;
            $candidates[]=[
                'schema'=>'jr.jrei.news-feed-candidate.v1',
                'sourceId'=>$sourceId,'title'=>$text,'url'=>$url,
                'sourcePublishedAt'=>null,'observedAt'=>$observedAt,
                'sourceFingerprint'=>hash('sha256',$sourceId.'|'.$url),
                'evidenceStatus'=>'UNREVIEWED_METADATA',
                'publicationAuthorized'=>false
            ];
        }
        return [
            'schema'=>'jr.jrei.news-feed-extraction.v1',
            'sourceId'=>$sourceId,
            'feedContentSha256'=>hash('sha256',$bytes),
            'candidateCount'=>count($candidates),'candidates'=>$candidates,
            'rightsToRedistributeNotEstablished'=>true,
            'publicPublicationAllowed'=>false,
            'indexWasHtml'=>true
        ];
    }finally{
        libxml_clear_errors();
        libxml_use_internal_errors($old);
    }
}
