<?php
declare(strict_types=1);
/** Offline, no SMTP, website requests, accounts or production SQL. */
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/php/news-library.php';
require_once dirname(__DIR__).'/php/original-api-http-adapter.php';
require_once dirname(__DIR__).'/php/original-cron-adapter.php';
function newsCheck(bool $ok,string $message): void {
    if(!$ok)throw new RuntimeException('News offline regression: '.$message);
}
function newsThrows(callable $fn,string $label): void {
    try{$fn();}catch(Throwable){return;}
    throw new RuntimeException('Expected rejection: '.$label);
}
newsCheck(jrNewsTopicValid('SCHOOL'),'school topic');
newsCheck(!jrNewsTopicValid('NONEXISTENT'),'reject unknown topic');
newsCheck(jrNewsDigestValid('DAILY'),'daily digest');
newsCheck(jrNewsExistingEcoCompatibilityCapabilities()['examReminderSenderAvailable']===false,
    'do not fabricate live reminder SMTP');
newsCheck(jrNewsSourceCapabilities()['sourceOnly']===true,'staged source flags');
newsCheck(jrNewsOriginalRequestBody('GET',[],['q'=>'کنکور'],null)['q']==='کنکور',
    'unicode search query preserved');
newsThrows(static fn()=>jrNewsOriginalRequestBody(
    'GET',[],['q'=>'abc','isOwner'=>'1'],null),'forged query owner field');
newsThrows(static fn()=>jrNewsOriginalRequestBody(
    'POST',['CONTENT_TYPE'=>'text/plain'],[], '{"x":1}'),'forged JSON mime');
newsThrows(static fn()=>jrNewsPrepareOriginalApiContext(
    'POST','/news/v1/owner/decision',['HTTP_ORIGIN'=>'https://evil.example'],
    static fn()=>[],static fn()=>[],
    static fn()=>[]),'external origin rejected before authority');
newsThrows(static fn()=>jrNewsOwnerAuthority([
    'source'=>'EXISTING_OPERATIONS_SESSION','ownerAuthenticated'=>true,
    'mfaVerified'=>false,'csrfVerified'=>true,
    'scope'=>'JREI_NEWS_EDITORIAL']),'owner requires MFA');
newsThrows(static fn()=>jrNewsComposeVerifiedDigestEmail(
    [],[],[],'fa','https://drjavadrezazadeh.com/api/newsletter/unsubscribe',time()),
    'unauthorized newsletter compose');
newsThrows(static fn()=>jrNewsComposeVerifiedExamReminder(
    [],[],[],'fa',time()),'unauthorized exam reminder compose');
newsCheck(jrNewsFeedPublicUrl(
    'https://university.example.edu/news/article',
    'university.example.edu')!==null,'approved HTTPS origin');
newsCheck(jrNewsFeedPublicUrl(
    'http://university.example.edu/news/article',
    'university.example.edu')===null,'reject HTTP downgrade');
newsCheck(jrNewsFeedPublicUrl(
    'https://evil.example/news/article',
    'university.example.edu')===null,'reject off-domain URL');
$feed='<?xml version="1.0" encoding="UTF-8"?>'.
    '<rss version="2.0"><channel><title>Official University</title>'.
    '<item><title>New entrance exam registration is open</title>'.
    '<link>https://university.example.edu/news/notice-1</link>'.
    '<pubDate>Fri, 23 Oct 2026 10:00:00 GMT</pubDate></item>'.
    '</channel></rss>';
$items=jrNewsParseApprovedFeed($feed,'application/rss+xml',
    'university.example.edu','source-authoritative-1',
    '2026-10-24T05:00:00Z');
newsCheck($items['candidateCount']===1,'valid RSS item extracted');
newsCheck($items['publicPublicationAllowed']===false,'metadata never public');
newsThrows(static fn()=>jrNewsParseApprovedFeed(
    '<!DOCTYPE root [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'.
    $feed,'application/rss+xml','university.example.edu',
    'source-authoritative-1','2026-10-24T05:00:00Z'),
    'RSS XXE safely rejected');

$source=[
    'source'=>'ORIGINAL_JREI_PRIVATE_SOURCE_REGISTRY',
    'registryState'=>'AUTHORITATIVE_REVIEWED',
    'issuerIdentityVerified'=>true,
    'notRevoked'=>true,'exactSourceUrlApproved'=>true,
    'rightsForPublicNews'=>true,'termsAndRobotsCurrent'=>true
];
$hash=hash('sha256','synthetic official JREI evidence');
$evidence=[
    'source'=>'ORIGINAL_JREI_VERIFIED_ARTICLE_EVIDENCE',
    'currentIssuerEvidence'=>true,'verifiedContentSha256'=>$hash,
    'claimsMatchPrimaryNotice'=>true,'noMaterialContradictions'=>true
];
$editorial=[
    'source'=>'ORIGINAL_JREI_EDITORIAL_QA',
    'bilingualComplete'=>true,'authorVoiceQualityPassed'=>true,
    'newsGuidanceComplete'=>true,'internalLinksChecked'=>true,
    'seoAndCanonicalChecked'=>true,'imageRightsCurrent'=>true,
    'assistantContextGrounded'=>true
];
$publisher=[
    'source'=>'ORIGINAL_AUTHENTICATED_CMS_POLICY',
    'originalCmsConnected'=>true,'exactRoutesCollisionFree'=>true,
    'authenticatedPublishReceiptSupported'=>true
];
$official=jrNewsOfficialPublicationDecision(
    ['evidenceSha256'=>$hash],$source,$evidence,$editorial,$publisher);
newsCheck($official['decision']==='ELIGIBLE_FOR_AUTOMATED_CMS_HANDOFF'&&
    $official['humanPerArticleApprovalRequired']===false&&
    $official['published']===false,
    'verified official story only enters original CMS proposal');
$uncertain=jrNewsOfficialPublicationDecision(
    ['evidenceSha256'=>$hash],$source,
    array_replace($evidence,['noMaterialContradictions'=>false]),
    $editorial,$publisher);
newsCheck($uncertain['decision']==='OWNER_EXCEPTION_QUEUE'&&
    $uncertain['humanPerArticleApprovalRequired']===true,
    'uncertain official claim requires owner review');
$offline=jrNewsOfficialPublicationDecision(
    ['evidenceSha256'=>$hash],$source,$evidence,$editorial,
    array_replace($publisher,['originalCmsConnected'=>false]));
newsCheck($offline['decision']==='SYSTEM_HOLD'&&
    $offline['humanPerArticleApprovalRequired']===false,
    'CMS outage must not create suspicious-news owner work');
$spoof=jrNewsOfficialPublicationDecision(
    ['evidenceSha256'=>$hash],
    array_replace($source,['source'=>'BROWSER_SUBMITTED_TRUST']),$evidence,
    $editorial,$publisher);
newsCheck($spoof['decision']==='OWNER_EXCEPTION_QUEUE',
    'browser-trusted source cannot authorize automatic publication');
echo "PASS: PHP official auto-handoff versus owner exception and system hold\\n";
echo "PASS: isolated news PHP input, authority, feed and consent contracts\n";

$directory=jrNewsOfficialInstitutionDirectory();
newsCheck(count($directory)>=9,'expected official institution bootstrap catalogue');
$sanjesh=jrNewsOfficialDirectoryMatch('https://www.sanjesh.org/news/example');
newsCheck(($sanjesh['institutionId']??null)==='sanjesh'&&
    $sanjesh['robotsOrRightsGranted']===false&&
    $sanjesh['actualUrlDownloadedOrVerified']===false,
    'official host discovered but does not automatically obtain publishing rights');
$pnu=jrNewsOfficialDirectoryMatch('https://pnu.ac.ir/news/item');
newsCheck(($pnu['institutionId']??null)==='pnu',
    'Payame Noor exact official host identified');
foreach([
    'https://sanjesh.org.evil.example/notice',
    'https://evil.example/sanjesh.org',
    'http://www.sanjesh.org/notice',
    'https://www.sanjesh.org@evil.example/notice',
    'https://user:pass@sanjesh.org/notice',
    'https://api.pnu.ac.ir/notice',
    'https://uast.ac.ir.evil.test/notice',
    'https://127.0.0.1/notice',
    'https://www.sanjesh.org:8443/notice',
    'https://www.sanjesh.org/notice#fragment',
    'https://www.sanjesh.org/notice'.chr(10)
] as $lookalike)
    newsCheck(jrNewsOfficialDirectoryMatch($lookalike)===null,
        'spoofed or unreviewed subdomain cannot inherit institutional trust');
echo "PASS: nine official institution discovery targets, lookalike rejection and no fabricated reuse rights\\n";
