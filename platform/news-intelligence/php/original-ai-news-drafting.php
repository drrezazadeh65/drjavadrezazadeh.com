<?php
declare(strict_types=1);
/**
 * Real FIRST-PARTY JREI private AI drafting adapter (PHP 8.3).
 * Existing credential, OpenAI Responses transport and atomic model budget
 * belong to api/jrei-ai-cloud-provider.php. No parallel provider or crawler.
 * Model output is never trusted as evidence or proof of publication.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/editorial-draft-store.php';
require_once __DIR__.'/independent-qa-ledger.php';
require_once dirname(__DIR__,3).'/api/jrei-ai-cloud-provider.php';

function jrNewsOriginalAiDraftObject(string $text):array {
    if(strlen($text)>10000)throw new RuntimeException('news_ai_output_oversized');
    $json=trim($text);
    if(str_starts_with($json,'```')){
        $json=preg_replace('/^`{3}(?:json)?\s*/i','',$json);
        $json=preg_replace('/\s*`{3}$/','',(string)$json);
    }
    $data=json_decode((string)$json,true,12,JSON_THROW_ON_ERROR);
    $fields=['headline','summary','body','nextSteps','description'];
    if(!is_array($data)||array_is_list($data)||
       count(array_diff($fields,array_keys($data)))!==0||
       count(array_diff(array_keys($data),$fields))!==0)
        throw new RuntimeException('news_ai_response_schema_invalid');
    foreach($fields as $field)
        if(!is_string($data[$field])||trim($data[$field])==='')
            throw new RuntimeException('news_ai_response_missing_'.$field);
    return $data;
}

/**
 * All callables MUST be server-owned and independent of model output.
 * $originalEvidence returns reviewed primary-source factual observations.
 * $styleProfile returns style MEASURED from real approved author documents.
 * $independentFactAndStyleAudit rechecks both language drafts against source.
 * $approvedMedia resolves first-party licensed EXISTING media and alt texts.
 * The function saves only after all independent gates pass.
 */
function jrNewsOriginalGenerateReviewedBilingualDraft(
    PDO $pdo,array $originalCfg,string $candidateId,string $reviewId,
    callable $originalEvidence,callable $styleProfile,
    callable $independentFactAndStyleAudit,callable $approvedMedia,
    callable $originalAuditorSignatureVerifier,int $nowEpoch
):array {
    if(($originalCfg['jrei_news_model_drafting_enabled']??false)!==true||
       ($originalCfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($originalCfg['jrei_live_ai_enabled']??false)!==true||
       !function_exists('jrAiCloudConfigured')||
       !function_exists('jrAiReserveOpenAiBudget')||
       !function_exists('jrAiOpenAiResponses')||
       !jrAiCloudConfigured($originalCfg)||
       !preg_match('/^[a-f0-9-]{36}$/iD',$candidateId)||
       !preg_match('/^[a-f0-9-]{36}$/iD',$reviewId)||$nowEpoch<=0)
        throw new RuntimeException('news_original_ai_route_not_enabled');
    $q=$pdo->prepare(
        "SELECT c.source_url,c.content_sha256,c.headline,c.priority_code,
                e.verification_state,e.issuer_verified,e.usage_rights_verified,
                e.content_sha256 AS reviewed_sha,e.evidence_private_reference
         FROM jrei_news_candidates c
         JOIN jrei_news_evidence_reviews e ON e.candidate_id=c.candidate_id
         WHERE c.candidate_id=? AND e.review_id=? LIMIT 1");
    $q->execute([$candidateId,$reviewId]);
    $r=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($r)||$r['verification_state']!=='APPROVED'||
       (int)$r['issuer_verified']!==1||(int)$r['usage_rights_verified']!==1||
       !preg_match('/^[a-f0-9]{64}$/D',(string)$r['content_sha256'])||
       !hash_equals((string)$r['content_sha256'],(string)$r['reviewed_sha']))
        throw new RuntimeException('news_original_ai_requires_independent_evidence');
    $packet=$originalEvidence([
        'candidateId'=>$candidateId,'reviewId'=>$reviewId,
        'sourceUrl'=>$r['source_url'],'evidenceSha256'=>$r['content_sha256'],
        'evidencePrivateReference'=>$r['evidence_private_reference']
    ]);
    if(!is_array($packet)||
       ($packet['source']??null)!=='ORIGINAL_JREI_VERIFIED_PRIVATE_OBSERVATION'||
       ($packet['sourceUrl']??null)!==$r['source_url']||
       ($packet['contentSha256']??null)!==$r['content_sha256']||
       ($packet['issuerRechecked']??null)!==true||
       ($packet['factsIndependentlyReviewed']??null)!==true||
       ($packet['rightsAndPrivacyRechecked']??null)!==true||
       !is_array($packet['facts']??null)||
       count($packet['facts'])<1||count($packet['facts'])>20)
        throw new RuntimeException('news_original_ai_evidence_not_verified');
    $facts=[];
    foreach($packet['facts'] as $fact){
        if(!is_string($fact)||strlen($fact)<12||strlen($fact)>450||
           preg_match('/[\x00-\x1f\x7f]/',$fact))
            throw new RuntimeException('news_original_ai_fact_invalid');
        $facts[]=$fact;
    }
    $draft=['internalLinks'=>[]];
    foreach(['fa','en'] as $lang){
        $style=$styleProfile($lang);
        if(!is_array($style)||
           ($style['source']??null)!=='ORIGINAL_APPROVED_AUTHOR_DOCUMENT_CORPUS'||
           ($style['language']??null)!==$lang||
           ($style['measuredRealDocuments']??0)<1||
           !preg_match('/^[a-f0-9]{64}$/D',(string)($style['corpusSha256']??''))||
           !is_string($style['measuredStyleInstructions']??null)||
           strlen($style['measuredStyleInstructions'])<50||
           strlen($style['measuredStyleInstructions'])>900)
            throw new RuntimeException('news_original_authorial_style_not_measured');
        // Both the factual packet and instructions are originally approved
        // nonpersonal public observations, never sensitive private documents.
        $instructions='You are drafting a source-grounded educational news report. '.
          'Only facts in the verified input may be stated as fact. No invented '.
          'exams, dates, scholarships, links, quotations, fees, rankings, '.
          'permissions or credentials. Always distinguish official '.
          'announcement from analysis. Output ONLY one JSON object with exact '.
          'string keys: headline, summary, body, nextSteps, description. '.
          'Use '.($lang==='fa'?'modern formal Persian':'formal US English').
          ' and the following genuinely measured author style: '.
          $style['measuredStyleInstructions'];
        $message=json_encode([
          'officialSourceUrl'=>$r['source_url'],
          'originalNewsHeadline'=>$r['headline'],
          'verifiedFacts'=>$facts,'priority'=>$r['priority_code'],
          'outputLanguage'=>$lang
        ],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        if(strlen($message)>4400)
            throw new RuntimeException('news_ai_reviewed_facts_input_too_large');
        // Original, atomic token quota: no unsupported limitless inference
        // promise, and no bypass of the existing model owner's budget.
        if(!jrAiReserveOpenAiBudget($pdo,$originalCfg,2400,800))
            throw new RuntimeException('news_original_ai_budget_not_available');
        $response=jrAiOpenAiResponses($originalCfg,[
            ['role'=>'user','content'=>$message]
        ],$instructions,800);
        if(($response['provider']??null)!=='OPENAI_RESPONSES'||
           ($response['providerOutputUnverified']??null)!==true||
           !is_string($response['text']??null))
            throw new RuntimeException('news_original_ai_untrusted_response');
        $draft[$lang]=[
            'language'=>$lang,'sourceUrl'=>(string)$r['source_url'],
            ...jrNewsOriginalAiDraftObject($response['text'])
        ];
        $draft[$lang]=jrNewsCleanEditorialLanguage($draft[$lang],$lang);
    }
    $audit=$independentFactAndStyleAudit([
        'candidateId'=>$candidateId,'reviewId'=>$reviewId,
        'contentSha256'=>$r['content_sha256'],
        'fa'=>$draft['fa'],'en'=>$draft['en'],'verifiedFacts'=>$facts
    ]);
    if(!is_array($audit)||
       ($audit['source']??null)!=='ORIGINAL_INDEPENDENT_JREI_NEWS_QA'||
       ($audit['evidenceStillCurrent']??null)!==true||
       ($audit['allFactualClaimsSupported']??null)!==true||
       ($audit['noMaterialContradictions']??null)!==true||
       ($audit['bilingualCompletenessVerified']??null)!==true||
       ($audit['authorialStyleMeasuredAndPassed']??null)!==true||
       ($audit['nextStepsGrounded']??null)!==true)
        throw new RuntimeException('news_original_ai_independent_qa_not_accepted');
    $media=$approvedMedia([
        'candidateId'=>$candidateId,'reviewId'=>$reviewId,
        'sourceUrl'=>$r['source_url'],
        'newsHeadline'=>(string)$r['headline'],'qaReceipt'=>$audit
    ]);
    $licensedImage=is_array($media)&&
        ($media['source']??null)==='ORIGINAL_APPROVED_SITE_MEDIA_REGISTRY'&&
        ($media['rightsCurrent']??null)===true&&
        is_string($media['assetReference']??null)&&
        $media['assetReference']!=='';
    $textOnly=is_array($media)&&
        ($media['source']??null)==='ORIGINAL_TEXT_FIRST_NO_IMAGE'&&
        ($media['rightsCurrent']??null)===true&&
        ($media['textOnly']??null)===true&&
        ($media['assetReference']??null)==='';
    if(!$licensedImage&&!$textOnly)
        throw new RuntimeException('news_original_ai_visual_policy_not_approved');
    $draft['imageAssetReference']=$media['assetReference'];
    $stored=jrNewsStoreEvidenceReviewedDraft(
        $pdo,$candidateId,$reviewId,$draft,
        static fn(string $task):bool=>$task==='NEWS_PRIVATE_DRAFT',
        static fn(string $asset):bool=>
            $asset===$media['assetReference']&&
            ($media['rightsCurrent']??null)===true&&
            (($asset===''&&($media['textOnly']??false)===true)||
             ($asset!==''&&($media['source']??null)===
                'ORIGINAL_APPROVED_SITE_MEDIA_REGISTRY')),
        $nowEpoch
    );
    // Independent verification must bind precisely the persisted bilingual
    // bytes and evidence digest. This cannot be self-signed by the generator.
    $receipt=[
        'source'=>'ORIGINAL_INDEPENDENT_JREI_QA',
        'auditorKind'=>$audit['auditorKind']??null,
        'humanReviewerId'=>$audit['humanReviewerId']??null,
        'independentServiceId'=>$audit['independentServiceId']??null,
        'auditEvidenceSha256'=>$audit['auditEvidenceSha256']??null,
        'editorialSha256'=>$stored['approvalDigest'],
        'sourceEvidenceSha256'=>$r['content_sha256'],
        'approvedMediaRef'=>$media['assetReference'],
        'expiresAt'=>$audit['expiresAt']??null,
        'currentSourceVerified'=>($audit['evidenceStillCurrent']??null)===true,
        'allFactualClaimsSupported'=>($audit['allFactualClaimsSupported']??null)===true,
        'noContradictions'=>($audit['noMaterialContradictions']??null)===true,
        'bothLanguagesComplete'=>($audit['bilingualCompletenessVerified']??null)===true,
        'realAuthorCorpusStylePassed'=>($audit['authorialStyleMeasuredAndPassed']??null)===true,
        'nextStepsGrounded'=>($audit['nextStepsGrounded']??null)===true
    ];
    $signed=jrNewsRecordIndependentOriginalQa(
        $pdo,$stored['revisionId'],$receipt,
        $originalAuditorSignatureVerifier,$nowEpoch
    );
    if(($signed['independentlyAudited']??false)!==true&&
       ($signed['alreadyRecorded']??false)!==true)
        throw new RuntimeException('news_independent_qa_receipt_not_recorded');
    $stored['independentQaId']=$signed['qaId'];
    $stored['requiresIndividualOwnerApproval']=false;
    $stored['requiresActiveStandingNewsPolicy']=true;
    return $stored;
}
