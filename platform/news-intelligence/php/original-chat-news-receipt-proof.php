<?php
declare(strict_types=1);
/**
 * Read-only ORIGINAL CMS receipt attestation for a previously bound JREI
 * machine-to-machine packet. No site writes or artificial model approvals.
 * An inbound packet does not establish a valid link to any CMS publication.
 *
 * This adapter is dormant until an independent original-site service has
 * durably and correctly populated packet->revision->publication mapping.
 * The existing CMS original receipt hashes, publisher row, signed editorial
 * QA, site media rights and source registry remain authoritative.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/original-private-publishing-pipeline.php';
require_once __DIR__.'/original-chat-news-signed-intake.php';

function jrNewsOriginalChatReceiptProof(
    PDO $pdo,string $siteRoot,array $packet,string $key,string $host,int $now
):?array {
    $packetId=$packet['packet_id']??null;
    $packetSha=$packet['packet_sha256']??null;
    $publicationId=$packet['verified_publication_id']??null;
    $revisionId=$packet['verified_revision_id']??null;
    if(($packet['state']??null)!=='ORIGINAL_CMS_VERIFIED'||
       !is_string($packetId)||!is_string($packetSha)||
       !is_string($publicationId)||!is_string($revisionId)||
       preg_match('/^[a-f0-9-]{36}$/iD',$publicationId)!==1||
       preg_match('/^[a-f0-9-]{36}$/iD',$revisionId)!==1)
        return null;
    $q=$pdo->prepare(
      "SELECT p.publication_id,p.revision_id,p.standing_policy_id,
              p.fa_route,p.en_route,p.fa_content_sha256,
              p.en_content_sha256,p.publisher_receipt_reference,
              p.published_at,p.publisher_state,
              v.approval_digest,v.bilingual_editorial_json,
              v.approved_image_ref,c.content_sha256,c.source_url,
              qa.evidence_sha256 AS qa_evidence,qa.editorial_sha256 AS qa_editorial,
              qa.verified_media_ref,qa.verified_at,qa.expires_at,qa.revoked_at,
              qa.current_source_verified,qa.all_claims_supported,
              qa.no_material_contradictions,qa.fa_en_complete,
              qa.author_style_measured,qa.next_steps_grounded
       FROM jrei_news_publications p
       JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
       JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
       JOIN jrei_news_independent_qa_receipts qa ON qa.revision_id=v.revision_id
       WHERE p.publication_id=? AND p.revision_id=?
         AND p.publisher_state='PUBLISHED' LIMIT 1"
    );
    $q->execute([$publicationId,$revisionId]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)||!is_string($row['standing_policy_id'])||
       !is_string($row['approved_image_ref'])||
       !is_string($row['publisher_receipt_reference']))
        return null;
    $published=(int)$row['published_at'];
    if($published<=0||$published>$now+300||
       (int)$row['verified_at']>$published||
       (int)$row['expires_at']<=$published||
       ($row['revoked_at']!==null&&(int)$row['revoked_at']<=$published))
        return null;
    foreach([
       'current_source_verified','all_claims_supported',
       'no_material_contradictions','fa_en_complete',
       'author_style_measured','next_steps_grounded'
    ] as $gate){
        if((int)$row[$gate]!==1)return null;
    }
    $digest=(string)$row['approval_digest'];
    $sourceSha=(string)$row['content_sha256'];
    $faSha=(string)$row['fa_content_sha256'];
    $enSha=(string)$row['en_content_sha256'];
    foreach([$digest,$sourceSha,$faSha,$enSha] as $hash){
        if(preg_match('/^[a-f0-9]{64}$/D',$hash)!==1)return null;
    }
    if(!hash_equals($digest,hash('sha256',(string)$row['bilingual_editorial_json']))||
       !hash_equals($digest,(string)$row['qa_editorial'])||
       !hash_equals($sourceSha,(string)$row['qa_evidence'])||
       !hash_equals((string)$row['verified_media_ref'],
           (string)$row['approved_image_ref']))
        return null;
    $expected='jrei-original-bilingual:'.hash('sha256',implode('|',[
        $publicationId,$digest,$faSha,$enSha
    ]));
    if(!hash_equals($expected,(string)$row['publisher_receipt_reference']))
        return null;
    // Preserve historical standing authorization at publication time; a
    // later expiry does not invalidate a previously genuine CMS receipt.
    $s=$pdo->prepare('SELECT policy_id,policy_code,policy_digest,
        owner_account_id,revision_number,effective_at,expires_at,revoked_at
        FROM jrei_news_standing_policies WHERE policy_id=? LIMIT 1');
    $s->execute([$row['standing_policy_id']]);
    $standing=$s->fetch(PDO::FETCH_ASSOC);
    if(!is_array($standing)||
       $standing['policy_code']!=='OFFICIAL_PRIMARY_AUTO_NEWS'||
       (int)$standing['effective_at']>$published||
       (int)$standing['expires_at']<=$published||
       ($standing['revoked_at']!==null&&
        (int)$standing['revoked_at']<=$published))
        return null;
    $policyDigest=hash('sha256',implode('|',[
       'jr.jrei.news-standing-owner-policy.v1',
       $standing['policy_id'],$standing['owner_account_id'],
       $standing['policy_code'],(string)$standing['revision_number'],
       (string)$standing['effective_at'],(string)$standing['expires_at']
    ]));
    if(!hash_equals($policyDigest,(string)$standing['policy_digest']))
        return null;

    // Current issuer and public reuse rights are checked independently of
    // any incoming packet's self-reported source manifest.
    $sourceId=jrNewsPrivateArticleOriginalSourceId(
        $pdo,$revisionId,(string)$row['source_url']);
    if($sourceId===null)return null;
    $original=jrNewsOriginalOfficialSourceSnapshot(
        $pdo,$sourceId,(string)$row['source_url']);
    foreach(['issuerIdentityVerified','notRevoked',
             'exactSourceUrlApproved','rightsForPublicNews',
             'termsAndRobotsCurrent'] as $gate){
        if(($original[$gate]??null)!==true)return null;
    }
    if(($original['registryState']??null)!=='AUTHORITATIVE_REVIEWED')
        return null;

    // Existing original asset registry, never an external news photo.
    $textOnly=$row['approved_image_ref']==='';
    $media=$textOnly?null:jrNewsOriginalLicensedMediaSnapshot(
        $siteRoot,(string)$row['approved_image_ref']);
    if(!$textOnly&&(
       ($media['rightsVerified']??false)!==true||
       trim((string)($media['altFa']??''))===''||
       trim((string)($media['altEn']??''))===''))
        return null;
    $receipt=[
       'publicationId'=>$publicationId,'revisionId'=>$revisionId,
       'standingPolicyId'=>$row['standing_policy_id'],
       'approvalDigest'=>$digest,
       'faRoute'=>$row['fa_route'],'enRoute'=>$row['en_route'],
       'faContentSha256'=>$faSha,'enContentSha256'=>$enSha
    ];
    $proof=jrNewsOriginalPublishedReceiptFromDisk(
        $siteRoot,$receipt,$receipt);
    if(($proof['faContentSha256']??null)!==$faSha||
       ($proof['enContentSha256']??null)!==$enSha)return null;

    // Receipt ID is deterministically bound to the genuine ORIGINAL
    // CMS reference; it is never received from Windows.
    $verified=[
       'state'=>'ORIGINAL_CMS_BILINGUAL_RECEIPTS_VERIFIED',
       'receiptId'=>'jrei_'.hash('sha256',$expected),
       'faUrl'=>'https://'.$host.$row['fa_route'],
       'enUrl'=>'https://'.$host.$row['en_route'],
       'publishedUtc'=>gmdate('Y-m-d\\TH:i:s\\Z',$published),
       'sourceRightsCurrent'=>true,
       'independentClaimsCurrent'=>true,
       'standingPolicyCurrent'=>true,
       'visualPolicySatisfied'=>true
    ];
    return jrNewsChatSignOriginalCmsReceipt(
       $verified,$packetId,$packetSha,$key,$host);
}
