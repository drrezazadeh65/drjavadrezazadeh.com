<?php
declare(strict_types=1);
// No production database, HTTP calls, API billing, visitor transcripts,
// account records or price lookups are used by this offline contract test.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/api/jrei-ai-public-service-route.php';
function verifyService(bool $condition,string $description): void {
    if(!$condition){fwrite(STDERR,"FAIL: ".$description."\n");exit(1);}
}
verifyService(jrAiPublicServiceIntent('سلام، امروز هوا چطوره؟')===null,
  'general conversation is not an advertisement');
verifyService(jrAiPublicServiceIntent('What is action research?')===null,
  'factual research question is not a service sale');
verifyService(jrAiPublicServiceIntent('روش مطالعه موثر چیست؟')===null,
  'educational study questions are not upsold');
verifyService(jrAiPublicServiceIntent('چه خدماتی ارائه می‌دهید؟')['directoryOnly']===true,
  'broad service request opens directory only');
$fa=jrAiPublicServiceEvidence('برای پاسخ به داوران مقاله خدمات دارید؟','fa');
verifyService(count($fa)>=1,'Persian reviewer-response service is discoverable');
verifyService($fa[0]['url']==='/fa/services/reviewer_response/',
  'Persian answer links directly to published reviewer service');
$en=jrAiPublicServiceEvidence('I need help with a reviewer response for my paper','en');
verifyService(count($en)>=1,'English reviewer-response service is discoverable');
verifyService($en[0]['url']==='/en/services/reviewer_response/',
  'English answer links to corresponding published service');
$editing=jrAiPublicServiceEvidence('برای ویرایش مقاله انگلیسی کمک تخصصی می‌خواهم','fa');
verifyService(($editing[0]['url']??null)==='/fa/services/academic_editing/',
  'English academic editing routes to actual Persian service page');
$major=jrAiPublicServiceEvidence('برای انتخاب رشته مشاوره می‌خواهم','fa');
verifyService(($major[0]['url']??null)==='/fa/services/field_selection_standard/',
  'major-selection consultation routes to published real service');
$general=jrAiPublicServiceEvidence('لطفا همه خدمات سایت را معرفی کنید','fa');
verifyService(count($general)===1&&$general[0]['url']==='/fa/services/',
  'broad services browsing never fabricates a service');
verifyService(jrAiPublicServiceEvidence('چه خدماتی دارید؟','fr')===[],
  'unsupported language is blocked');
foreach([$fa,$en,$editing,$major,$general] as $items)
  foreach($items as $entry){
    verifyService(preg_match('~^/(?:fa|en)/services/(?:[a-z0-9_]+/)?$~D',$entry['url'])===1,
      'recommendation must be on first-party service path');
    verifyService(preg_match('/^S[1-3]$/D',$entry['id'])===1,
      'recommendation retains source identity for answer citation gate');
    verifyService(!isset($entry['price'])&&!isset($entry['availability']),
      'recommendation does not invent prices or availability');
  }
echo "JREI bilingual service recommendation source checks passed\n";
