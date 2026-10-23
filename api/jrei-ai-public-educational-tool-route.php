<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Deterministic and conservative PUBLIC education tool dispatcher.
 *
 * Resolves a narrow educational intent to existing REAL site pages using
 * the original public search-index, not model-generated links or learner
 * records. Never executes GOLDEN TALENT / BAHAR / RCAS psychometric scores,
 * payments, premium services, consent or private answer-key tools.
 *
 * Ambiguous/conflicting intent => return no routed tool and allow existing
 * source-grounded public index retrieval to decide normally.
 */
function jrAiPublicEducationalToolIntent(string $question): ?string {
    if(trim($question)===''||strlen($question)>2400||
       !preg_match('//u',$question))return null;
    $q=function_exists('mb_strtolower')?
        mb_strtolower($question,'UTF-8'):strtolower($question);
    $q=str_replace(['ي','ك','ى'],['ی','ک','ی'],$q);
    $patterns=[
      'GOLDEN_TALENT_INFO'=>
        '/(?:golden[\\s-]*talent|استعدادیابی|کشف\\s+استعداد|پرورش\\s+استعداد)/u',
      'BAHAR_STUDY_INFO'=>
        '/(?:\\bbahar\\b|برنامه\\s+مطالعه|مهارت\\s+مطالعه|study\\s+plan|retrieval\\s+practice)/u',
      'RCAS_REFLECTION_INFO'=>
        '/(?:\\brcas\\b|بازاندیشی\\s+آموزشی|بازاندیشی\\s+یادگیری|reflective\\s+learning)/u',
      'ACADEMIC_PATHWAY_INFO'=>
        '/(?:انتخاب\\s+رشته|مسیر\\s+تحصیلی|major\\s+selection|academic\\s+pathway)/u'
    ];
    $matched=[];
    foreach($patterns as $id=>$pattern)
        if(preg_match($pattern,$q)===1)$matched[]=$id;
    return count($matched)===1?$matched[0]:null;
}
function jrAiPublicEducationalLandingEvidence(
    string $question,string $lang): array {
    if(!in_array($lang,['fa','en'],true))return [];
    $intent=jrAiPublicEducationalToolIntent($question);
    if($intent===null)return [];
    $allowed=[
      'GOLDEN_TALENT_INFO'=>[
        'fa'=>['fa/golden-talent/','fa/golden-talent/ravesh-shenasi/'],
        'en'=>['en/golden-talent/','en/golden-talent/methodology/']],
      'BAHAR_STUDY_INFO'=>[
        'fa'=>['fa/bahar/'],'en'=>['en/bahar/']],
      'RCAS_REFLECTION_INFO'=>[
        'fa'=>['fa/rcas/'],'en'=>['en/rcas/']],
      'ACADEMIC_PATHWAY_INFO'=>[
        'fa'=>['fa/masir-man/','fa/entekhab-reshteh/'],
        'en'=>['en/services/field_selection_standard/']]
    ];
    $paths=$allowed[$intent][$lang]??[];
    $file=dirname(__DIR__).'/assets/search-index.json';
    if(!$paths||!is_file($file)||!is_readable($file)||
       filesize($file)>1000000)return [];
    $bytes=file_get_contents($file);
    if(!is_string($bytes)||strlen($bytes)>1000000)return [];
    try{$index=json_decode($bytes,true,24,JSON_THROW_ON_ERROR);}
    catch(Throwable $e){return [];}
    if(!is_array($index)||!array_is_list($index)||
       count($index)>2200)return [];
    $found=[];$seen=[];
    foreach($index as $row){
        if(!is_array($row)||($row['lang']??null)!==$lang||
           !in_array($row['path']??null,$paths,true)||
           isset($seen[$row['path']]))continue;
        $title=$row['title']??null;
        $summary=$row['summary']??null;
        if(!is_string($title)||trim($title)===''||strlen($title)>180||
           !is_string($summary)||trim($summary)===''||
           strlen($summary)>700)continue;
        $path=(string)$row['path'];
        // A stale/unshipped index entry is NOT a navigable tool.
        $public=dirname(__DIR__).'/'.$path.'index.html';
        if(!is_file($public)||!is_readable($public))continue;
        $seen[$path]=true;
        $found[$path]=['title'=>$title,'summary'=>$summary,
          'url'=>'/'.$path];
    }
    if(!isset($found[$paths[0]]))return [];
    $evidence=[];
    foreach($paths as $path){
        if(!isset($found[$path]))continue;
        $entry=$found[$path];
        $entry['id']='S'.(count($evidence)+1);
        $evidence[]=$entry;
    }
    return $evidence;
}

/** Live file/index presence hints, NOT a model, a student score or QA PASS. */
function jrAiOwnerEducationalToolReadiness(): array {
    $root=dirname(__DIR__);
    $pages=[
      'GOLDEN_TALENT_INFO'=>['fa/golden-talent/','en/golden-talent/'],
      'BAHAR_STUDY_INFO'=>['fa/bahar/','en/bahar/'],
      'RCAS_REFLECTION_INFO'=>['fa/rcas/','en/rcas/'],
      'ACADEMIC_PATHWAY_INFO'=>[
          'fa/masir-man/','en/services/field_selection_standard/']
    ];
    $out=['schema'=>'jr.jrei.educational-tool-routing-readiness.v1',
      'mode'=>'PUBLIC_INFORMATION_NAVIGATION_ONLY',
      'indexPresent'=>is_file($root.'/assets/search-index.json'),
      'routes'=>[],
      'privateLearnerDataAccessEnabled'=>false,
      'assessmentExecutionEnabled'=>false,
      'researchScaleValidationEstablished'=>false,
      'liveModelToolInvocationDemonstrated'=>false];
    foreach($pages as $code=>$pair){
        $out['routes'][]=[
          'code'=>$code,
          'persianPagePresent'=>is_file($root.'/'.$pair[0].'index.html'),
          'englishPagePresent'=>is_file($root.'/'.$pair[1].'index.html'),
          'automatedScoringOrAdviceAuthorized'=>false
        ];
    }
    return $out;
}
