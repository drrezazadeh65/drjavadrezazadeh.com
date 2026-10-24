<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/api/jrei-ka-safe-discovery.php';

function assertUrls(string $html,array $expected,string $message): void {
    $found=jrKaDiscoverSameHostPdfLinks(
        'https://www.provider.example.org/archive/2026/index.html',$html);
    $actual=array_column($found,'url');
    if($actual!==$expected){
        fwrite(STDERR,$message."\nExpected: ".json_encode($expected).
          "\nActual: ".json_encode($actual)."\n");
        exit(1);
    }
    foreach($found as $row){
        if($row['sha256']!==hash('sha256',$row['url'])||
           strlen($row['label'])>220)exit(1);
    }
}
assertUrls('<a href="soal.pdf">Exam 1</a>' .
    '<a href="./answer.PDF?view=1&amp;kind=key">Key</a>' .
    '<a href="/root/other.pdf">Root</a>' .
    '<a href="https://www.provider.example.org/archive/a.pdf">Absolute</a>',[
    'https://www.provider.example.org/archive/2026/soal.pdf',
    'https://www.provider.example.org/archive/2026/answer.PDF?view=1&kind=key',
    'https://www.provider.example.org/root/other.pdf',
    'https://www.provider.example.org/archive/a.pdf'
],'Relative, root, absolute and entity-decoded links');
assertUrls('<base href="https://evil.org/">' .
    '<a href="exam.pdf">Same host only</a>' .
    '<a href="//evil.org/p.pdf">No scheme-relative</a>' .
    '<a href="https://evil.org/p.pdf">No external</a>' .
    '<a href="http://www.provider.example.org/p.pdf">No HTTP</a>' .
    '<a href="../escape.pdf">No traversal</a>' .
    '<a href="%2e%2e/escape.pdf">No encoded traversal</a>' .
    '<a href="javascript:alert(1)">No JS</a>' .
    '<a href="docs/not-pdf.html">No HTML</a>' .
    '<a href="exam.pdf#frag">No fragments</a>',[
    'https://www.provider.example.org/archive/2026/exam.pdf'
],'Reject unapproved locators');
assertUrls('<a href="soal.pdf">First</a><a href="soal.pdf">Repeated</a>',[
    'https://www.provider.example.org/archive/2026/soal.pdf'
],'Deduplicate');
$many=str_repeat('<a href="file.pdf">x</a>',4001);
assertUrls($many,[],'Fail closed on excessive HTML link count');
$many='';for($i=0;$i<60;$i++)$many.='<a href="file'.$i.'.pdf">x</a>';
if(count(jrKaDiscoverSameHostPdfLinks(
    'https://www.provider.example.org/archive/2026/index.html',$many))!==40)
    exit(1);
echo "PASS: same-host PDF discovery regression\n";
