<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Non-citation gate ONLY for introductory/general conversational explanations
 * for which the published JREI index has no relevant site evidence.
 * A structurally safe output is NOT a fact-checked answer. Never let the
 * browser mistake this for approved evidence, assessment or real-time facts.
 */
function jrAiPublicUncitedAnswerGate(string $answer,string $lang): array {
    $blocked=static fn(string $reason): array=>[
        'state'=>'BLOCKED','publiclyRenderable'=>false,
        'reason'=>$reason,'usedSourceIds'=>[],
        'independentScientificValidation'=>false
    ];
    if(!in_array($lang,['fa','en'],true)||
       strlen($answer)<12||strlen($answer)>3200||
       preg_match('//u',$answer)!==1||
       preg_match('/\S/u',$answer)!==1)
        return $blocked('INVALID_GENERAL_EXPLANATION');
    if(preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$answer)||
       preg_match('~(?:https?://|www\.|(?:javascript|data):)~i',$answer)||
       preg_match('/\[[Ss][1-4]\]/',$answer))
        return $blocked('UNVERIFIED_LINK_OR_CITATION');
    if(preg_match('/(?:sk-[A-Za-z0-9_-]{12,}|-----BEGIN.*PRIVATE KEY-----)/',
             $answer)||
       preg_match('/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu',$answer)||
       preg_match('/(?:\d[\s-]*){13,19}/u',$answer))
        return $blocked('POTENTIAL_PERSONAL_OR_SECRET_MATERIAL');
    if(preg_match('/(?:به احتمال \d|رتبه شما|قبولی تضمینی|guaranteed admission|your percentile|your IQ)/iu',
          $answer))
        return $blocked('UNSUPPORTED_HIGH_STAKES_PREDICTION');
    return [
        'state'=>'GENERAL_UNCITED_PROVISIONAL',
        'publiclyRenderable'=>true,'usedSourceIds'=>[],
        'scientificFactsIndependentlyVerified'=>false,
        'independentScientificValidation'=>false,
        'requiresExpertReviewForConsequentialAnswers'=>true
    ];
}
