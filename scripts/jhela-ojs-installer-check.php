<?php
declare(strict_types=1);
/** JHELA PKP OJS pre-install filesystem check: CLI ONLY, READ ONLY.
 * Requires JHELA_OJS_DOCROOT, JHELA_MAIN_PUBLIC_ROOT and JHELA_OJS_PRIVATE_DIR.
 * Does not load OJS, read secrets, connect to MySQL, install or publish.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
if(($argv[1]??'')!=='--installer-check'||count($argv)!==2){fwrite(STDERR,"Usage: php scripts/jhela-ojs-installer-check.php --installer-check\n");exit(2);}
$checks=[];
$add=static function(string $id,bool $pass,string $note='')use(&$checks):void{$checks[]=['id'=>$id,'pass'=>$pass,'note'=>$note];};
$real=static function(string $key):string|false {
    $input=trim((string)(getenv($key)?:''));
    return $input!==''&&str_starts_with($input,'/')?realpath($input):false;
};
$root=$real('JHELA_OJS_DOCROOT');$main=$real('JHELA_MAIN_PUBLIC_ROOT');$private=$real('JHELA_OJS_PRIVATE_DIR');
$valid=static fn($x):bool=>is_string($x)&&is_dir($x);
$within=static fn(string $child,string $parent):bool=>$child===$parent||str_starts_with($child,rtrim($parent,'/').'/');
$add('ojs_docroot_exists',$valid($root));
$add('main_webroot_exists',$valid($main));
$add('private_files_dir_exists',$valid($private));
$add('private_files_dir_writable',$valid($private)&&is_writable($private));
// cPanel can require subdomains to remain under public_html; this is safe only
// when manuscript storage is elsewhere and the main-domain alias is controlled.
$separate=$valid($root)&&$valid($main)&&$root!==$main&&!$within($main,$root);
$nested=$separate&&$within($root,$main);
$add('dedicated_journal_docroot',$separate,'Dedicated application directory; nested cPanel subdomains are allowed');
$safe=$valid($root)&&$valid($main)&&$valid($private)&&
    !$within($private,$root)&&!$within($private,$main)&&!$within($root,$private)&&!$within($main,$private);
$add('manuscripts_outside_all_webroots',$safe,'Even public_html/files is unsafe; separately test URL and alias isolation');
$layout=[
    'index_php'=>'index.php',
    'configuration_template'=>'config.TEMPLATE.inc.php',
    'pkp_bootstrap'=>'lib/pkp/includes/bootstrap.php',
    'pkp_vendor_autoload'=>'lib/pkp/lib/vendor/autoload.php',
    'db_version_xml'=>'dbscripts/xml/version.xml',
    'install_template'=>'lib/pkp/templates/install/install.tpl',
];
foreach($layout as $id=>$rel)$add('native_'.$id,$valid($root)&&is_file($root.'/'.$rel));
$add('php_82_plus',PHP_VERSION_ID>=80200,'Verify effective web PHP version separately');
foreach(['pdo_mysql','mbstring','xml','dom','fileinfo','openssl','gd','intl','curl','zip'] as $ext)
    $add('php_'.$ext,extension_loaded($ext));
$bytes=static function(string $key):int {
    $v=trim((string)ini_get($key));
    if(!preg_match('/^(\d+)([KMG]?)$/i',$v,$m))return 0;
    return (int)$m[1]*(1024**[''=>0,'K'=>1,'M'=>2,'G'=>3][strtoupper($m[2])]);
};
$add('cli_upload_limits_10mb',$bytes('upload_max_filesize')>=10*1024*1024
    &&$bytes('post_max_size')>=10*1024*1024,'Verify effective web PHP limits in cPanel separately');
$pass=!in_array(false,array_column($checks,'pass'),true);
echo json_encode(['schema'=>'jhela-ojs-installer-check-v1','scope'=>'READ_ONLY_CLI_NOT_LIVE_EVIDENCE',
    'installer_layout_ready'=>$pass,'checks'=>$checks,
    'nested_main_webroot'=>$nested,'main_domain_alias_status'=>$nested?'REQUIRES_INDEPENDENT_HTTP_PATH_CHECK':'NOT_NESTED',
    'next'=>$pass?'Independently verify public main-domain /journals alias protection if nested, official package digest, DNS/TLS, effective web PHP, isolated manuscript URLs, and database before installation.':'Correct failed source-layout, private-storage, PHP or document-root checks before installation.'],
    JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)."\n";
exit($pass?0:1);
