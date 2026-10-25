<?php
declare(strict_types=1);
/**
 * One-shot explicit owner-approved Bertina JREI-LM bootstrap.
 * Backs up the original mother DB under a private parent of public_html,
 * validates the real dump digest, then adds exactly three reviewed JREI
 * tables. No shell strings, inbound agent, new database, payments or public
 * chat activation. Never prints credentials, paths, SQL or private content.
 *
 * CLI: php api/internal/jrei-owner-one-shot-bootstrap.php --owner-approved
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
if(($argv[1]??'')!=='--owner-approved'||count($argv)!==2){
    fwrite(STDERR,"JREI_OWNER_APPROVAL_REQUIRED\n");exit(2);
}
umask(0077);
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-local-schema-caretaker.php';

function jreiOwnerFindDumper(): ?string {
    foreach(['/usr/bin/mariadb-dump','/usr/bin/mysqldump',
              '/bin/mariadb-dump','/bin/mysqldump'] as $path){
        if(is_file($path)&&is_executable($path))return $path;
    }
    return null;
}
function jreiOwnerDbCoordinates(string $dsn): array {
    if(!str_starts_with($dsn,'mysql:'))throw new RuntimeException('DSN_NOT_MYSQL');
    $pieces=explode(';',substr($dsn,6));$kv=[];
    foreach($pieces as $part){
        if($part==='')continue;
        $p=explode('=',$part,2);
        if(count($p)!==2||!in_array($p[0],['host','port','dbname','charset','unix_socket'],true))
            throw new RuntimeException('DSN_UNSUPPORTED');
        $kv[$p[0]]=$p[1];
    }
    if(($kv['dbname']??'')!=='drjavad1_store')
        throw new RuntimeException('WRONG_MOTHER_DB');
    $host=$kv['host']??'localhost';
    if(!preg_match('/^[A-Za-z0-9.-]{1,253}$/D',$host))
        throw new RuntimeException('DB_HOST_INVALID');
    $port=$kv['port']??'3306';
    if(!ctype_digit($port)||(int)$port<1||(int)$port>65535)
        throw new RuntimeException('DB_PORT_INVALID');
    $socket=$kv['unix_socket']??null;
    if($socket!==null&&
       (!str_starts_with($socket,'/')||strlen($socket)>300||
        preg_match('/[\r\n]/',$socket)))
        throw new RuntimeException('DB_SOCKET_INVALID');
    return ['host'=>$host,'port'=>$port,'socket'=>$socket];
}
function jreiOwnerDump(PDO $pdo,array $cfg): array {
    $exe=jreiOwnerFindDumper();
    if($exe===null||!function_exists('proc_open'))
        throw new RuntimeException('DB_DUMP_EXECUTABLE_UNAVAILABLE');
    $coords=jreiOwnerDbCoordinates((string)($cfg['db_dsn']??''));
    $user=(string)($cfg['db_user']??'');
    $password=(string)($cfg['db_password']??'');
    if($user===''||preg_match('/[\r\n]/',$user.$password))
        throw new RuntimeException('DB_BACKUP_CREDENTIALS_INVALID');
    $dbName=$pdo->query('SELECT DATABASE()')->fetchColumn();
    if($dbName!=='drjavad1_store')
        throw new RuntimeException('WRONG_MOTHER_DB');
    // The deployment document root is www/public_html, its parent is the
    // private hosting home. Never place dumps beneath the web document root.
    $site=realpath(dirname(__DIR__,2));
    $privateParent=realpath(dirname(__DIR__,3));
    if(!$site||!$privateParent||
       !str_starts_with($site,$privateParent.DIRECTORY_SEPARATOR))
        throw new RuntimeException('PRIVATE_HOME_UNAVAILABLE');
    $dir=$privateParent.'/jrei-mother-db-private-backups';
    if(!is_dir($dir)&&!mkdir($dir,0700,false))
        throw new RuntimeException('PRIVATE_BACKUP_DIRECTORY_UNAVAILABLE');
    if(is_link($dir)||!is_dir($dir)||
       realpath($dir)!==$dir||
       str_starts_with(realpath($dir),$site.DIRECTORY_SEPARATOR))
        throw new RuntimeException('PRIVATE_BACKUP_DIRECTORY_UNSAFE');
    chmod($dir,0700);
    $nonce=bin2hex(random_bytes(8));
    $options=$dir.'/.dump-'.$nonce.'.cnf';
    $backup=$dir.'/mother-'.gmdate('Ymd-His').'-'.$nonce.'.sql';
    $fh=null;
    try {
        // Escaped credentials are written to a 0600 temporary option file;
        // no passwords in process arguments or child environment.
        $escape=static fn(string $v): string=>str_replace(
            ["\\",'"',"\n","\r"],["\\\\",'\\"','\\n','\\r'],$v);
        $opts="[client]\nuser=\"".$escape($user)."\"\n".
              "password=\"".$escape($password)."\"\n";
        if($coords['socket']!==null)
            $opts.="socket=\"".$escape($coords['socket'])."\"\n";
        else
            $opts.="host=\"".$escape($coords['host'])."\"\nport=".$coords['port']."\n";
        if(file_put_contents($options,$opts,LOCK_EX)===false)
            throw new RuntimeException('PRIVATE_DUMP_OPTIONS_FAILED');
        chmod($options,0600);
        $args=[
          $exe,'--defaults-extra-file='.$options,
          '--single-transaction','--quick','--hex-blob',
          '--default-character-set=utf8mb4','--triggers',
          '--databases','drjavad1_store'
        ];
        $process=proc_open($args,
          [0=>['pipe','r'],1=>['file',$backup,'w'],2=>['file',$dir.'/.stderr-'.$nonce,'w']],
          $pipes,$privateParent,[]);
        if(!is_resource($process))throw new RuntimeException('DB_DUMP_START_FAILED');
        fclose($pipes[0]);
        $status=proc_close($process);
        if($status!==0)throw new RuntimeException('DB_DUMP_FAILED');
        chmod($backup,0600);
        clearstatcache(true,$backup);
        $size=filesize($backup);
        if(!is_int($size)||$size<65536||$size>10737418240)
            throw new RuntimeException('DB_DUMP_SIZE_OUT_OF_RANGE');
        $header=file_get_contents($backup,false,null,0,4096);
        if(!is_string($header)||
            (!str_contains($header,'MariaDB dump')&&!str_contains($header,'MySQL dump')))
            throw new RuntimeException('DB_DUMP_HEADER_INVALID');
        $hash=hash_file('sha256',$backup);
        if(!is_string($hash)||!preg_match('/^[a-f0-9]{64}$/D',$hash))
            throw new RuntimeException('DB_DUMP_DIGEST_FAILED');
        // First-party caretaker re-reads the backup, checks owner/size,
        // freshness and SHA, validates fixed DDL and takes a MySQL lock.
        return ['file'=>$backup,'sha'=>$hash,'size'=>$size];
    } catch(Throwable $e){
        if(is_file($backup))@unlink($backup);
        throw $e;
    } finally {
        if(is_file($options))@unlink($options);
        $err=$dir.'/.stderr-'.$nonce;
        if(is_file($err))@unlink($err);
    }
}
try {
    $cfg=cfg();$pdo=db();
    if(!$pdo instanceof PDO)throw new RuntimeException('MOTHER_DB_UNAVAILABLE');
    if(!jrHybridSchemaReady($pdo))
        throw new RuntimeException('EXISTING_SIGNED_WORKER_TABLES_REQUIRED');
    $backup=jreiOwnerDump($pdo,$cfg);
    // Per-invocation explicit owner approval, not a persistent toggle.
    // This does NOT enable a host Cron, public chat or arbitrary future DDL.
    $oneShot=$cfg;
    $oneShot['jrei_local_schema_caretaker_enabled']=true;
    $oneShot['operations_cron_master_enabled']=true;
    $oneShot['jrei_local_schema_backup_file']=$backup['file'];
    $oneShot['jrei_local_schema_backup_sha256']=$backup['sha'];
    $result=jrJreiLocalSchemaApply($pdo,$oneShot);
    fwrite(STDOUT,"[JREI] PRIVATE_MOTHER_DB_DUMP_CREATED_AND_SHA256_VERIFIED\n");
    fwrite(STDOUT,"[JREI] REVIEWED_ADDITIVE_TABLES_READY=".$result['expectedTables']."\n");
    fwrite(STDOUT,"[JREI] NEW_TABLES=".$result['newTables']."\n");
    fwrite(STDOUT,"[JREI] PUBLIC_CHAT_STILL_OFF\n");
    fwrite(STDOUT,"[JREI] BACKUP_RESTORE_NOT_INDEPENDENTLY_TESTED\n");
    exit(0);
}catch(Throwable $e){
    $reason=$e->getMessage();
    if(!preg_match('/^[A-Z0-9_]{4,80}$/D',$reason))$reason='OWNER_DB_BOOTSTRAP_UNAVAILABLE';
    fwrite(STDERR,"[JREI] ".$reason."\n");
    exit(1);
}
