<?php
declare(strict_types=1);
/**
 * Bertina private service-file readiness: CLI read-only, secrets never printed.
 * This is NOT a production release approval and does not create/alter DB rows.
 * Usage on approved host: php scripts/service-private-custody-preflight.php
 * Optional read-only database readiness: --check-db
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$root=dirname(__DIR__);
$configuration=[
    'service_files_enabled'=>getenv('JR_SERVICE_FILES_ENABLED')==='true',
    'service_private_storage'=>(string)(getenv('JR_SERVICE_PRIVATE_STORAGE')?:''),
    'service_antivirus_binary'=>(string)(getenv('JR_SERVICE_AV_BINARY')?:''),
    'public_tls_confirmed'=>getenv('JR_PUBLIC_TLS_CONFIRMED')==='true',
    'auth_pepper'=>(string)(getenv('JR_AUTH_PEPPER')?:''),
    'db_dsn'=>(string)(getenv('JR_DB_DSN')?:''),
    'db_user'=>(string)(getenv('JR_DB_USER')?:''),
    'db_password'=>(string)(getenv('JR_DB_PASSWORD')?:'')
];
$private=$root.'/api/config.local.php';
if (is_file($private)) {
    $loaded=require $private;
    if (is_array($loaded)) $configuration=array_replace($configuration,$loaded);
}
$checks=[];
$checks['featureExplicitlyEnabled']=($configuration['service_files_enabled']??false)===true;
$checks['tlsOwnerSwitchAsserted']=($configuration['public_tls_confirmed']??false)===true;
$checks['strongExistingPepper']=strlen((string)($configuration['auth_pepper']??''))>=32;
$checks['phpOpenSSL']=extension_loaded('openssl')
    &&function_exists('openssl_encrypt')&&function_exists('openssl_decrypt');
$checks['phpHKDF']=function_exists('hash_hkdf');
$checks['fileInformation']=class_exists('finfo');
$checks['docxArchive']=class_exists('ZipArchive');
$checks['privateFileLocking']=function_exists('flock');
$checks['safePHPUploadLimit']=false;
$limit=static function(string $setting): int {
    $value=trim((string)ini_get($setting));
    if(!preg_match('/^([0-9]+)([KMG])?$/iD',$value,$m))return 0;
    $number=(int)$m[1];$suffix=strtoupper((string)($m[2]??''));
    $scale=[''=>1,'K'=>1024,'M'=>1048576,'G'=>1073741824][$suffix]??0;
    return $scale>0&&$number<=intdiv(PHP_INT_MAX,$scale)?$number*$scale:0;
};
$checks['safePHPUploadLimit']=$limit('upload_max_filesize')>=12582912
    &&$limit('post_max_size')>=12582912+65536;
$memory=trim((string)ini_get('memory_limit'));
$checks['safePHPMemoryLimit']=$memory==='-1'||$limit('memory_limit')>=100663296;
$execRaw=trim((string)ini_get('max_execution_time'));
$checks['safePHPExecutionLimit']=preg_match('/^\\d+$/D',$execRaw)===1
    &&((int)$execRaw===0||(int)$execRaw>=90);
// CLI PHP can have a different INI from web PHP. This CLI check is only
// a prerequisite, not proof that the cPanel web-SAPI timeout was updated.

$dir=(string)($configuration['service_private_storage']??'');
$real=$dir!==''&&str_starts_with($dir,'/')&&!is_link($dir)?realpath($dir):false;
$www=(string)($_SERVER['DOCUMENT_ROOT']??'');
$documentRoot=$www!==''?realpath($www):false;
$outside=$real!==false&&($documentRoot===false
    ||($real!==$documentRoot&&!str_starts_with($real,$documentRoot.'/')))
    &&!str_contains($real,'/public_html/')&&!str_ends_with($real,'/public_html');
$mode=$outside?@fileperms($real):false;
$checks['privateStorageOutsideWebRoot']=$outside;
$checks['privateStoragePrivatePermissions']=$outside&&$mode!==false&&($mode&0077)===0;
$checks['privateStorageUsable']=$outside&&is_dir($real)&&is_writable($real);
$space=$outside?@disk_free_space($real):false;
$checks['privateStorageSpaceForOneJob']=$space!==false&&$space>=50331648;
$scanner=(string)($configuration['service_antivirus_binary']??'');
$checks['approvedAntiMalwareBinary']=in_array($scanner,
    ['/usr/bin/clamscan','/usr/local/bin/clamscan'],true)&&is_executable($scanner)
    &&function_exists('proc_open');
if (in_array('--check-db',$argv,true)) {
    $checks['readOnlyDatabaseSchema']=false;
    try {
        $dsn=(string)($configuration['db_dsn']??'');
        if($dsn!==''&&str_starts_with($dsn,'mysql:')){
            $pdo=new PDO($dsn,(string)($configuration['db_user']??''),
                (string)($configuration['db_password']??''),[
                    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_EMULATE_PREPARES=>false,
                    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
                ]);
            $required=[
                'commerce_service_cases'=>['order_id','sku','status'],
                'commerce_payment_claims'=>['provider','transaction_id','order_id','verified_amount'],
                'commerce_service_files'=>['id','order_id','sku','kind','consent_version','subject_is_minor','guardian_acknowledged'],
                'commerce_service_delivery_evidence'=>['order_id','sku','evidence_kind','evidence_reference_hmac'],
                'commerce_service_buyer_receipts'=>['file_id','order_id','sku','account_id','acknowledged_at']
            ];
            $valid=true;
            foreach($required as $table=>$columns){
                $q=$pdo->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?');
                $q->execute([$table]);$found=$q->fetchAll(PDO::FETCH_COLUMN);
                if(array_diff($columns,$found)!==[])$valid=false;
                $engine=$pdo->prepare('SELECT ENGINE FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?');
                $engine->execute([$table]);
                if(strcasecmp((string)$engine->fetchColumn(),'InnoDB')!==0)$valid=false;
            }
            $checks['readOnlyDatabaseSchema']=$valid;
        }
    }catch(Throwable $e){$checks['readOnlyDatabaseSchema']=false;}
}
$ready=!in_array(false,$checks,true);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'schema'=>'service-private-custody-read-only-preflight-v1',
    'status'=>$ready?'SOURCE_HOST_PREREQUISITES_MET':'BLOCKED_PREREQUISITES_MISSING',
    'checks'=>$checks,
    'customerDataAccessed'=>false,
    'filesUploaded'=>false,'databaseMutated'=>false,'paymentTested'=>false,
    'webPhpRuntimeIndependentlyVerified'=>false,
    'productionCertified'=>false,
    'next'=>'Independent staging/production acceptance and full masterplan release gate remain mandatory.'
],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
exit($ready?0:2);
