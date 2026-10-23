<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Bounded, DNS-pinned, same-origin robots-aware HTTPS source transport.
 * ONLY preapproved DB-resolved URLs reach here; none are visitor-supplied.
 * Does NOT write a file, publish material, generate an answer or mark a job.
 */
function jrKaApprovedHttpsUrl(string $url): array {
    if(strlen($url)<12||strlen($url)>650||
       preg_match('/[\x00-\x20\x7f\\\\]/',$url)||str_contains($url,'#'))
        throw new DomainException('ka_invalid_url');
    $p=parse_url($url);
    if(!is_array($p)||($p['scheme']??'')!=='https'||
       empty($p['host'])||isset($p['user'])||isset($p['pass'])||
       isset($p['fragment'])||isset($p['port'])&&$p['port']!==443)
        throw new DomainException('ka_https_only');
    $host=(string)$p['host'];
    if(strlen($host)>253||!preg_match('/^[a-z0-9.-]+$/D',$host)||
       $host!==strtolower($host)||!str_contains($host,'.')||
       str_starts_with($host,'.')||str_ends_with($host,'.')||
       filter_var($host,FILTER_VALIDATE_IP)||
       preg_match('/(?:^|\.)(?:localhost|local|internal|invalid|test|example)$/D',$host))
        throw new DomainException('ka_host_invalid');
    $path=(string)($p['path']??'/');
    if($path==='')$path='/';
    if(!str_starts_with($path,'/')||strlen($path)>450||
       preg_match('~(?:^|/)\.\.(?:/|$)~',$path))
        throw new DomainException('ka_path_invalid');
    $query=isset($p['query'])?'?'.$p['query']:'';
    if(strlen($query)>190)throw new DomainException('ka_query_too_long');
    return [$host,$path.$query];
}
function jrKaSafePublicIpv4(string $ip): bool {
    if(!filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4|
        FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE))return false;
    $parts=array_map('intval',explode('.',$ip));[$a,$b,$c]=$parts;
    if($a===0||$a===10||$a===127||$a>=224||
       $a===100&&$b>=64&&$b<=127||
       $a===169&&$b===254||
       $a===172&&$b>=16&&$b<=31||
       $a===192&&($b===0||$b===168||$b===88&&$c===99||
          $b===31||$b===52)||$a===198&&($b===18||$b===19||
          $b===51&&$c===100)||$a===203&&$b===0&&$c===113)
        return false;
    return true;
}
function jrKaPinnedPublicIpv4(string $host): string {
    $entries=dns_get_record($host,DNS_A);
    if(!is_array($entries)||count($entries)<1||count($entries)>20)
        throw new DomainException('ka_dns_unavailable');
    $ips=[];
    foreach($entries as $entry){
        if(!is_array($entry)||!is_string($entry['ip']??null)||
           !jrKaSafePublicIpv4($entry['ip']))
            throw new DomainException('ka_dns_not_public');
        $ips[]=$entry['ip'];
    }
    return $ips[0];
}
function jrKaPinnedGet(string $url,int $maximumBytes,
    array $allowedMime=['application/pdf','text/html','text/plain',
      'application/json']): array {
    if(!function_exists('curl_init')||
       $maximumBytes<1||$maximumBytes>8388608)
        throw new DomainException('ka_transport_not_available');
    [$host,$path]=jrKaApprovedHttpsUrl($url);
    $ip=jrKaPinnedPublicIpv4($host);
    $handle=curl_init($url);
    if($handle===false)throw new DomainException('ka_curl_unavailable');
    $bytes='';$mime=null;$declared=null;$overflow=false;
    $encoding='identity';
    $write=static function($ch,string $chunk) use (&$bytes,
       &$overflow,$maximumBytes): int {
        if(strlen($bytes)+strlen($chunk)>$maximumBytes){
            $overflow=true;return 0;
        }
        $bytes.=$chunk;
        return strlen($chunk);
    };
    $headers=static function($ch,string $line) use (&$mime,&$declared,&$encoding): int {
        $text=trim($line);
        if(stripos($text,'content-type:')===0)
            $mime=strtolower(trim(explode(';',substr($text,13),2)[0]));
        if(stripos($text,'content-length:')===0)
            $declared=trim(substr($text,15));
        if(stripos($text,'content-encoding:')===0)
            $encoding=strtolower(trim(substr($text,17)));
        return strlen($line);
    };
    curl_setopt_array($handle,[
      CURLOPT_HTTPGET=>true,
      CURLOPT_FOLLOWLOCATION=>false,
      CURLOPT_MAXREDIRS=>0,
      CURLOPT_CONNECTTIMEOUT=>5,
      CURLOPT_TIMEOUT=>20,
      CURLOPT_SSL_VERIFYPEER=>true,
      CURLOPT_SSL_VERIFYHOST=>2,
      CURLOPT_IPRESOLVE=>CURL_IPRESOLVE_V4,
      CURLOPT_RESOLVE=>[$host.':443:'.$ip],
      CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
      CURLOPT_PROXY=>'',
      CURLOPT_USERAGENT=>'JREI-ReviewedSourceIntake/1.0',
      CURLOPT_HTTPHEADER=>[
        'Accept: application/pdf,text/html,text/plain,application/json',
        'Accept-Encoding: identity'
      ],
      CURLOPT_WRITEFUNCTION=>$write,
      CURLOPT_HEADERFUNCTION=>$headers
    ]);
    try{
        $success=curl_exec($handle);
        $status=(int)curl_getinfo($handle,CURLINFO_RESPONSE_CODE);
        $tls=(string)curl_getinfo($handle,CURLINFO_EFFECTIVE_URL);
    }finally{curl_close($handle);}
    if($success===false||$overflow||$status!==200||
       $tls!==$url||$bytes===''||
       $encoding!=='identity'||
       !in_array($mime,$allowedMime,true)||
       $declared!==null&&(!ctype_digit($declared)||
         (int)$declared!==strlen($bytes)))
        throw new DomainException('ka_fetch_rejected_or_incomplete');
    return ['bytes'=>$bytes,'mime'=>$mime,'ip'=>$ip,
       'byteCount'=>strlen($bytes),'status'=>200];
}

/** RFC9309-inspired conservative parser. Unsupported directives fail closed. */
function jrKaRobotsDecision(string $content,string $requestPath): array {
    if(strlen($content)>131072||!preg_match('//u',$content)||
       !str_starts_with($requestPath,'/'))
        throw new DomainException('ka_robots_unreadable');
    $groups=[];$agents=[];$rules=[];$inRules=false;
    $flush=static function() use (&$groups,&$agents,&$rules,&$inRules): void {
        if($agents)$groups[]=['agents'=>$agents,'rules'=>$rules];
        $agents=[];$rules=[];$inRules=false;
    };
    foreach(preg_split('/\r?\n/',$content) as $raw){
        $row=trim(explode('#',$raw,2)[0]);
        if($row===''){if($inRules)$flush();continue;}
        $p=strpos($row,':');
        if($p===false)continue;
        $key=strtolower(trim(substr($row,0,$p)));
        $value=trim(substr($row,$p+1));
        if($key==='user-agent'){
            if($inRules)$flush();
            if($value!=='')$agents[]=strtolower($value);
        }elseif(in_array($key,['allow','disallow','crawl-delay'],true)&&$agents){
            $inRules=true;
            if(strlen($value)>1000)throw new DomainException('ka_robots_rule_long');
            if($key==='crawl-delay'){
                if(!is_numeric($value)||(float)$value<0||
                   (float)$value>3600)
                    throw new DomainException('ka_robots_delay_invalid');
                $rules[]=['delay'=>(int)ceil((float)$value)];
            }elseif($value!=='')$rules[]=['allow'=>$key==='allow','path'=>$value];
        }
    }
    $flush();
    $target='jrei-reviewedsourceintake';
    $best=0;
    foreach($groups as $g)foreach($g['agents'] as $agent)
      if($agent!=='*'&&str_starts_with($target,$agent))
        $best=max($best,strlen($agent));
    $selected=[];
    foreach($groups as $g)foreach($g['agents'] as $agent)
      if($best>0&&$agent!=='*'&&strlen($agent)===$best&&str_starts_with($target,$agent)||
         $best===0&&$agent==='*'){$selected[]=$g;break;}
    $result=null;$longest=-1;$delay=0;
    foreach($selected as $group)foreach($group['rules'] as $rule){
        if(isset($rule['delay'])){$delay=max($delay,$rule['delay']);continue;}
        $pattern=$rule['path'];
        if(!str_starts_with($pattern,'/'))
            throw new DomainException('ka_robots_unsupported_rule');
        $end=str_ends_with($pattern,'$');
        if($end)$pattern=substr($pattern,0,-1);
        $regexp='~^'.str_replace('\*','.*',
            preg_quote($pattern,'~')).($end?'$':'').'~';
        if(preg_match($regexp,$requestPath)){
            $strength=strlen(str_replace('*','',$pattern));
            if($strength>$longest||$strength===$longest&&$rule['allow']){
                $result=$rule['allow'];$longest=$strength;
            }
        }
    }
    return ['allowed'=>$result!==false,'delaySeconds'=>$delay];
}
