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
echo "PASS: isolated news PHP input, authority, feed and consent contracts\n";
