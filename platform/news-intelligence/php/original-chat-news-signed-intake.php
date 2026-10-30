<?php
declare(strict_types=1);
/**
 * ORIGINAL SITE COPY of JREI's source-reviewed CHAT-FIRST news bridge.
 * Canonical upstream source: drrezazadeh65/JREI, integrations/news-intelligence-source/php/original-chat-news-signed-intake.php.
 * Website-only transport contract; never a new AI engine or CMS.
 *
 * This file is a reusable source component, NOT a mounted HTTP route.
 * Only the ORIGINAL Bertina authenticated API bootstrap may invoke it.
 * No new CMS, user page, DB or automatic direct website write is created.
 * Original independently reviewed source/candidate/QA/standing-policy and
 * filesystem CMS receipt workers remain authoritative. Caller supplies
 * atomic mother-DB replay/idempotency callbacks; absent -> fail closed.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Verify exact transport bytes before decoding. The caller is responsible
 * for TLS and hard-coded route dispatch; never trust client-chosen path.
 *
 * @param array<string,string> $headers already normalized to lowercase
 * @param callable $claimNonce atomic durable bool claim in original DB
 * @param callable $reservePacket atomic durable idempotent packet reservation
 * @return array<string,mixed> validated, UNTRUSTED candidate for original QA
 */
function jrNewsChatVerifySignedIntake(
    string $method, string $route, array $headers, string $rawBody,
    string $expectedRoute, string $key, int $now,
    callable $claimNonce, callable $reservePacket
): array {
    if (strlen($key) < 32 || $method !== 'POST' || $route !== $expectedRoute ||
        strlen($rawBody) < 90 || strlen($rawBody) > 8000000 ||
        ($headers['x-jrei-service']??'') !== 'jrei-news-site-bridge')
        throw new RuntimeException('news_chat_transport_not_authorized');

    $stamp=(string)($headers['x-jrei-timestamp']??'');
    $nonce=(string)($headers['x-jrei-nonce']??'');
    $signature=(string)($headers['x-jrei-signature']??'');
    $packetId=(string)($headers['x-jrei-packet-id']??'');
    $packetSha=(string)($headers['x-jrei-packet-sha256']??'');
    if (!preg_match('/^[0-9]{10}$/D',$stamp) ||
        abs($now-(int)$stamp)>120 ||
        !preg_match('/^[a-zA-Z0-9_-]{16,96}$/D',$nonce) ||
        !preg_match('/^[a-f0-9]{64}$/D',$signature) ||
        !preg_match('/^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{10}$/D',$packetId) ||
        !preg_match('/^[a-f0-9]{64}$/D',$packetSha) ||
        ($headers['x-jrei-idempotency-key']??'')!==$packetSha)
        throw new RuntimeException('news_chat_transport_fields_invalid');

    $expected=hash_hmac('sha256',
        $method."\n".$route."\n".$stamp."\n".$nonce."\n".$rawBody,$key);
    if (!hash_equals($expected,$signature))
        throw new RuntimeException('news_chat_bad_hmac');

    // The nonce claim MUST be atomic across every PHP worker. Never fall
    // back to a PHP process array or a non-persistent filesystem cache.
    if ($claimNonce($nonce,$now,$now+300)!==true)
        throw new RuntimeException('news_chat_replay_or_ledger_unavailable');

    $body=json_decode($rawBody,true,32,JSON_THROW_ON_ERROR);
    if (!is_array($body) ||
        ($body['schema']??null)!=='jr.jrei.news-original-cms-outbound.v1' ||
        ($body['packet_id']??null)!==$packetId ||
        ($body['mode']??null)!=='SITE_ORIGINAL_STANDING_POLICY_ONLY' ||
        !is_string($body['draft_id']??null) ||
        !preg_match('/^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{10}$/D',
            $body['draft_id']) ||
        !is_string($body['draft_sha256']??null) ||
        !preg_match('/^[a-f0-9]{64}$/D',$body['draft_sha256']) ||
        !is_string($body['fa']??null) ||
        !is_string($body['en']??null) ||
        strlen($body['fa'])<150 || strlen($body['en'])<150 ||
        strlen($body['fa'])>24000 || strlen($body['en'])>24000 ||
        !is_array($body['source_versions']??null) ||
        count($body['source_versions'])<1 ||
        count($body['source_versions'])>8)
        throw new RuntimeException('news_chat_story_contract_invalid');

    $versions=[];
    foreach ($body['source_versions'] as $source) {
        if (!is_array($source) ||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)($source['source_sha256']??'')) ||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)($source['passage_sha256']??'')) ||
            !filter_var($source['source_url']??null,FILTER_VALIDATE_URL) ||
            strncmp((string)$source['source_url'],'https://',8)!==0)
            throw new RuntimeException('news_chat_source_evidence_invalid');
        // It is NOT sufficient for a client's source manifest to say
        // PUBLIC_REUSE_APPROVED; the original mother DB must recheck it.
        $versions[]=[
            'sourceUrl'=>$source['source_url'],
            'sha256'=>$source['source_sha256'],
            'passageSha256'=>$source['passage_sha256'],
        ];
    }

    $assets=$body['image_assets']??null;
    if (!is_array($assets) || count($assets)>4)
        throw new RuntimeException('news_chat_media_contract_invalid');
    // Images are optional. Article licensing is NOT image licensing;
    // the original CMS independently selects licensed source/stock artwork
    // or renders a text-first card, never an automatically copied photo.
    $media=[];
    $total=0;
    foreach ($assets as $asset) {
        if (!is_array($asset) ||
            !is_string($asset['content_base64']??null) ||
            !preg_match('/^[a-f0-9]{64}$/D',(string)($asset['sha256']??'')) ||
            ($asset['mime']??'')!=='image/webp' ||
            !is_int($asset['width']??null) ||
            !is_int($asset['height']??null) ||
            $asset['width']<128 || $asset['width']>2048 ||
            $asset['height']<128 || $asset['height']>2048)
            throw new RuntimeException('news_chat_media_descriptor_invalid');
        $data=base64_decode($asset['content_base64'],true);
        if ($data===false || strlen($data)<20 ||
            substr($data,0,4)!=='RIFF' ||
            substr($data,8,4)!=='WEBP' ||
            !hash_equals($asset['sha256'],hash('sha256',$data)))
            throw new RuntimeException('news_chat_media_content_invalid');
        $total+=strlen($data);
        if ($total>5500000)
            throw new RuntimeException('news_chat_media_bytes_limit');
        $media[]=[
            'sha256'=>$asset['sha256'], 'bytes'=>strlen($data),
            'width'=>$asset['width'],'height'=>$asset['height'],
            // Data remains caller-private until original media rights/alt
            // and CMS storage are approved. Never echo it in a HTTP body.
            'binary'=>$data,
        ];
    }
    $imageSeo=$body['image_seo_proposal']??null;
    if (!is_array($imageSeo) ||
        ($imageSeo['site_must_allocate_final_image_urls']??null)!==true ||
        ($imageSeo['image_required_for_publication']??null)!==false)
        throw new RuntimeException('news_chat_image_policy_invalid');
    if (count($assets)>0 && (
        !is_string($imageSeo['alt_fa']??null) ||
        !is_string($imageSeo['alt_en']??null) ||
        strlen($imageSeo['alt_fa'])<20 ||
        strlen($imageSeo['alt_fa'])>900 ||
        strlen($imageSeo['alt_en'])<15 ||
        strlen($imageSeo['alt_en'])>400 ||
        !preg_match('/[\x{0600}-\x{06FF}]/u',$imageSeo['alt_fa']) ||
        !preg_match('/[A-Za-z]/',$imageSeo['alt_en'])))
        throw new RuntimeException('news_chat_bilingual_image_seo_invalid');
    $widths=array_map(
        static fn(array $asset):int=>$asset['width'],$assets);
    if (!is_array($imageSeo['responsive_widths']??null) ||
        $imageSeo['responsive_widths']!==$widths)
        throw new RuntimeException('news_chat_responsive_widths_not_matched');
    // Same-version duplicate packet must be returned via ORIGINAL durable
    // ledger; it may already be published. No blindly repeated CMS write.
    $reservation=$reservePacket($packetId,$packetSha,
        hash('sha256',$rawBody));
    if (!is_array($reservation) ||
        !in_array($reservation['state']??'',
            ['NEW_HELD_FOR_ORIGINAL_QA','EXISTING_PACKET'],true))
        throw new RuntimeException('news_chat_original_idempotency_unavailable');
    return [
        'schema'=>'jr.jrei.site-original-chat-intake.v1',
        'state'=>$reservation['state'],
        'packetId'=>$packetId,'packetSha256'=>$packetSha,
        'draftId'=>$body['draft_id'],
        'sourceVersions'=>$versions,
        'fa'=>$body['fa'],'en'=>$body['en'],
        'seoProposal'=>$body['seo_proposal']??null,
        'imageSeoUnverifiedProposal'=>[
            'altFa'=>$imageSeo['alt_fa']??null,
            'altEn'=>$imageSeo['alt_en']??null,
            'mediaOptional'=>true,
            'officialSourceImageRequiresSeparateReuseRights'=>true,
            'widths'=>$widths,
            'independentRightsOrSeoApproval'=>false,
            'publicSrcsetAssigned'=>false,
        ],
        'media'=>$media,
        // These are always UNKNOWN until independent ORIGINAL checks:
        'sourceRightsVerified'=>false,
        'independentFactQaVerified'=>false,
        'originalStandingPolicyVerified'=>false,
        'originalCmsPublicationReceipt'=>null,
        'published'=>false,
        'manualEditorialPageRequired'=>false,
    ];
}

/**
 * ONLY original CMS worker's independently verified publication receipt
 * may be signed into the response format expected by Python JREI.
 * The caller must derive $verified from ORIGINAL mother-DB + on-disk
 * receipt checks, never from JSON received from Windows.
 */
function jrNewsChatSignOriginalCmsReceipt(
    array $verified,string $packetId,string $packetSha,
    string $sharedKey,string $expectedHost
): array {
    if (strlen($sharedKey)<32 ||
        !preg_match('/^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{10}$/D',$packetId) ||
        !preg_match('/^[a-f0-9]{64}$/D',$packetSha) ||
        ($verified['state']??null)!=='ORIGINAL_CMS_BILINGUAL_RECEIPTS_VERIFIED' ||
        ($verified['sourceRightsCurrent']??false)!==true ||
        ($verified['independentClaimsCurrent']??false)!==true ||
        ($verified['standingPolicyCurrent']??false)!==true ||
        // No image requires NO invented approval. If an image is used,
        // rights must be independently established by the original CMS.
        ($verified['visualPolicySatisfied']??false)!==true)
        throw new RuntimeException('news_chat_original_cms_verification_required');
    $id=(string)($verified['receiptId']??'');
    $fa=(string)($verified['faUrl']??'');
    $en=(string)($verified['enUrl']??'');
    $when=(string)($verified['publishedUtc']??'');
    if (!preg_match('/^[A-Za-z0-9_-]{12,130}$/D',$id) ||
        !preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/D',$when) ||
        !str_starts_with($fa,'https://'.$expectedHost.'/fa/akhbar/') ||
        !str_starts_with($en,'https://'.$expectedHost.'/en/news-insights/'))
        throw new RuntimeException('news_chat_original_receipt_format_invalid');
    $state='PUBLISHED_BILINGUAL_CMS_VERIFIED';
    $signed=implode("\n",[$state,$packetSha,$packetId,$id,$fa,$en,$when]);
    return [
        'state'=>$state,'packet_id'=>$packetId,
        'packet_sha256'=>$packetSha,
        'receipt_id'=>$id,'fa_url'=>$fa,'en_url'=>$en,
        'published_utc'=>$when,
        'receipt_hmac'=>hash_hmac('sha256',$signed,$sharedKey),
    ];
}


/**
 * The SECOND site endpoint is a read-only ORIGINAL receipt query. It does
 * not reserve a new publication or call the CMS writer. It verifies the
 * same client transport signature but uses a fresh replay-protected nonce.
 * Only the original durable packet ledger maps packet ID/SHA to source,
 * revision, original publication and on-disk verified CMS receipts.
 */
function jrNewsChatVerifySignedReceiptQuery(
    string $method,string $route,array $headers,string $rawBody,
    string $expectedRoute,string $key,int $now,callable $claimNonce
): array {
    if ($method!=='POST'||$route!==$expectedRoute||strlen($key)<32||
        strlen($rawBody)<80||strlen($rawBody)>1024||
        ($headers['x-jrei-service']??'')!=='jrei-news-site-bridge')
        throw new RuntimeException('news_chat_receipt_query_not_authorized');
    $stamp=(string)($headers['x-jrei-timestamp']??'');
    $nonce=(string)($headers['x-jrei-nonce']??'');
    $hmac=(string)($headers['x-jrei-signature']??'');
    $packet=(string)($headers['x-jrei-packet-id']??'');
    $sha=(string)($headers['x-jrei-packet-sha256']??'');
    if (!preg_match('/^[0-9]{10}$/D',$stamp) ||
        abs($now-(int)$stamp)>120 ||
        !preg_match('/^[A-Za-z0-9_-]{16,96}$/D',$nonce) ||
        !preg_match('/^[a-f0-9]{64}$/D',$hmac) ||
        !preg_match('/^[0-9]{8}T[0-9]{6}Z-[a-f0-9]{10}$/D',$packet) ||
        !preg_match('/^[a-f0-9]{64}$/D',$sha) ||
        ($headers['x-jrei-idempotency-key']??'')!==$sha)
        throw new RuntimeException('news_chat_receipt_query_fields_invalid');
    $expected=hash_hmac('sha256',
        "POST\n".$route."\n".$stamp."\n".$nonce."\n".$rawBody,$key);
    if (!hash_equals($hmac,$expected))
        throw new RuntimeException('news_chat_receipt_query_bad_hmac');
    if ($claimNonce($nonce,$now,$now+300)!==true)
        throw new RuntimeException('news_chat_receipt_query_replayed');
    $body=json_decode($rawBody,true,12,JSON_THROW_ON_ERROR);
    if (!is_array($body) ||
        ($body['schema']??null)!=='jr.jrei.news-site-publication-status.v1' ||
        ($body['packet_id']??null)!==$packet ||
        ($body['packet_sha256']??null)!==$sha ||
        ($body['read_only_status']??null)!==true ||
        ($body['resubmit_article']??null)!==false)
        throw new RuntimeException('news_chat_receipt_query_contract_invalid');
    return [
        'state'=>'ORIGINAL_DURABLE_RECEIPT_LOOKUP_ONLY',
        'packetId'=>$packet,'packetSha256'=>$sha,
        'noCmsWriteAuthorized'=>true,
        'statusOnly'=>true
    ];
}
