<?php
declare(strict_types=1);
// Pure isolated tests. No database, gateway, uploads, private server path,
// customers or real documents touched.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/service-files.php';
function cfg(): array {return ['auth_pepper'=>str_repeat('synthetic-example-no-production-key-',3)];}
function validUuid(string $id): bool {
    return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i',$id)===1;
}
function validEmail(string $email): bool {return filter_var($email,FILTER_VALIDATE_EMAIL)!==false;}
function stage9SchemaReady(PDO $pdo): bool {return false;}
function uuidv4(): string {return 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';}

function pass(bool $condition,string $name): void {
    if(!$condition)throw new RuntimeException('service_file_test_failed_'.$name);
    echo "PASS ".$name."\n";
}
function fails(callable $task,string $name): void {
    try{$task();throw new RuntimeException('unexpected_acceptance_'.$name);}
    catch(Throwable $e){
        if(str_starts_with($e->getMessage(),'unexpected_acceptance_'))throw $e;
        pass($e instanceof InvalidArgumentException||$e instanceof RuntimeException,$name);
    }
}
$order='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
$sku='service:academic_editing';
$plain="%PDF-1.7\n".str_repeat('Synthetic fixture scientific report - ',25);
$sealed=jrServiceFileEncrypt($plain,$order,$sku);
pass($sealed!==$plain && str_starts_with($sealed,'JRSF1'),'encrypts_with_versioned_aead_envelope');
pass(jrServiceFileDecrypt($sealed,$order,$sku)===$plain,'round_trip_correct_paid_case');
fails(fn()=>jrServiceFileDecrypt($sealed,$other,$sku),'cannot_decrypt_another_customers_order');
fails(fn()=>jrServiceFileDecrypt($sealed,$order,'service:other'),'cannot_decrypt_different_service');
$tampered=$sealed;
$tampered[strlen($tampered)-2]=chr(ord($tampered[strlen($tampered)-2])^1);
fails(fn()=>jrServiceFileDecrypt($tampered,$order,$sku),'tampered_ciphertext_rejected');
fails(fn()=>jrServiceFileDecrypt(substr($sealed,0,18),$order,$sku),'truncated_ciphertext_rejected');
fails(fn()=>jrServiceFileReference($order,'service:../../../../secret'),'malicious_sku_rejected');
$tmp=tempnam(sys_get_temp_dir(),'jr-pdf-');
if($tmp===false)throw new RuntimeException('temp_fixture_failed');
try{
    file_put_contents($tmp,$plain);
    pass(jrServiceFileCheckFormat('sample.pdf',$tmp)[0]==='pdf','valid_simple_pdf_detected');
    fails(fn()=>jrServiceFileCheckFormat('sample.docx',$tmp),'renamed_pdf_not_accepted_as_docx');
    fails(fn()=>jrServiceFileCheckFormat('secret.php',$tmp),'executable_extension_rejected');
}finally{@unlink($tmp);}

/**
 * Read the literal production PCRE expressions (not a hand-copied regex)
 * so an escaping mistake in source cannot silently make every valid
 * 12 MiB upload and every 48-hex .blob filename impossible.
 */
function serviceSourceRegexes(string $filename): array {
    $source=file_get_contents(__DIR__.'/../api/'.$filename);
    if(!is_string($source))throw new RuntimeException('php_source_unavailable');
    $all=[];$cursor=0;$needle="preg_match('";
    while(($pos=strpos($source,$needle,$cursor))!==false){
        $begin=$pos+strlen($needle);
        $end=strpos($source,"'",$begin);
        if($end===false)throw new RuntimeException('broken_source_regex_literal');
        $all[]=substr($source,$begin,$end-$begin);
        $cursor=$end+1;
    }
    return $all;
}
$sourcePatterns=serviceSourceRegexes('service-files.php');
$uploadPattern=$sourcePatterns[0]??'';
pass(@preg_match($uploadPattern,'12M')===1
    &&@preg_match($uploadPattern,'16M')===1
    &&@preg_match($uploadPattern,'2K')===1
    &&@preg_match($uploadPattern,'12mb')===0,
    'production_source_php_regexes_accept_real_upload_values');
$blob='a'.str_repeat('b',47).'.blob';
foreach(['service-files.php','operations-service-delivery.php',
    'service-buyer-receipt.php'] as $filename){
    $regexes=array_filter(serviceSourceRegexes($filename),
        static fn(string $pattern): bool => str_contains($pattern,'.blob'));
    pass(count($regexes)>0,'production_has_sealed_name_checks_'.basename($filename,'.php'));
    foreach($regexes as $pattern){
        pass(@preg_match($pattern,$blob)===1
            &&@preg_match($pattern,$blob.'.txt')===0
            &&@preg_match($pattern,'other/../'.$blob)===0,
            'production_filename_pcre_accepts_exact_hex_blob_'.basename($filename,'.php'));
    }
}

echo "Secure service file crypto tests: synthetic only; no real content or release verified.\n";
