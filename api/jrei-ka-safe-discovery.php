<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-private-https.php';

/**
 * Autonomously discover candidate PDF documents only from an HTML seed
 * which has already been lawfully acquired from an approved original source.
 * Never fetch a newly found URL or assume reuse rights on a linked PDF.
 */
/**
 * Normalize only same-host HTTPS PDF candidates found in approved HTML.
 * No candidate is fetched or automatically approved by this resolver.
 */
function jrKaResolvePdfCandidate(string $seedUrl,string $href): ?string {
    if($href===''||strlen($href)>620||
       preg_match('/[\x00-\x20\x7f\\\\]/',$href)||
       str_contains($href,'#')||str_starts_with($href,'//'))
        return null;
    try{
        [$host,$seedPath]=jrKaApprovedHttpsUrl($seedUrl);
        if(preg_match('~^[a-z][a-z0-9+.-]*:~i',$href)){
            if(!str_starts_with($href,'https://'))return null;
            $target=$href;
        }else{
            $pathOnly=explode('?', $href,2)[0];
            if($pathOnly===''||str_contains($pathOnly,'\\'))return null;
            $seedDirectory=substr(explode('?', $seedPath,2)[0],
              0,strrpos(explode('?', $seedPath,2)[0],'/')+1);
            $path=str_starts_with($href,'/')?$href:$seedDirectory.$href;
            [$rawPath,$query]=array_pad(explode('?',$path,2),2,null);
            $parts=[];
            foreach(explode('/',$rawPath) as $part){
                if($part===''||$part==='.')continue;
                if($part==='..'){
                    if(!$parts)return null;
                    array_pop($parts);
                    continue;
                }
                if(preg_match('/%(?:2e|2f|5c|00)/i',$part))return null;
                $parts[]=$part;
            }
            $target='https://'.$host.'/'.implode('/',$parts).
              ($query!==null?'?'.$query:'');
        }
        [$targetHost,$targetPath]=jrKaApprovedHttpsUrl($target);
        if($targetHost!==$host)return null;
        if(!preg_match('~\.pdf(?:\?|$)~i',$targetPath))return null;
        return $target;
    }catch(Throwable $e){return null;}
}
function jrKaDiscoverSameHostPdfLinks(string $seedUrl,string $html): array {
    if(strlen($html)<1||strlen($html)>2097152||
       !class_exists('DOMDocument'))return [];
    try{jrKaApprovedHttpsUrl($seedUrl);}
    catch(Throwable $e){return [];}
    $dom=new DOMDocument();
    $old=libxml_use_internal_errors(true);
    try{
        if(!$dom->loadHTML('<?xml encoding="UTF-8"?>'.$html,
            LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING))
            return [];
        $links=$dom->getElementsByTagName('a');
        if($links->length>4000)return [];
        $out=[];$max=40;
        foreach($links as $link){
            if(count($out)>=$max)break;
            $target=jrKaResolvePdfCandidate($seedUrl,
              trim((string)$link->getAttribute('href')));
            if($target===null)continue;
            $label=trim(preg_replace('/\s+/u',' ',
                (string)$link->textContent));
            if(strlen($label)>220){
                preg_match('/^.{0,50}/us',$label,$prefix);
                $label=$prefix[0]??'Potential document';
            }
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
