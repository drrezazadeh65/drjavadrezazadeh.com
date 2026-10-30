<?php
declare(strict_types=1);
/**
 * ORIGINAL first-party JREI News style/media evidence ports.
 * Nothing is approved merely because a source JSON or picture exists.
 * Admin acceptance pins the actual measured author corpus digest in
 * private Bertina configuration, not in browser input or an LLM response.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/original-news-policy-resolver.php';

function jrJreiApprovedMeasuredNewsAuthorStyle(string $language):array {
    if(!in_array($language,['fa','en'],true))
        throw new InvalidArgumentException('news_author_style_language_invalid');
    $cfg=cfg(); // ORIGINAL secure Bertina PHP configuration
    $filename=__DIR__.'/style-profile-'.$language.'.json';
    $expected=$cfg['jrei_news_approved_'.$language.'_author_corpus_sha256']??null;
    if(!is_string($expected)||!preg_match('/^[a-f0-9]{64}$/D',$expected)||
       is_link($filename)||!is_file($filename)||!is_readable($filename)||
       filesize($filename)>20000)
        throw new RuntimeException('news_original_author_corpus_not_approved');
    try {
        $doc=json_decode((string)file_get_contents($filename),true,16,JSON_THROW_ON_ERROR);
    }catch(Throwable $e){
        throw new RuntimeException('news_original_author_style_profile_unavailable');
    }
    if(!is_array($doc)||
       ($doc['schema']??null)!=='jr.jrei.private-author-style-aggregate.v1'||
       ($doc['language']??null)!==$language||
       ($doc['measuredCorpus']['sha256']??null)!==$expected||
       ($doc['measuredCorpus']['documentCount']??0)<1||
       !is_string($doc['measuredStyleInstructions']??null)||
       strlen($doc['measuredStyleInstructions'])<50||
       strlen($doc['measuredStyleInstructions'])>900)
        throw new RuntimeException('news_original_author_style_unverified');
    if(($doc['boundaries']['requireOriginalOwnerApprovalAndCorpusProvenanceBeforeAutomaticJreiUse']??false)!==true)
        throw new RuntimeException('news_author_style_approval_contract_missing');
    return [
        'source'=>'ORIGINAL_APPROVED_AUTHOR_DOCUMENT_CORPUS',
        'language'=>$language,
        'measuredRealDocuments'=>(int)$doc['measuredCorpus']['documentCount'],
        'corpusSha256'=>$expected,
        'measuredStyleInstructions'=>$doc['measuredStyleInstructions'],
        'originalPrivateOwnerCorpusApprovalPinned'=>true
    ];
}

/**
 * Select an existing, independently rights-approved conceptual illustration
 * when the owner has not pinned a specific image. No remote copying, paid
 * image generation or AI-created fake photographs of an actual news event.
 * Only original owner-controlled first-party registry entries are accepted.
 * This is presentation media, never proof of an official announcement.
 */
function jrNewsDefaultIllustrationCandidates(string $headline):array {
    $academic='assets/images/editorial-launch/academic-ecosystem-network-20261011.webp';
    $research='assets/images/editorial-launch/academic-research-editing-20261011.webp';
    $international='assets/images/editorial-launch/international-research-collaboration-20261011.webp';
    $assessment='assets/images/editorial-launch/humanability-educational-assessment-20261011.webp';
    $headline=strtolower($headline);
    if(preg_match('/آزمون|کنکور|سنجش|ارزیابی|نتایج|assessment|exam|admission|results/u',$headline))
        return [$assessment,$academic,$research,$international];
    if(preg_match('/بورسیه|بین.الملل|همکاری|scholarship|international|exchange|collaboration/u',$headline))
        return [$international,$academic,$research,$assessment];
    if(preg_match('/پژوهش|مقاله|تحقیق|research|academic|publication/u',$headline))
        return [$research,$academic,$assessment,$international];
    return [$academic,$research,$assessment,$international];
}

/** Resolve local media using a verified owner-pinned reference, then a
 * deterministic rights-checked branded fallback from the existing registry.
 */
function jrJreiOriginalLicensedNewsMedia(array $request):array {
    $candidate=$request['candidateId']??null;
    $review=$request['reviewId']??null;
    if(!is_string($candidate)||!preg_match('/^[a-f0-9-]{36}$/iD',$candidate)||
       !is_string($review)||!preg_match('/^[a-f0-9-]{36}$/iD',$review))
        throw new InvalidArgumentException('news_original_media_context_invalid');
    $cfg=cfg();
    $root=realpath(dirname(__DIR__,3));
    if($root===false)throw new RuntimeException('news_original_media_root_missing');
    $pinned=$cfg['jrei_news_approved_brand_media_ref']??null;
    $candidates=[];
    if(is_string($pinned)&&$pinned!=='')$candidates[]=$pinned;
    $subject=$request['newsHeadline']??'';
    if(!is_string($subject)||strlen($subject)>500)$subject='';
    foreach(jrNewsDefaultIllustrationCandidates($subject) as $illustration){
        if(!in_array($illustration,$candidates,true))
            $candidates[]=$illustration;
    }
    $media=null;$asset=null;
    foreach($candidates as $reference){
        $probe=jrNewsOriginalLicensedMediaSnapshot($root,$reference);
        if(($probe['rightsVerified']??false)===true&&
           preg_match('/^[a-f0-9]{64}$/D',
               (string)($probe['physicalContentSha256']??''))===1){
            $asset=$reference;$media=$probe;break;
        }
    }
    if(!is_array($media)||!is_string($asset)) {
        // Only images with documented ORIGINAL registry rights can be used.
        // Lack of an eligible image is NOT a reason to suppress an otherwise
        // independently reviewed official announcement. Never assign a fake
        // image licence or a speculative third-party photo.
        return [
          'source'=>'ORIGINAL_TEXT_FIRST_NO_IMAGE',
          'rightsCurrent'=>true, 'assetReference'=>'',
          'textOnly'=>true, 'mediaBytesTransferred'=>0,
          'illustrativeImageApproved'=>false
        ];
    }
    return [
       'source'=>'ORIGINAL_APPROVED_SITE_MEDIA_REGISTRY',
       'rightsCurrent'=>true,
       'assetReference'=>$asset,
       'physicalContentSha256'=>$media['physicalContentSha256'],
       'altFa'=>$media['altFa'],
       'altEn'=>$media['altEn'],
       'sameSiteOnly'=>true,
       'automaticallySelected'=>!is_string($pinned)||$asset!==$pinned,
       'imageIsIllustrativeNotOfficialEventEvidence'=>true
    ];
}
