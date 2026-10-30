<?php
declare(strict_types=1);
/**
 * RESERVED FOR FINAL OWNER-AUTHORISED INTEGRATED QA. NEVER RUN IN CODE-ONLY.
 * Pure transport contract cases. No host database, website writes or live
 * news publication. Independently reviewed source/QA tests are still needed.
 */
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/platform/news-intelligence/php/original-chat-news-signed-intake.php';
function newsContractAssert(bool $ok,string $reason):void{
    if(!$ok)throw new RuntimeException($reason);
}
$sitePath='/api/jrei/v1/news-intake';
$key=str_repeat('private-contract-only-',3);
$id='20261030T160000Z-'.str_repeat('a',10);
$sha=str_repeat('b',64);
$passage=str_repeat('c',64);
$body=[
 'schema'=>'jr.jrei.news-original-cms-outbound.v1',
 'mode'=>'SITE_ORIGINAL_STANDING_POLICY_ONLY',
 'packet_id'=>$id,
 'draft_id'=>'20261030T155959Z-'.str_repeat('d',10),
 'draft_sha256'=>str_repeat('e',64),
 'fa'=>str_repeat('اطلاعیه آموزشی مستند. ',12),
 'en'=>str_repeat('Official source-grounded educational notice. ',8),
 'source_versions'=>[[
   'source_url'=>'https://example.org/notices/education',
   'source_sha256'=>$sha,
   'passage_sha256'=>$passage
 ]],
 'image_assets'=>[],
 'image_seo_proposal'=>[
   'site_must_allocate_final_image_urls'=>true,
   'image_required_for_publication'=>false,
   'responsive_widths'=>[]
 ]
];
$json=json_encode($body,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
$timestamp=(string)time();
$nonce='qa-private-example-nonce-0001';
$sig=hash_hmac('sha256',implode("\n",['POST',$sitePath,$timestamp,$nonce,$json]),$key);
$headers=[
 'x-jrei-service'=>'jrei-news-site-bridge',
 'x-jrei-timestamp'=>$timestamp,'x-jrei-nonce'=>$nonce,
 'x-jrei-signature'=>$sig,'x-jrei-packet-id'=>$id,
 'x-jrei-packet-sha256'=>$sha,'x-jrei-idempotency-key'=>$sha
];
$used=[];
$claim=static function(string $n,int $now,int $until)use(&$used):bool{
    if(isset($used[$n]))return false;
    $used[$n]=true;return true;
};
$reserved=0;
$reserve=static function(string $i,string $s,string $digest)use(&$reserved,$id,$sha,$json):array{
    newsContractAssert($i===$id&&$s===$sha&&
        hash_equals($digest,hash('sha256',$json)),
        'signed_body_reservation_mismatch');
    $reserved++;
    return ['state'=>'NEW_HELD_FOR_ORIGINAL_QA'];
};
$accepted=jrNewsChatVerifySignedIntake(
    'POST',$sitePath,$headers,$json,$sitePath,$key,time(),$claim,$reserve);
newsContractAssert($accepted['published']===false&&
    $accepted['originalCmsPublicationReceipt']===null&&
    $accepted['sourceRightsVerified']===false&&
    $accepted['independentFactQaVerified']===false&&
    $reserved===1&&$accepted['media']===[],
    'signed_text_first_must_remain_unpublished_and_unaudited');
try{
    jrNewsChatVerifySignedIntake(
        'POST',$sitePath,$headers,$json,$sitePath,$key,time(),$claim,$reserve);
    throw new RuntimeException('replayed_nonce_accepted');
}catch(RuntimeException $e){
    newsContractAssert($e->getMessage()==='news_chat_replay_or_ledger_unavailable',
        'unexpected_replay_outcome');
}
$statusPath='/api/jrei/v1/news-receipt';
$receiptBody=json_encode([
 'schema'=>'jr.jrei.news-site-publication-status.v1',
 'packet_id'=>$id,'packet_sha256'=>$sha,
 'read_only_status'=>true,'resubmit_article'=>false
],JSON_THROW_ON_ERROR);
$nonce='qa-private-example-nonce-0002';
$headers['x-jrei-nonce']=$nonce;
$headers['x-jrei-signature']=hash_hmac('sha256',
    implode("\n",['POST',$statusPath,$timestamp,$nonce,$receiptBody]),$key);
$status=jrNewsChatVerifySignedReceiptQuery(
    'POST',$statusPath,$headers,$receiptBody,$statusPath,$key,time(),$claim);
newsContractAssert($status['statusOnly']===true&&
    $status['noCmsWriteAuthorized']===true,'receipt_endpoint_cannot_publish');
echo "SOURCE CONTRACT CASES PASSED; NO LIVE CMS OR STANDING AUTHORITY VERIFIED\n";
