<?php
declare(strict_types=1);
/**
 * First-party ORIGINAL Bertina filesystem CMS news writer (PHP 8.3).
 * Only server-private, separately activated Cron may invoke this after
 * original mother-DB standing policy, source, QA, media and route checks.
 * Does not alter historical routes or overwrite static pages.
 *
 * Two-language write is a compensated operation rather than a DB
 * transaction; a failed second write retracts first. Crashed/uncertain
 * writes must be reconciled from the original authenticated receipt ledger
 * before any automated retry. Never use on visitor/API input.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/verified-news-page-render.php';

function jrNewsCmsSafeTarget(string $siteRoot,string $route):array {
    if(!preg_match('#^/(?:fa/akhbar|en/news-insights)/[a-z0-9-]{5,100}/$#D',$route))
        throw new RuntimeException('news_cms_route_scope_invalid');
    $resolved=realpath($siteRoot);
    $original=realpath(dirname(__DIR__,3));
    if($resolved===false||$original===false||$resolved!==$original||
       is_link($siteRoot)||!is_dir($siteRoot))
        throw new RuntimeException('news_cms_original_root_unavailable');
    $elements=explode('/',trim($route,'/'));
    $parent=$resolved;
    foreach(array_slice($elements,0,-1) as $part){
        $parent.=DIRECTORY_SEPARATOR.$part;
        if(!is_dir($parent)||is_link($parent))
            throw new RuntimeException('news_cms_existing_archive_missing');
        if(realpath($parent)!==$parent)
            throw new RuntimeException('news_cms_parent_realpath_mismatch');
    }
    $destination=$parent.DIRECTORY_SEPARATOR.end($elements);
    if(file_exists($destination)||is_link($destination))
        throw new RuntimeException('news_cms_existing_slug_collision');
    return ['directory'=>$destination,
        'index'=>$destination.DIRECTORY_SEPARATOR.'index.html'];
}
function jrNewsOriginalWriteVerifiedBilingualPages(
    PDO $pdo,string $revisionId,string $publicationId,
    string $siteRoot,callable $originalTrustedCmsRecheck,
    array $originalOwnerRelease,int $nowEpoch
):array {
    if(($originalOwnerRelease['source']??null)!=='ORIGINAL_JREI_PRIVATE_CMS_WORKER'||
       ($originalOwnerRelease['productionNewsWriteEnabled']??null)!==true||
       ($originalOwnerRelease['finalIntegratedAcceptanceVerified']??null)!==true||
       ($originalOwnerRelease['originalCmsRecoveredBackupVerified']??null)!==true||
       !preg_match('/^[a-f0-9-]{36}$/iD',$revisionId)||
       !preg_match('/^[a-f0-9-]{36}$/iD',$publicationId)||
       $nowEpoch<=0)
        throw new RuntimeException('news_cms_original_release_not_accepted');
    $q=$pdo->prepare(
        "SELECT p.publisher_state,p.revision_id,p.fa_route,p.en_route,
                p.approved_decision_id,p.standing_policy_id,
                v.bilingual_editorial_json,v.approval_digest,
                v.approved_image_ref,c.source_url,c.content_sha256
         FROM jrei_news_publications p
         JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         WHERE p.publication_id=? AND p.revision_id=?
           AND p.publisher_state='WAITING_FOR_PUBLISHER'");
    $q->execute([$publicationId,$revisionId]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)||
       !preg_match('/^[a-f0-9]{64}$/D',(string)$row['approval_digest'])||
       !hash_equals((string)$row['approval_digest'],
         hash('sha256',(string)$row['bilingual_editorial_json'])))
        throw new RuntimeException('news_cms_original_revision_unverified');
    $policy=$originalTrustedCmsRecheck([
        'publicationId'=>$publicationId,'revisionId'=>$revisionId,
        'approvalDigest'=>$row['approval_digest'],
        'standingPolicyId'=>$row['standing_policy_id'],
        'manualDecisionId'=>$row['approved_decision_id'],
        'sourceUrl'=>$row['source_url'],
        'evidenceSha256'=>$row['content_sha256'],
        'imageRef'=>$row['approved_image_ref'],
        'faRoute'=>$row['fa_route'],'enRoute'=>$row['en_route']
    ]);
    if(!is_array($policy)||
       ($policy['source']??null)!=='ORIGINAL_AUTHENTICATED_CMS_RECHECK'||
       ($policy['signedOriginalPublicationAuthorityCurrent']??null)!==true||
       ($policy['sourceEvidenceAndUsageRightsCurrent']??null)!==true||
       ($policy['independentClaimReviewCurrent']??null)!==true||
       ($policy['newsLanguageAndSeoQualityCurrent']??null)!==true||
       ($policy['licensedOriginalMediaCurrent']??null)!==true||
       ($policy['zeroPublicRouteCollisions']??null)!==true||
       ($policy['approvalDigest']??null)!==$row['approval_digest'])
        throw new RuntimeException('news_cms_verified_original_policy_unavailable');
    // The original site registry, NOT the LLM, supplies genuine bilingual
    // artwork accessibility text and current reuse permission.
    $textOnly=($row['approved_image_ref']==='');
    $originalMedia=$textOnly?null:jrNewsOriginalLicensedMediaSnapshot(
        $siteRoot,(string)$row['approved_image_ref']);
    if(!$textOnly&&(
       ($originalMedia['rightsVerified']??false)!==true||
       trim((string)($originalMedia['altFa']??''))===''||
       trim((string)($originalMedia['altEn']??''))===''))
        throw new RuntimeException('news_cms_original_illustration_rights_changed');
    $ctx=[
        'verifiedImageAltFa'=>$originalMedia['altFa']??null,
        'verifiedImageAltEn'=>$originalMedia['altEn']??null,
        'verifiedTextOnly'=>$textOnly,
        'source'=>'ORIGINAL_AUTHENTICATED_CMS',
        'originalNewsroomReleaseAccepted'=>true,
        'currentOfficialEvidenceAndClaimsReviewed'=>true,
        'mediaRightsVerified'=>true,'verifiedOriginalCmsPolicy'=>true,
        'verifiedImageRef'=>$row['approved_image_ref'],
        'originalSourceUrl'=>$row['source_url']
    ];
    $fa=jrNewsOriginalPublicNewsHtml(
        (string)$row['bilingual_editorial_json'],
        (string)$row['approval_digest'],$ctx,'fa',$nowEpoch);
    $en=jrNewsOriginalPublicNewsHtml(
        (string)$row['bilingual_editorial_json'],
        (string)$row['approval_digest'],$ctx,'en',$nowEpoch);
    if($fa['route']!==$row['fa_route']||
       $en['route']!==$row['en_route'])
        throw new RuntimeException('news_cms_immutable_routes_changed');
    // Validate both destination trees before creating either one.
    $first=jrNewsCmsSafeTarget($siteRoot,$fa['route']);
    $second=jrNewsCmsSafeTarget($siteRoot,$en['route']);
    $dirs=[];$published=[];$temps=[];
    try{
        foreach([$first,$second] as $target){
            if(!mkdir($target['directory'],0755)||
               is_link($target['directory'])){
                throw new RuntimeException('news_cms_cannot_create_target');
            }
            $dirs[]=$target['directory'];
        }
        foreach([[$first,$fa],[$second,$en]] as [$target,$article]){
            $temp=$target['directory'].DIRECTORY_SEPARATOR.
                '.news-private-'.bin2hex(random_bytes(10)).'.tmp';
            $handle=@fopen($temp,'xb');
            if($handle===false)
                throw new RuntimeException('news_cms_private_temp_creation_failed');
            $temps[]=$temp;
            try{
                $html=(string)$article['html'];
                $off=0;
                while($off<strlen($html)){
                    $n=fwrite($handle,substr($html,$off,65536));
                    if($n===false||$n===0)
                        throw new RuntimeException('news_cms_write_failed');
                    $off+=$n;
                }
                if(!fflush($handle))
                    throw new RuntimeException('news_cms_flush_failed');
            }finally{fclose($handle);}
            if(!hash_equals((string)$article['contentSha256'],
                    (string)hash_file('sha256',$temp)))
                throw new RuntimeException('news_cms_prepublication_hash_invalid');
            @chmod($temp,0644);
            // Link is exclusive: atomic no-overwrite on the same filesystem.
            if(!@link($temp,$target['index']))
                throw new RuntimeException('news_cms_atomic_exclusive_link_failed');
            $published[]=$target['index'];
            @unlink($temp);
        }
        foreach([[$first,$fa],[$second,$en]] as [$target,$article]){
            $hash=@hash_file('sha256',$target['index']);
            if(!is_string($hash)||
               !hash_equals((string)$article['contentSha256'],$hash))
                throw new RuntimeException('news_cms_postpublication_hash_invalid');
        }
        $postReview=$originalTrustedCmsRecheck([
            'publicationId'=>$publicationId,'revisionId'=>$revisionId,
            'approvalDigest'=>$row['approval_digest'],
            'standingPolicyId'=>$row['standing_policy_id'],
            'manualDecisionId'=>$row['approved_decision_id'],
            'sourceUrl'=>$row['source_url'],
            'evidenceSha256'=>$row['content_sha256'],
            'imageRef'=>$row['approved_image_ref'],
            'faRoute'=>$fa['route'],'enRoute'=>$en['route']
        ]);
        if(!is_array($postReview)||
           ($postReview['signedOriginalPublicationAuthorityCurrent']??null)!==true||
           ($postReview['sourceEvidenceAndUsageRightsCurrent']??null)!==true||
           ($postReview['independentClaimReviewCurrent']??null)!==true||
           ($postReview['licensedOriginalMediaCurrent']??null)!==true||
           ($postReview['approvalDigest']??null)!==$row['approval_digest'])
            throw new RuntimeException('news_cms_source_changed_after_write');
        $reference='jrei-original-bilingual:'.hash('sha256',implode('|',[
            $publicationId,$row['approval_digest'],
            $fa['contentSha256'],$en['contentSha256']
        ]));
        return [
            'source'=>'ORIGINAL_AUTHENTICATED_CMS',
            'verified'=>true,
            'bothCanonicalDocumentsVerified'=>true,
            'sourceRecheckedAfterPublication'=>true,
            'publicationId'=>$publicationId,'revisionId'=>$revisionId,
            'approvalDigest'=>$row['approval_digest'],
            'standingPolicyId'=>$row['standing_policy_id'],
            'manualDecisionId'=>$row['approved_decision_id'],
            'faRoute'=>$fa['route'],'enRoute'=>$en['route'],
            'faContentSha256'=>$fa['contentSha256'],
            'enContentSha256'=>$en['contentSha256'],
            'receiptReference'=>$reference,
            'requiresOriginalDbReceiptCommit'=>true,
            'mailSocialAndIndexDispatchPerformed'=>false
        ];
    }catch(Throwable $e){
        foreach($published as $file)@unlink($file);
        foreach($temps as $temp)@unlink($temp);
        foreach(array_reverse($dirs) as $dir)@rmdir($dir);
        throw $e;
    }
}
