<?php
declare(strict_types=1);
// JREI Konkur/academic exams: deterministic synthetic scoring regression.
// No real learner, copyrighted item, AI provider, Windows node, host or DB.
define('BERTINA_API_BOOTSTRAPPED',true);
function validUuid(string $id): bool {
    return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/D',$id)===1;
}
require_once dirname(__DIR__).'/api/jrei-exam-deterministic-scoring.php';
function verify(bool $ok,string $message): void {
    if(!$ok){fwrite(STDERR,"FAIL: $message\n");exit(1);}
}
$scoreModel='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$id1='11111111-1111-4111-8111-111111111111';
$id2='22222222-2222-4222-8222-222222222222';
$id3='33333333-3333-4333-8333-333333333333';
$good='44444444-4444-4444-8444-444444444444';
$wrong='55555555-5555-4555-8555-555555555555';
$allowed=[$good,$wrong];
$policy=jrExamMcqPolicyFingerprint($scoreModel,1000,333,0);
$context=[
  'schema'=>'jr.jrei.reviewed-mcq-context.v1',
  'instrumentVersionId'=>'66666666-6666-4666-8666-666666666666',
  'scoringModelId'=>$scoreModel,'policySha256'=>$policy,
  'correctMillipoints'=>1000,'incorrectPenaltyMillipoints'=>333,
  'unansweredMillipoints'=>0,
  'items'=>[
    ['itemId'=>$id1,'correctOptionId'=>$good,'allowedOptionIds'=>$allowed],
    ['itemId'=>$id2,'correctOptionId'=>$wrong,'allowedOptionIds'=>$allowed],
    ['itemId'=>$id3,'correctOptionId'=>$good,'allowedOptionIds'=>$allowed]
  ]
];
$answers=[$id1=>$good,$id2=>$good];
$a=jrExamDeterministicRawGrade($context,$answers);
$b=jrExamDeterministicRawGrade($context,$answers);
verify($a===$b,'repeatable scoring output changes between identical calls');
verify($a['questionCount']===3&&$a['correctCount']===1&&
  $a['incorrectCount']===1&&$a['unansweredCount']===1,
  'correct, incorrect and unanswered categories must match original keys');
verify($a['rawScoreMillipoints']===667&&$a['maximumMillipoints']===3000,
  'integer millipoint penalty or exact maximum changed');
verify($a['percentile']===null&&$a['admissionProbability']===null&&
  $a['automaticPublicationAuthorized']===false&&
  $a['psychometricValidationEstablished']===false,
  'raw performance cannot be marketed as percentile, admission or validated science');
try{
  jrExamDeterministicRawGrade($context,[$id1=>'77777777-7777-4777-8777-777777777777']);
  verify(false,'unpublished option must be rejected');
}catch(InvalidArgumentException $expected){}
try{
  jrExamDeterministicRawGrade($context,
    ['88888888-8888-4888-8888-888888888888'=>$good]);
  verify(false,'non-instrument question must be rejected');
}catch(InvalidArgumentException $expected){}
echo "JREI Konkur exact deterministic no-provider preliminary scoring PASS\n";
