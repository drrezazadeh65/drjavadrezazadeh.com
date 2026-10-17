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
    $main=getenv('JHELA_MAIN_PUBLIC_ROOT')?:'';
    $rp=$root!==''?realpath($root):false;
    $pp=$private!==''?realpath($private):false;
    $mp=$main!==''?realpath($main):false;
    $within=static function(string $child,string $parent):bool {
        return $child===$parent || str_starts_with($child,rtrim($parent,DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR);
    };
    $check('main_public_root_known',is_string($mp)&&is_dir($mp));
    $check('dedicated_ojs_document_root',is_string($rp)&&is_dir($rp)&&is_readable($rp));
    $check('private_files_directory_exists',is_string($pp)&&is_dir($pp)&&is_writable($pp));
    // Prove a real installed PKP application, not a hand-written imitation.
    $ojsRoot=is_string($rp)?$rp:'';
    $config=$ojsRoot!==''?$ojsRoot.'/config.inc.php':'';
    $check('official_ojs_application_files',$ojsRoot!==''&&is_file($ojsRoot.'/index.php')&&
      is_file($ojsRoot.'/lib/pkp/includes/bootstrap.php')&&
      is_file($ojsRoot.'/lib/pkp/lib/vendor/autoload.php')&&
      is_file($ojsRoot.'/lib/pkp/templates/install/install.tpl')&&
      is_file($ojsRoot.'/dbscripts/xml/version.xml')&&is_file($config));
    $installed=false;
    if($config!==''&&is_file($config)&&is_readable($config)){
       $raw=@file_get_contents($config);
       $installed=is_string($raw)&&preg_match('/^\\s*installed\\s*=\\s*(?:On|true|1)\\s*$/im',$raw)===1;
    }
    $check('ojs_install_completed',$installed);
    // cPanel may require a dedicated subdomain directory *inside* public_html.
    // Require a distinct OJS application root and explicit main-domain alias proof
    // whenever that directory is accessible from the parent public site.
    $distinct=is_string($rp)&&is_string($mp)&&$rp!==$mp&&!$within($mp,$rp);
    $check('ojs_document_root_distinct_from_main_root',$distinct);
    $nested=$distinct&&$within($rp,$mp);
    $check('nested_main_domain_path_access_verified',!$nested||
      (getenv('JHELA_OJS_MAIN_DOMAIN_PATH_VERIFIED')?:'')==='true',
      'If nested below public_html, independently prove main-domain /journals path is access-controlled or canonicalised; never infer from docroot.');
    // Reject OJS files_dir anywhere beneath EITHER web root: an old pre-install
    // form mistakenly proposed main public_html/files despite a separate OJS root.
    $safeStorage=is_string($rp)&&is_string($pp)&&is_string($mp)&&
        !$within($pp,$rp)&&!$within($pp,$mp)&&!$within($rp,$pp)&&!$within($mp,$pp);
    $check('submission_files_outside_webroot',$safeStorage);
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
            try{
               $db->query('SELECT major, minor FROM versions LIMIT 1')->fetch(PDO::FETCH_ASSOC);
               $db->query('SELECT journal_id FROM journals LIMIT 1')->fetch(PDO::FETCH_ASSOC);
               $check('native_ojs_schema_present',true);
            }catch(Throwable $e){$check('native_ojs_schema_present',false);}
        }catch(Throwable $e){$check('database_connectivity',false);}
    }else{$check('database_connectivity',false);$check('native_ojs_schema_present',false);}
    // A manual environment flag is only human-provided evidence: it does not
    // demonstrate an actual browser-trusted server certificate.
    // Before public intake, independently authenticate the EXACT journal host.
    $ownerTlsEvidence=(getenv('JHELA_OJS_TLS_CERTIFIED')?:'')==='true';
    $trustedJournalTls=false;
    if ($ownerTlsEvidence && extension_loaded('openssl') && function_exists('stream_socket_client')) {
        $journalHost='journal.drjavadrezazadeh.com'; // Fixed allowlist; never a user URL.
        $tlsContext=stream_context_create(['ssl'=>[
            'verify_peer'=>true,
            'verify_peer_name'=>true,
            'peer_name'=>$journalHost,
            'SNI_enabled'=>true,
            'SNI_server_name'=>$journalHost,
            'allow_self_signed'=>false,
            'capture_peer_cert'=>true,
            'crypto_method'=>STREAM_CRYPTO_METHOD_TLS_CLIENT,
        ]]);
        $networkError=0; $networkReason='';
        $socket=@stream_socket_client('tls://'.$journalHost.':443',
            $networkError,$networkReason,7,STREAM_CLIENT_CONNECT,$tlsContext);
        if(is_resource($socket)){
            $options=stream_context_get_options($tlsContext);
            $peerCert=$options['ssl']['peer_certificate']??null;
            $trustedJournalTls=$peerCert instanceof OpenSSLCertificate;
            fclose($socket);
        }
        // Never print certificate contents, network host IPs or private paths.
    }
    $check('live_dns_tls_owner_verification',$ownerTlsEvidence,
      'Separate dated CA evidence from the operator, never a self-signed cPanel icon.');
    $check('independent_ca_trusted_tls_handshake',$trustedJournalTls,
      'Require a live CA-validated TLS chain, correct SNI and certificate hostname without insecure bypass.');
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
