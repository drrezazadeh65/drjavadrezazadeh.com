<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-private-https.php';

/**
 * Autonomously discover candidate PDF documents only from an HTML seed
 * which has already been lawfully acquired from an approved original source.
 * Never fetch a newly found URL or assume reuse rights on a linked PDF.
 */
function jrKaDiscoverSameHostPdfLinks(string $seedUrl,string $html): array {
    if(strlen($html)<1||strlen($html)>2097152||
       !class_exists('DOMDocument'))return [];
    [$seedHost,$seedPath]=jrKaApprovedHttpsUrl($seedUrl);
    $dom=new DOMDocument();
    $old=libxml_use_internal_errors(true);
    try{
        if(!$dom->loadHTML($html,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING))
            return [];
        $links=$dom->getElementsByTagName('a');
        if($links->length>4000)return [];
        $out=[];$max=40;
        foreach($links as $link){
            if(count($out)>=$max)break;
            $href=trim((string)$link->getAttribute('href'));
            if($href===''||strlen($href)>620||
               preg_match('/[\x00-\x20\x7f\\\\]/',$href)||
               str_contains($href,'#')||
               preg_match('~(?:^|/)\.\.(?:/|$)~',$href))
                continue;
            if(str_starts_with($href,'/')){
                if(str_starts_with($href,'//'))continue;
                $target='https://'.$seedHost.$href;
            }elseif(str_starts_with($href,'https://')){
                $target=$href;
            }else{
                // Do not resolve arbitrary relative or protocol-relative
                // paths; owner-approved root and absolute URLs are enough
                // for the first safe autonomous discovery phase.
                continue;
            }
            try{[$host,$path]=jrKaApprovedHttpsUrl($target);}
            catch(Throwable $e){continue;}
            if($host!==$seedHost)continue;
            $pathname=explode('?',strtolower($path),2)[0];
            if(!str_ends_with($pathname,'.pdf'))continue;
            $label=trim(preg_replace('/\s+/u',' ',
                (string)$link->textContent));
            if(strlen($label)>220)$label=substr($label,0,220);
            if($label==='')$label='Potential PDF from approved seed';
            $key=hash('sha256',$target);
            if(!isset($out[$key]))$out[$key]=[
                'sha256'=>$key,'url'=>$target,'label'=>$label
            ];
        }
        return array_values($out);
    }finally{
        libxml_clear_errors();libxml_use_internal_errors($old);
    }
}

/**
 * Insert candidates into the SINGLE original mother DB, transactionally
 * alongside the legally fetched HTML observation. Nothing is promoted to
 * approved status. Source/document copyright may still forbid reproduction.
 */
function jrKaStageHtmlDiscovery(PDO $pdo,string $sourceId,
    string $observationId,string $seedUrl,string $html,int $now): int {
    if(!validUuid($sourceId)||!validUuid($observationId))
        throw new DomainException('ka_discovery_reference_invalid');
    $found=jrKaDiscoverSameHostPdfLinks($seedUrl,$html);
    if(!$found)return 0;
    $q=$pdo->prepare("INSERT INTO jrei_ka_discovery_candidates
      (candidate_id,seed_source_id,originating_observation_id,
       candidate_url,candidate_url_sha256,candidate_label,
       discovery_kind,state,first_discovered_at,last_discovered_at)
      VALUES (?,?,?,?,?,?,'POTENTIAL_EXAM_DOCUMENT',
       'DISCOVERED_REQUIRES_RIGHTS_REVIEW',?,?)
      ON DUPLICATE KEY UPDATE last_discovered_at=VALUES(last_discovered_at)");
    $new=0;
    foreach($found as $item){
        $q->execute([jrKaUuid(),$sourceId,$observationId,
            $item['url'],$item['sha256'],$item['label'],$now,$now]);
        if($q->rowCount()===1)$new++;
    }
    return $new;
}
