<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/internal/jr-publishing-notifications.php';
function a(bool $check,string $why): void { if(!$check) throw new RuntimeException($why); }
$input=[
  'provider_verified'=>true,'safe_sale_reference'=>'abcdef012345',
  'gross_toman'=>1000000,'author_toman'=>700000,
  'talent_fund_toman'=>300000,'operating_reserve_toman'=>70000,
  'buyer_name'=>'PRIVATE BUYER SHOULD NOT APPEAR',
  'buyer_email'=>'buyer-private-example@example.invalid',
  'raw_gateway_trans_id'=>'SECRET TRANSACTION DO NOT INCLUDE'
];
$t=jrPublishingAuthorSaleNotice($input,'سید محراب میرکریمی');
a(str_contains($t['body'],'700,000'),'author share missing');
a(str_contains($t['body'],'300,000'),'talent fund share missing');
a(str_contains($t['body'],'70,000'),'independent cost missing');
a(str_contains($t['body'],'تسویه بانکی انجام‌شده نیست'),'settlement disclaimer missing');
a(!str_contains($t['body'],$input['buyer_name']),'buyer name leaked');
a(!str_contains($t['body'],$input['buyer_email']),'buyer email leaked');
a(!str_contains($t['body'],$input['raw_gateway_trans_id']),'gateway id leaked');
$negative=$input;$negative['provider_verified']=false;
try { jrPublishingAuthorSaleNotice($negative,'مؤلف'); throw new RuntimeException('unverified payment accepted'); }
catch(DomainException $e){}
$negative=$input;$negative['operating_reserve_toman']=65000;
try { jrPublishingAuthorSaleNotice($negative,'مؤلف'); throw new RuntimeException('bad reserve accepted'); }
catch(InvalidArgumentException $e){}
$negative=$input;$negative['author_toman']=700000;
try { jrPublishingAuthorSaleNotice($negative,'مؤلف'); throw new RuntimeException('bad gross share accepted'); }
catch(InvalidArgumentException $e){}
echo "JR author email: privacy and banking-template assertions PASS; SMTP NOT SENT.\n";
