<?php
declare(strict_types=1);
/**
 * SOURCE-ONLY cases reserved for final owner-authorized acceptance.
 * Never executed in the code-only phase; no CMS write, DB, image generation
 * or licence approval is implied by these synthetic renderer fixtures.
 */
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/platform/news-intelligence/php/verified-news-page-render.php';
function sourceContractRequire(bool $condition,string $message):void{
    if(!$condition)throw new RuntimeException($message);
}
$source='https://example.edu/official/notice';
$base=[
  'schema'=>'jr.jrei.news-owner-editorial-payload.v1',
  'routeProposal'=>[
    'schema'=>'jr.jrei.news-bilingual-proposed-routes.v1',
    'faPath'=>'/fa/akhbar/verified-test/',
    'enPath'=>'/en/news-insights/verified-test/'
  ],
  'internalLinks'=>[],
  'imageAssetReference'=>''
];
foreach(['fa','en'] as $lang){
  $base[$lang]=[
    'language'=>$lang,'sourceUrl'=>$source,
    'headline'=>$lang==='fa'?'اطلاعیه رسمی آموزشی':'Official educational notice',
    'summary'=>$lang==='fa'?'خلاصه اطلاعیه منبع معتبر':'Summary of the official source',
    'body'=>$lang==='fa'?'متن اطلاعیه دارای شواهد':'Evidence-grounded announcement text',
    'nextSteps'=>$lang==='fa'?'مراجعه به اطلاعیه منبع اصلی':'Consult the original source',
    'description'=>$lang==='fa'?'اطلاعیه آموزشی مستند از منبع اصلی':'Source-backed educational announcement'
  ];
}
$ctx=[
  'source'=>'ORIGINAL_AUTHENTICATED_CMS',
  'originalNewsroomReleaseAccepted'=>true,
  'currentOfficialEvidenceAndClaimsReviewed'=>true,
  'mediaRightsVerified'=>true,
  'verifiedOriginalCmsPolicy'=>true,
  'verifiedTextOnly'=>true,
  'verifiedImageRef'=>'',
  'originalSourceUrl'=>$source
];
$raw=json_encode($base,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
$sha=hash('sha256',$raw);
foreach(['fa','en'] as $lang){
  $result=jrNewsOriginalPublicNewsHtml($raw,$sha,$ctx,$lang,1793376000);
  $html=$result['html'];
  sourceContractRequire(!str_contains($html,'<figure>'),
      'text_first_must_not_claim_documentary_image');
  sourceContractRequire(!str_contains($html,'og:image'),
      'text_first_must_not_fabricate_social_image');
  sourceContractRequire(str_contains($html,'https://example.edu/official/notice'),
      'verified_original_source_citation_missing');
  sourceContractRequire(str_contains($html,'hreflang='),
      'bilingual_canonical_metadata_missing');
}
$ctx['verifiedTextOnly']=false;
try{
  jrNewsOriginalPublicNewsHtml($raw,$sha,$ctx,'en',1793376000);
  throw new RuntimeException('missing_explicit_text_first_authority_was_accepted');
}catch(RuntimeException $e){
  sourceContractRequire($e->getMessage()==='news_verified_html_media_invalid',
      'wrong_missing_visual_policy_result');
}
echo "SOURCE RENDER CONTRACT CASES PASSED; NOT A PUBLICATION RECEIPT\n";
