<?php
declare(strict_types=1);
// Source-only, offline discovery acceptance: NEVER makes network requests.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/api/jrei-ka-safe-discovery.php';

function jreiAssertSame($expected,$actual,$message): void {
    if($expected!==$actual){
        fwrite(STDERR,$message.' expected='.json_encode($expected).' actual='.
          json_encode($actual).PHP_EOL);
        exit(1);
    }
}
$seed='https://exam.example.org/archive/1404/index.html';
$cases=[
    ['exam.pdf','https://exam.example.org/archive/1404/exam.pdf'],
    ['./exam.pdf','https://exam.example.org/archive/1404/exam.pdf'],
    ['../1403/answers.PDF?year=1403',
      'https://exam.example.org/archive/1403/answers.PDF?year=1403'],
    ['/files/1404/دفترچه.pdf','https://exam.example.org/files/1404/دفترچه.pdf'],
    ['https://exam.example.org/public/exam.pdf',
      'https://exam.example.org/public/exam.pdf'],
    ['https://other.example.org/foreign.pdf',null],
    ['//other.example.org/foreign.pdf',null],
    ['http://exam.example.org/plain.pdf',null],
    ['javascript:alert(1)',null],
    ['../../../../outside.pdf',null],
    ['../%2e%2e/unsafe.pdf',null],
    ['files/exam.pdf#fragment',null],
    ['files/exam.pdf?token=thing', 'https://exam.example.org/archive/1404/files/exam.pdf?token=thing'],
    ['exam.html',null],
];
foreach($cases as [$href,$expected]){
    jreiAssertSame($expected,jrKaResolvePdfCandidate($seed,$href),$href);
}
$html='<a href="exam.pdf">دفترچه آزمون</a>'.
      '<a href="./exam.pdf">Duplicate</a>'.
      '<a href="../1403/answers.PDF">پاسخ‌نامه</a>'.
      '<a href="https://other.example.org/foreign.pdf">Offhost</a>'.
      '<a href="javascript:alert(1)">Unsafe</a>'.
      '<a href="exam.html">Non document</a>';
$links=jrKaDiscoverSameHostPdfLinks($seed,$html);
jreiAssertSame(2,count($links),'PDF detection and deduplication');
jreiAssertSame('دفترچه آزمون',$links[0]['label'],'Persian anchor preserved');
jreiAssertSame(hash('sha256',$links[0]['url']),
               $links[0]['sha256'],'Candidate hash');
echo "JREI safe PDF discovery: 14 URL cases and 3 HTML assertions passed; no HTTP fetch.\n";
