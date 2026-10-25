<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * One-owner-policy, native Bertina backup for the original mother database.
 *
 * No web route, network backup upload, Windows drive access, arbitrary shell,
 * model-generated commands, public file, credential log or parallel DB.
 * Called by the explicitly owner-enabled CLI schema caretaker only.
 * Requires the host to provide a vetted local mariadb-dump/mysqldump binary.
 */
function jrJreiPrivateBackupHome(): string {
    $site=realpath(dirname(__DIR__));
    if($site===false)throw new DomainException('jrei_backup_site_root_unavailable');
    $home=realpath(dirname($site));
    if($home===false||$home==='/'||$home===$site||
       !is_dir($home)||!is_writable($home))
        throw new DomainException('jrei_backup_private_home_unavailable');
    return $home;
}
function jrJreiPrivateBackupDirectory(): string {
    $home=jrJreiPrivateBackupHome();
    $dir=$home.DIRECTORY_SEPARATOR.'jrei-private-mother-backups';
    if(is_link($dir))throw new DomainException('jrei_backup_symlink_forbidden');
    if(!is_dir($dir)&&!@mkdir($dir,0700,false)&&!is_dir($dir))
        throw new DomainException('jrei_backup_private_directory_unavailable');
    $real=realpath($dir);
    if($real===false||dirname($real)!==$home||is_link($dir)||
       !is_dir($real)||!is_writable($real))
        throw new DomainException('jrei_backup_private_directory_invalid');
    // Never use a writable-by-others backup directory.
    $mode=@fileperms($real);
    if(!is_int($mode)||($mode&0077)!==0)
        throw new DomainException('jrei_backup_private_directory_permissions');
    return $real;
}
function jrJreiPrivateBackupClient(): string {
    foreach(['/usr/bin/mariadb-dump','/usr/bin/mysqldump',
             '/usr/local/bin/mariadb-dump','/usr/local/bin/mysqldump'] as $file){
        if(is_file($file)&&!is_link($file)&&is_executable($file))
            return $file;
    }
    throw new DomainException('jrei_backup_native_dump_unavailable');
}
function jrJreiPrivateBackupConnection(array $cfg): array {
    $dsn=$cfg['db_dsn']??null;
    $user=$cfg['db_user']??null;
    $pass=$cfg['db_password']??null;
    if(!is_string($dsn)||!str_starts_with($dsn,'mysql:')||
       !is_string($user)||$user===''||strlen($user)>128||
       !is_string($pass)||strlen($pass)>512||
       strpbrk($user,"\r\n\0")!==false||
       strpbrk($pass,"\r\n\0")!==false)
        throw new DomainException('jrei_backup_private_db_config_missing');
    $kv=[];
    foreach(explode(';',substr($dsn,6)) as $entry){
        if($entry==='')continue;
        $parts=explode('=',$entry,2);
        if(count($parts)!==2||!preg_match('/^[a-z_]+$/D',$parts[0]))
            throw new DomainException('jrei_backup_private_dsn_invalid');
        $kv[$parts[0]]=$parts[1];
    }
    if(($kv['dbname']??null)!=='drjavad1_store')
        throw new DomainException('jrei_backup_wrong_database');
    $host=$kv['host']??'localhost';
    if(!in_array($host,['localhost','127.0.0.1','::1'],true))
        throw new DomainException('jrei_backup_nonlocal_db_disallowed');
    $port=$kv['port']??'3306';
    if(!preg_match('/^[0-9]{2,5}$/D',$port)||
       (int)$port<1||(int)$port>65535)
        throw new DomainException('jrei_backup_invalid_local_db_port');
    if(isset($kv['unix_socket'])&&$kv['unix_socket']!=='')
        throw new DomainException('jrei_backup_socket_requires_separate_review');
    return ['host'=>$host,'port'=>$port,'user'=>$user,'pass'=>$pass];
}
function jrJreiPrivateBackupCreate(PDO $pdo,array $cfg): array {
    if(PHP_SAPI!=='cli'||($cfg['jrei_local_schema_caretaker_enabled']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true)
        throw new DomainException('jrei_backup_cli_owner_policy_required');
    if(!function_exists('proc_open'))
        throw new DomainException('jrei_backup_process_unavailable');
    if($pdo->query('SELECT DATABASE()')->fetchColumn()!=='drjavad1_store')
        throw new DomainException('jrei_backup_wrong_database');
    $details=jrJreiPrivateBackupConnection($cfg);
    $binary=jrJreiPrivateBackupClient();
    $dir=jrJreiPrivateBackupDirectory();
    $originalUmask=umask(0077);
    $passwordFile=null;
    $partial=null;
    try {
        $stamp=gmdate('Ymd_His');
        $nonce=bin2hex(random_bytes(8));
        $prefix='jrei-mother-'.$stamp.'-'.$nonce;
        $passwordFile=$dir.DIRECTORY_SEPARATOR.$prefix.'.cnf';
        $partial=$dir.DIRECTORY_SEPARATOR.$prefix.'.partial';
        $final=$dir.DIRECTORY_SEPARATOR.$prefix.'.sql';
        // Option-file quoting prevents command-line credential exposure.
        // The file is mode 0600 in a mode 0700 owner-private directory.
        $quoted=static fn(string $x):string=>
            '"'.str_replace(['\\','"'],['\\\\','\\"'],$x).'"';
        $option="[client]\n".
            "user=".$quoted($details['user'])."\n".
            "password=".$quoted($details['pass'])."\n".
            "host=".$quoted($details['host'])."\n".
            "port=".$quoted($details['port'])."\n";
        $f=@fopen($passwordFile,'x');
        if($f===false)throw new DomainException('jrei_backup_credentials_file_unavailable');
        try{
            @chmod($passwordFile,0600);
            if(fwrite($f,$option)!==strlen($option))
                throw new DomainException('jrei_backup_credentials_file_unavailable');
        }finally{fclose($f);}
        $backup=@fopen($partial,'x');
        if($backup===false)throw new DomainException('jrei_backup_output_unavailable');
        fclose($backup);
        @chmod($partial,0600);
        // proc_open argv array avoids shell expansion. No arbitrary command,
        // paths, flags or database name can come from Windows/model/HTTP.
        $cmd=[$binary,'--defaults-extra-file='.$passwordFile,
            '--single-transaction','--quick','--skip-lock-tables',
            '--no-tablespaces','--hex-blob','--default-character-set=utf8mb4',
            '--triggers','--databases','drjavad1_store'];
        $spec=[
          0=>['file','/dev/null','r'],
          1=>['file',$partial,'w'],
          2=>['pipe','w']
        ];
        $pipes=[];
        $process=@proc_open($cmd,$spec,$pipes,$dir,null,['bypass_shell'=>true]);
        if(!is_resource($process))
            throw new DomainException('jrei_backup_process_unavailable');
        // Do not log stderr: the database client may include host/account info.
        if(isset($pipes[2])&&is_resource($pipes[2])){
            stream_get_contents($pipes[2],8192);
            fclose($pipes[2]);
        }
        $exit=proc_close($process);
        if($exit!==0)throw new DomainException('jrei_backup_native_dump_failed');
        clearstatcache(true,$partial);
        $size=filesize($partial);
        if(!is_int($size)||$size<65536||$size>10737418240)
            throw new DomainException('jrei_backup_dump_size_unacceptable');
        $digest=hash_file('sha256',$partial);
        if(!is_string($digest)||!preg_match('/^[a-f0-9]{64}$/D',$digest))
            throw new DomainException('jrei_backup_digest_failed');
        // Check the tool produced an SQL archive with mother DB declaration,
        // not an empty/error message. Not proof of an actual restore.
        $head=@file_get_contents($partial,false,null,0,4096);
        if(!is_string($head)||
           !str_contains($head,'drjavad1_store'))
            throw new DomainException('jrei_backup_dump_header_unrecognized');
        if(!@rename($partial,$final))
            throw new DomainException('jrei_backup_private_commit_failed');
        $partial=null;
        @chmod($final,0600);
        return [
          'jrei_local_schema_backup_file'=>$final,
          'jrei_local_schema_backup_sha256'=>$digest
        ];
    }finally{
        if($passwordFile!==null&&is_file($passwordFile))
            @unlink($passwordFile);
        if($partial!==null&&is_file($partial))@unlink($partial);
        umask($originalUmask);
    }
}
