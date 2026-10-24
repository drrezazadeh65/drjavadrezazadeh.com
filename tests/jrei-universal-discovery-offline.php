<?php
declare(strict_types=1);
// Offline regression checks; no HTTP or production DB access.
define('BERTINA_API_BOOTSTRAPPED', true);
require_once dirname(__DIR__).'/api/jrei-ka-universal-discovery.php';
function check(bool $condition, string $name): void {
    if (!$condition) { fwrite(STDERR, "FAIL: ".$name."\n"); exit(1); }
}
$seed='https://example.org/exams/index.html';
check(jrKaResolveEducationalCandidate($seed,'../files/sample.docx')==='https://example.org/files/sample.docx','relative Word link');
check(jrKaResolveEducationalCandidate($seed,'https://evil.example/test.pdf')===null,'cross-host rejected');
check(jrKaResolveEducationalCandidate($seed,'javascript:alert(1)')===null,'scheme rejected');
check(jrKaResolveEducationalCandidate($seed,'../../../../escape.pdf')===null,'path traversal rejected');
if (class_exists('DOMDocument') && function_exists('mb_strlen')) {
    $html='<a href="../files/sample.docx">سؤالات آموزشی</a><a href="/slides.pptx">Slides</a><a href="https://evil.example/test.pdf">Bad</a>';
    $found=jrKaDiscoverEducationalLinks($seed,$html);
    check(count($found)===2,'multi-format discovery and unsafe-host exclusion');
    check($found[0]['state']==='DISCOVERED_REQUIRES_RIGHTS_REVIEW','no automatic authorization');
}
echo "Universal discovery offline checks passed\n";
