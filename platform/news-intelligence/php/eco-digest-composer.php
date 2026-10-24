<?php
declare(strict_types=1);
/**
 * Compose a bilingual first-party NEWS DIGEST for the ORIGINAL eco mail
 * worker. Does NOT transmit mail, create a second SMTP service or bypass
 * native ARTICLES consent. Original worker must recheck account + consent,
 * stored bilingual content hashes, retraction and safe unsubscription
 * immediately before SMTP submission.
 *
 * Source only. No direct HTTP entry point.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function jrNewsComposeVerifiedDigestEmail(
    array $privateOriginalWorkerReceipt,array $consent,
    array $publishedItems,string $locale,string $originalOptoutUrl,
    int $nowEpoch
): array {
    if(!in_array($locale,['fa','en'],true)||
        $nowEpoch<=0||
        ($privateOriginalWorkerReceipt['source']??null)!==
            'ORIGINAL_ECO_NEWS_DIGEST_WORKER'||
        ($privateOriginalWorkerReceipt['signedJobVerified']??null)!==true||
        ($privateOriginalWorkerReceipt['ownerNewsDistributionEnabled']??null)!==true||
        ($privateOriginalWorkerReceipt['originalPublisherProofRechecked']??null)!==true||
        ($consent['source']??null)!=='EXISTING_ECO_CONSENT'||
        ($consent['purpose']??null)!=='ARTICLES'||
        ($consent['granted']??null)!==true||
        ($consent['withdrawn']??null)!==false||
        !is_array($publishedItems)||count($publishedItems)<1||
        count($publishedItems)>20) {
        throw new RuntimeException('news_digest_original_eco_worker_not_ready');
    }
    $optout=parse_url($originalOptoutUrl);
    if(!is_array($optout)||($optout['scheme']??null)!=='https'||
        ($optout['host']??null)!=='drjavadrezazadeh.com'||
        !is_string($optout['path']??null)||
        !str_starts_with($optout['path'],'/api/newsletter/')) {
        throw new RuntimeException('news_digest_existing_unsubscribe_not_verified');
    }
    $fa=$locale==='fa';
    $subject=$fa?
        'گزیده خبرهای آموزشی شما | دکتر جواد رضازاده':
        'Your Educational News Digest | Dr. Javad Rezazadeh';
    $text=$fa?
        "گزیده خبرهای آموزشی بر اساس موضوعات انتخابی شما\n\n":
        "Educational news selected from your current preferences\n\n";
    $urls=[];
    foreach($publishedItems as $i=>$row) {
        if(!is_array($row)||
            ($row['source']??null)!=='ORIGINAL_AUTHENTICATED_PUBLISHER_RECEIPT'||
            ($row['publisherState']??null)!=='PUBLISHED'||
            ($row['retracted']??null)!==false||
            ($row['locale']??null)!==$locale||
            !is_string($row['route']??null)||
            !preg_match('#^/'.$locale.'/[a-z0-9/-]+/$#D',$row['route'])||
            str_contains($row['route'],'//')||
            !is_string($row['headline']??null)||
            trim($row['headline'])===''||
            strlen($row['headline'])>720||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)($row['contentSha256']??''))||
            !preg_match('/^[a-f0-9]{64}$/D',
                (string)($row['ownerApprovalDigest']??''))) {
            throw new RuntimeException('news_digest_unverified_public_article');
        }
        $url='https://drjavadrezazadeh.com'.$row['route'];
        if(isset($urls[$url]))continue;
        $urls[$url]=true;
        $headline=preg_replace('/[\x00-\x1F\x7F]+/u',' ',
            trim($row['headline']));
        if(!is_string($headline))throw new RuntimeException('news_digest_text_invalid');
        $text.=($i+1).". ".$headline."\n".$url."\n\n";
    }
    $text.=$fa?
        "پیش از تصمیم‌گیری درباره مهلت‌ها و آزمون‌ها، اطلاعیه اصلی را بررسی کنید.\n\n".
        "لغو دریافت خبرنامه:\n".$originalOptoutUrl."\n":
        "Verify examination deadlines with the original issuing authority.\n\n".
        "Unsubscribe from optional news emails:\n".$originalOptoutUrl."\n";
    if(strlen($text)>16000)throw new RuntimeException('news_digest_mail_size_invalid');
    return [
        'schema'=>'jr.jrei.news-eco-mail-composition.v1',
        'originalEcoPurpose'=>'ARTICLES',
        'subject'=>$subject,'plainTextBody'=>$text,
        'locale'=>$locale,'publicArticleCount'=>count($urls),
        'unsubscribeProvided'=>true,
        'ownerApprovalAlreadyRechecked'=>true,
        'noPersonalIdentifierInReturnedContent'=>true,
        'createdAtUtc'=>gmdate('Y-m-d\TH:i:s\Z',$nowEpoch),
        'actualMailSendAttempted'=>false,
        'smtpAccepted'=>false,
        'inboxDelivered'=>false
    ];
}
