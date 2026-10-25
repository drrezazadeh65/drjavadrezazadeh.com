<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * JREI independent negative-only PHP response integrity boundary.
 * A valid response here is NOT scientific acceptance. Keep the Bertina
 * source evidence gate as the final independent publication decision.
 */
function jrJreiNumeralAscii(string $text): string {
    return strtr($text,[
      '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4',
      '۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
      '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4',
      '٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9'
    ]);
}
/** Exact arithmetic syntax only; this is not a general expression evaluator. */
function jrJreiSimpleArithmeticExpected(string $question): ?string {
    if(strlen($question)>400)return null;
    $q=trim(jrJreiNumeralAscii($question));
    $x=null;$y=null;$operator=null;
    if(preg_match('/^([0-9]{1,8})\s*([×*+÷\/−-])\s*([0-9]{1,8})\s*(?:=\s*\?)?[.؟?!]*$/uD',$q,$m)===1){
        $x=(int)$m[1];$y=(int)$m[3];$operator=$m[2];
    }elseif(preg_match('/^(?:عدد\s*)?([0-9]{1,8})\s*را\s*در\s*([0-9]{1,8})\s*ضرب\s*(?:کن|کنید)(?:\s*و\s*نتیجه\s*را\s*فقط\s*با\s*رقم\s*بنویس)?[.؟!]*$/uD',$q,$m)===1){
        $x=(int)$m[1];$y=(int)$m[2];$operator='×';
    }elseif(preg_match('/^what is ([0-9]{1,8}) (times|multiplied by|divided by) ([0-9]{1,8})\?\s*(?:respond with the number only\.?)?$/iD',$q,$m)===1){
        $x=(int)$m[1];$y=(int)$m[3];
        $operator=$m[2]==='divided by'?'/':'×';
    }else return null;
    if($x>10000000||$y>10000000)return null;
    if($operator==='×'||$operator==='*')$result=$x*$y;
    elseif($operator==='+')$result=$x+$y;
    elseif($operator==='−'||$operator==='-')$result=$x-$y;
    elseif($operator==='/'||$operator==='÷'){
        if($y===0||$x%$y!==0)return null;
        $result=intdiv($x,$y);
    }else return null;
    if(abs($result)>1000000000)return null;
    return (string)$result;
}
function jrJreiLocalDraftIntegrityFailure(string $question,string $answer,string $lang): ?string {
    if(!in_array($lang,['fa','en'],true)||strlen($question)>2400||
       trim($answer)===''||strlen($answer)>4000)
        return 'INVALID_DRAFT_SIZE';
    if(preg_match('/<\\/?think(?:\\s|>)/i',$answer)===1)
        return 'INTERNAL_THINKING_LEAK';
    if($lang==='fa'&&preg_match('/[\x{3400}-\x{9FFF}\x{F900}-\x{FAFF}]/u',$answer)===1)
        return 'FOREIGN_CJK_SCRIPT_INTRUSION';
    // Independently reject the demonstrated incorrect Persian
    // psychometric definition; don't pretend a dictionary proves science.
    if($lang==='fa'&&str_contains($question,'روایی')&&
       str_contains($question,'پایایی')&&
       preg_match('/روایی.{0,40}(?:سرعت|اثربخشی\s+اطلاعات)/u',$answer)===1)
        return 'INVALID_PERSIAN_VALIDITY_DEFINITION';
    if(preg_match('/(?:قبولی\s*(?:شما|قطعی|تضمینی)|رتبه\s*قطعی|guaranteed\s+admission)/iu',$answer)===1)
        return 'UNVERIFIED_ADMISSION_GUARANTEE';
    $exact=jrJreiSimpleArithmeticExpected($question);
    if($exact!==null&&trim(jrJreiNumeralAscii($answer))!==$exact)
        return 'WRONG_DETERMINISTIC_ARITHMETIC';
    return null; // no negative finding, NOT permission to publish
}
