<?php
declare(strict_types=1);
/**
 * One original/private JREI News publishing pipeline for already independently
 * signed source, claims, bilingual quality and first-party media. Uses
 * existing mother DB, original private CMS and original public indexer.
 * Server-private only, no browser-provided receipts or invented approvals.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/standing-official-publication.php';
require_once __DIR__.'/original-news-policy-resolver.php';
require_once __DIR__.'/original-cms-news-writer.php';
require_once __DIR__.'/public-search-indexer.php';

function jrNewsPrivateActiveStandingPolicy(PDO $pdo,int $at):?array{
    $q=$pdo->prepare(
        "SELECT policy_id,policy_digest,policy_code,owner_account_id,
            revision_number,effective_at,expires_at,owner_mfa_audit_ref
         FROM jrei_news_standing_policies
         WHERE policy_code='OFFICIAL_PRIMARY_AUTO_NEWS'
           AND revoked_at IS NULL AND effective_at<=? AND expires_at>?
         ORDER BY effective_at DESC,revision_number DESC LIMIT 1");
    $q->execute([$at,$at]);
    $p=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($p)||
       !preg_match('/^[a-zA-Z0-9._:-]{5,100}$/D',
         (string)$p['owner_mfa_audit_ref']))return null;
    $hash=hash('sha256',implode('|',[
        'jr.jrei.news-standing-owner-policy.v1',
        $p['policy_id'],$p['owner_account_id'],$p['policy_code'],
        $p['revision_number'],$p['effective_at'],$p['expires_at']
    ]));
    return hash_equals($hash,(string)$p['policy_digest'])?$p:null;
}
function jrNewsPrivateArticleOriginalSourceId(
    PDO $pdo,string $revisionId,string $articleUrl
):?string {
    $q=$pdo->prepare(
        "SELECT d.approved_article_source_id
         FROM jrei_news_editorial_versions v
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         JOIN jrei_news_discovered_urls d
           ON d.monitor_id=c.monitor_id
          AND BINARY d.canonical_url_sha256=BINARY SHA2(c.source_url,256)
          AND d.canonical_article_url=c.source_url
         WHERE v.revision_id=? AND BINARY c.source_url=BINARY ?
           AND d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
         LIMIT 1");
    $q->execute([$revisionId,$articleUrl]);
    $id=$q->fetchColumn();
    return is_string($id)&&preg_match('/^[a-f0-9-]{36}$/iD',$id)?$id:null;
}

function jrNewsPrivateCmsContextPolicy(PDO $pdo,array $cfg,string $root,
    array $originalContext,int $at,bool $existingOriginalPages=false):array {
    $id=(string)($originalContext['revisionId']??'');
    $sourceUrl=(string)($originalContext['sourceUrl']??'');
    $sourceId=jrNewsPrivateArticleOriginalSourceId($pdo,$id,$sourceUrl);
    if($sourceId===null)
        throw new RuntimeException('news_private_original_article_source_missing');
    $policyId=$originalContext['standingPolicyId']??null;
    $standing=jrNewsPrivateActiveStandingPolicy($pdo,$at);
    if(!is_array($standing)||$policyId!==$standing['policy_id'])
        throw new RuntimeException('news_private_standing_policy_no_longer_current');
    $snap=jrNewsOriginalIndependentCmsPolicy($pdo,$cfg,$root,[
        'revisionId'=>$id,'sourceId'=>$sourceId,
        'sourceUrl'=>$sourceUrl,
        'approvalDigest'=>$originalContext['approvalDigest']??'',
        'evidenceSha256'=>$originalContext['evidenceSha256']??'',
        'faRoute'=>$originalContext['faRoute']??'',
        'enRoute'=>$originalContext['enRoute']??''
    ],$at,$existingOriginalPages);
    $e=$snap['evidence']??[];
    $q=$snap['editorial']??[];
    $c=$snap['publisher']??[];
    $ready=($snap['originalSourceRightsStillCurrent']??null)===true&&
        ($e['currentIssuerEvidence']??null)===true&&
        ($e['claimsMatchPrimaryNotice']??null)===true&&
        ($e['noMaterialContradictions']??null)===true&&
        ($q['bilingualComplete']??null)===true&&
        ($q['authorVoiceQualityPassed']??null)===true&&
        ($q['imageRightsCurrent']??null)===true&&
        ($c['originalCmsConnected']??null)===true&&
        ($c['exactRoutesCollisionFree']??null)===true;
    return [
       'source'=>'ORIGINAL_AUTHENTICATED_CMS_RECHECK',
       'signedOriginalPublicationAuthorityCurrent'=>$ready,
       'sourceEvidenceAndUsageRightsCurrent'=>$ready,
       'independentClaimReviewCurrent'=>$ready,
       'newsLanguageAndSeoQualityCurrent'=>$ready,
       'licensedOriginalMediaCurrent'=>$ready,
       'zeroPublicRouteCollisions'=>$ready,
       'approvalDigest'=>$originalContext['approvalDigest']??null
    ];
}
function jrNewsOriginalPublishedReceiptFromDisk(
    string $root,array $ctx,array $receipt
):array {
    foreach(['publicationId','approvalDigest','standingPolicyId',
             'faRoute','enRoute'] as $field)
        if(($ctx[$field]??null)!==($receipt[$field]??null))
            throw new RuntimeException('news_private_original_cms_receipt_mismatch');
    $site=realpath($root);
    if($site===false)
        throw new RuntimeException('news_private_original_cms_root_missing');
    foreach(['fa','en'] as $lang){
        $route=$ctx[$lang.'Route'];
        if(!is_string($route)||
           !preg_match('#^/(?:fa/akhbar|en/news-insights)/[a-z0-9-]{5,100}/$#D',$route))
            throw new RuntimeException('news_private_original_cms_route_invalid');
        $filename=$site.DIRECTORY_SEPARATOR.
            str_replace('/',DIRECTORY_SEPARATOR,trim($route,'/')).
            DIRECTORY_SEPARATOR.'index.html';
        if(is_link($filename)||!is_file($filename)||!is_readable($filename)||
           filesize($filename)>450000)
            throw new RuntimeException('news_private_original_cms_file_missing');
        $actual=hash_file('sha256',$filename);
        if(!is_string($actual)||
           !hash_equals((string)$receipt[$lang.'ContentSha256'],$actual))
            throw new RuntimeException('news_private_original_cms_public_hash_changed');
    }
    return $receipt;
}
function jrNewsOriginalPrivateCmsPublishBatch(
    PDO $pdo,array $cfg,string $siteRoot,int $at,int $maxPerTick=3
):array {
    if(($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['jrei_news_original_cms_writer_enabled']??false)!==true||
       ($cfg['jrei_news_standing_official_publishing_enabled']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true||
       $at<=0||$maxPerTick<1||$maxPerTick>8)
        throw new RuntimeException('news_private_autopublisher_not_enabled');
    $standing=jrNewsPrivateActiveStandingPolicy($pdo,$at);
    if($standing===null)
        return ['state'=>'STANDING_POLICY_NOT_ACTIVE','examined'=>0,
            'published'=>0,'publicWrites'=>0,'dailyNewsQuota'=>null];
    $q=$pdo->prepare(
        "SELECT v.revision_id FROM jrei_news_editorial_versions v
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         JOIN jrei_news_independent_qa_receipts qa
           ON qa.revision_id=v.revision_id
          AND qa.editorial_sha256=v.approval_digest
          AND qa.evidence_sha256=c.content_sha256
          AND qa.revoked_at IS NULL AND qa.expires_at>?
         LEFT JOIN jrei_news_publications pub ON pub.revision_id=v.revision_id
         WHERE v.editorial_state='PENDING_OWNER_APPROVAL'
           AND pub.publication_id IS NULL
         ORDER BY CASE c.priority_code
           WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END,
           c.first_observed_at ASC,v.revision_id ASC LIMIT ?");
    $q->bindValue(1,$at,PDO::PARAM_INT);
    $q->bindValue(2,$maxPerTick,PDO::PARAM_INT);
    $q->execute();
    $ready=$q->fetchAll(PDO::FETCH_COLUMN);
    $summary=['schema'=>'jr.jrei.original-private-publishing-batch.v1',
        'state'=>'NO_ELIGIBLE_REVISIONS','examined'=>0,'staged'=>0,
        'published'=>0,'publicWrites'=>0,
        'exceptions'=>0,'dailyNewsQuota'=>null];
    foreach($ready as $revision){
        $summary['examined']++;
        $quality=function(array $context)use($pdo,$cfg,$siteRoot,$at):array{
            return jrNewsOriginalIndependentCmsPolicy(
                $pdo,$cfg,$siteRoot,$context,$at,false);
        };
        $stage=jrNewsStageStandingOfficialPublication(
            $pdo,(string)$revision,(string)$standing['policy_id'],
            $quality,$at);
        if(($stage['state']??null)!=='WAITING_FOR_PUBLISHER'){
            $summary['exceptions']++;continue;
        }
        $summary['staged']++;
    }
    $q=$pdo->prepare(
        "SELECT publication_id,revision_id FROM jrei_news_publications
         WHERE publisher_state='WAITING_FOR_PUBLISHER'
           AND standing_policy_id=?
         ORDER BY publication_id ASC LIMIT ?");
    $q->bindValue(1,$standing['policy_id']);
    $q->bindValue(2,$maxPerTick,PDO::PARAM_INT);
    $q->execute();
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $pending){
        $pubId=(string)$pending['publication_id'];
        $rev=(string)$pending['revision_id'];
        $precheck=0;
        $cmsPolicy=function(array $context)use(
            $pdo,$cfg,$siteRoot,$at,&$precheck):array{
            $after=$precheck>0;
            $precheck++;
            return jrNewsPrivateCmsContextPolicy(
                $pdo,$cfg,$siteRoot,$context,$at,$after);
        };
        $proof=jrNewsOriginalWriteVerifiedBilingualPages(
            $pdo,$rev,$pubId,$siteRoot,$cmsPolicy,[
              'source'=>'ORIGINAL_JREI_PRIVATE_CMS_WORKER',
              'productionNewsWriteEnabled'=>true,
              'finalIntegratedAcceptanceVerified'=>true,
              'originalCmsRecoveredBackupVerified'=>
                ($cfg['jrei_news_verified_restore_accepted']??false)===true
            ],$at);
        $verify=static function(array $context)use($siteRoot,$proof):array {
            return jrNewsOriginalPublishedReceiptFromDisk(
                $siteRoot,$context,$proof);
        };
        $qualityAfter=function(array $context)use($pdo,$cfg,$siteRoot,$at):array{
            return jrNewsOriginalIndependentCmsPolicy(
                $pdo,$cfg,$siteRoot,$context,$at,true);
        };
        $confirm=jrNewsConfirmStandingOriginalCmsPublication(
            $pdo,$pubId,[
              'source'=>'ORIGINAL_PRIVATE_CMS',
              'finalIntegratedAcceptanceVerified'=>true,
              'standingOfficialNewsPublishingEnabled'=>true
            ],$qualityAfter,$verify,$at);
        if(($confirm['status']??null)!=='PUBLISHED')
            throw new RuntimeException('news_private_publication_receipt_not_committed');
        $summary['published']++;
        $summary['publicWrites']+=2;
        $summary['state']='BILINGUAL_ORIGINAL_CMS_PUBLISHED';
    }
    return $summary;
}
