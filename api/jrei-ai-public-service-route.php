<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Deterministic first-party professional-service discovery for the real
 * OpenAI-backed site assistant. Only published page metadata is used.
 * There are NO payments, bookings, customer records, model-generated URLs,
 * inferred prices, inventory promises or unreviewed recommendations here.
 */
function jrAiServiceNormalizedQuestion(string $question): string {
    $q=function_exists('mb_strtolower')
        ?mb_strtolower($question,'UTF-8'):strtolower($question);
    return str_replace(['ي','ك','ى','‌'],['ی','ک','ی',' '],$q);
}

/**
 * Classify requests for a service, consultation or direct professional help.
 * Ordinary factual questions must not become unsolicited advertising.
 * Terms cover both Persian and English; conflicts yield the service directory.
 */
function jrAiPublicServiceIntent(string $question): ?array {
    if(trim($question)===''||strlen($question)>2400||
       !preg_match('//u',$question))return null;
    $q=jrAiServiceNormalizedQuestion($question);
    $explicit=preg_match('/(?:خدمت|خدمات|مشاور|مشاوره|رزرو|سفارش|ثبت درخواست|ثبت نام|هزینه|قیمت|کمک تخصصی|چه خدمات|کمکم کنید|راهنمایی حرفه ای|\b(?:service|services|consultation|consulting|book|booking|pricing|price|paid|hire|professional help|can you help|need help|recommend a service)\b)/iu',$q)===1;
    // Strong task-specific phrases are explicit asks even without the
    // word "service", but topical educational questions alone are not.
    $rules=[
      'field_selection_comprehensive'=>'/(?:انتخاب.{0,8}رشته.{0,12}جامع|انتخاب.{0,8}رشته.{0,20}نهایی|اولویت.{0,6}بندی.{0,10}نهایی|comprehensive.{0,18}major selection|comprehensive.{0,18}university selection)/iu',
      'golden_talent_premium'=>'/(?:golden.{0,18}talent.{0,20}premium|استعدادیابی.{0,18}جلسه.{0,12}والد|ارزیابی جامع.{0,18}گزارش.{0,12}مسیر|parent.{0,16}session.{0,16}pathway report)/iu',
      'konkur_month'=>'/(?:کنکور.{0,20}(?:یک ماه|یک ماهه|ماهانه)|برنامه.{0,16}یک ماهه.{0,12}کنکور|one.month.{0,14}(?:konkur|entrance)|month.long.{0,16}(?:exam|konkur))/iu',
      'talent_initial'=>'/(?:استعدادیابی.{0,14}اولیه|ارزیابی.{0,14}استعداد.{0,14}اولیه|initial.{0,15}talent assessment)/iu',
      'academic_consult_60'=>'/(?:مشاوره.{0,14}تخصصی.{0,14}تحصیلی|specialist.{0,16}academic consultation|academic.{0,16}consultation)/iu',
      'reviewer_response'=>'/(?:پاسخ.{0,18}داور|کامنت.{0,18}داور|داور.{0,18}پاسخ|response.{0,18}reviewer|reviewer.{0,18}(?:response|comments?))/iu',
      'academic_interview_90'=>'/(?:مصاحبه.{0,25}(?:هیات|هیئت|علمی|دانشگاه)|آمادگی.{0,15}مصاحبه|faculty.{0,20}interview|academic.{0,20}interview)/iu',
      'academic_cv'=>'/(?:رزومه|\bcv\b|اپلای|academic application|faculty application)/iu',
      'academic_editing'=>'/(?:ویرایش.{0,24}(?:انگلیسی|مقاله|پایان نامه|متن علمی)|ویراستاری|english.{0,12}edit|academic.{0,12}edit|proofread|language edit)/iu',
      'manuscript_diagnostic'=>'/(?:بازبینی.{0,18}مقاله|ارزیابی.{0,18}مقاله|نقد.{0,18}مقاله|manuscript.{0,20}(?:review|diagnos)|diagnostic.{0,12}review)/iu',
      'journal_strategy'=>'/(?:انتخاب.{0,12}مجله|مجله.{0,12}مناسب|ژورنال.{0,12}مناسب|journal.{0,16}(?:selection|strategy|fit)|where.{0,20}publish)/iu',
      'field_selection_standard'=>'/(?:انتخاب.{0,8}رشته|رشته.{0,10}دانشگاه|major.{0,12}selection|choose.{0,12}major|university.{0,12}selection)/iu',
      'konkur_consult_60'=>'/(?:کنکور|\bkonkur\b|entrance exam)/iu',
      'transcript_analysis'=>'/(?:تحلیل.{0,14}کارنامه|کارنامه.{0,14}تحلیل|academic transcript|scorecard analysis)/iu',
      'golden_talent_comprehensive'=>'/(?:golden[ -]?talent|استعدادیابی|استعداد.{0,10}فرزند|talent assessment)/iu',
      'teacher_consult_60'=>'/(?:مشکل.{0,12}تدریس|مواد.{0,10}آموزشی|مشاوره.{0,12}معلم|teacher.{0,16}(?:consult|materials|assessment))/iu',
      'teacher_dev_90'=>'/(?:توسعه.{0,8}حرفه ای.{0,10}(?:معلم|مدرس)|teacher professional development|educator development)/iu',
      'organization_consult_90'=>'/(?:مشاوره.{0,10}مدرسه|مشاوره.{0,10}سازمان|school.{0,12}consult|institutional.{0,12}consult)/iu',
      'research_consult_60'=>'/(?:روش.{0,8}پژوهش|روش.{0,8}تحقیق|روش شناسی.{0,10}پژوهش|research.{0,12}(?:method|design|consult)|پایان نامه.{0,15}مشاور)/iu',
      'specialist_workshop_120'=>'/(?:کارگاه.{0,14}آموزشی|برگزاری.{0,14}کارگاه|ورکشاپ|professional workshop|online workshop)/iu',
      'student_parent_90'=>'/(?:جلسه.{0,12}والد|دانش آموز.{0,15}والد|student.parent consultation)/iu'
    ];
    $found=[];
    foreach($rules as $code=>$pattern){
        if(preg_match($pattern,$q)===1)$found[]=$code;
    }
    if(!$found){
        return $explicit?['directoryOnly'=>true,'codes'=>[]]:null;
    }
    if(!$explicit){
        // Do not infer commercial intent merely because an article mentions
        // a major, an exam, research methods or talent generally.
        $strong=['reviewer_response','academic_interview_90',
          'academic_cv','academic_editing','manuscript_diagnostic',
          'journal_strategy','transcript_analysis'];
        $found=array_values(array_intersect($found,$strong));
        if(!$found)return null;
    }
    // If multiple competing services match, direct the learner to the
    // full directory rather than deciding their purchase for them.
    $found=array_values(array_unique($found));
    return ['directoryOnly'=>count($found)>2,'codes'=>array_slice($found,0,2)];
}

/** Output uses the existing public evidence shape and citation guard. */
function jrAiPublicServiceEvidence(string $question,string $lang): array {
    if(!in_array($lang,['fa','en'],true))return [];
    $intent=jrAiPublicServiceIntent($question);
    if($intent===null)return [];
    $file=dirname(__DIR__).'/assets/search-index.json';
    if(!is_file($file)||!is_readable($file)||filesize($file)>1000000)
        return [];
    $bytes=file_get_contents($file);
    if(!is_string($bytes)||strlen($bytes)>1000000)return [];
    try{$index=json_decode($bytes,true,24,JSON_THROW_ON_ERROR);}
    catch(Throwable $e){return [];}
    if(!is_array($index)||!array_is_list($index)||count($index)>2200)
        return [];
    $wanted=[];
    if(!$intent['directoryOnly'])
        foreach($intent['codes'] as $code)$wanted[$lang.'/services/'.$code.'/']=true;
    // Offer a neutral overview for broad, unknown and mixed needs.
    $wanted[$lang.'/services/']=true;
    $selected=[];
    foreach($index as $row){
        if(!is_array($row)||($row['lang']??null)!==$lang||
           !isset($wanted[$row['path']??'']))continue;
        $path=(string)$row['path'];
        $title=$row['title']??null;$summary=$row['summary']??null;
        if(!preg_match('~^(?:fa|en)/services/(?:[a-z0-9_]+/)?$~D',$path)||
           !is_string($title)||trim($title)===''||strlen($title)>180||
           !is_string($summary)||trim($summary)===''||strlen($summary)>700)
            continue;
        $onDisk=dirname(__DIR__).'/'.$path.'index.html';
        if(!is_file($onDisk)||!is_readable($onDisk))continue;
        $selected[$path]=['title'=>$title,'summary'=>$summary,
          'url'=>'/'.$path];
    }
    $out=[];
    // Specific user-matched service before the optional directory.
    foreach(array_keys($wanted) as $path){
        if(!isset($selected[$path]))continue;
        $item=$selected[$path];
        $item['id']='S'.(count($out)+1);
        $out[]=$item;
        if(count($out)>=3)break;
    }
    return $out;
}
