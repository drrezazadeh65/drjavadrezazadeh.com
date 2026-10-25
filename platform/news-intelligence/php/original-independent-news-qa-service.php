<?php
declare(strict_types=1);
/**
 * First-party bridge to an INDEPENDENT editorial QA producer.
 *
 * External, independently operated audit service must write a signed,
 * short-lived evidence record to the private directory for the exact two
 * generated language drafts. The generative-model worker cannot sign it,
 * approve itself, choose a reviewer, or change the signature key.
 * An absent/expired/tampered audit is a SYSTEM_HOLD, never "APPROVED".
 *
 * Canonical signed JSON:
 * {"payload":{"schema":"jr.jrei.news-independent-audit.v1",
 *  "candidateId":"uuid","reviewId":"uuid","evidenceSha256":"hex",
 *  "draftSha256":"hex","issuedAt":epoch,"expiresAt":epoch,
 *  "independentServiceId":"JREI-INDEPENDENT-QA",
 *  "separateFromGenerator":true,"sourceCorpusEvidenceChecked":true,
 *  "issuerReverified":true,"allFactualClaimsSupported":true,
 *  "noMaterialContradictions":true,"bilingualCompletenessVerified":true,
 *  "authorialStyleMeasuredAndPassed":true,"nextStepsGrounded":true},
 *  "hmacSha256":"hex"}
 *
 * Sign json_encode(payload, JSON_UNESCAPED_UNICODE |
 * JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) using the independent
 * reviewer service key (not the source-reader/model key).
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/original-independent-news-qa-producer.php';

function jrNewsIndependentDraftAuditDigest(array $draft):string {
    foreach(['candidateId','reviewId','contentSha256','fa','en'] as $name)
        if(!array_key_exists($name,$draft))
            throw new InvalidArgumentException('news_independent_qa_draft_missing_'.$name);
    $encoded=json_encode([
       'candidateId'=>$draft['candidateId'],
       'reviewId'=>$draft['reviewId'],
       'contentSha256'=>$draft['contentSha256'],
       'fa'=>$draft['fa'],'en'=>$draft['en']
    ],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    if(strlen($encoded)>230000)
        throw new RuntimeException('news_independent_qa_draft_too_large');
    return hash('sha256',$encoded);
}

function jrNewsReadOriginalIndependentAudit(array $request):array {
    $sha=$request['draftSha256']??null;
    $expectedEvidence=$request['contentSha256']??null;
    if(!is_string($sha)||!preg_match('/^[a-f0-9]{64}$/D',$sha)||
       !is_string($expectedEvidence)||!preg_match('/^[a-f0-9]{64}$/D',$expectedEvidence))
        throw new InvalidArgumentException('news_independent_audit_digest_invalid');
    $cfg=cfg(); // Existing private Bertina settings; never from a request.
    $secret=$cfg['jrei_news_independent_qa_secret']??null;
    $location=$cfg['jrei_news_independent_qa_dir']??null;
    if(!is_string($secret)||strlen($secret)<32||strlen($secret)>256||
       !is_string($location)||strlen($location)>650||
       !str_starts_with($location,'/')||is_link($location))
        throw new RuntimeException('news_original_independent_qa_secret_missing');
    $root=realpath(dirname(__DIR__,3));
    $dir=realpath($location);
    if($root===false||$dir===false||!is_dir($dir)||
       $root===$dir||str_starts_with($dir,$root.DIRECTORY_SEPARATOR))
        throw new RuntimeException('news_independent_qa_private_directory_invalid');
    $file=$dir.DIRECTORY_SEPARATOR.$sha.'.json';
    if(is_link($file)||!is_file($file)||!is_readable($file)||
       filesize($file)<220||filesize($file)>16000||
       realpath($file)!==$file)
        throw new RuntimeException('news_independent_qa_signed_record_missing');
    $bytes=file_get_contents($file);
    if(!is_string($bytes))
        throw new RuntimeException('news_independent_qa_signed_record_unreadable');
    try{
        $doc=json_decode($bytes,true,18,JSON_THROW_ON_ERROR);
    }catch(Throwable $e){
        throw new RuntimeException('news_independent_qa_signed_record_invalid');
    }
    if(!is_array($doc)||!is_array($doc['payload']??null)||
       !is_string($doc['hmacSha256']??null)||
       !preg_match('/^[a-f0-9]{64}$/D',$doc['hmacSha256']))
        throw new RuntimeException('news_independent_qa_signed_record_shape');
    $p=$doc['payload'];
    $canonical=json_encode($p,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|
        JSON_THROW_ON_ERROR);
    if(!hash_equals(hash_hmac('sha256',$canonical,$secret),$doc['hmacSha256']))
        throw new RuntimeException('news_independent_qa_signature_invalid');
    $at=time();
    if(($p['schema']??null)!=='jr.jrei.news-independent-audit.v1'||
       ($p['candidateId']??null)!==($request['candidateId']??null)||
       ($p['reviewId']??null)!==($request['reviewId']??null)||
       ($p['evidenceSha256']??null)!==$expectedEvidence||
       ($p['draftSha256']??null)!==$sha||
       !is_int($p['issuedAt']??null)||!is_int($p['expiresAt']??null)||
       $p['issuedAt']>$at||$p['issuedAt']<$at-86400||
       $p['expiresAt']<=$at||$p['expiresAt']>$at+86400||
       ($p['separateFromGenerator']??null)!==true||
       ($p['sourceCorpusEvidenceChecked']??null)!==true||
       ($p['issuerReverified']??null)!==true)
        throw new RuntimeException('news_independent_qa_identity_or_clock_invalid');
    foreach(['allFactualClaimsSupported','noMaterialContradictions',
        'bilingualCompletenessVerified','authorialStyleMeasuredAndPassed',
        'nextStepsGrounded'] as $gate)
        if(($p[$gate]??null)!==true)
            throw new RuntimeException('news_independent_qa_gate_missing_'.$gate);
    if(!is_string($p['independentServiceId']??null)||
       !preg_match('/^[a-zA-Z0-9:._-]{6,100}$/D',$p['independentServiceId']))
        throw new RuntimeException('news_independent_qa_service_identity_invalid');
    $p['auditEvidenceSha256']=hash('sha256',$canonical);
    return $p;
}

function jrJreiIndependentNewsEditorialAudit(array $request):array {
    $sha=jrNewsIndependentDraftAuditDigest($request);
    $lookup=[
        'draftSha256'=>$sha,
        'candidateId'=>$request['candidateId'],
        'reviewId'=>$request['reviewId'],
        'contentSha256'=>$request['contentSha256']
    ];
    try{
        $receipt=jrNewsReadOriginalIndependentAudit($lookup);
    }catch(RuntimeException $e){
        // Never replace an invalid, altered, expired or revoked QA record:
        // only a genuinely absent file may initiate an independent review.
        if($e->getMessage()!=='news_independent_qa_signed_record_missing')
            throw $e;
        jrNewsOriginalPrepareIndependentSecondPass($request,$sha);
        $receipt=jrNewsReadOriginalIndependentAudit($lookup);
    }
    return [
        'source'=>'ORIGINAL_INDEPENDENT_JREI_NEWS_QA',
        'auditorKind'=>'INDEPENDENT_AUTOMATED_QA',
        'humanReviewerId'=>null,
        'independentServiceId'=>$receipt['independentServiceId'],
        'auditEvidenceSha256'=>$receipt['auditEvidenceSha256'],
        'expiresAt'=>$receipt['expiresAt'],
        'evidenceStillCurrent'=>$receipt['issuerReverified'],
        'allFactualClaimsSupported'=>$receipt['allFactualClaimsSupported'],
        'noMaterialContradictions'=>$receipt['noMaterialContradictions'],
        'bilingualCompletenessVerified'=>$receipt['bilingualCompletenessVerified'],
        'authorialStyleMeasuredAndPassed'=>$receipt['authorialStyleMeasuredAndPassed'],
        'nextStepsGrounded'=>$receipt['nextStepsGrounded'],
        'independentlySignedBySeparateService'=>true
    ];
}

/** Verify the exact stored immutable FA+EN editorial snapshot after staging.
 * The original source evidence was already independently signed in JREI-KA.
 * No trust is inherited from the drafting model's own response.
 */
function jrJreiVerifyIndependentNewsQaSignature(array $context):array {
    $pdo=db();
    if(!$pdo instanceof PDO)
        throw new RuntimeException('news_independent_qa_original_db_unavailable');
    $revision=$context['revisionId']??null;
    if(!is_string($revision)||!preg_match('/^[a-f0-9-]{36}$/iD',$revision))
        throw new InvalidArgumentException('news_independent_qa_revision_invalid');
    $q=$pdo->prepare(
        'SELECT candidate_id,evidence_review_id,bilingual_editorial_json,
                approval_digest FROM jrei_news_editorial_versions
         WHERE revision_id=? LIMIT 1'
    );
    $q->execute([$revision]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)||!hash_equals((string)$row['approval_digest'],
         (string)($context['storedEditorialSha256']??'')))
        throw new RuntimeException('news_independent_qa_stored_revision_changed');
    try{
        $doc=json_decode((string)$row['bilingual_editorial_json'],true,24,JSON_THROW_ON_ERROR);
    }catch(Throwable $e){
        throw new RuntimeException('news_independent_qa_stored_json_invalid');
    }
    if(!is_array($doc)||($doc['candidateId']??null)!==$row['candidate_id']||
       ($doc['reviewId']??null)!==$row['evidence_review_id']||
       ($doc['evidenceSha256']??null)!==($context['reviewedSourceSha256']??null)||
       !is_array($doc['fa']??null)||!is_array($doc['en']??null))
        throw new RuntimeException('news_independent_qa_stored_lineage_invalid');
    $draftDigest=jrNewsIndependentDraftAuditDigest([
        'candidateId'=>$row['candidate_id'],
        'reviewId'=>$row['evidence_review_id'],
        'contentSha256'=>$context['reviewedSourceSha256'],
        'fa'=>$doc['fa'],'en'=>$doc['en']
    ]);
    $audit=jrNewsReadOriginalIndependentAudit([
        'draftSha256'=>$draftDigest,
        'candidateId'=>$row['candidate_id'],
        'reviewId'=>$row['evidence_review_id'],
        'contentSha256'=>$context['reviewedSourceSha256']
    ]);
    if(!hash_equals($audit['auditEvidenceSha256'],
         (string)($context['auditEvidenceSha256']??''))||
       $audit['independentServiceId']!==($context['independentServiceId']??null)||
       ($context['auditorKind']??null)!=='INDEPENDENT_AUTOMATED_QA'||
       ($context['humanReviewerId']??null)!==null)
        throw new RuntimeException('news_independent_qa_auditor_receipt_mismatch');
    return [
        'source'=>'ORIGINAL_JREI_QA_IDENTITY_SERVICE',
        'separateFromGenerator'=>true,
        'sourceCorpusEvidenceChecked'=>true,
        'auditorIdentityVerified'=>true,
        'signedAuditDigestCurrent'=>true,
        'auditEvidenceSha256'=>$audit['auditEvidenceSha256']
    ];
}
