<?php
declare(strict_types=1);
/**
 * Read an INDEPENDENT, ORIGINAL-JREI reviewer-signed fact packet from a
 * private filesystem location OUTSIDE the document root. A fact packet must
 * be produced by the original source-review process, never by the drafting
 * LLM, a browser, or this reader. This function performs NO crawling/writes.
 *
 * Packet representation:
 * {"payload":{candidateId,reviewId,sourceUrl,contentSha256,
 *    issuedAt,expiresAt,issuerRechecked,factsIndependentlyReviewed,
 *    rightsAndPrivacyRechecked,facts:[...]}, "hmacSha256":"64 lowercase hex"}
 * The HMAC is over PHP json_encode(payload, JSON_UNESCAPED_UNICODE |
 * JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), with a PRIVATE signing key
 * separate from JREI model provider credentials. The source reviewer must
 * sign the exact reviewed payload independently of the AI.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/official-auto-handoff.php';

function jrJreiPrivateReviewedNewsEvidence(array $request):array {
    $id=$request['candidateId']??null;
    $reviewId=$request['reviewId']??null;
    $url=$request['sourceUrl']??null;
    $sha=$request['evidenceSha256']??null;
    if(!is_string($id)||!preg_match('/^[a-f0-9-]{36}$/iD',$id)||
       !is_string($reviewId)||!preg_match('/^[a-f0-9-]{36}$/iD',$reviewId)||
       !is_string($url)||strlen($url)>1000||
       !str_starts_with($url,'https://')||
       !is_string($sha)||!preg_match('/^[a-f0-9]{64}$/D',$sha))
        throw new InvalidArgumentException('news_original_review_packet_request_invalid');
    $cfg=cfg();
    $key=$cfg['jrei_news_original_fact_signing_secret']??null;
    $folder=$cfg['jrei_news_original_fact_packet_dir']??null;
    if(!is_string($key)||strlen($key)<32||strlen($key)>256||
       !is_string($folder)||!str_starts_with($folder,'/')||
       strlen($folder)>650||is_link($folder))
        throw new RuntimeException('news_original_fact_packet_not_configured');
    $dir=realpath($folder);
    $site=realpath(dirname(__DIR__,3));
    if($dir===false||!is_dir($dir)||$site===false||
       $dir===$site||str_starts_with($dir,$site.DIRECTORY_SEPARATOR))
        throw new RuntimeException('news_original_fact_packet_private_path_invalid');
    $pdo=db();
    if(!$pdo instanceof PDO)
        throw new RuntimeException('news_original_fact_mother_database_missing');
    $q=$pdo->prepare(
        "SELECT c.candidate_id,c.source_url,c.content_sha256,
                e.evidence_private_reference,e.issuer_verified,
                e.usage_rights_verified,e.verification_state,
                d.approved_article_source_id
           FROM jrei_news_candidates c
           JOIN jrei_news_evidence_reviews e
             ON e.candidate_id=c.candidate_id
            AND BINARY e.content_sha256=BINARY c.content_sha256
           JOIN jrei_news_discovered_urls d
             ON BINARY d.canonical_article_url=BINARY c.source_url
            AND d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
          WHERE c.candidate_id=? AND e.review_id=? LIMIT 1"
    );
    $q->execute([$id,$reviewId]);
    $record=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($record)||$record['source_url']!==$url||
       !hash_equals((string)$record['content_sha256'],$sha)||
       $record['verification_state']!=='APPROVED'||
       (int)$record['issuer_verified']!==1||
       (int)$record['usage_rights_verified']!==1)
        throw new RuntimeException('news_original_fact_review_not_current');
    $origin=jrNewsOriginalOfficialSourceSnapshot(
        $pdo,(string)$record['approved_article_source_id'],$url);
    if($origin['registryState']!=='AUTHORITATIVE_REVIEWED'||
       $origin['issuerIdentityVerified']!==true||
       $origin['notRevoked']!==true||
       $origin['exactSourceUrlApproved']!==true||
       $origin['rightsForPublicNews']!==true||
       $origin['termsAndRobotsCurrent']!==true)
        throw new RuntimeException('news_original_fact_source_not_authorized');
    $ref=$record['evidence_private_reference'];
    if(!is_string($ref)||!preg_match('/^[a-f0-9]{64}\.json$/D',$ref))
        throw new RuntimeException('news_original_fact_review_packet_reference_unavailable');
    $file=$dir.DIRECTORY_SEPARATOR.$ref;
    if(is_link($file)||!is_file($file)||!is_readable($file)||
       filesize($file)<150||filesize($file)>18000||
       realpath($file)!==$file)
        throw new RuntimeException('news_original_fact_packet_file_unavailable');
    $raw=file_get_contents($file);
    if(!is_string($raw))
        throw new RuntimeException('news_original_fact_packet_unreadable');
    try{$document=json_decode($raw,true,18,JSON_THROW_ON_ERROR);}
    catch(Throwable $e){throw new RuntimeException('news_original_fact_packet_json_invalid');}
    if(!is_array($document)||!is_array($document['payload']??null)||
       !is_string($document['hmacSha256']??null)||
       !preg_match('/^[a-f0-9]{64}$/D',$document['hmacSha256']))
        throw new RuntimeException('news_original_fact_packet_shape_invalid');
    $payload=$document['payload'];
    $signed=json_encode($payload,
        JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    if(!hash_equals(hash_hmac('sha256',$signed,$key),
            $document['hmacSha256']))
        throw new RuntimeException('news_original_fact_packet_signature_invalid');
    $now=time();
    if(($payload['candidateId']??null)!==$id||
       ($payload['reviewId']??null)!==$reviewId||
       ($payload['sourceUrl']??null)!==$url||
       ($payload['contentSha256']??null)!==$sha||
       ($payload['issuerRechecked']??null)!==true||
       ($payload['factsIndependentlyReviewed']??null)!==true||
       ($payload['rightsAndPrivacyRechecked']??null)!==true||
       !is_int($payload['issuedAt']??null)||
       !is_int($payload['expiresAt']??null)||
       $payload['issuedAt']>$now||
       $payload['issuedAt']<$now-86400||
       $payload['expiresAt']<=$now||
       $payload['expiresAt']>$now+86400||
       !is_array($payload['facts']??null)||
       count($payload['facts'])<1||count($payload['facts'])>20)
        throw new RuntimeException('news_original_fact_packet_outdated_or_inconsistent');
    foreach($payload['facts'] as $fact){
        if(!is_string($fact)||strlen($fact)<12||strlen($fact)>450||
           preg_match('/[\x00-\x1f\x7f]/',$fact)||
           preg_match('//u',$fact)!==1)
            throw new RuntimeException('news_original_fact_packet_fact_invalid');
    }
    return [
        'source'=>'ORIGINAL_JREI_VERIFIED_PRIVATE_OBSERVATION',
        'sourceUrl'=>$url,
        'contentSha256'=>$sha,
        'issuerRechecked'=>true,
        'factsIndependentlyReviewed'=>true,
        'rightsAndPrivacyRechecked'=>true,
        'facts'=>$payload['facts'],
        'ownerApprovalOfEachArticleRequired'=>false,
        'privateSourceReviewSigned'=>true
    ];
}
