<?php
declare(strict_types=1);
// Local-only archive verifier. Never deploy this file to the production site.
function bxFail(string $code): never { throw new RuntimeException($code); }
function bxPath(string $name): void {
    if($name===''||str_contains($name,'\\')||str_starts_with($name,'/')||preg_match('/[\x00-\x1f\x7f]/',$name))bxFail('archive_path_invalid');
    foreach(explode('/',$name) as $part)if($part===''||$part==='.'||$part==='..')bxFail('archive_path_invalid');
}
function bxWrite(string $file,string $data): void {
    $fp=fopen($file,'x+b');if(!$fp||!chmod($file,0600))bxFail('extract_write_failed');
    try{for($at=0;$at<strlen($data);){$n=fwrite($fp,substr($data,$at));if(!$n)bxFail('extract_write_failed');$at+=$n;}if(!fflush($fp))bxFail('extract_write_failed');}
    finally{fclose($fp);}
}
function bxMain(array $argv): void {
    if(count($argv)!==5)bxFail('extract_arguments_invalid');
    [$script,$archive,$passwordFile,$envelopeFile,$out]=$argv;
    if(!class_exists('ZipArchive')||!ZipArchive::isEncryptionMethodSupported(ZipArchive::EM_AES_256,false))bxFail('zip_aes256_unavailable');
    $envelope=json_decode((string)file_get_contents($envelopeFile),true,512,JSON_THROW_ON_ERROR);
    if(!is_array($envelope)||($envelope['ok']??false)!==true||($envelope['archiveEncryption']??'')!=='ZIP-AES256-each-entry'||filesize($archive)!==($envelope['archiveBytes']??null)||!hash_equals((string)($envelope['archiveSha256']??''),(string)hash_file('sha256',$archive)))bxFail('archive_envelope_mismatch');
    $password=rtrim((string)file_get_contents($passwordFile),"\r\n");if(!preg_match('/^[a-f0-9]{64}$/',$password))bxFail('archive_password_invalid');
    if(!is_dir($out)||is_link($out)||(fileperms($out)&0777)!==0700||count(scandir($out))!==2)bxFail('extract_directory_invalid');
    $zip=new ZipArchive();if($zip->open($archive)!==true||!$zip->setPassword($password))bxFail('archive_open_failed');
    try{
        $names=[];$total=0;
        for($i=0;$i<$zip->numFiles;$i++){
            $s=$zip->statIndex($i);if(!is_array($s)||($s['encryption_method']??null)!==ZipArchive::EM_AES_256)bxFail('archive_unencrypted_entry');
            $name=(string)$s['name'];bxPath($name);if(isset($names[$name]))bxFail('archive_duplicate_entry');
            $size=$s['size']??null;if(!is_int($size)||$size<0||($total+=$size)>2147483648)bxFail('extract_size_limit');
            if($zip->getExternalAttributesIndex($i,$opsys,$attr)&&$opsys===ZipArchive::OPSYS_UNIX&&(($attr>>16)&0170000)===0120000)bxFail('archive_symlink_entry');
            $names[$name]=$size;
        }
        if(!isset($names['manifest.json'])||$names['manifest.json']>33554432)bxFail('archive_manifest_invalid');
        $raw=$zip->getFromName('manifest.json');if(!is_string($raw)||strlen($raw)!==$names['manifest.json']||!hash_equals((string)($envelope['contentManifestSha256']??''),hash('sha256',$raw)))bxFail('archive_manifest_mismatch');
        $m=json_decode($raw,true,512,JSON_THROW_ON_ERROR);
        if(!is_array($m)||($m['schema']??'')!=='bertina-private-backup-content-v1'||($m['id']??'')!==($envelope['id']??'')||!is_array($m['entries']??null)||!is_array($m['siteFiles']??null)||!is_array($m['database']['objects']??null))bxFail('archive_manifest_invalid');
        if(!hash_equals((string)($envelope['databaseDefinitionSha256']??''),hash('sha256',json_encode($m['database']['objects'],JSON_THROW_ON_ERROR))))bxFail('database_definition_hash_mismatch');
        $expected=$m['entries'];$expected['manifest.json']=['bytes'=>strlen($raw),'sha256'=>hash('sha256',$raw)];
        if(array_diff_key($names,$expected)||array_diff_key($expected,$names)||!isset($expected['database/database.sql']))bxFail('archive_entry_set_mismatch');
        if(count($m['siteFiles'])!==($envelope['fileCount']??null)||count($m['database']['objects'])!==($envelope['objectCount']??null)||count($m['database']['rowCounts']??[])!==($envelope['tableCount']??null))bxFail('archive_count_mismatch');
        $site=[];foreach($m['siteFiles'] as $name=>$entry){bxPath((string)$name);$site['site/'.$name]=true;if(($expected['site/'.$name]['bytes']??null)!==($entry['size']??null)||($expected['site/'.$name]['sha256']??null)!==($entry['sha256']??null))bxFail('site_manifest_mismatch');}
        foreach($expected as $name=>$entry){
            if($name!=='manifest.json'&&$name!=='database/database.sql'&&!isset($site[$name]))bxFail('archive_unexpected_entry');
            if(!is_array($entry)||!is_int($entry['bytes']??null)||$entry['bytes']!==$names[$name]||!preg_match('/^[a-f0-9]{64}$/',(string)($entry['sha256']??'')))bxFail('archive_entry_metadata_invalid');
            $target=$out.'/'.$name;$parent=dirname($target);if(!is_dir($parent)&&!mkdir($parent,0700,true))bxFail('extract_directory_failed');
            $stream=$zip->getStream($name);$fp=fopen($target,'x+b');if(!is_resource($stream)||!is_resource($fp)||!chmod($target,0600))bxFail('extract_stream_failed');
            $hash=hash_init('sha256');$bytes=0;
            try{while(!feof($stream)){$chunk=fread($stream,65536);if($chunk===false)bxFail('archive_decryption_failed');$bytes+=strlen($chunk);if($bytes>$entry['bytes'])bxFail('archive_entry_size_mismatch');hash_update($hash,$chunk);for($at=0;$at<strlen($chunk);){$n=fwrite($fp,substr($chunk,$at));if(!$n)bxFail('extract_write_failed');$at+=$n;}}if(!fflush($fp))bxFail('extract_write_failed');}
            finally{fclose($stream);fclose($fp);}
            if($bytes!==$entry['bytes']||!hash_equals($entry['sha256'],hash_final($hash)))bxFail('archive_entry_hash_mismatch');
        }
        echo json_encode(['ok'=>true,'allEntriesAes256'=>true,'allEntryHashesMatch'=>true,'contentManifestSha256'=>hash('sha256',$raw),'databaseDefinitionSha256'=>$envelope['databaseDefinitionSha256'],'entryCount'=>count($expected)],JSON_THROW_ON_ERROR)."\n";
    }finally{$zip->close();$password='';}
}
umask(0077);ini_set('display_errors','0');ini_set('log_errors','0');
try{bxMain($argv);}catch(Throwable $e){$code=preg_match('/^[a-z_]{3,70}$/',$e->getMessage())?$e->getMessage():'archive_verification_failed';fwrite(STDERR,json_encode(['ok'=>false,'error'=>$code])."\n");exit(1);}
