<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/operations-alerts.php';

/**
 * CLI-only Apache/LiteSpeed access-log observer, separate from public traffic.
 * Never retains IPs, user-agent, query strings, authentication tokens or
 * POST content. Registered public 404 routes are SEO triage candidates, not
 * automatically approved redirects. Does not change .htaccess.
 */
function operationsHttpRoute(string $value): ?array {
    if(strlen($value)>1024||!str_starts_with($value,'/')||str_contains($value,'\\'))return null;
    $path=parse_url($value,PHP_URL_PATH);
    if(!is_string($path)||!str_starts_with($path,'/'))return null;
    // Preserve valid historical Persian slugs, but exclude tokens, user identifiers,
    // unsafe escapes and excessively long or private routes.
    $decoded=rawurldecode($path);
    if(strlen($decoded)>230||!preg_match('//u',$decoded)
        ||str_contains($decoded,'..')||str_contains($decoded,'@')
        ||str_contains($decoded,'?')||str_contains($decoded,'#')
        ||preg_match('/[\x00-\x1F\x7F]/',$decoded))return null;
    $normalized=preg_replace('#/{2,}#','/',$decoded);
    if(!is_string($normalized))return null;
    if(preg_match('#^/(?:api|fa/app|en/account|fa/customer-dashboard|fa/login|en/login|fa/register|en/register|checkout|payment|fa/shop/(?:cart|checkout|payment)|en/shop/(?:cart|checkout|payment))(/|$)#i',$normalized))
        return null;
    if(preg_match('#[A-Za-z0-9_-]{35,}#',$normalized))return null;
    $probe=(bool)preg_match('#(?:^|/)(?:wp-admin|wp-login\.php|\.git|\.env|phpmyadmin|cgi-bin|vendor|xmlrpc\.php)(?:/|$)#i',$normalized);
    return ['path'=>$normalized,'classification'=>$probe?'scanner_probe':'seo_review_candidate'];
}
function operationsHttpParse(string $line): ?array {
    if(strlen($line)>8192||!preg_match('/\[([^\]]+)\]\s+"(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\s+([^\s"]+)\s+HTTP\/[0-9.]+"\s+(\d{3})\b/',$line,$m))
        return null;
    $status=(int)$m[3];
    if($status<200||$status>599)return null;
    try{$ts=DateTimeImmutable::createFromFormat('d/M/Y:H:i:s O',$m[1]);}
    catch(Throwable $e){return null;}
    if($ts===false)return null;
    return ['status'=>$status,'at'=>$ts->getTimestamp(),'route'=>operationsHttpRoute($m[2])];
}
function operationsHttpObserverStatus(PDO $pdo,array $config): array {
    $configured=is_string($config['operations_access_log_path']??null)
        &&($config['operations_access_log_path']??'')!=='';
    $now=time();
    $view=['ok'=>true,'schema'=>'operations-http-observer-v1',
        'checkedAt'=>$now,'configured'=>$configured,
        'state'=>$configured?'schema_unavailable':'not_configured',
        'lastObservedAt'=>null,'batches'=>[],'top404Routes'=>[],
        'limits'=>'Read-only, opt-in private access logs. No IP, user agent or query stored; automatic redirects forbidden.'];
    try{
        $cursor=$pdo->query('SELECT updated_at FROM operations_http_log_cursor WHERE singleton_id=1')->fetch(PDO::FETCH_ASSOC);
        $rows=$pdo->query('SELECT observed_at,records_read,errors_404,errors_5xx FROM operations_http_observation_batches ORDER BY batch_id DESC LIMIT 24')->fetchAll(PDO::FETCH_ASSOC);
        $q=$pdo->query('SELECT route_path,classification,total_hits,last_seen_at FROM operations_http_error_routes WHERE http_status=404 ORDER BY last_seen_at DESC,total_hits DESC LIMIT 35');
        $routes=[];
        foreach($q as $r)$routes[]=[
            'route'=>$r['route_path'],'type'=>$r['classification'],
            'occurrences'=>(int)$r['total_hits'],'lastSeenAt'=>(int)$r['last_seen_at']];
        $view['state']=!$configured?'not_configured':
            ($cursor?(((int)$cursor['updated_at']>=$now-900
                &&(int)$cursor['updated_at']<=$now+60)?'observed':'stale')
                :'ready_for_first_read');
        $view['lastObservedAt']=$cursor?(int)$cursor['updated_at']:null;
        $view['batches']=array_map(static fn($r)=>[
            'at'=>(int)$r['observed_at'],'scanned'=>(int)$r['records_read'],
            'notFound'=>(int)$r['errors_404'],'serverErrors'=>(int)$r['errors_5xx']],$rows);
        $view['top404Routes']=$routes;
    }catch(Throwable $e){}
    return $view;
}
/**
 * Cursor is initialized at EOF: historic access log data must not create an
 * alert storm on installation. Subsequent runs read at most 1 MiB / 5000
 * complete log lines. No HTTP requests or emails are made by this observer.
 */
function operationsHttpObserve(PDO $pdo,string $file,int $at,int $retentionDays=90): array {
    if(PHP_SAPI!=='cli')throw new RuntimeException('cli_only');
    if($file===''||!str_starts_with($file,'/')||!is_file($file)||!is_readable($file))
        return ['status'=>'log_unavailable','lines'=>0,'errors404'=>0,'errors5xx'=>0];
    if(!in_array($retentionDays,[7,30,90,180,365],true))$retentionDays=90;
    $lock=(int)$pdo->query("SELECT GET_LOCK('drjr_http_observer_v1',0)")->fetchColumn();
    if($lock!==1)return ['status'=>'busy','lines'=>0,'errors404'=>0,'errors5xx'=>0];
    try {
        $fh=@fopen($file,'rb');if($fh===false)return ['status'=>'log_unavailable','lines'=>0,'errors404'=>0,'errors5xx'=>0];
        try{
            $stat=fstat($fh);
            if(!is_array($stat))return ['status'=>'log_unavailable','lines'=>0,'errors404'=>0,'errors5xx'=>0];
            $size=(int)$stat['size'];$inode=(string)($stat['ino']??0);
            $q=$pdo->query('SELECT log_inode,byte_offset FROM operations_http_log_cursor WHERE singleton_id=1');
            $cursor=$q->fetch(PDO::FETCH_ASSOC);
            if(!$cursor){
                $pdo->prepare('INSERT INTO operations_http_log_cursor(singleton_id,log_inode,byte_offset,updated_at) VALUES(1,?,?,?)')
                    ->execute([$inode,$size,$at]);
                return ['status'=>'initialized_at_eof','lines'=>0,'errors404'=>0,'errors5xx'=>0];
            }
            $offset=($cursor['log_inode']===$inode&&(int)$cursor['byte_offset']<=$size)
                ?(int)$cursor['byte_offset']:0;
            if(fseek($fh,$offset)!==0)return ['status'=>'read_unavailable','lines'=>0,'errors404'=>0,'errors5xx'=>0];
            $read=0;$bytes=0;$errors404=0;$errors5xx=0;$recent404=0;$recent5xx=0;$recentSeen=0;$routes=[];
            while(!feof($fh)&&$read<5000&&$bytes<1048576){
                $line=fgets($fh,8192);if($line===false)break;
                $bytes+=strlen($line);$read++;
                if(!str_ends_with($line,"\n")&&!feof($fh))continue;
                $parsed=operationsHttpParse($line);if(!$parsed)continue;
                // Count older records for history, but only records with genuine
                // timestamps in the last five minutes may raise urgent alerts.
                $current=$parsed['at']>=$at-300 && $parsed['at']<=$at+60;
                if($current)$recentSeen++;
                if($parsed['status']===404){
                    $errors404++;
                    if($current)$recent404++;
                    if($parsed['route']){
                        $key=$parsed['route']['path'].'|404';
                        if(!isset($routes[$key]))$routes[$key]=[
                            'path'=>$parsed['route']['path'],
                            'classification'=>$parsed['route']['classification'],
                            'count'=>0,'lastSeenAt'=>$parsed['at']];
                        $routes[$key]['count']++;
                        $routes[$key]['lastSeenAt']=max($routes[$key]['lastSeenAt'],$parsed['at']);
                    }
                }elseif($parsed['status']>=500){$errors5xx++;if($current)$recent5xx++;}
            }
            $end=ftell($fh);if($end===false)throw new RuntimeException('log_cursor_unavailable');
            $pdo->beginTransaction();
            try{
                $pdo->prepare('UPDATE operations_http_log_cursor SET log_inode=?,byte_offset=?,updated_at=? WHERE singleton_id=1')
                    ->execute([$inode,$end,$at]);
                $insert=$pdo->prepare('INSERT INTO operations_http_error_routes
                    (route_hash,route_path,classification,http_status,total_hits,first_seen_at,last_seen_at)
                    VALUES (?,?,?,404,?,?,?)
                    ON DUPLICATE KEY UPDATE total_hits=total_hits+VALUES(total_hits),
                    last_seen_at=GREATEST(last_seen_at,VALUES(last_seen_at))');
                foreach($routes as $value){
                    $id=hash('sha256','route-v1|'.$value['path'].'|404');
                    $insert->execute([$id,$value['path'],$value['classification'],
                        $value['count'],$value['lastSeenAt'],$value['lastSeenAt']]);
                }
                $pdo->prepare('INSERT INTO operations_http_observation_batches
                    (observed_at,records_read,errors_404,errors_5xx) VALUES(?,?,?,?)')
                    ->execute([$at,$read,$errors404,$errors5xx]);
                $pdo->prepare('DELETE FROM operations_http_observation_batches WHERE observed_at<? LIMIT 500')
                    ->execute([$at-$retentionDays*86400]);
                $pdo->prepare('DELETE FROM operations_http_error_routes WHERE last_seen_at<? LIMIT 500')
                    ->execute([$at-$retentionDays*86400]);
                $pdo->commit();
            }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
            // Only current batches can produce urgent alerts. No raw route,
            // visitor identity or logs ever enter an email.
            // Never generate an urgent email from historical logfile backlog.
            // A clean recent batch can resolve an incident, but a batch
            // consisting only of old records cannot establish recovery.
            if($recentSeen>0&&$at-(int)$cursor['updated_at']<=900){
                if($recent5xx>0)operationsAlertRecord($pdo,'http_5xx_surge','site_http_5xx',$at);
                else operationsAlertResolve($pdo,'http_5xx_surge','site_http_5xx',$at);
                if($recent404>=10)operationsAlertRecord($pdo,'http_404_surge','site_http_404',$at);
                else operationsAlertResolve($pdo,'http_404_surge','site_http_404',$at);
            }
            return ['status'=>'observed','lines'=>$read,'errors404'=>$errors404,'errors5xx'=>$errors5xx];
        }finally{fclose($fh);}
    }finally{$pdo->query("SELECT RELEASE_LOCK('drjr_http_observer_v1')");}
}
