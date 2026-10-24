<?php
declare(strict_types=1);
/**
 * JREI News: parse an already legally acquired, privately archived RSS/Atom
 * response. No network IO, no crawler, no claim that metadata is true.
 *
 * The existing JREI transport must verify publisher rights, robots, DNS pinning,
 * TLS, content length/type, URL redirects and private content storage first.
 * XML external entities and DTDs are explicitly forbidden.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function jrNewsFeedPublicUrl(string $candidate, string $approvedHost): ?string {
    // Feed-provided URLs are metadata, never routing instructions. Reject
    // whitespace/control characters and backslashes before URL parsing.
    if (strlen($candidate)>1000 ||
        preg_match('/[[:cntrl:][:space:]\\\\]/',$candidate)===1 ||
        filter_var($candidate,FILTER_VALIDATE_URL)===false) return null;
    $parts=parse_url($candidate);
    if (!is_array($parts) || strtolower((string)($parts['scheme']??''))!=='https' ||
        !empty($parts['user']) || !empty($parts['pass']) ||
        !empty($parts['fragment']) || isset($parts['port']) && (int)$parts['port']!==443) return null;
    $hostname=strtolower(rtrim((string)($parts['host']??''),'.'));
    if ($hostname!==$approvedHost || $hostname==='' ||
        filter_var($hostname,FILTER_VALIDATE_IP)!==false) return null;
    return $candidate;
}
function jrNewsParseApprovedFeed(
    string $bytes, string $mime, string $approvedHost,
    string $sourceRegistryId, string $observedAt
): array {
    if (strlen($bytes)<50 || strlen($bytes)>2097152 ||
        !in_array(strtolower(trim(explode(';',$mime)[0])),
            ['application/rss+xml','application/atom+xml','application/xml','text/xml'],true) ||
        !preg_match('/^[a-z0-9.-]{4,253}$/D',$approvedHost) ||
        !preg_match('/^[a-zA-Z0-9._:-]{1,80}$/D',$sourceRegistryId) ||
        !preg_match('/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/D',$observedAt)) {
        throw new InvalidArgumentException('news_feed_metadata_not_reviewed');
    }
    if (stripos($bytes,'<!DOCTYPE')!==false ||
        stripos($bytes,'<!ENTITY')!==false ||
        stripos($bytes,'<xsl:')!==false) {
        throw new RuntimeException('news_feed_unsafe_xml');
    }
    if (!class_exists('DOMDocument')) throw new RuntimeException('news_feed_xml_extension_missing');
    $old=libxml_use_internal_errors(true);
    try {
        $xml=new DOMDocument();
        $xml->resolveExternals=false;
        $xml->substituteEntities=false;
        $xml->validateOnParse=false;
        if (!$xml->loadXML($bytes,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING|LIBXML_NOBLANKS)) {
            throw new RuntimeException('news_feed_xml_invalid');
        }
        $xpath=new DOMXPath($xml);
        $root=$xml->documentElement;
        if (!$root || !in_array(strtolower($root->localName),['rss','feed','rdf'],true))
            throw new RuntimeException('news_feed_root_invalid');
        // Only root-level RSS channel items, Atom feed entries and RDF
        // channel items are candidates. Do not interpret nested/embedded
        // HTML or foreign XML as an independently approved news item.
        $items=$xpath->query(
            "/*[local-name()='rss']/*[local-name()='channel']/*[local-name()='item']".
            " | /*[local-name()='feed']/*[local-name()='entry']".
            " | /*[local-name()='RDF']/*[local-name()='item']"
        );
        if (!$items) throw new RuntimeException('news_feed_items_missing');
        $output=[];$seen=[];
        foreach ($items as $node) {
            if (count($output)>=100)break;
            $title='';
            $published=null;
            $link='';
            foreach ($node->childNodes as $child) {
                if (!$child instanceof DOMElement)continue;
                $name=strtolower($child->localName);
                if ($name==='title' && $title==='') $title=trim($child->textContent);
                if (in_array($name,['pubdate','published','updated'],true) && $published===null)
                    $published=trim($child->textContent);
                if ($name==='link' && $link==='') {
                    $href=$child->getAttribute('href');
                    $rel=$child->getAttribute('rel');
                    if ($href!==''&&($rel===''||$rel==='alternate'))$link=$href;
                    else if ($href==='')$link=trim($child->textContent);
                }
            }
            if ($title==='' || strlen($title)>720 ||
                preg_match('//u',$title)!==1 ||
                preg_match_all('/./us',$title)>240 || $link==='')continue;
            $url=jrNewsFeedPublicUrl($link,$approvedHost);
            if (!$url)continue;
            $dedupe=hash('sha256',$sourceRegistryId.'|'.$url);
            if (isset($seen[$dedupe]))continue;
            $seen[$dedupe]=true;
            $publishedAt=null;
            if ($published!==null && strlen($published)<=100) {
                try {
                    $date=new DateTimeImmutable($published);
                    $publishedAt=$date->setTimezone(new DateTimeZone('UTC'))
                        ->format('Y-m-d\TH:i:s\Z');
                } catch (Throwable $ignored) {$publishedAt=null;}
            }
            $output[]=[
                'schema'=>'jr.jrei.news-feed-candidate.v1',
                'sourceId'=>$sourceRegistryId,'title'=>$title,
                'url'=>$url,'sourcePublishedAt'=>$publishedAt,
                'observedAt'=>$observedAt,
                'sourceFingerprint'=>$dedupe,
                'evidenceStatus'=>'UNREVIEWED_METADATA',
                'publicationAuthorized'=>false
            ];
        }
        return [
            'schema'=>'jr.jrei.news-feed-extraction.v1',
            'sourceId'=>$sourceRegistryId,
            'feedContentSha256'=>hash('sha256',$bytes),
            'candidateCount'=>count($output),'candidates'=>$output,
            'rightsToRedistributeNotEstablished'=>true,
            'publicPublicationAllowed'=>false
        ];
    } finally {
        libxml_clear_errors();
        libxml_use_internal_errors($old);
    }
}
