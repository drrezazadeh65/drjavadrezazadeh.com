<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Conservative public-navigation model-output gate.
 *
 * A marker is NOT a semantic entailment proof. This gate only establishes
 * bounded, original-server source identities, non-synthetic hyperlinks,
 * limited numerical assertions, and explicit provisional wording.
 * Science/learning assessment must pass a DIFFERENT expert-evidence gate.
 */
function jrAiPublicAnswerGate(string $answer,array $sources,string $lang): array {
    $deny=static fn(string $reason): array=>[
      'state'=>'BLOCKED','publiclyRenderable'=>false,
      'reason'=>$reason,'independentScientificValidation'=>false
    ];
    if(!in_array($lang,['fa','en'],true)||strlen($answer)<12||
       strlen($answer)>4000||!preg_match('/\S/u',$answer))
        return $deny('INVALID_ANSWER_LENGTH');
    if(preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$answer)||
       preg_match('~(?:https?://|www\.|(?:javascript|data):)~i',$answer))
        return $deny('UNCONTROLLED_MODEL_LINK');
    if(preg_match('/(?:sk-[A-Za-z0-9_-]{12,}|-----BEGIN.*PRIVATE KEY-----)/',
        $answer)||preg_match('/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu',$answer))
        return $deny('PERSONAL_OR_SECRET_MATERIAL');
    if(preg_match('/(?:\d[\s-]*){13,19}/u',$answer))
        return $deny('POTENTIAL_FINANCIAL_OR_PERSONAL_IDENTIFIER');
    if(preg_match('/(?:به احتمال \d|رتبه شما|قبولی تضمینی|guaranteed admission|your percentile|your IQ)/iu',
         $answer))
        return $deny('UNSUPPORTED_HIGH_STAKES_PREDICTION');
    $known=[];$eligibleNums=[];
    foreach($sources as $source){
        if(!is_array($source)||!preg_match('/^S[1-4]$/D',(string)($source['id']??''))||
           !is_string($source['title']??null)||
           !is_string($source['summary']??null))
            return $deny('SOURCE_PROVENANCE_UNKNOWN');
        if(isset($known[$source['id']]))return $deny('DUPLICATE_SOURCE_ID');
        $known[$source['id']]=$source;
        preg_match_all('/[0-9۰-۹٠-٩]+(?:[.,٫٬][0-9۰-۹٠-٩]+)*/u',
          $source['title'].' '.$source['summary'],$numbers);
        foreach($numbers[0]??[] as $num)$eligibleNums[jrAiNormalNumber($num)]=true;
    }
    $ids=[];
    preg_match_all('/\[([A-Za-z0-9_-]{1,12})\]/',$answer,$matches);
    foreach($matches[1]??[] as $sourceId){
        if(!isset($known[$sourceId]))return $deny('UNRECOGNISED_CITATION');
        $ids[$sourceId]=true;
    }
    if(!$ids)return $deny('UNSOURCED_MODEL_ANSWER');
    // New numerical assertions cannot be justified by attaching a random
    // citation. Use only numeric strings already in the selected summaries.
    // The numeric suffix in [S1] is a source ID, never a numeric claim.
    $numericText=preg_replace('/\[S[1-4]\]/','',$answer);
    preg_match_all('/[0-9۰-۹٠-٩]+(?:[.,٫٬][0-9۰-۹٠-٩]+)*/u',$numericText,$nums);
    foreach($nums[0]??[] as $num){
        if(!isset($eligibleNums[jrAiNormalNumber($num)]))
            return $deny('UNSUPPORTED_NUMERIC_ASSERTION');
    }
    // Avoid paragraphs that attach a citation only at the end of an
    // unrelated text block; this remains a structural check, not NLI.
    $blocks=preg_split('/\R{2,}/u',trim($answer));
    if(count($blocks)>5)return $deny('TOO_MANY_UNREVIEWED_PARAGRAPHS');
    foreach($blocks as $block){
        if((function_exists('mb_strlen')?mb_strlen($block,'UTF-8'):strlen($block))>1100)
            return $deny('UNBOUNDED_UNCITED_EXPLANATION');
        if(!preg_match('/\[S[1-4]\]/',$block))
            return $deny('PARAGRAPH_WITHOUT_CITATION');
    }
    return [
       'state'=>'STRUCTURAL_EVIDENCE_ONLY',
       'publiclyRenderable'=>true,
       'usedSourceIds'=>array_keys($ids),
       'modelClaimsSemanticallyEntailed'=>false,
       'independentScientificValidation'=>false,
       'requiresExpertReviewForConsequentialAnswers'=>true
    ];
}
function jrAiNormalNumber(string $number): string {
    return strtr($number,[
      '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5',
      '۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
      '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4',
      '٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
      '٫'=>'.','٬'=>','
    ]);
}
