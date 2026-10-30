<?php
declare(strict_types=1);
/**
 * Actual ORIGINAL JREI+CMS policy adapter. No browser/model-supplied proof.
 * Inspects the one mother DB, expiring independent QA receipt, physical
 * original media registry, immutable intended FA/EN CMS route and PHP host.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/independent-qa-ledger.php';
require_once __DIR__.'/official-auto-handoff.php';

function jrNewsOriginalLicensedMediaSnapshot(
    string $siteRoot,string $reference
):array {
    $unavailable=['rightsVerified'=>false,'assetReference'=>$reference];
    if(!preg_match('#^/?assets/images/[A-Za-z0-9_/.-]+\.(?:png|webp|avif|jpe?g)$#D',
        $reference)||str_contains($reference,'..'))return $unavailable;
    $relative=ltrim($reference,'/');
    $root=realpath($siteRoot);
    if($root===false||is_link($siteRoot))return $unavailable;
    $full=$root.DIRECTORY_SEPARATOR.str_replace('/',DIRECTORY_SEPARATOR,$relative);
    $actual=realpath($full);
    if($actual===false||!str_starts_with($actual,
       $root.DIRECTORY_SEPARATOR.'assets'.DIRECTORY_SEPARATOR.'images'.DIRECTORY_SEPARATOR)||
       !is_file($actual)||!is_readable($actual))
       return $unavailable;
    $catalog=$root.DIRECTORY_SEPARATOR.'assets'.DIRECTORY_SEPARATOR.'media-registry.json';
    if(!is_file($catalog)||is_link($catalog)||!is_readable($catalog)||
       filesize($catalog)>1048576)return $unavailable;
    try{
        $doc=json_decode((string)file_get_contents($catalog),true,24,JSON_THROW_ON_ERROR);
    }catch(Throwable $e){return $unavailable;}
    if(!is_array($doc)||!is_array($doc['assets']??null))
        return $unavailable;
    foreach($doc['assets'] as $a){
        if(!is_array($a)||($a['path']??null)!==$relative||
           !is_string($a['rights']??null)||
           !str_contains(strtolower($a['rights']),'approved')||
           !is_string($a['alt_fa']??null)||
           !is_string($a['alt_en']??null)||
           trim($a['alt_fa'])===''||trim($a['alt_en'])==='')continue;
        return [
            'rightsVerified'=>true,'assetReference'=>$reference,
            'assetAbsolutePath'=>$actual,
            'altFa'=>$a['alt_fa'],'altEn'=>$a['alt_en'],
            'physicalContentSha256'=>hash_file('sha256',$actual)
        ];
    }
    return $unavailable;
}

function jrNewsOriginalIndependentCmsPolicy(
    PDO $pdo,array $cfg,string $siteRoot,array $request,int $now,
    bool $permitExistingOriginalReceipt=false
):array {
    $revision=$request['revisionId']??null;
    $sourceId=$request['sourceId']??null;
    $sourceUrl=$request['sourceUrl']??null;
    $digest=$request['approvalDigest']??null;
    $sha=$request['evidenceSha256']??null;
    if(!is_string($revision)||!preg_match('/^[a-f0-9-]{36}$/iD',$revision)||
       !is_string($sourceId)||!preg_match('/^[a-f0-9-]{36}$/iD',$sourceId)||
       !is_string($sourceUrl)||!is_string($digest)||
       !preg_match('/^[a-f0-9]{64}$/D',$digest)||
       !is_string($sha)||!preg_match('/^[a-f0-9]{64}$/D',$sha)||
       $now<=0)
        throw new InvalidArgumentException('news_original_cms_policy_request_invalid');
    $qa=jrNewsIndependentQaCurrent($pdo,$revision,$digest,$sha,$now);
    $v=$pdo->prepare(
        'SELECT v.bilingual_editorial_json,v.approval_digest,v.approved_image_ref
           FROM jrei_news_editorial_versions v WHERE v.revision_id=?');
    $v->execute([$revision]);
    $draft=$v->fetch(PDO::FETCH_ASSOC);
    // Text-first stories have an explicit, QA-bound empty image reference.
    // Do not conflate missing image rights for a nonempty asset with
    // permission to publish without an illustration.
    $textOnly=is_array($draft)&&
        ($draft['approved_image_ref']??null)===''&&
        is_string($draft['bilingual_editorial_json']??null);
    $media=$textOnly?
        ['rightsVerified'=>true,'textOnly'=>true,'assetReference'=>'']:
        ((!is_array($draft)||!is_string($draft['approved_image_ref']))?
            ['rightsVerified'=>false,'textOnly'=>false]:
            jrNewsOriginalLicensedMediaSnapshot(
                $siteRoot,$draft['approved_image_ref']));
    $original=jrNewsOriginalOfficialSourceSnapshot($pdo,$sourceId,$sourceUrl);
    $sourceOkay=$original['registryState']==='AUTHORITATIVE_REVIEWED'&&
        $original['issuerIdentityVerified']===true&&
        $original['notRevoked']===true&&
        $original['exactSourceUrlApproved']===true&&
        $original['rightsForPublicNews']===true&&
        $original['termsAndRobotsCurrent']===true;
    $qaOkay=is_array($qa)&&is_array($draft)&&
       $qa['verified_media_ref']===$draft['approved_image_ref']&&
       hash_equals((string)$draft['approval_digest'],$digest);
    $routeFree=true;
    foreach(['faRoute','enRoute'] as $name){
        $r=$request[$name]??null;
        if(!is_string($r)||
           !preg_match('#^/(?:fa/akhbar|en/news-insights)/[a-z0-9-]{5,100}/$#D',$r)||
           str_contains($r,'..')||str_contains($r,'//')){
            $routeFree=false;break;
        }
        $path=realpath($siteRoot);
        if($path===false){$routeFree=false;break;}
        $real=$path.DIRECTORY_SEPARATOR.str_replace('/',
            DIRECTORY_SEPARATOR,trim($r,'/'));
        if(!$permitExistingOriginalReceipt &&
            (file_exists($real)||is_link($real))){
            $routeFree=false;break;
        }
    }
    $cmsEnabled=($cfg['jrei_news_integrated_release_accepted']??false)===true&&
       ($cfg['jrei_news_original_cms_writer_enabled']??false)===true&&
       ($cfg['operations_cron_master_enabled']??false)===true&&
       PHP_VERSION_ID>=80300&&is_dir($siteRoot)&&is_writable($siteRoot);
    return [
        'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_POLICY',
        'evidence'=>[
            'source'=>'ORIGINAL_JREI_VERIFIED_ARTICLE_EVIDENCE',
            'currentIssuerEvidence'=>$sourceOkay&&$qaOkay,
            'verifiedContentSha256'=>$sha,
            'claimsMatchPrimaryNotice'=>$qaOkay,
            'noMaterialContradictions'=>$qaOkay
        ],
        'editorial'=>[
            'source'=>'ORIGINAL_JREI_EDITORIAL_QA',
            'bilingualComplete'=>$qaOkay,
            'authorVoiceQualityPassed'=>$qaOkay,
            'newsGuidanceComplete'=>$qaOkay,
            'internalLinksChecked'=>$qaOkay,
            'seoAndCanonicalChecked'=>$qaOkay&&$routeFree,
            'imageRightsCurrent'=>$media['rightsVerified']??false,
            'textOnlyVisualPolicyVerified'=>$textOnly,
            'assistantContextGrounded'=>$qaOkay
        ],
        'publisher'=>[
            'source'=>'ORIGINAL_AUTHENTICATED_CMS_POLICY',
            'originalCmsConnected'=>$cmsEnabled,
            'exactRoutesCollisionFree'=>$routeFree,
            'authenticatedPublishReceiptSupported'=>$cmsEnabled&&
                function_exists('jrNewsOriginalWriteVerifiedBilingualPages')
        ],
        'qaId'=>$qa['qa_id']??null,
        'originalMediaDigest'=>$media['physicalContentSha256']??null,
        'modelOutputTrustedWithoutIndependentAudit'=>false,
        'originalSourceRightsStillCurrent'=>$sourceOkay
    ];
}
