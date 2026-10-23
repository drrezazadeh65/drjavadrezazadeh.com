<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-acquisition-dispatch.php';

/**
 * Private first-pass educational document text extraction.
 * No external executables, model calls, OCR claims, science certification,
 * visitor uploads or public publication. PDF requires separate approved OCR
 * and specialist diagram/mathematical layout interpretation.
 */
function jrKaTextSchemaReady(PDO $pdo,array $cfg): bool {
    // Extraction may continue on already licensed archived observations
    // while new network acquisition is independently suspended.
    if(($cfg['jrei_ka_text_extraction_enabled']??false)!==true||
       !jrKaSchemaReady($pdo)||
       jrKaPrivateArchiveRoot($cfg)===null)return false;
    try{
        $pdo->query("SELECT observation_id,processing_state,claim_token,
           extraction_review_required FROM jrei_ka_text_extraction_jobs LIMIT 0");
        return true;
    }catch(Throwable $e){return false;}
}
function jrKaTextExtractBytes(string $mime,string $raw): array {
    if(strlen($raw)<1||strlen($raw)>8388608)
        throw new DomainException('ka_extraction_input_out_of_bounds');
    if($mime==='application/pdf'){
        if(!str_starts_with($raw,'%PDF-'))
            throw new DomainException('ka_invalid_pdf_signature');
        return ['state'=>'OCR_REQUIRED','text'=>null,
           'method'=>'PDF_SIGNATURE_ONLY',
           'language'=>null,'requiresOcr'=>true];
    }
    if(!in_array($mime,['text/html','text/plain','application/json'],true))
        throw new DomainException('ka_extraction_mime_unhandled');
    if(!preg_match('//u',$raw))
        throw new DomainException('ka_extraction_utf8_review_required');
    $text=$raw;
    if($mime==='text/html'){
        if(!class_exists('DOMDocument')||!class_exists('DOMXPath'))
            throw new DomainException('ka_html_dom_unavailable');
        $dom=new DOMDocument();
        $old=libxml_use_internal_errors(true);
        try{
            $loaded=$dom->loadHTML(
               '<?xml encoding="UTF-8"?>'.$raw,
               LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING);
            if(!$loaded)throw new DomainException('ka_html_invalid');
            $xp=new DOMXPath($dom);
            $removed=$xp->query('//script|//style|//template|//noscript|//svg|//form');
            if($removed!==false){
                foreach($removed as $node)
                    if($node->parentNode)$node->parentNode->removeChild($node);
            }
            $body=$dom->getElementsByTagName('body')->item(0);
            $text=$body instanceof DOMNode?(string)$body->textContent:'';
        }finally{
            libxml_clear_errors();
            libxml_use_internal_errors($old);
        }
    }elseif($mime==='application/json'){
        // Structured public JSON can include unverifiable/generated data.
        // Keep raw JSON private and require explicit schema approval
        // rather than converting arbitrary keys into educational facts.
        return ['state'=>'STRUCTURED_REVIEW_REQUIRED','text'=>null,
            'method'=>'JSON_SCHEMA_NOT_APPROVED',
            'language'=>null,'requiresOcr'=>false];
    }
    $text=preg_replace('/[\x{0000}-\x{0008}\x{000B}\x{000C}\x{000E}-\x{001F}]/u',' ',$text);
    if(!is_string($text))
        throw new DomainException('ka_extraction_unicode_invalid');
    $text=preg_replace('/[^\S\r\n]+/u',' ',$text);
    $text=preg_replace('/(?:\r\n?|\n){3,}/u',"\n\n",$text);
    if(!is_string($text))throw new DomainException('ka_extraction_normalization_failed');
    $text=trim($text);
    if(strlen($text)<20)
        return ['state'=>'OCR_OR_MANUAL_REVIEW_REQUIRED','text'=>null,
            'method'=>$mime==='text/html'?'DOM_VISIBLE_TEXT':'PLAIN_UTF8',
            'language'=>null,'requiresOcr'=>$mime==='text/html'];
    if(strlen($text)>524288)
        throw new DomainException('ka_extraction_text_over_limit');
    preg_match_all('/[\x{0600}-\x{06FF}]/u',$text,$persian);
    preg_match_all('/[A-Za-z]/',$text,$latin);
    $fa=count($persian[0]??[]);$en=count($latin[0]??[]);
    $lang=$fa>$en*2?'fa':($en>$fa*2?'en':'mixed');
    // Explicit mathematical notation and MathML require specialist source
    // inspection, not ordinary prose retrieval. We retain the authorised
    // immutable original but DO NOT index questionable equation text as an
    // approved passage. This heuristic cannot detect all formulas/diagrams.
    $mathMarkup=$mime==='text/html'&&
        preg_match('~<math(?:\\s|>|/)~i',$raw)===1;
    $mathCharacters=preg_match(
        '/[∑∏∫√∞∂∇≠≈≤≥∝∈∉⊂⊆⊕⊗∴∵∠∥]/u',$text)===1;
    $mathLatex=preg_match(
        '/\\\\(?:frac|sqrt|sum|int|lim|begin)\b/u',
        $text)===1;
    if($mathMarkup||$mathCharacters||$mathLatex){
        return ['state'=>'MATH_LAYOUT_REVIEW_REQUIRED','text'=>null,
          'method'=>'MATHEMATICAL_NOTATION_SCIENTIFIC_REVIEW_REQUIRED',
          'language'=>$lang,'requiresOcr'=>false,
          'requiresMathematicsExpertReview'=>true,
          'formulaAccuracyVerified'=>false,
          'diagramAccuracyVerified'=>false];
    }
    return ['state'=>'TEXT_PENDING_SCIENTIFIC_REVIEW','text'=>$text,
        'method'=>$mime==='text/html'?'DOM_VISIBLE_TEXT':'PLAIN_UTF8',
        'language'=>$lang,'requiresOcr'=>false];
}
function jrKaQueueOneTextExtraction(PDO $pdo,int $at): ?array {
    // Backfill a bounded batch so an archive obtained before extraction
    // activation is never lost. An original observation has one job only.
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("INSERT IGNORE INTO jrei_ka_text_extraction_jobs
            (observation_id,source_id,processing_state,created_at,updated_at)
            SELECT o.observation_id,o.source_id,'QUEUED',o.observed_at,?
            FROM jrei_ka_private_observations o
            LEFT JOIN jrei_ka_text_extraction_jobs x
              ON x.observation_id=o.observation_id
            WHERE x.observation_id IS NULL
              AND o.state='PENDING_SCIENTIFIC_REVIEW'
            ORDER BY o.observed_at ASC,o.observation_id ASC LIMIT 20");
        $q->execute([$at]);
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    $q=$pdo->prepare("SELECT x.observation_id,x.source_id
       FROM jrei_ka_text_extraction_jobs x
       WHERE x.processing_state='QUEUED' AND x.attempts<2
       ORDER BY x.created_at ASC,x.observation_id ASC LIMIT 8");
    $q->execute();$candidates=$q->fetchAll(PDO::FETCH_ASSOC);
    foreach($candidates as $candidate){
        $pdo->beginTransaction();
        try{
            // Same source-first lock order as original owner source controls.
            $q=$pdo->prepare("SELECT rights_state,review_state,is_revoked,
               is_superseded FROM jrei_exam_sources WHERE source_id=? FOR UPDATE");
            $q->execute([$candidate['source_id']]);$source=$q->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT scheduling_state,rights_reviewed
              FROM jrei_ka_source_policies WHERE source_id=? FOR UPDATE");
            $q->execute([$candidate['source_id']]);$policy=$q->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT observation_id,source_id,state,
              private_object_key,bytes_total,content_sha256,mime_type,
              rights_state_at_acquisition FROM jrei_ka_private_observations
              WHERE observation_id=? FOR UPDATE");
            $q->execute([$candidate['observation_id']]);$ob=$q->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT processing_state,attempts
              FROM jrei_ka_text_extraction_jobs
              WHERE observation_id=? FOR UPDATE");
            $q->execute([$candidate['observation_id']]);$job=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($source)||!is_array($policy)||!is_array($ob)||!is_array($job)||
               $policy['scheduling_state']!=='APPROVED'||
               (int)$policy['rights_reviewed']!==1||
               $ob['source_id']!==$candidate['source_id']||
               $job['processing_state']!=='QUEUED'||(int)$job['attempts']>=2||
               $ob['state']!=='PENDING_SCIENTIFIC_REVIEW'||
               $source['review_state']!=='AUTHORITATIVE_REVIEWED'||
               (int)$source['is_revoked']!==0||(int)$source['is_superseded']!==0||
               $source['rights_state']!==$ob['rights_state_at_acquisition']){
                $pdo->commit();continue;
            }
            $token=jrKaUuid();
            $q=$pdo->prepare("UPDATE jrei_ka_text_extraction_jobs SET
               processing_state='EXTRACTING',claim_token=?,claimed_at=?,
               attempts=attempts+1,updated_at=?
               WHERE observation_id=? AND processing_state='QUEUED'");
            $q->execute([$token,$at,$at,$ob['observation_id']]);
            if($q->rowCount()!==1)
                throw new DomainException('ka_extraction_claim_race');
            $pdo->commit();
            return ['token'=>$token,'observation'=>$ob];
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }
    return null;
}
function jrKaQuarantineUnknownTextClaims(PDO $pdo,int $now): int {
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("UPDATE jrei_ka_text_extraction_jobs SET
           processing_state='UNKNOWN_EXTRACTION_REVIEW',
           failure_code='EXTRACTION_CLAIM_STALE',
           claim_token=NULL,claimed_at=NULL,updated_at=?
           WHERE processing_state='EXTRACTING' AND claimed_at<?
           ORDER BY claimed_at ASC LIMIT 20");
        $q->execute([$now,$now-300]);
        $count=$q->rowCount();
        $pdo->commit();
        return $count;
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();throw $e;
    }
}
/** Private, content-addressed, non-overwriting small UTF-8 text artifact. */
function jrKaStorePrivateText(string $root,string $value): array {
    $hash=hash('sha256',$value);
    $name=$hash.'.txt';
    $path=$root.DIRECTORY_SEPARATOR.$name;
    $bytes=strlen($value);
    if(file_exists($path)||is_link($path)){
        if(!is_file($path)||is_link($path)||filesize($path)!==$bytes||
           !hash_equals($hash,(string)hash_file('sha256',$path)))
            throw new DomainException('ka_private_text_digest_conflict');
        return ['key'=>$name,'sha256'=>$hash,'bytes'=>$bytes];
    }
    $tmp=$root.DIRECTORY_SEPARATOR.'.jrei-text-'.bin2hex(random_bytes(12));
    $fp=fopen($tmp,'x+b');
    if($fp===false)throw new DomainException('ka_private_text_open_failed');
    try{
        if(!chmod($tmp,0600))throw new DomainException('ka_private_text_permissions');
        $wrote=0;
        while($wrote<$bytes){
            $n=fwrite($fp,substr($value,$wrote,65536));
            if($n===false||$n===0)throw new DomainException('ka_private_text_write_error');
            $wrote+=$n;
        }
        if(!fflush($fp))throw new DomainException('ka_private_text_flush_error');
    }catch(Throwable $e){
        fclose($fp);
        @unlink($tmp);
        throw $e;
    }
    fclose($fp);
    if(!link($tmp,$path)){
        @unlink($tmp);
        if(!is_file($path)||is_link($path)||filesize($path)!==$bytes||
           !hash_equals($hash,(string)hash_file('sha256',$path)))
            throw new DomainException('ka_private_text_link_conflict');
    }else @unlink($tmp);
    return ['key'=>$name,'sha256'=>$hash,'bytes'=>$bytes];
}
/**
 * At most one observation per owner-enabled Cron tick. File content is
 * NEVER copied to a live model, public site or approved assessment.
 */
function jrKaExtractOnePrivateObservation(PDO $pdo,array $cfg): array {
    $result=['schema'=>'jr.jrei.ka-text-extraction.v1','status'=>'OFF',
       'processed'=>0,'ocrPerformed'=>false,
       'independentScienceReviewPassed'=>false,'publiclyPublished'=>false];
    if(!jrKaTextSchemaReady($pdo,$cfg))return $result;
    $now=time();$stale=jrKaQuarantineUnknownTextClaims($pdo,$now);
    $result['staleClaimsQuarantined']=$stale;
    $work=jrKaQueueOneTextExtraction($pdo,$now);
    if($work===null)return [...$result,'status'=>'NO_AUTHORISED_TEXT_JOB'];
    $ob=$work['observation'];$id=(string)$ob['observation_id'];
    $token=$work['token'];$new=null;$data=null;
    try{
        $root=jrKaPrivateArchiveRoot($cfg);
        if($root===null)throw new DomainException('ka_private_archive_unavailable');
        $digest=(string)$ob['content_sha256'];
        if(!preg_match('/^[a-f0-9]{64}$/D',$digest)||
           $ob['private_object_key']!==$digest.'.bin'||
           (int)$ob['bytes_total']<1||(int)$ob['bytes_total']>8388608)
            throw new DomainException('ka_observation_integrity_invalid');
        $rawPath=$root.DIRECTORY_SEPARATOR.$digest.'.bin';
        if(is_link($rawPath))
            throw new DomainException('ka_observation_symlink_not_allowed');
        $path=realpath($rawPath);
        if($path===false||dirname($path)!==$root||
           is_link($root.DIRECTORY_SEPARATOR.$digest.'.bin')||
           !is_file($path)||
           !is_readable($path)||filesize($path)!==(int)$ob['bytes_total'])
            throw new DomainException('ka_private_observation_missing');
        $raw=file_get_contents($path);
        if(!is_string($raw)||strlen($raw)!==(int)$ob['bytes_total']||
           !hash_equals($digest,hash('sha256',$raw)))
            throw new DomainException('ka_observation_content_changed');
        $data=jrKaTextExtractBytes((string)$ob['mime_type'],$raw);
        $raw='';
        $chars=is_string($data['text']??null)?
           (function_exists('mb_strlen')?
             mb_strlen($data['text'],'UTF-8'):strlen($data['text'])):null;
        if(is_string($data['text']??null))
            $new=jrKaStorePrivateText($root,$data['text']);
        $data['text']=null;
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare("SELECT review_state,rights_state,is_revoked,
               is_superseded FROM jrei_exam_sources WHERE source_id=? FOR UPDATE");
            $q->execute([$ob['source_id']]);$source=$q->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT scheduling_state,rights_reviewed
              FROM jrei_ka_source_policies WHERE source_id=? FOR UPDATE");
            $q->execute([$ob['source_id']]);$policy=$q->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT processing_state,claim_token FROM
              jrei_ka_text_extraction_jobs WHERE observation_id=? FOR UPDATE");
            $q->execute([$id]);$current=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($source)||!is_array($policy)||!is_array($current)||
               $policy['scheduling_state']!=='APPROVED'||
               (int)$policy['rights_reviewed']!==1||
               $source['review_state']!=='AUTHORITATIVE_REVIEWED'||
               (int)$source['is_revoked']!==0||
               (int)$source['is_superseded']!==0||
               $source['rights_state']!==$ob['rights_state_at_acquisition']||
               $current['processing_state']!=='EXTRACTING'||
               !hash_equals($token,(string)$current['claim_token']))
                throw new DomainException('ka_extraction_lease_or_rights_revoked');
            $q=$pdo->prepare("UPDATE jrei_ka_text_extraction_jobs
              SET processing_state=?,claim_token=NULL,claimed_at=NULL,
               extraction_method=?,text_content_sha256=?,
               text_private_object_key=?,extracted_bytes=?,
               extracted_characters=?,detected_language=?,
               scanned_pdf_needs_ocr=?,updated_at=?
              WHERE observation_id=? AND claim_token=? AND
                processing_state='EXTRACTING'");
            // The character count is captured before plaintext leaves
            // memory. Byte count remains authoritative for file storage.
            $q->execute([$data['state'],$data['method'],
               $new['sha256']??null,$new['key']??null,
               $new['bytes']??null,$chars,
               $data['language'],(int)$data['requiresOcr'],time(),$id,$token]);
            if($q->rowCount()!==1)
                throw new DomainException('ka_extraction_completion_conflict');
            $pdo->commit();
            return [...$result,'status'=>$data['state'],'processed'=>1,
                'languageHint'=>$data['language'],'textSha256'=>$new['sha256']??null,
                'textBytes'=>$new['bytes']??null];
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();throw $e;
        }
    }catch(Throwable $e){
        $failure=preg_match('/^[a-z0-9_]{3,64}$/i',$e->getMessage())?
            strtoupper($e->getMessage()):'EXTRACTION_ERROR';
        try{
            $pdo->beginTransaction();
            $q=$pdo->prepare("UPDATE jrei_ka_text_extraction_jobs
               SET processing_state='EXTRACTION_FAILED_REVIEW',
                 failure_code=?,claim_token=NULL,claimed_at=NULL,
                 updated_at=? WHERE observation_id=? AND claim_token=?
                 AND processing_state='EXTRACTING'");
            $q->execute([$failure,time(),$id,$token]);
            $pdo->commit();
        }catch(Throwable $ignored){
            if($pdo->inTransaction())$pdo->rollBack();
        }
        return [...$result,'status'=>'EXTRACTION_FAILED_REVIEW',
            'failureCode'=>$failure];
    }
}
