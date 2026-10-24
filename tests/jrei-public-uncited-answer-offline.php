<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/api/jrei-ai-uncited-answer-guard.php';
function assertGeneral(bool $ok,string $name): void {
    if(!$ok){fwrite(STDERR,"FAIL: ".$name."\n");exit(1);}
}
$math=jrAiPublicUncitedAnswerGate('در ریاضی، حاصل جمع ۲ و ۲ برابر با ۴ است.','fa');
assertGeneral(($math['publiclyRenderable']??null)===true,
    'ordinary bilingual educational explanation is permitted');
assertGeneral(($math['state']??null)==='GENERAL_UNCITED_PROVISIONAL',
    'uncited general explanation remains provisional');
assertGeneral(($math['usedSourceIds']??null)===[],
    'generic response cannot fabricate verified citations');
$unsourced=jrAiPublicUncitedAnswerGate('According to [S1], this is proven.','en');
assertGeneral(($unsourced['publiclyRenderable']??null)===false,
    'fabricated server citations are forbidden');
$url=jrAiPublicUncitedAnswerGate('I recommend https://evil.example/pay for lessons.','en');
assertGeneral(($url['publiclyRenderable']??null)===false,
    'uncontrolled model-generated hyperlinks are forbidden');
$danger=jrAiPublicUncitedAnswerGate('قبولی تضمینی خواهید داشت و رتبه شما ۱۲۳ است.','fa');
assertGeneral(($danger['publiclyRenderable']??null)===false,
    'unverified admissions guarantees are forbidden');
assertGeneral(jrAiPublicUncitedAnswerGate("Valid text\0unsafe",'en')['publiclyRenderable']===false,
    'control characters forbidden');
assertGeneral(jrAiPublicUncitedAnswerGate('Normal text goes here.','fr')['publiclyRenderable']===false,
    'unsupported languages forbidden');
echo "JREI general uncited answer safety checks passed\n";
