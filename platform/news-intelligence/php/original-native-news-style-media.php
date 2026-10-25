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

/** Only licensed, first-party EXISTING site artwork may be returned; when
 * disabled or missing, keep news in SYSTEM_HOLD. No remote image copying.
 */
function jrJreiOriginalLicensedNewsMedia(array $request):array {
    $candidate=$request['candidateId']??null;
    $review=$request['reviewId']??null;
    if(!is_string($candidate)||!preg_match('/^[a-f0-9-]{36}$/iD',$candidate)||
       !is_string($review)||!preg_match('/^[a-f0-9-]{36}$/iD',$review))
        throw new InvalidArgumentException('news_original_media_context_invalid');
    $cfg=cfg();
    $asset=$cfg['jrei_news_approved_brand_media_ref']??null;
    if(!is_string($asset)||$asset==='')
        throw new RuntimeException('news_original_media_policy_unavailable');
    $root=realpath(dirname(__DIR__,3));
    if($root===false)throw new RuntimeException('news_original_media_root_missing');
    $media=jrNewsOriginalLicensedMediaSnapshot($root,$asset);
    if(($media['rightsVerified']??false)!==true||
       !preg_match('/^[a-f0-9]{64}$/D',
           (string)($media['physicalContentSha256']??'')))
        throw new RuntimeException('news_original_media_current_rights_missing');
    return [
       'source'=>'ORIGINAL_APPROVED_SITE_MEDIA_REGISTRY',
       'rightsCurrent'=>true,
       'assetReference'=>$asset,
       'physicalContentSha256'=>$media['physicalContentSha256'],
       'altFa'=>$media['altFa'],
       'altEn'=>$media['altEn'],
       'sameSiteOnly'=>true
    ];
}
