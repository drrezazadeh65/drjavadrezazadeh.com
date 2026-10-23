<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ai-cloud-provider.php';
require_once __DIR__.'/jrei-ai-answer-guard.php';
require_once __DIR__.'/jrei-ai-provider-telemetry.php';

/**
 * Real public bilingual assistant coordinator (first narrow approved tool).
 * Uses only SERVER-side public site-index metadata for source selection.
 * Actual scientific/admission answers, private learner history, autonomous
 * crawling, payments and assessment writes are NOT authorised by this module.
 */
/**
 * Conservative first-pass personal-data filter for EVERY turn. It is not an
 * exhaustive PII classifier and should not be used to infer safe disclosure.
 * The original public UI states this limitation before external transfer.
 */
function jrAiPublicTextSensitive(string $value): bool {
    return preg_match('/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u',$value)===1||
        preg_match('/(?:\d[\s-]*){13,19}/u',$value)===1||
        preg_match('/(?:password|passcode|otp|one.time.password|گذرواژه|رمز عبور|کد ملی|شماره کارت|رمز دوم)/ui',$value)===1||
        preg_match('/(?:\b(?:IBAN|passport|national id|national identification|bank account)\b|شماره شناسنامه|گذرنامه|شبا|شناسه ملی)/ui',$value)===1;
}
function jrAiPublicIndexPath(): string {
    return dirname(__DIR__).'/assets/search-index.json';
}
function jrAiPublicEvidence(string $question,string $lang): array {
    if(!in_array($lang,['fa','en'],true)||strlen($question)>2200)
        return [];
    $file=jrAiPublicIndexPath();
    if(!is_file($file)||!is_readable($file)||filesize($file)>1000000)
        return [];
    $raw=file_get_contents($file);
    if(!is_string($raw)||strlen($raw)>1000000)return [];
    try{$rows=json_decode($raw,true,24,JSON_THROW_ON_ERROR);}
    catch(Throwable $e){return [];}
    if(!is_array($rows)||!array_is_list($rows)||count($rows)>2200)
        return [];
    $wordSet=static function(string $s): array {
        $s=function_exists('mb_strtolower')?mb_strtolower($s,'UTF-8'):strtolower($s);
        $s=str_replace(['ي','ك','ى'],['ی','ک','ی'],$s);
        $parts=preg_split('/[^\p{L}\p{N}]+/u',$s,-1,PREG_SPLIT_NO_EMPTY);
        $out=[];
        foreach($parts?:[] as $word)if((function_exists('mb_strlen')?mb_strlen($word,'UTF-8'):strlen($word))>=3)
            $out[$word]=true;
        return $out;
    };
    $wanted=$wordSet($question);
    if(!$wanted)return [];
    $candidates=[];
    foreach($rows as $row){
        if(!is_array($row)||($row['lang']??null)!==$lang)continue;
        $path=$row['path']??null;$title=$row['title']??null;
        $summary=$row['summary']??null;
        if(!is_string($path)||!is_string($title)||!is_string($summary)||
           strlen($title)>180||strlen($summary)>700||
           !preg_match('~^(?:fa|en)/[a-zA-Z0-9/_-]{0,170}$~D',$path)||
           str_contains($path,'..')||
           preg_match('~(?:^|/)(?:account|app|dashboard|checkout|payment|login|register|admin|assessments|my)(?:/|$)~i',$path))
            continue;
        $words=$wordSet($title.' '.$summary.' '.(string)($row['keywords']??''));
        $matched=count(array_intersect_key($wanted,$words));
        if($matched===0)continue;
        $rank=$matched*10;
        foreach(array_keys($wanted) as $term)
            if((function_exists('mb_stripos')?mb_stripos($title,$term,0,'UTF-8'):stripos($title,$term))!==false)$rank+=5;
        $candidates[]=['rank'=>$rank,'title'=>$title,'summary'=>$summary,
           'path'=>$path];
    }
    usort($candidates,static fn($a,$b)=>$b['rank']<=>$a['rank']?:
        strcmp($a['path'],$b['path']));
    $out=[];
    foreach(array_slice($candidates,0,4) as $i=>$row)
        $out[]=[
          'id'=>'S'.($i+1),
          'title'=>$row['title'],
          'summary'=>$row['summary'],
          'url'=>'/'.ltrim($row['path'],'/')
        ];
    return $out;
}

function jrAiPublicCanAnswer(PDO $pdo,array $cfg): bool {
    return ($cfg['jrei_public_ai_release_accepted']??false)===true&&
        jrAiCloudConfigured($cfg)&&
        jrAiBudgetSourceReady($pdo)&&
        jrAiTelemetrySchemaReady($pdo)&&
        is_file(jrAiPublicIndexPath())&&
        is_readable(jrAiPublicIndexPath());
}

/** No server transcript storage. No arbitrary user/provider tools. */
function jrAiPublicChat(PDO $pdo,array $cfg,array $body): array {
    $message=$body['message']??null;
    $lang=$body['page']['lang']??null;
    $consent=$body['providerConsent']??null;
    if($consent!==true||
       !is_string($message)||trim($message)===''||
       strlen($message)>1800||
       !in_array($lang,['fa','en'],true))
        throw new InvalidArgumentException('public_ai_message_or_consent_invalid');
    // PII defences are conservative; they do not constitute guaranteed
    // detection. The UI must explicitly disclose third-party processing.
    if(jrAiPublicTextSensitive($message))
        throw new DomainException('public_ai_possible_sensitive_information');
    $history=$body['history']??[];
    if(!is_array($history)||!array_is_list($history)||count($history)>8)
        throw new InvalidArgumentException('public_ai_history_invalid');
    $messages=[];
    foreach($history as $entry){
        if(!is_array($entry)||!in_array($entry['role']??null,
              ['user','assistant'],true)||
           !is_string($entry['content']??null)||
           trim($entry['content'])===''||strlen($entry['content'])>800)
            throw new InvalidArgumentException('public_ai_history_invalid');
        if(jrAiPublicTextSensitive($entry['content']))
            throw new DomainException('public_ai_history_contains_sensitive_information');
        $messages[]=['role'=>$entry['role'],'content'=>$entry['content']];
    }
    $messages[]=['role'=>'user','content'=>$message];
    $query=$message;
    for($i=count($history)-1;$i>=0;$i--){
        if(($history[$i]['role']??null)==='user'){
            $query.=' '.substr($history[$i]['content'],0,250);
            break;
        }
    }
    $evidence=jrAiPublicEvidence($query,$lang);
    if(!$evidence)
        throw new DomainException('public_ai_no_relevant_approved_navigation_evidence');
    $references='';
    foreach($evidence as $source)$references.='['.$source['id'].'] '.
      $source['title'].' — '.$source['summary'].' ('.$source['url'].")\n";
    $instruction=$lang==='fa'?
      'شما دستیار گفت‌وگویی دوزبانهٔ JREI هستید. پاسخ فعلی فقط راهنمایی عمومی صفحات سایت است، نه مشاورهٔ قطعی، ارزیابی علمی، تأیید مدرک، نمره، رتبه یا خدمات مالی. '.
      'فقط اطلاعات موجود در منابع عمومیِ پایین را به‌صورت محتاطانه توضیح دهید. اگر شاهد کافی ندارید، محدودیت را صریح بگویید. '.
      'در پاسخ، شناسهٔ منابع [S1] تا [S4] را دقیق استفاده کنید؛ چیزی جعل نکنید. هیچ دادهٔ خصوصی، کلید، مشخصات پرداخت یا نتیجهٔ آزمون درخواست نکنید.' :
      'You are the JREI bilingual public site-guidance assistant. Answer only from the public source summaries below. '.
      'Cite source markers [S1] to [S4] when supporting a factual claim, express uncertainty, never invent dates, fees, actual models, educational diagnoses, exam ranks or validation. '.
      'Do not claim these directory summaries are independently reviewed research evidence. Ask for no personal or payment data.';
    $instruction.="\n\nSERVER-SELECTED PUBLIC SITE SUMMARIES (NOT SCIENTIFIC CERTIFICATION):\n".$references;
    $requestBytes=strlen($instruction)+strlen(json_encode($messages,
       JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
    $inputReservation=$requestBytes+400;
    if($inputReservation>12000)
        throw new DomainException('public_ai_input_exceeds_budget');
    if(!jrAiReserveOpenAiBudget($pdo,$cfg,$inputReservation,240))
        throw new DomainException('public_ai_daily_budget_exhausted');
    $started=microtime(true);
    try{
        $response=jrAiOpenAiResponses($cfg,$messages,$instruction,240);
        $duration=(int)round((microtime(true)-$started)*1000);
        jrAiRecordProviderOutcome($pdo,(string)$cfg['jrei_ai_openai_model'],
            true,min(300000,max(0,$duration)),
            $response['inputTokens'],$response['outputTokens']);
    }catch(Throwable $providerError){
        $duration=(int)round((microtime(true)-$started)*1000);
        // The client sees a generic unavailable state; do not expose the
        // provider's raw error, secrets, model payload or personal text.
        try{
            jrAiRecordProviderOutcome($pdo,(string)$cfg['jrei_ai_openai_model'],
                false,min(300000,max(0,$duration)),null,null);
        }catch(Throwable $metricsUnavailable){}
        throw $providerError;
    }
    $text=$response['text'];
    $gate=jrAiPublicAnswerGate($text,$evidence,$lang);
    if(($gate['publiclyRenderable']??false)!==true)
        throw new DomainException('public_ai_output_evidence_or_privacy_blocked');
    // These citations are always server-selected, never model-generated
    // hyperlinks. Treat plausible prose as provisional until final QA.
    $links=array_map(static fn($r)=>['url'=>$r['url'],'label'=>$r['title']],$evidence);
    return [
      'ok'=>true,'answer'=>$text,'links'=>$links,
      'schema'=>'jr.jrei.public-assistant-model-draft.v1',
      'runtime'=>'CLOUD_MODEL_SOURCE_GUIDED',
      'sourceScope'=>'PUBLIC_SITE_SUMMARY_ONLY',
      'scientificClaimsIndependentlyVerified'=>false,
      'modelOutputVerification'=>'STRUCTURAL_CITATIONS_ONLY_NOT_SEMANTIC_PROOF',
      'validatedSourceMarkers'=>$gate['usedSourceIds'],
      'sourceCount'=>count($evidence),
      'modelProvider'=>$response['provider'],
      'usage'=>[
         'inputTokens'=>$response['inputTokens'],
         'outputTokens'=>$response['outputTokens']
      ],
      'conversationStoredByJrei'=>false,
      'providerStoreRequested'=>false,
      'privateLearnerToolsUsed'=>false
    ];
}
