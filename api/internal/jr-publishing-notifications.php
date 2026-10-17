<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED') && PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/**
 * Author notification template ONLY. This library never sends messages.
 * The future worker must load an actual verified paid transaction from the
 * existing commerce_payment_claims, resolve the approved author's verified
 * private account email and use the outbox deduplication key before SMTP.
 *
 * @return array{subject:string,body:string}
 */
function jrPublishingAuthorSaleNotice(array $event, string $authorName): array {
    if (($event['provider_verified']??null) !== true)
        throw new DomainException('bank_verification_required');
    foreach(['gross_toman','author_toman','talent_fund_toman',
       'operating_reserve_toman'] as $field) {
        if (!array_key_exists($field,$event) || !is_int($event[$field])
            || $event[$field] < 0) throw new InvalidArgumentException('invalid_sale_amount');
    }
    $gross=$event['gross_toman'];
    $author=$event['author_toman'];
    $fund=$event['talent_fund_toman'];
    $reserve=$event['operating_reserve_toman'];
    if ($gross < 1 || $author > $gross || $fund > $gross
        || $author+$fund !== $gross
        || $reserve !== intdiv($gross,10000)*700
                    + intdiv(($gross%10000)*700,10000))
        throw new InvalidArgumentException('unbalanced_contractual_sale');
    $ref=(string)($event['safe_sale_reference']??'');
    if(!preg_match('/^[a-z0-9]{10,24}$/D',$ref))
        throw new InvalidArgumentException('invalid_privacy_safe_reference');
    if(trim($authorName)===''||strlen($authorName)>180||preg_match('/[\x00-\x1f]/u',$authorName))
        throw new InvalidArgumentException('invalid_author_display_name');
    $money=static fn(int $n): string => number_format($n,0,'.',',');
    $subject='اعلان فروش تأییدشده اثر شما | شناسه '.$ref;
    $body="جناب آقای / سرکار خانم {$authorName}\n\n"
      ."یک فروش جدید از اثر شما پس از تأیید تراکنش توسط درگاه ثبت شده است.\n\n"
      ."شناسه محرمانه فروش: {$ref}\n"
      ."مبلغ فروش: ".$money($gross)." تومان\n"
      ."سهم مؤلف: ".$money($author)." تومان\n"
      ."سهم صندوق حمایت از استعدادها: ".$money($fund)." تومان\n"
      ."ذخیره عملیاتی سایت (۷ درصد): ".$money($reserve)." تومان\n"
      ."این ذخیره از بودجه جداگانه مجموعه تأمین می‌شود و از سهم مؤلف یا صندوق کسر نخواهد شد.\n\n"
      ."توجه: ثبت سهم مؤلف به معنی تسویه بانکی انجام‌شده نیست؛ وضعیت تسویه را در داشبورد خود مشاهده کنید.\n"
      ."اختصاص سهم صندوق نیز به معنی پرداخت قطعی آن به یک کودک یا نوجوان نیست.\n\n"
      ."داشبورد مؤلف: https://drjavadrezazadeh.com/fa/app/author/\n\n"
      ."سامانه انتشار علمی دکتر جواد رضازاده یزدلی\n";
    return ['subject'=>$subject,'body'=>$body];
}
