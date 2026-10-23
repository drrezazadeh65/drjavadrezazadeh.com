<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * JREI genuine cloud model adapter. This performs an ACTUAL outbound HTTPS
 * OpenAI Responses API inference only after explicit server-side opt-in,
 * keyed credential, approved configured model, and conservative DB quota
 * reservation. A ChatGPT subscription is not an API credential.
 *
 * The return value is NEVER an independent proof that model output is true.
 * Caller must attach authentic server-selected sources and disclose limits.
 */
function jrAiCloudConfigured(array $c): bool {
    $key=(string)($c['jrei_ai_openai_key']??'');
    $model=(string)($c['jrei_ai_openai_model']??'');
    return ($c['jrei_live_ai_enabled']??false)===true &&
      function_exists('curl_init') &&
      preg_match('/^[a-zA-Z0-9._-]{3,90}$/D',$model)===1 &&
      strlen($key)>=24 && strlen($key)<=512 &&
      !preg_match('/[\r\n]/',$key) &&
      is_int($c['jrei_ai_daily_call_limit']??null) &&
      $c['jrei_ai_daily_call_limit']>0 &&
      $c['jrei_ai_daily_call_limit']<=200 &&
      is_int($c['jrei_ai_daily_input_limit']??null) &&
      $c['jrei_ai_daily_input_limit']>=1000 &&
      $c['jrei_ai_daily_input_limit']<=1000000 &&
      is_int($c['jrei_ai_daily_output_limit']??null) &&
      $c['jrei_ai_daily_output_limit']>=500 &&
      $c['jrei_ai_daily_output_limit']<=1000000;
}

/** Source-independent, conservative budget: reserve before billable send. */
function jrAiReserveOpenAiBudget(PDO $pdo,array $c,int $inputTokens,int $outputTokens): bool {
    if(!jrAiCloudConfigured($c)||
       $inputTokens<1||$inputTokens>12000||
       $outputTokens<32||$outputTokens>800)return false;
    $day=gmdate('Y-m-d');$at=time();
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("INSERT IGNORE INTO jrei_ai_daily_budget
           (quota_date,provider_code,updated_at) VALUES (?,'OPENAI',?)");
        $q->execute([$day,$at]);
        $q=$pdo->prepare("SELECT reserved_calls,reserved_input_tokens,
            reserved_output_tokens FROM jrei_ai_daily_budget
            WHERE quota_date=? AND provider_code='OPENAI' FOR UPDATE");
        $q->execute([$day]);$r=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($r)||
           (int)$r['reserved_calls']+1>$c['jrei_ai_daily_call_limit']||
           (int)$r['reserved_input_tokens']+$inputTokens>$c['jrei_ai_daily_input_limit']||
           (int)$r['reserved_output_tokens']+$outputTokens>$c['jrei_ai_daily_output_limit']){
            $pdo->commit();return false;
        }
        $q=$pdo->prepare("UPDATE jrei_ai_daily_budget SET
           reserved_calls=reserved_calls+1,
           reserved_input_tokens=reserved_input_tokens+?,
           reserved_output_tokens=reserved_output_tokens+?,
           updated_at=?
           WHERE quota_date=? AND provider_code='OPENAI'");
        $q->execute([$inputTokens,$outputTokens,$at,$day]);
        if($q->rowCount()!==1)
            throw new DomainException('ai_budget_reservation_race');
        $pdo->commit();return true;
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrAiBudgetSourceReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT quota_date,reserved_calls,reserved_input_tokens,reserved_output_tokens FROM jrei_ai_daily_budget LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}

/**
 * Actual provider call. Endpoint and request headers cannot be supplied
 * by client, source metadata or model output. Do not use provider tools
 * or automatic access to user documents in this version.
 */
function jrAiOpenAiResponses(array $cfg,array $messages,string $instructions,
    int $maxOutputTokens=240): array {
    if(!jrAiCloudConfigured($cfg))
        throw new DomainException('ai_provider_not_configured');
    if(count($messages)<1||count($messages)>10||
       strlen($instructions)<20||strlen($instructions)>12000||
       $maxOutputTokens<32||$maxOutputTokens>800)
        throw new InvalidArgumentException('ai_provider_request_invalid');
    foreach($messages as $item) {
        if(!is_array($item)||
           !in_array($item['role']??null,['user','assistant'],true)||
           !is_string($item['content']??null)||
           trim($item['content'])===''||
           strlen($item['content'])>4500)
            throw new InvalidArgumentException('ai_provider_message_invalid');
    }
    $body=json_encode([
      'model'=>$cfg['jrei_ai_openai_model'],
      'instructions'=>$instructions,
      'input'=>$messages,
      'max_output_tokens'=>$maxOutputTokens,
      'store'=>false,
      'stream'=>false,
      'tools'=>[],
      'parallel_tool_calls'=>false,
      'truncation'=>'disabled'
    ],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    if(strlen($body)>28000)throw new DomainException('ai_request_too_large');
    $url='https://api.openai.com/v1/responses';
    $curl=curl_init($url);
    if($curl===false)throw new DomainException('ai_transport_unavailable');
    $received='';$overflow=false;
    $callback=static function($handle,string $chunk) use (&$received,&$overflow): int {
        if(strlen($received)+strlen($chunk)>65536){
            $overflow=true;return 0;
        }
        $received.=$chunk;return strlen($chunk);
    };
    curl_setopt_array($curl,[
      CURLOPT_POST=>true,
      CURLOPT_POSTFIELDS=>$body,
      CURLOPT_HTTPHEADER=>[
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer '.$cfg['jrei_ai_openai_key']
      ],
      CURLOPT_FOLLOWLOCATION=>false,
      CURLOPT_MAXREDIRS=>0,
      CURLOPT_CONNECTTIMEOUT=>5,
      CURLOPT_TIMEOUT=>20,
      CURLOPT_SSL_VERIFYPEER=>true,
      CURLOPT_SSL_VERIFYHOST=>2,
      CURLOPT_WRITEFUNCTION=>$callback,
      CURLOPT_USERAGENT=>'JREI-Private-Gateway/1.0',
      CURLOPT_HTTP_VERSION=>CURL_HTTP_VERSION_1_1
    ]);
    try{
        $ok=curl_exec($curl);
        $code=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);
    }finally{
        curl_close($curl);
    }
    if($overflow||$ok===false||$code!==200)
        throw new DomainException('ai_provider_failed_or_rejected');
    $data=json_decode($received,true,32,JSON_THROW_ON_ERROR);
    if(!is_array($data)||($data['status']??null)!=='completed'||
       !is_array($data['output']??null))
        throw new DomainException('ai_provider_output_incomplete');
    $parts=[];
    foreach($data['output'] as $item){
        if(!is_array($item)||($item['type']??null)!=='message'||
           ($item['role']??null)!=='assistant'||!is_array($item['content']??null))
            continue;
        foreach($item['content'] as $segment){
            if(is_array($segment)&&($segment['type']??null)==='output_text'&&
               is_string($segment['text']??null))$parts[]=$segment['text'];
        }
    }
    $text=trim(implode("\n",$parts));
    if($text===''||strlen($text)>10000)
        throw new DomainException('ai_provider_response_unusable');
    $usage=is_array($data['usage']??null)?$data['usage']:[];
    return [
      'schema'=>'jr.jrei.live-model-output.v1',
      'provider'=>'OPENAI_RESPONSES',
      'model'=>(string)$cfg['jrei_ai_openai_model'],
      'text'=>$text,
      'inputTokens'=>is_int($usage['input_tokens']??null)?$usage['input_tokens']:null,
      'outputTokens'=>is_int($usage['output_tokens']??null)?$usage['output_tokens']:null,
      'providerOutputUnverified'=>true,
      'providerApplicationStorageRequested'=>false,
      'externalToolsUsed'=>false
    ];
}
