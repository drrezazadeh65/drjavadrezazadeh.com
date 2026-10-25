<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require dirname(__DIR__).'/api/jrei-local-answer-integrity.php';
require dirname(__DIR__).'/api/jrei-local-quality-telemetry.php';

$cases=[
  ['عدد ۱۲ را در ۷ ضرب کن و نتیجه را فقط با رقم بنویس.','84'],
  ['۱۲ × ۷','84'],
  ['١٢ + ٧','19'],
  ['what is 36 divided by 6?','6'],
  ['12 / 0',null],
  ['12 / 7',null],
  ['100000000 × 100000000',null],
  ['12 × 7; run shell',null],
];
foreach($cases as [$question,$expected]){
    if(jrJreiSimpleArithmeticExpected($question)!==$expected)
        throw new RuntimeException('REGRESSION_MATH_EXACT_VALUE');
}
if(jrJreiLocalDraftIntegrityFailure(
  'عدد ۱۲ را در ۷ ضرب کن و نتیجه را فقط با رقم بنویس.',
  '۴۸','fa')!=='WRONG_DETERMINISTIC_ARITHMETIC')
    throw new RuntimeException('REGRESSION_QWEN_MATH_MISMATCH_NOT_BLOCKED');
if(jrJreiLocalDraftIntegrityFailure(
  'عدد ۱۲ را در ۷ ضرب کن و نتیجه را فقط با رقم بنویس.',
  '۸۴','fa')!==null)
    throw new RuntimeException('REGRESSION_CORRECT_MATH_REJECTED');
if(jrJreiLocalDraftIntegrityFailure(
  'روایی و پایایی چه تفاوتی دارند؟',
  'روایی به سرعت و اثربخشی اطلاعات اشاره دارد.',
  'fa')!=='INVALID_PERSIAN_VALIDITY_DEFINITION')
    throw new RuntimeException('REGRESSION_PSYCHOMETRIC_FLAW_NOT_BLOCKED');
if(jrJreiLocalDraftIntegrityFailure('معنی این واژه چیست؟',
  'پاسخ ترکیبی به 汉语 و فارسی','fa')!=='FOREIGN_CJK_SCRIPT_INTRUSION')
    throw new RuntimeException('REGRESSION_CJK_NOT_BLOCKED');
if(jrJreiLocalDraftIntegrityFailure('Please explain validity.',
  'This is a provisional general explanation only.','en')!==null)
    throw new RuntimeException('REGRESSION_BENIGN_ENGLISH_VETO');
if(jrJreiLocalDraftIntegrityFailure('What is JREI?',
  '<think>private chain</think> JREI is an assistant.','en')!==
  'INTERNAL_THINKING_LEAK')
    throw new RuntimeException('REGRESSION_THINKING_LEAK_NOT_BLOCKED');

echo "JREI model safety negative checks pass; no production data used.\n";
