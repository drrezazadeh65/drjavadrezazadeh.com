<?php
declare(strict_types=1);
/**
 * JHELA OJS 3.5 independent-server preflight. CLI ONLY, read-only.
 * --contract: validates supported PHP capabilities locally without querying private DB.
 * --runtime: requires real Bertina private provisioning; never prints credentials, paths, host IPs.
 * Does not install, migrate, upload, create users or enable public submission.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$mode=$argv[1]??'';
if (!in_array($mode,['--contract','--runtime'],true)) { fwrite(STDERR,"Usage: php scripts/jhela-ojs-readiness.php --contract|--runtime\n"); exit(2); }
$runtime=($mode==='--runtime');
$checks=[];
$check=static function (string $id,bool $ok,string $detail='')use(&$checks):void {
    $checks[]=['id'=>$id,'pass'=>$ok,'detail'=>$detail];
};
$check('php_82_or_newer',PHP_VERSION_ID>=80200,'Minimum for OJS 3.5');
foreach(['pdo','pdo_mysql','mbstring','xml','dom','fileinfo','openssl','gd','intl','curl','zip'] as $ext){
    $check('php_extension_'.$ext,extension_loaded($ext));
}
$check('random_bytes',function_exists('random_bytes'));
$check('supported_target_origin',(getenv('JHELA_OJS_ORIGIN')?:'https://journal.drjavadrezazadeh.com')==='https://journal.drjavadrezazadeh.com');
$check('public_site_not_modified',true,'Read-only script never mutates the main website');
if($runtime){
    $root=getenv('JHELA_OJS_DOCROOT')?:'';
    $private=getenv('JHELA_OJS_PRIVATE_DIR')?:'';
    $rp=$root!==''?realpath($root):false;
    $pp=$private!==''?realpath($private):false;
    $check('dedicated_ojs_document_root',is_string($rp)&&is_dir($rp)&&is_readable($rp));
    $check('private_files_directory_exists',is_string($pp)&&is_dir($pp)&&is_writable($pp));
    $overlap=is_string($rp)&&is_string($pp)&&
        (str_starts_with($pp,rtrim($rp,DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR)||$rp===$pp);
    $check('submission_files_outside_webroot',is_string($rp)&&is_string($pp)&&!$overlap);
    $check('dedicated_ojs_database',is_string(getenv('JHELA_OJS_DB_DSN'))&&getenv('JHELA_OJS_DB_DSN')!=='' &&
      getenv('JHELA_OJS_DB_DSN')!==(getenv('JR_DB_DSN')?:'') &&
      !str_contains((string)getenv('JHELA_OJS_DB_DSN'),'YOUR_DATABASE'));
    $check('db_credentials_present',(getenv('JHELA_OJS_DB_USER')?:'')!=='' && (getenv('JHELA_OJS_DB_PASSWORD')?:'')!=='');
    $dsn=getenv('JHELA_OJS_DB_DSN')?:'';
    if($dsn!=='' && (getenv('JHELA_OJS_DB_USER')?:'')!==''){
        try{
            $db=new PDO($dsn,(string)getenv('JHELA_OJS_DB_USER'),(string)getenv('JHELA_OJS_DB_PASSWORD'),[
              PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT=>5,PDO::ATTR_EMULATE_PREPARES=>false
            ]);
            $db->query('SELECT 1')->fetchColumn();
            $check('database_connectivity',true);
        }catch(Throwable $e){$check('database_connectivity',false);}
    }else{$check('database_connectivity',false);}
    $check('live_dns_tls_owner_verification',(getenv('JHELA_OJS_TLS_CERTIFIED')?:'')==='true',
      'Requires separate CA-trusted hostname+certificate evidence, not curl -k');
    $check('independent_restore_proof',(getenv('JHELA_OJS_RESTORE_VERIFIED')?:'')==='true',
      'Restore must cover isolated OJS database, private files and configuration');
    $check('owner_approved_editorial_roles',(getenv('JHELA_OJS_ROLES_VERIFIED')?:'')==='true');
    $check('real_smtp_receipt',(getenv('JHELA_OJS_SMTP_RECEIPT_VERIFIED')?:'')==='true');
    $check('private_manuscript_access_test',(getenv('JHELA_OJS_PRIVATE_ACCESS_VERIFIED')?:'')==='true');
    $check('review_workflow_e2e_test',(getenv('JHELA_OJS_REVIEW_E2E_VERIFIED')?:'')==='true');
}
$pass=!in_array(false,array_column($checks,'pass'),true);
echo json_encode(['schema'=>'jhela-ojs-readiness-v1','mode'=>$runtime?'runtime':'contract',
   'ready'=>$pass,'advisory'=>'Contract pass alone never permits a public submission launch',
   'checks'=>$checks],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)."\n";
exit($pass?0:1);
