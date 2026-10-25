<?php
declare(strict_types=1);
/**
 * Content-addressed, HMAC-signed first-party fact packet for a *narrow*
 * deterministically confirmed official headline, not a full factual review.
 * The generator is entirely independent of the language model and never
 * asserts exam deadlines, fees, admissions, outcomes or an unsupported body.
 *
 * The private JREI fact signer and the original verifier share a separate
 * secret configured on Bertina, not model credentials. The canonical
 * immutable file stays outside public_html.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsOriginalHeadlinePacketPrivateConfig(array $cfg):array {
    $secret=$cfg['jrei_news_original_fact_signing_secret']??null;
    $folder=$cfg['jrei_news_original_fact_packet_dir']??null;
    if(!is_string($secret)||strlen($secret)<32||strlen($secret)>256||
       !is_string($folder)||strlen($folder)>650||
       !str_starts_with($folder,'/')||is_link($folder))
        throw new RuntimeException('news_original_private_fact_signer_not_configured');
    $private=realpath($folder);
    $web=realpath(dirname(__DIR__,3));
    if($private===false||!is_dir($private)||!is_writable($private)||
       $web===false||$private===$web||
       str_starts_with($private,$web.DIRECTORY_SEPARATOR))
        throw new RuntimeException('news_original_fact_directory_must_be_private');
    return [$secret,$private];
}

/**
 * Must be called *after* jrNewsApproveAutomatedOfficialEvidence has
 * atomically recorded an independent review bound to exact original bytes.
 * Rechecks reviewer authority and does not overwrite another reviewer's
 * evidence reference. A crash leaves a repairable primary-headline marker;
 * the next original private worker can retry safely.
 */
function jrNewsWriteOriginalHeadlineFactPacket(
    PDO $pdo,array $cfg,array $observed,int $now
):array {
    if($now<=0||!is_array($observed)||
       !preg_match('/^[a-f0-9-]{36}$/iD',(string)($observed['candidateId']??''))||
       !preg_match('/^[a-f0-9-]{36}$/iD',(string)($observed['reviewId']??''))||
       !preg_match('/^[a-f0-9]{64}$/D',(string)($observed['contentSha256']??''))||
       !is_string($observed['sourceUrl']??null)||
       !str_starts_with($observed['sourceUrl'],'https://')||
       !is_string($observed['headline']??null))
        throw new InvalidArgumentException('news_original_headline_packet_context_invalid');
    [$secret,$private]=jrNewsOriginalHeadlinePacketPrivateConfig($cfg);
    $q=$pdo->prepare(
        "SELECT e.review_id,e.candidate_id,e.content_sha256,
                e.independent_service_id,e.independent_audit_reference,
                e.evidence_private_reference,e.issuer_verified,
                e.usage_rights_verified,e.verification_state,c.source_url
         FROM jrei_news_evidence_reviews e
         JOIN jrei_news_candidates c ON c.candidate_id=e.candidate_id
         WHERE e.review_id=? AND c.candidate_id=?
           AND BINARY e.content_sha256=BINARY c.content_sha256");
    $q->execute([$observed['reviewId'],$observed['candidateId']]);
    $review=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($review)||
       $review['verification_state']!=='APPROVED'||
       (int)$review['issuer_verified']!==1||
       (int)$review['usage_rights_verified']!==1||
       $review['independent_service_id']!=='JREI_ORIGINAL_DETERMINISTIC_HEADLINE_V1'||
       $review['source_url']!==$observed['sourceUrl']||
       !hash_equals((string)$review['content_sha256'],$observed['contentSha256'])||
       !preg_match('/^primary-headline:[a-f0-9]{64}$/D',
            (string)$review['independent_audit_reference']))
        throw new RuntimeException('news_original_fact_source_audit_not_current');
    $fact='عنوان اعلام‌شده در اطلاعیهٔ رسمی: '.trim($observed['headline']);
    if(strlen($fact)<12||strlen($fact)>450||
       preg_match('//u',$fact)!==1||
       preg_match('/[\x00-\x1f\x7f]/',$fact))
        throw new RuntimeException('news_original_fact_headline_invalid');
    $payload=[
        'candidateId'=>$observed['candidateId'],
        'reviewId'=>$observed['reviewId'],
        'sourceUrl'=>$observed['sourceUrl'],
        'contentSha256'=>$observed['contentSha256'],
        'issuedAt'=>$now,
        'expiresAt'=>$now+43200,
        'issuerRechecked'=>true,
        'factsIndependentlyReviewed'=>true,
        'rightsAndPrivacyRechecked'=>true,
        'facts'=>[$fact]
    ];
    $encoded=json_encode($payload,
        JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $envelope=json_encode([
        'payload'=>$payload,
        'hmacSha256'=>hash_hmac('sha256',$encoded,$secret)
    ],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $reference=hash('sha256',$envelope).'.json';
    $file=$private.DIRECTORY_SEPARATOR.$reference;
    $existing=$review['evidence_private_reference'];
    if(is_string($existing)&&
       preg_match('/^[a-f0-9]{64}\.json$/D',$existing)===1){
        $prior=$private.DIRECTORY_SEPARATOR.$existing;
        if(is_link($prior)||!is_file($prior)||
           !hash_equals(substr($existing,0,64),(string)hash_file('sha256',$prior)))
            throw new RuntimeException('news_original_prior_packet_corrupted');
        return ['evidencePrivateReference'=>$existing,'alreadyPersisted'=>true];
    }
    if($existing!==$review['independent_audit_reference'])
        throw new RuntimeException('news_original_packet_review_conflict');
    // Exclusive, non-following file creation. An orphan file is harmless;
    // a DB reference is updated only after the immutable bytes are confirmed.
    $handle=@fopen($file,'x');
    if($handle!==false){
        try {
            if(fwrite($handle,$envelope)!==strlen($envelope)||
               !fflush($handle))
                throw new RuntimeException('news_original_fact_packet_write_incomplete');
        } finally {
            fclose($handle);
        }
        @chmod($file,0600);
    }
    if(is_link($file)||!is_file($file)||!is_readable($file)||
       !hash_equals(substr($reference,0,64),(string)hash_file('sha256',$file)))
        throw new RuntimeException('news_original_fact_packet_immutable_digest_invalid');
    $change=$pdo->prepare(
        'UPDATE jrei_news_evidence_reviews
         SET evidence_private_reference=?
         WHERE review_id=? AND candidate_id=?
           AND BINARY content_sha256=BINARY ?
           AND independent_service_id=?
           AND BINARY evidence_private_reference=BINARY ?');
    $change->execute([
        $reference,$review['review_id'],$review['candidate_id'],
        $observed['contentSha256'],
        'JREI_ORIGINAL_DETERMINISTIC_HEADLINE_V1',
        $review['independent_audit_reference']
    ]);
    if($change->rowCount()!==1)
        throw new RuntimeException('news_original_fact_packet_link_race');
    return ['evidencePrivateReference'=>$reference,'alreadyPersisted'=>false,
        'verifiedFactsCount'=>1,'narrowOfficialTitleOnly'=>true,
        'modelGeneratedSourceFacts'=>false];
}
