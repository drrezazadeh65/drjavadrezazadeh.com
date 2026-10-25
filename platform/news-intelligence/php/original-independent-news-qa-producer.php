<?php
declare(strict_types=1);
/**
 * Dedicated second-model editorial audit, separate from generative drafting.
 * It never authors or edits the article and never invents source evidence.
 * A second independently selected model performs a *conservative* semantic
 * review, after deterministic date/URL/number leakage checks. The result
 * is bound to exact immutable facts + bilingual bytes with a private HMAC.
 * The audit is a quality gate, not proof that a language model is infallible.
 * Dedicated second-pass AI remains OFF without a distinct configured model.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once dirname(__DIR__,3).'/api/jrei-ai-cloud-provider.php';
require_once __DIR__.'/original-reviewed-news-evidence-port.php';

function jrNewsIndependentSecondPassText(string $text,array $facts):bool{
    if(strlen($text)>5000||preg_match('//u',$text)!==1)return false;
    $base=implode("\n",$facts);
    // No novel dates, amounts or outbound links can be invented by AI.
    $ascii=static fn(string $s):string=>strtr($s,[
        '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4',
        '۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
        '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4',
        '٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9'
    ]);
    preg_match_all('/(?<!\p{L})[0-9]+(?:[.,\/:-][0-9]+)*/u',$ascii($text),$nums);
    $allowed=$ascii($base);
    foreach($nums[0] as $value)
        if(!str_contains($allowed,$value))return false;
    preg_match_all('#https?://[^\s\x00-\x1f<>"\']+#iu',$text,$urls);
    if(count($urls[0])!==0)return false;
    if(preg_match('/\b(?:guaranteed|certainly|100%|confirmed admission|قبولی قطعی|تضمینی)\b/iu',$text))
        return false;
    return true;
}

/**
 * This is the independent PRODUCER for the existing signed QA receipt
 * reader, not a bypass of that reader. Requires the separately configured,
 * distinct original second-pass model and already signed source facts.
 */
function jrNewsOriginalPrepareIndependentSecondPass(
    array $request,string $draftSha256
):array {
    $cfg=cfg();
    $otherModel=$cfg['jrei_news_independent_qa_model']??'';
    if(($cfg['jrei_news_independent_second_pass_enabled']??false)!==true||
       !is_string($otherModel)||!preg_match('/^[a-zA-Z0-9._-]{3,90}$/D',$otherModel)||
       $otherModel===($cfg['jrei_ai_openai_model']??'')||
       !preg_match('/^[a-f0-9]{64}$/D',$draftSha256))
        throw new RuntimeException('news_second_pass_independent_model_not_authorized');
    $candidate=$request['candidateId']??null;
    $review=$request['reviewId']??null;
    $digest=$request['contentSha256']??null;
    if(!is_string($candidate)||!preg_match('/^[a-f0-9-]{36}$/iD',$candidate)||
       !is_string($review)||!preg_match('/^[a-f0-9-]{36}$/iD',$review)||
       !is_string($digest)||!preg_match('/^[a-f0-9]{64}$/D',$digest)||
       !is_array($request['fa']??null)||!is_array($request['en']??null))
        throw new InvalidArgumentException('news_second_pass_input_invalid');
    $pdo=db();
    if(!$pdo instanceof PDO)throw new RuntimeException('news_second_pass_mother_db_missing');
    $lookup=$pdo->prepare(
        "SELECT c.source_url FROM jrei_news_candidates c
         JOIN jrei_news_evidence_reviews e ON e.candidate_id=c.candidate_id
         WHERE c.candidate_id=? AND e.review_id=?
           AND BINARY c.content_sha256=BINARY ?
           AND BINARY e.content_sha256=BINARY c.content_sha256
           AND e.verification_state='APPROVED'
           AND e.issuer_verified=1 AND e.usage_rights_verified=1 LIMIT 1"
    );
    $lookup->execute([$candidate,$review,$digest]);
    $source=$lookup->fetchColumn();
    if(!is_string($source))throw new RuntimeException('news_second_pass_source_not_verified');
    $facts=jrJreiPrivateReviewedNewsEvidence([
        'candidateId'=>$candidate,'reviewId'=>$review,
        'sourceUrl'=>$source,'evidenceSha256'=>$digest
    ]);
    if(($facts['privateSourceReviewSigned']??false)!==true||
       !is_array($facts['facts']??null)||count($facts['facts'])<1)
        throw new RuntimeException('news_second_pass_source_facts_unsigned');
    foreach(['fa','en'] as $lang){
        foreach(['headline','summary','body','nextSteps','description'] as $key){
            $value=$request[$lang][$key]??null;
            if(!is_string($value)||trim($value)===''||
               !jrNewsIndependentSecondPassText($value,$facts['facts']))
                throw new RuntimeException('news_second_pass_unverified_numbers_or_links');
        }
    }
    $compact=json_encode([
        'sourceSha256'=>$digest,'verifiedFacts'=>$facts['facts'],
        'fa'=>$request['fa'],'en'=>$request['en'],
        'requiredDraftDigest'=>$draftSha256
    ],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    if(strlen($compact)>4500)
        throw new RuntimeException('news_second_pass_review_input_too_large');
    if(!jrAiReserveOpenAiBudget($pdo,$cfg,3200,400))
        throw new RuntimeException('news_second_pass_review_budget_unavailable');
    $independentCfg=$cfg;
    $independentCfg['jrei_ai_openai_model']=$otherModel;
    $instruction='Independent editorial verifier: check every factual claim '.
      'in both language drafts against the provided verified facts ONLY. '.
      'Any admission, deadline, amount, scholarship, ranking, regulatory '.
      'implication, quote, statistic or causal assertion not explicitly '.
      'in the facts means reject. Evaluate Persian-English equivalence, '.
      'adequacy of stylistic restraint, and action-step grounding. '.
      'Never treat model assertions as source evidence. If unsure reject. '.
      'Return only JSON with exact keys: requiredDraftDigest (string), '.
      'factsSupported (boolean), equivalentLanguages (boolean), '.
      'styleAdequate (boolean), nextStepsGrounded (boolean), '.
      'unsupportedClaims (array of strings). No markdown.';
    $answer=jrAiOpenAiResponses($independentCfg,
        [['role'=>'user','content'=>$compact]],$instruction,400);
    if(($answer['provider']??null)!=='OPENAI_RESPONSES'||
       ($answer['model']??null)!==$otherModel||
       !is_string($answer['text']??null))
        throw new RuntimeException('news_second_pass_original_provider_failed');
    $response=trim($answer['text']);
    if(str_starts_with($response,'```')){
        $response=(string)preg_replace('/^\x60{3}(?:json)?\s*|\s*\x60{3}$/i','',$response);
    }
    try{$evaluated=json_decode($response,true,12,JSON_THROW_ON_ERROR);}
    catch(Throwable $e){throw new RuntimeException('news_second_pass_json_invalid');}
    if(!is_array($evaluated)||array_is_list($evaluated)||
       ($evaluated['requiredDraftDigest']??null)!==$draftSha256||
       ($evaluated['factsSupported']??null)!==true||
       ($evaluated['equivalentLanguages']??null)!==true||
       ($evaluated['styleAdequate']??null)!==true||
       ($evaluated['nextStepsGrounded']??null)!==true||
       ($evaluated['unsupportedClaims']??null)!==[])
        throw new RuntimeException('news_second_pass_independent_review_rejected');
    $location=$cfg['jrei_news_independent_qa_dir']??null;
    $key=$cfg['jrei_news_independent_qa_secret']??null;
    if(!is_string($key)||strlen($key)<32||strlen($key)>256||
       !is_string($location)||!str_starts_with($location,'/')||is_link($location))
        throw new RuntimeException('news_second_pass_qa_signer_not_configured');
    $dir=realpath($location);
    $web=realpath(dirname(__DIR__,3));
    if($dir===false||!is_dir($dir)||!is_writable($dir)||
       $web===false||$dir===$web||
       str_starts_with($dir,$web.DIRECTORY_SEPARATOR))
        throw new RuntimeException('news_second_pass_private_dir_invalid');
    $now=time();
    $payload=[
        'schema'=>'jr.jrei.news-independent-audit.v1',
        'candidateId'=>$candidate,'reviewId'=>$review,
        'evidenceSha256'=>$digest,'draftSha256'=>$draftSha256,
        'issuedAt'=>$now,'expiresAt'=>$now+3600,
        'independentServiceId'=>'JREI-SECOND-MODEL-EDITORIAL-QA',
        'separateFromGenerator'=>true,
        'sourceCorpusEvidenceChecked'=>true,'issuerReverified'=>true,
        'allFactualClaimsSupported'=>true,
        'noMaterialContradictions'=>true,
        'bilingualCompletenessVerified'=>true,
        'authorialStyleMeasuredAndPassed'=>true,
        'nextStepsGrounded'=>true
    ];
    $canonical=json_encode($payload,
        JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $body=json_encode([
        'payload'=>$payload,'hmacSha256'=>hash_hmac('sha256',$canonical,$key)
    ],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $filename=$dir.DIRECTORY_SEPARATOR.$draftSha256.'.json';
    $handle=@fopen($filename,'x');
    if($handle===false)
        throw new RuntimeException('news_second_pass_audit_already_exists_or_io_failure');
    try{
        if(fwrite($handle,$body)!==strlen($body)||!fflush($handle))
            throw new RuntimeException('news_second_pass_audit_not_durable');
    }finally{fclose($handle);}
    @chmod($filename,0600);
    return ['draftSha256'=>$draftSha256,'independentModel'=>$otherModel,
        'signedAuditCreated'=>true,'originalCmsPublished'=>false];
}
