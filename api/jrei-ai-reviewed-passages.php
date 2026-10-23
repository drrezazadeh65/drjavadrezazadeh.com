<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-private-https.php';
require_once __DIR__.'/jrei-ka-acquisition-dispatch.php';

/**
 * Read-only, owner-enabled RAG over INDEPENDENTLY reviewed public-quote
 * passage spans in the original mother DB. No inference here.
 *
 * Merely extracting a PDF or proposing byte spans never qualifies.
 * Eligibility requires separate passage, source reuse-rights and reviewer
 * approvals, matching exact UTF-8 SHA-256 document and paragraph digests.
 * Retrieving an authorised citation does not prove its interpretation.
 */
function jrAiApprovedPassageSchemaReady(PDO $pdo): bool {
    try{
        $pdo->query("SELECT passage_id,passage_state,review_rights_state,
           reviewer_account_id,text_content_sha256,passage_sha256
           FROM jrei_ka_private_passages LIMIT 0");
        $pdo->query("SELECT observation_id,processing_state,
           text_private_object_key,extracted_bytes
           FROM jrei_ka_text_extraction_jobs LIMIT 0");
        return true;
    }catch(Throwable $e){return false;}
}
function jrAiPassageTokens(string $text): array {
    $value=function_exists('mb_strtolower')?
        mb_strtolower($text,'UTF-8'):strtolower($text);
    $value=str_replace(['ي','ك','ى'],['ی','ک','ی'],$value);
    $parts=preg_split('/[^\p{L}\p{N}]+/u',$value,-1,PREG_SPLIT_NO_EMPTY);
    $terms=[];
    foreach($parts?:[] as $term){
        if((function_exists('mb_strlen')?
          mb_strlen($term,'UTF-8'):strlen($term))>=3)
            $terms[$term]=true;
    }
    return $terms;
}
function jrAiApprovedPublicPassages(PDO $pdo,array $cfg,
    string $question,string $lang): array {
    if(($cfg['jrei_ai_approved_passage_retrieval_enabled']??false)!==true||
       !in_array($lang,['fa','en'],true)||
       strlen($question)>2400||!jrAiApprovedPassageSchemaReady($pdo))
        return [];
    $root=jrKaPrivateArchiveRoot($cfg);
    if($root===null)return [];
    $wanted=jrAiPassageTokens($question);
    if(!$wanted)return [];
    $q=$pdo->prepare("SELECT p.passage_id,p.passage_sha256,
         p.byte_offset,p.byte_length,p.text_content_sha256,
         t.text_private_object_key,t.extracted_bytes,
         s.source_title,s.source_locator_uri,s.source_kind,
         s.country_code,s.subject_id
       FROM jrei_ka_private_passages p
       JOIN jrei_exam_sources s ON s.source_id=p.source_id
       JOIN jrei_ka_private_observations o ON o.observation_id=p.observation_id
       JOIN jrei_ka_text_extraction_jobs t ON t.observation_id=p.observation_id
       WHERE p.passage_state='APPROVED_PUBLIC_AI_EVIDENCE'
         AND p.review_rights_state='PERMITTED_PUBLIC_QUOTE'
         AND p.reviewer_account_id IS NOT NULL
         AND s.reviewer_account_id IS NOT NULL
         AND p.reviewer_account_id<>s.reviewer_account_id
         AND s.review_state='AUTHORITATIVE_REVIEWED'
         AND s.rights_state='PERMITTED_REPRODUCTION'
         AND s.is_revoked=0 AND s.is_superseded=0
         AND o.state='PENDING_SCIENTIFIC_REVIEW'
         AND o.rights_state_at_acquisition='PERMITTED_REPRODUCTION'
         AND t.processing_state='TEXT_PENDING_SCIENTIFIC_REVIEW'
         AND t.text_content_sha256=p.text_content_sha256
         AND t.detected_language IN (?,'mixed')
       ORDER BY p.reviewed_at DESC,p.passage_id ASC LIMIT 32");
    $q->execute([$lang]);
    $ranked=[];
    foreach($q as $row){
        $digest=(string)$row['text_content_sha256'];
        $passageDigest=(string)$row['passage_sha256'];
        if(!preg_match('/^[a-f0-9]{64}$/D',$digest)||
           !preg_match('/^[a-f0-9]{64}$/D',$passageDigest)||
           $row['text_private_object_key']!==$digest.'.txt')
            continue;
        $length=(int)$row['byte_length'];$offset=(int)$row['byte_offset'];
        $fileSize=(int)$row['extracted_bytes'];
        if($length<40||$length>650||$offset<0||$fileSize<40||
           $fileSize>524288||$offset>$fileSize-$length)
            continue;
        $file=$root.DIRECTORY_SEPARATOR.$digest.'.txt';
        if(is_link($file))continue;
        $absolute=realpath($file);
        if($absolute===false||dirname($absolute)!==$root||
           !is_file($absolute)||!is_readable($absolute)||
           filesize($absolute)!==$fileSize)continue;
        $whole=file_get_contents($absolute);
        if(!is_string($whole)||strlen($whole)!==$fileSize||
           !hash_equals($digest,hash('sha256',$whole)))continue;
        $excerpt=substr($whole,$offset,$length);
        $whole='';
        if(!preg_match('//u',$excerpt)||
           !hash_equals($passageDigest,hash('sha256',$excerpt))||
           preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$excerpt)||
           preg_match('/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u',$excerpt)||
           preg_match('/(?:\d[\s-]*){13,19}/u',$excerpt)||
           preg_match('/(?:کد ملی|شماره کارت|شماره شناسنامه|گذرنامه|national id|passport number|bank account)/iu',$excerpt))
            continue;
        $url=(string)$row['source_locator_uri'];
        // External citations must not leak private signed query
        // tokens or personal identifiers embedded in document URLs.
        if(str_contains($url,'?'))continue;
        try{jrKaApprovedHttpsUrl($url);}
        catch(Throwable $e){continue;}
        $title=(string)$row['source_title'];
        if($title===''||strlen($title)>240)continue;
        $found=array_intersect_key($wanted,
             jrAiPassageTokens($title.' '.$excerpt.' '.$row['subject_id']));
        if(!count($found))continue;
        $rank=count($found)*10;
        foreach(array_keys($wanted) as $term)
            if((function_exists('mb_stripos')?
               mb_stripos($title,$term,0,'UTF-8'):stripos($title,$term))!==false)
                $rank+=3;
        $ranked[]=[
          'rank'=>$rank,'title'=>$title,'summary'=>$excerpt,
          'url'=>$url,'sourceType'=>'INDEPENDENTLY_REVIEWED_QUOTE',
          'originalPrivatePassageSha256'=>$passageDigest,
          'scientificClaimSemanticsValidated'=>false
        ];
    }
    usort($ranked,static fn($a,$b)=>$b['rank']<=>$a['rank']?:
        strcmp($a['originalPrivatePassageSha256'],
               $b['originalPrivatePassageSha256']));
    $out=[];
    foreach(array_slice($ranked,0,4) as $i=>$row){
        unset($row['rank']);
        $out[]=['id'=>'S'.($i+1),...$row];
    }
    return $out;
}
