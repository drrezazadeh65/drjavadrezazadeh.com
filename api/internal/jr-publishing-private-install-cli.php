<?php
declare(strict_types=1);
/**
 * CLI-only private PDF installer for an authorised Bertina hosting operator.
 * Does not set public purchase flags, access the bank, configure the database
 * or certify copyright/licensing. Never upload this ZIP inside public_html.
 *
 * php /path/public_html/api/internal/jr-publishing-private-install-cli.php \
 *   --archive=/home/ACCOUNT/private-inbox/JR_Publishing_PDF_Private_Server_Staging.zip \
 *   --dest=/home/ACCOUNT/jr-publishing-private \
 *   --confirm=INSTALL_VERIFIED_PRIVATE_PDFS
 */
if (PHP_SAPI!=='cli') { http_response_code(404); exit; }
$expected=[
  'tefl_1370_1405_questions.pdf'=>[
    'size'=>3660392,'sha256'=>'6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8'
  ],
  'tefl_1370_1405_answers.pdf'=>[
    'size'=>7656609,'sha256'=>'db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4'
  ]
];
function jrInstallStop(string $reason): never {
    fwrite(STDERR,"JR private PDF installer refused: ".$reason."\n");
    exit(2);
}
$args=[];
foreach(array_slice($argv,1) as $argument){
    if(!preg_match('/^--([a-z-]+)=(.+)$/D',$argument,$m))jrInstallStop('unsupported_arguments');
    if(array_key_exists($m[1],$args))jrInstallStop('duplicated_argument');
    $args[$m[1]]=$m[2];
}
if(count($args)!==3 || ($args['confirm']??'')!=='INSTALL_VERIFIED_PRIVATE_PDFS')
    jrInstallStop('explicit_operator_confirmation_required');
$from=(string)($args['archive']??'');
$to=(string)($args['dest']??'');
if(!str_starts_with($from,'/')||!str_starts_with($to,'/'))
    jrInstallStop('absolute_paths_required');
$archive=realpath($from);$dest=realpath($to);
if(!$archive || !is_file($archive)|| !is_readable($archive) ||
   !$dest || !is_dir($dest)||!is_writable($dest) || !is_readable($dest))
    jrInstallStop('private_source_or_destination_unavailable');
$webroot=realpath(dirname(__DIR__,2)); // /home/account/public_html
if(!$webroot)jrInstallStop('webroot_not_identified');
$insideWeb=static fn(string $p): bool => $p===$webroot ||
    str_starts_with($p,$webroot.DIRECTORY_SEPARATOR);
if($insideWeb($archive) || $insideWeb($dest))
    jrInstallStop('public_html_is_forbidden');
if($archive===$dest || str_contains($dest,'..'))
    jrInstallStop('invalid_private_destination');
if(!class_exists(ZipArchive::class))jrInstallStop('zip_extension_not_available');
$zip=new ZipArchive();
if($zip->open($archive,0)!==true)jrInstallStop('archive_not_readable');
$allowed=array_merge(array_keys($expected),
    ['private-asset-manifest.json','READ_ME_PRIVATE_DEPLOYMENT.txt']);
if($zip->numFiles!==count($allowed))jrInstallStop('archive_contents_not_exactly_expected');
$actual=[];
for($i=0;$i<$zip->numFiles;$i++){
    $name=$zip->getNameIndex($i);
    if(!is_string($name) || !in_array($name,$allowed,true) || isset($actual[$name]))
        jrInstallStop('unexpected_archive_member');
    $actual[$name]=true;
}
foreach($allowed as $name)if(!isset($actual[$name]))jrInstallStop('archive_missing_expected_member');
$manifest=json_decode($zip->getFromName('private-asset-manifest.json')?:'',true);
if(!is_array($manifest) || ($manifest['schema']??'')!=='jr-private-publishing-upload-v1')
    jrInstallStop('invalid_private_manifest');
// Refuse to trust the manifest as authority: verify it agrees with PINNED known hashes.
foreach($manifest['manifest']??[] as $record){
    $name=$record['private_storage_name']??'';
    if(!isset($expected[$name])||
       ($record['sha256']??null)!==$expected[$name]['sha256']||
       ($record['byte_size']??null)!==$expected[$name]['size'])
        jrInstallStop('manifest_does_not_match_pinned_assets');
}
if(count($manifest['manifest']??[])!==2)jrInstallStop('manifest_requires_two_assets');
// Phase 1: validate existing target and both ZIP streams before moving a byte.
$staged=[];$already=[];
try {
    foreach($expected as $name=>$meta){
        $target=$dest.DIRECTORY_SEPARATOR.$name;
        if(is_link($target))jrInstallStop('symlink_destination_forbidden');
        if(file_exists($target)){
            if(!is_file($target)||filesize($target)!==$meta['size']||
               !hash_equals($meta['sha256'],hash_file('sha256',$target)))
                jrInstallStop('existing_target_is_different');
            $already[]=$name;
            continue;
        }
        $entry=$zip->statName($name);
        if(!is_array($entry)||($entry['size']??null)!==$meta['size'])
            jrInstallStop('source_entry_wrong_size');
        $input=$zip->getStream($name);
        if(!is_resource($input))jrInstallStop('cannot_open_private_pdf_entry');
        $temporary=tempnam($dest,'.jr-private-stage-');
        if($temporary===false){fclose($input);jrInstallStop('private_temp_creation_failed');}
        $staged[$name]=$temporary;
        $output=fopen($temporary,'wb');
        if(!is_resource($output)){fclose($input);jrInstallStop('private_temp_write_failed');}
        $written=stream_copy_to_stream($input,$output);
        fclose($input);fclose($output);
        if($written!==$meta['size']||filesize($temporary)!==$meta['size'])
            jrInstallStop('pdf_size_mismatch');
        $fh=fopen($temporary,'rb');if(!$fh)jrInstallStop('pdf_magic_unavailable');
        $magic=fread($fh,5);fclose($fh);
        if($magic!=='%PDF-' || !hash_equals($meta['sha256'],hash_file('sha256',$temporary)))
            jrInstallStop('pdf_integrity_failure');
        if(!chmod($temporary,0640))jrInstallStop('private_file_permissions_failed');
    }
    // Phase 2: publish both verified files ONLY to an out-of-webroot directory.
    $installed=[];
    foreach($staged as $name=>$tmp){
        $target=$dest.DIRECTORY_SEPARATOR.$name;
        if(file_exists($target)||is_link($target))jrInstallStop('concurrent_asset_install_detected');
        if(!rename($tmp,$target))jrInstallStop('atomic_private_rename_failed');
        $installed[]=$target;unset($staged[$name]);
    }
    $zip->close();
    fwrite(STDOUT,"Two verified private PDFs now present; newly installed: ".count($installed)."; previously valid: ".count($already).".\n");
    fwrite(STDOUT,"NOT a commercial activation. Next: verify scan evidence, rights, schema, SMTP and bank-test.\n");
    exit(0);
}finally{
    foreach($staged as $tmp)if(is_file($tmp))@unlink($tmp);
}
