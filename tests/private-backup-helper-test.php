<?php
declare(strict_types=1);

// Local synthetic fixtures only. No production private key or remote service is used.
umask(0077);
$root=sys_get_temp_dir().'/bertina-helper-fixture-'.bin2hex(random_bytes(8));
if(!mkdir($root,0700))throw new RuntimeException('fixture_directory_failed');
$checks=0;
function check(bool $result,string $description): void {
    global $checks;
    if(!$result)throw new RuntimeException('FAIL: '.$description);
    $checks++;
}
function refused(string $code,callable $operation,string $description): void {
    try{$operation();}catch(RuntimeException $e){check($e->getMessage()===$code,$description.' ('.$e->getMessage().')');return;}
    throw new RuntimeException('FAIL: '.$description.' accepted');
}
function removeTree(string $path): void {
    if(is_link($path)||is_file($path)){unlink($path);return;}
    if(!is_dir($path))return;
    foreach(new FilesystemIterator($path,FilesystemIterator::SKIP_DOTS) as $entry)removeTree($entry->getPathname());
    rmdir($path);
}
function signedServer(array $r,$key,int $now,string $action='status',string $range='',string $body=''): array {
    $server=['HTTPS'=>'on','SERVER_PORT'=>'443','HTTP_HOST'=>'drjavadrezazadeh.com',
        'REQUEST_METHOD'=>in_array($action,['create','certify','retire'],true)?'POST':'GET',
        'HTTP_X_CODEX_BACKUP_ACTION'=>$action,'HTTP_X_CODEX_BACKUP_TIME'=>(string)$now,
        'HTTP_X_CODEX_BACKUP_NONCE'=>bin2hex(random_bytes(32)),'HTTP_RANGE'=>$range,
        'HTTP_X_CODEX_BACKUP_BODY_SHA256'=>$action==='certify'?hash('sha256',$body):''];
    if(!openssl_sign(cbCanonical($r,$server),$signature,$key,OPENSSL_ALGO_SHA256))throw new RuntimeException('fixture_sign_failed');
    $server['HTTP_X_CODEX_BACKUP_SIGNATURE']=base64_encode($signature);
    return $server;
}
class ContentFixtureStatement extends PDOStatement {
    public function __construct(private mixed $result){}
    public function fetch(int $mode=PDO::FETCH_DEFAULT,int $cursorOrientation=PDO::FETCH_ORI_NEXT,int $cursorOffset=0): mixed {return $this->result;}
    public function fetchColumn(int $column=0): mixed {return $this->result;}
}
class ContentFixturePDO extends PDO {
    public array $statements=[];
    public function __construct(private mixed $maximum,private mixed $sessionLimit){}
    public function query(string $query,?int $fetchMode=null,mixed ...$fetchModeArgs): PDOStatement|false {
        $this->statements[]=$query;
        return new ContentFixtureStatement(str_contains($query,'@@SESSION.max_sort_length')?$this->sessionLimit:['cb_max_0'=>$this->maximum]);
    }
    public function exec(string $statement): int|false {$this->statements[]=$statement;return 0;}
}

try {
    $key=openssl_pkey_new(['private_key_bits'=>4096,'private_key_type'=>OPENSSL_KEYTYPE_RSA]);
    check($key!==false,'generated local 4096-bit RSA test key');
    $csr=openssl_csr_new(['commonName'=>'local-private-backup-test.invalid'],$key,['digest_alg'=>'sha256']);
    $cert=$csr?openssl_csr_sign($csr,null,$key,1,['digest_alg'=>'sha256']):false;
    check($cert!==false&&openssl_x509_export($cert,$publicPem),'generated local self-signed test certificate');
    $now=1800000000;
    $r=['schema'=>'bertina-private-backup-v1','id'=>str_repeat('a',32),'issuedAt'=>$now-20,
        'expiresAt'=>$now+1800,'publicKeyPem'=>$publicPem,'sourceRelease'=>str_repeat('b',40)];
    $template=file_get_contents(dirname(__DIR__).'/scripts/bertina-private-backup-template.php');
    check(is_string($template)&&substr_count($template,'__CODEX_BACKUP_REQUEST_BASE64__')===1,'one request placeholder in source template');
    $library=$root.'/rendered-helper.php';
    file_put_contents($library,str_replace('__CODEX_BACKUP_REQUEST_BASE64__',base64_encode(json_encode($r,JSON_THROW_ON_ERROR)),$template));
    define('CODEX_BACKUP_LIBRARY_CONTEXT',true);
    require $library;
    check(cbRequest()===$r,'rendered request accepted with local public certificate');
    // Each child receives only a synthetic public request; no private key is written.
    $runner=$root.'/request-validation.php';
    file_put_contents($runner,"<?php define('CODEX_BACKUP_LIBRARY_CONTEXT',true); require \$argv[1]; try{cbRequest();echo 'accepted';}catch(RuntimeException \$e){echo \$e->getMessage();}\n");
    $smallKey=openssl_pkey_new(['private_key_bits'=>2048,'private_key_type'=>OPENSSL_KEYTYPE_RSA]);
    $smallPublic=openssl_pkey_get_details($smallKey)['key'];
    foreach([
        [['schema'=>'unknown'],'request_invalid'],[['id'=>str_repeat('z',32)],'request_invalid'],
        [['issuedAt'=>(float)$r['issuedAt']],'request_invalid'],[['expiresAt'=>$r['issuedAt']],'request_invalid'],
        [['expiresAt'=>$r['issuedAt']+3601],'request_invalid'],[['sourceRelease'=>'main'],'request_invalid'],
        [['publicKeyPem'=>$smallPublic],'request_key_invalid']
    ] as [$changes,$expected]){
        $invalid=array_replace($r,$changes);$child=$root.'/request-variant.php';
        file_put_contents($child,str_replace('__CODEX_BACKUP_REQUEST_BASE64__',base64_encode(json_encode($invalid,JSON_THROW_ON_ERROR|JSON_PRESERVE_ZERO_FRACTION)),$template));
        $process=proc_open([PHP_BINARY,$runner,$child],[1=>['pipe','w'],2=>['pipe','w']],$pipes);
        check(is_resource($process),'spawn isolated request validation');
        $result=stream_get_contents($pipes[1]);$errors=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);
        check(proc_close($process)===0&&$errors===''&&$result===$expected,'invalid request refused: '.array_key_first($changes));
    }

    foreach(['create','status','download','retire','certify'] as $action){
        $server=signedServer($r,$key,$now,$action,$action==='download'?'bytes=0-9':'',$action==='certify'?'{}':'');
        check(cbAuthorize($r,$server,$now)===$action,'signed '.$action.' action authorized');
    }
    $server=signedServer($r,$key,$now);
    foreach([
        ['HTTPS','off','native_https_required'],['SERVER_PORT','80','native_https_required'],
        ['HTTP_HOST','other.invalid','native_https_required'],['HTTP_HOST','drjavadrezazadeh.com:443','native_https_required'],
        ['REQUEST_METHOD','POST','request_action_invalid'],['HTTP_X_CODEX_BACKUP_ACTION','delete','request_action_invalid'],
        ['HTTP_X_CODEX_BACKUP_TIME',(string)($now-121),'request_window_invalid'],
        ['HTTP_X_CODEX_BACKUP_TIME','123','request_window_invalid'],['HTTP_X_CODEX_BACKUP_NONCE',str_repeat('x',64),'request_window_invalid'],
        ['HTTP_RANGE','bytes=0-9','request_range_invalid'],['HTTP_X_CODEX_BACKUP_BODY_SHA256',str_repeat('c',64),'request_body_hash_invalid'],
        ['HTTP_X_CODEX_BACKUP_SIGNATURE','not base64','signature_invalid']
    ] as [$field,$value,$code]){
        $changed=$server;$changed[$field]=$value;
        refused($code,fn()=>cbAuthorize($r,$changed,$now),'refuse changed '.$field);
    }
    refused('request_expired',fn()=>cbAuthorize($r,$server,$r['expiresAt']),'exact request expiry refused');
    refused('request_expired',fn()=>cbAuthorize($r,$server,$r['issuedAt']-31),'request issued in future refused');
    foreach(['HTTP_X_CODEX_BACKUP_TIME','HTTP_X_CODEX_BACKUP_NONCE'] as $field){
        $changed=$server;$changed[$field]=$field==='HTTP_X_CODEX_BACKUP_TIME'?(string)($now+1):str_repeat('e',64);
        refused('signature_invalid',fn()=>cbAuthorize($r,$changed,$now),'signature binds '.$field);
    }
    $download=signedServer($r,$key,$now,'download','bytes=0-9');$download['HTTP_RANGE']='bytes=10-19';
    refused('signature_invalid',fn()=>cbAuthorize($r,$download,$now),'signature binds download range');
    $certify=signedServer($r,$key,$now,'certify','','{}');$certify['HTTP_X_CODEX_BACKUP_BODY_SHA256']=hash('sha256','[]');
    refused('signature_invalid',fn()=>cbAuthorize($r,$certify,$now),'signature binds proof body hash');
    $other=$r;$other['id']=str_repeat('f',32);
    refused('signature_invalid',fn()=>cbAuthorize($other,$server,$now),'signature binds request ID and helper filename');

    $site=$root.'/site';mkdir($site,0700);
    $private=cbPrivateDirectory($site,$r);
    check(dirname($private)===dirname($site)&&!str_starts_with($private,$site.'/'),'backup directory outside site root');
    check((fileperms($private)&0777)===0700,'backup directory private permissions');
    $nonce=str_repeat('c',64);cbNonce($private,$nonce);
    check((fileperms($private.'/nonces/'.$nonce)&0777)===0600,'nonce private file permissions');
    refused('nonce_replayed',fn()=>cbNonce($private,$nonce),'nonce replay refused');
    cbWrite($private.'/example.json','{"test":true}');
    check(file_get_contents($private.'/example.json')==='{"test":true}'&&(fileperms($private.'/example.json')&0777)===0600,'atomic private file write');
    check(glob($private.'/example.json.tmp-*')===[],'atomic write leaves no temporary file');
    symlink($private.'/example.json',$private.'/example-link.json');
    refused('private_file_symlink',fn()=>cbWrite($private.'/example-link.json','changed'),'private symlink refused');
    check(file_get_contents($private.'/example.json')==='{"test":true}','symlink target unchanged');

    // Only synthetic config files: include output must never escape, even on refusal.
    $configFile=$root.'/configuration-fixture.php';
    $config=['db_dsn'=>'mysql:synthetic_fixture','db_password'=>'local_fixture_secret'];
    foreach(['',"\n "," \t\r\n"] as $whitespace){
        file_put_contents($configFile,'<?php echo '.var_export($whitespace,true).'; return '.var_export($config,true).';');
        ob_start();try{$loaded=cbPrivateConfiguration($configFile);}finally{$visible=ob_get_clean();}
        check($loaded===$config,'array configuration accepted with ASCII JSON whitespace');
        check($visible==='','accepted configuration never prints include output or secrets');
    }
    file_put_contents($configFile,'<?php return '.var_export($config,true).'; ?>' . "\n ");
    ob_start();try{$loaded=cbPrivateConfiguration($configFile);}finally{$visible=ob_get_clean();}
    check($loaded===$config&&$visible==='','array with closing-tag trailing newline/space remains unchanged and private');
    foreach(['local_fixture_secret',"\xC2\xA0","\f","\v","\0"] as $unexpected){
        file_put_contents($configFile,'<?php echo '.var_export($unexpected,true).'; return '.var_export($config,true).';');
        ob_start();try{refused('private_configuration_output_invalid',fn()=>cbPrivateConfiguration($configFile),'non-JSON-whitespace configuration output refused with fixed code');}finally{$visible=ob_get_clean();}
        check($visible==='','rejected configuration output never prints secrets or invalid bytes');
    }
    foreach([null,false,1,'local_fixture_secret'] as $nonarray){
        file_put_contents($configFile,'<?php echo "\\n "; return '.var_export($nonarray,true).';');
        ob_start();try{refused('private_configuration_type_invalid',fn()=>cbPrivateConfiguration($configFile),'non-array configuration refused with distinct fixed code');}finally{$visible=ob_get_clean();}
        check($visible==='','non-array configuration refusal suppresses all include output');
    }
    file_put_contents($configFile,'<?php echo "local_fixture_secret"; throw new RuntimeException("local_fixture_secret");');
    ob_start();try{refused('private_configuration_load_failed',fn()=>cbPrivateConfiguration($configFile),'configuration exception is replaced by a fixed safe code');}finally{$visible=ob_get_clean();}
    check($visible==='','configuration exception prints neither output nor exception contents');

    $ddl="CREATE TABLE `AUTO_INCREMENT=111` (`id` int AUTO_INCREMENT, `note` varchar(255) DEFAULT 'AUTO_INCREMENT=222', `quoted` varchar(255) COMMENT 'it''s AUTO_INCREMENT=333', `double` varchar(255) DEFAULT \"AUTO_INCREMENT=444\") ENGINE=InnoDB AUTO_INCREMENT=555 COMMENT='AUTO_INCREMENT=666'";
    $normalized=cbNormalizeAutoIncrement($ddl);
    check($normalized===str_replace('ENGINE=InnoDB AUTO_INCREMENT=555','ENGINE=InnoDB AUTO_INCREMENT=SNAPSHOT',$ddl),'normalize only unquoted table auto-increment option');
    $objects=[['kind'=>'table','name'=>'t','ddl'=>$ddl]];
    $advanced=$objects;$advanced[0]['ddl']=str_replace('AUTO_INCREMENT=555','AUTO_INCREMENT=999',$ddl);
    check(cbDefinitionFingerprint($objects)===cbDefinitionFingerprint($advanced),'auto-increment counter does not change definition fingerprint');
    $changed=$objects;$changed[0]['ddl']=str_replace('AUTO_INCREMENT=222','AUTO_INCREMENT=999',$ddl);
    check(cbDefinitionFingerprint($objects)!==cbDefinitionFingerprint($changed),'quoted literal change changes definition fingerprint');
    check(cbNormalizeAutoIncrement("COMMENT='escaped \\' AUTO_INCREMENT=42' AUTO_INCREMENT=9")==="COMMENT='escaped \\' AUTO_INCREMENT=42' AUTO_INCREMENT=SNAPSHOT",'escaped quotes remain protected');
    check(cbNormalizeAutoIncrement('X_AUTO_INCREMENT=9 AUTO_INCREMENT=10')==='X_AUTO_INCREMENT=9 AUTO_INCREMENT=SNAPSHOT','identifier boundary respected');

    // Fixed byte encodings are an independent oracle for row-content framing.
    // PHP never decodes the fixture cell bytes, so NUL/invalid UTF-8 stay exact.
    check(function_exists('cbContentCanonical'),'row-content canonical API present');
    $rowFixtures=[
        [[],"[]\n",'zero-column row'],[[null],"[null]\n",'SQL NULL'],
        [[''],"[\"\"]\n",'empty bytes'],[['00'],"[\"00\"]\n",'NUL byte'],
        [['30'],"[\"30\"]\n",'numeric zero text'],[['302E3030'],"[\"302E3030\"]\n",'decimal zero text'],
        [['00FF0A0D095C'],"[\"00FF0A0D095C\"]\n",'binary NUL high byte newline tab backslash'],
        [['D8B3D984D8A7D98520F09F9880'],"[\"D8B3D984D8A7D98520F09F9880\"]\n",'Unicode UTF-8 bytes'],
        [['31','3233'],"[\"31\",\"3233\"]\n",'numeric cells 1 and 23'],
        [['3132','33'],"[\"3132\",\"33\"]\n",'numeric cells 12 and 3'],
        [[null,''],"[null,\"\"]\n",'NULL then empty bytes'],
        [['',null],"[\"\",null]\n",'empty bytes then NULL']
    ];
    $rowHashes=[];
    foreach($rowFixtures as [$values,$expected,$description]){
        $canonical=cbContentCanonical($values);
        check($canonical===$expected,'exact content canonical encoding: '.$description);
        $rowHashes[]=hash('sha256',$canonical);
    }
    check(count(array_unique($rowHashes))===count($rowHashes),'NULL empty NUL numeric binary Unicode and field partitions remain distinct');
    $emptyHash=hash('sha256','');$row=cbContentCanonical(['30',null,'']);
    $one=hash_init('sha256');hash_update($one,$row);$oneHash=hash_final($one);
    $twice=hash_init('sha256');hash_update($twice,$row);hash_update($twice,$row);$twiceHash=hash_final($twice);
    check($emptyHash!==$oneHash&&$oneHash!==$twiceHash,'streaming content hash preserves empty table and duplicate row multiplicity');
    $sameCountBefore=hash('sha256',cbContentCanonical(['31','414243']).cbContentCanonical(['32','444546']));
    $sameCountCorrupt=hash('sha256',cbContentCanonical(['31','414243']).cbContentCanonical(['32','444547']));
    check($sameCountBefore!==$sameCountCorrupt,'one changed cell changes digest with identical row count and shape');
    check(cbContentCanonical(['aaff'])==="[\"AAFF\"]\n",'canonical hexadecimal normalized to uppercase');
    foreach([['0'],['GG'],["00\n"],[false],[0],[[]]] as $invalid)
        refused('database_content_value_invalid',fn()=>cbContentCanonical($invalid),'reject non-byte or malformed hexadecimal content value');
    check(cbContentValues(['cb_hex_0'=>'00','cb_hex_1'=>null],2)===['00',null],'source content row preserves exact ordered aliases and NULL');
    refused('database_content_alias_missing',fn()=>cbContentValues(['cb_hex_0'=>'00'],2),'missing content field refused rather than treated as NULL');
    refused('database_content_alias_invalid',fn()=>cbContentValues(['cb_hex_0'=>'00','extra'=>'FF'],1),'unexpected content field refused');
    refused('database_content_alias_invalid',fn()=>cbContentValues(['cb_hex_1'=>null,'cb_hex_0'=>'00'],2),'out-of-order source aliases refused');
    refused('database_content_value_invalid',fn()=>cbContentValues(['cb_hex_0'=>false],1),'non-string source field refused');
    $primaryQuery=cbContentQuery('fixture','table',['value','cb_hex_0','computed'],['cb_hex_0']);
    $primaryOrder=explode(' ORDER BY ',$primaryQuery,2)[1]??'';
    check((bool)preg_match('/\.`cb_hex_0` ASC$/',$primaryOrder),'primary key is qualified so it cannot resolve to SELECT alias');
    check(str_contains($primaryQuery,'AS `cb_hex_2`'),'query includes generated/computed content column');
    $composite=cbContentQuery('fixture','table',['a','b','payload'],['b','a']);$compositeOrder=explode(' ORDER BY ',$composite,2)[1]??'';
    check((bool)preg_match('/\.`b` ASC,.*\.`a` ASC$/',$compositeOrder),'composite primary key order preserved');
    $noPrimary=cbContentQuery('schema`name','table`name',['binary`field','text'],[]);
    check(str_contains($noPrimary,'`schema``name`.`table``name`'),'schema and table identifiers escaped');
    check(str_contains($noPrimary,'`binary``field`'),'column identifiers escaped');
    check(substr_count($noPrimary,' IS NULL) DESC')===2&&substr_count($noPrimary,' AS BINARY) ASC')===2,'no-PK order uses NULL first and binary hexadecimal for every field');
    foreach([[[],[]],[['a','a'],[]],[['a'],['missing']],[['a'],['a','a']]] as [$columns,$primary])
        refused('database_content_columns_invalid',fn()=>cbContentQuery('fixture','table',$columns,$primary),'invalid row-content query columns refused');
    $sortDb=new ContentFixturePDO(2050,4100);
    check(cbContentSort($sortDb,'fixture','table',['payload'],[])===[2050,4100],'no-PK sort bound covers full hexadecimal value');
    check(in_array('SET SESSION max_sort_length=4100',$sortDb->statements,true),'source applies measured full-value sort length');
    $emptySort=new ContentFixturePDO(null,4);
    check(cbContentSort($emptySort,'fixture','table',['payload'],[])===[0,4],'empty no-PK table uses minimal safe sort length');
    $smallLimit=new ContentFixturePDO(2050,1024);
    refused('database_content_sort_limit_unavailable',fn()=>cbContentSort($smallLimit,'fixture','table',['payload'],[]),'server clamp below required sort length refused');
    $largeValue=new ContentFixturePDO(4194305,8388610);
    refused('database_content_sort_value_too_large',fn()=>cbContentSort($largeValue,'fixture','table',['payload'],[]),'unbounded no-PK value refused');
    $primarySort=new ContentFixturePDO(null,null);
    check(cbContentSort($primarySort,'fixture','table',['id'],['id'])===[null,null]&&$primarySort->statements===[],'primary key order needs no lossy content sort bound');

    check(cbRange('',10)===[0,9,200],'full archive range');
    check(cbRange('bytes=0-9',10)===[0,9,206],'bounded archive range');
    check(cbRange('bytes=9-9',10)===[9,9,206],'one byte final range');
    check(cbRange('bytes=0-16777215',16777216)===[0,16777215,206],'maximum chunk range');
    foreach(['bytes=0-10','bytes=9-8','bytes=0-','bytes=-1','bytes=0-1,3-4','bytes=0-16777216','bytes=18446744073709551615-18446744073709551615','Bytes=0-1'] as $range)
        refused('download_range_invalid',fn()=>cbRange($range,$range==='bytes=0-16777216'?16777217:10),'reject range '.$range);

    // Invalid local configuration deliberately fails before any PDO connection.
    mkdir($site.'/api',0700);mkdir($site.'/empty',0700);
    file_put_contents($site.'/api/config.local.php',"<?php return ['db_dsn'=>'sqlite::memory:'];\n");
    file_put_contents($site.'/index.php','synthetic site');
    file_put_contents($site.'/sw.js',"const CACHE_VERSION='jr-site-bertina-".$r['sourceRelease']."';\n");
    $helper=$site.'/bertina-private-backup-'.$r['id'].'.php';file_put_contents($helper,'synthetic helper');
    $files=cbFiles($site,$helper);
    check(array_keys($files)===['api/config.local.php','index.php','sw.js'],'site inventory excludes only exact helper');
    check(array_keys(cbDirectories($site))===['api','empty'],'empty directories included in inventory');
    symlink($site.'/index.php',$site.'/linked.php');
    refused('site_symlink_present',fn()=>cbFiles($site,$helper),'site file symlink refused');unlink($site.'/linked.php');
    file_put_contents($private.'/database.sql.pending','synthetic pending plaintext');
    file_put_contents($private.'/full-backup.zip.pending','synthetic partial ciphertext');
    file_put_contents($private.'/full-backup.zip','synthetic incomplete final ciphertext');
    refused('mysql_configuration_missing',fn()=>cbCreate($site,$private,$r,$helper),'invalid DSN fails before a connection');
    foreach(['database.sql.pending','full-backup.zip.pending','full-backup.zip'] as $name)
        check(!file_exists($private.'/'.$name),'failed create removes '.$name);
    $failed=cbMetadata($private);
    check($failed['ok']===false&&$failed['status']==='failed','failed create publishes failure metadata');
    // The coordination lock belongs to this synthetic root; remove it after use.
    $lock=sys_get_temp_dir().'/drjr-bertina-deploy-'.hash('sha256',realpath($site)).'.lock';
    if(is_file($lock))unlink($lock);

    // These are synthetic owner attestations, not evidence of a real restore or copy.
    $spki=cbSpki($publicPem);$publicDetails=openssl_pkey_get_details($key);
    $publicDer=base64_decode(preg_replace('/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/','',$publicDetails['key']),true);
    check($spki===hash('sha256',$publicDer),'recipient fingerprint is SHA-256 of SPKI DER');
    $meta=['ok'=>true,'schema'=>'bertina-private-backup-metadata-v1','id'=>$r['id'],
        'createdAt'=>$now-10,'sourceReleaseSha'=>$r['sourceRelease'],'recipientSpkiSha256'=>$spki,
        'archiveSha256'=>hash('sha256','local synthetic ciphertext'),'archiveBytes'=>123];
    cbWrite($private.'/metadata.json',json_encode($meta,JSON_THROW_ON_ERROR));
    $proof=['schema'=>'bertina-private-backup-restore-proof-v1','backupId'=>$r['id'],
        'recipientSpkiSha256'=>$spki,'sourceRelease'=>$r['sourceRelease'],'createdAtEpoch'=>$meta['createdAt'],
        'certifiedAtEpoch'=>$now,'expiresAtEpoch'=>$now+3600,'encryptedSnapshotSha256'=>$meta['archiveSha256'],
        'encryptedSnapshotBytes'=>$meta['archiveBytes'],'isolatedRestoreVerified'=>true,
        'secondaryCiphertextReadbackVerified'=>true,'secondaryCiphertextSha256'=>$meta['archiveSha256']];
    $makeProofServer=function(string $body)use($r,$key,$now):array{
        $s=signedServer($r,$key,$now,'certify','',$body);
        if(!openssl_sign($body,$signature,$key,OPENSSL_ALGO_SHA256))throw new RuntimeException('fixture_proof_sign_failed');
        $s['HTTP_X_CODEX_BACKUP_PROOF_SIGNATURE']=base64_encode($signature);return $s;
    };
    $body=json_encode($proof,JSON_THROW_ON_ERROR);$proofServer=$makeProofServer($body);
    refused('certification_body_invalid',fn()=>cbCertify($private,$r,$proofServer,$body.' ',$now),'proof body hash mismatch refused');
    $large=str_repeat('x',16385);$largeServer=$makeProofServer($large);
    refused('certification_body_invalid',fn()=>cbCertify($private,$r,$largeServer,$large,$now),'oversize proof refused');
    $invalidProofs=[
        [['schema'=>'other'],'certification_schema_invalid'],[['backupId'=>str_repeat('f',32)],'certification_schema_invalid'],
        [['unknown'=>'field'],'certification_schema_invalid'],[['recipientSpkiSha256'=>str_repeat('f',64)],'certification_source_invalid'],
        [['sourceRelease'=>str_repeat('c',40)],'certification_source_invalid'],[['createdAtEpoch'=>$meta['createdAt']-1],'certification_time_invalid'],
        [['createdAtEpoch'=>(string)$meta['createdAt']],'certification_time_invalid'],[['certifiedAtEpoch'=>$now-121],'certification_time_invalid'],
        [['certifiedAtEpoch'=>$now+121],'certification_time_invalid'],[['expiresAtEpoch'=>$now],'certification_time_invalid'],
        [['expiresAtEpoch'=>$meta['createdAt']+21601],'certification_time_invalid'],[['encryptedSnapshotSha256'=>str_repeat('f',64)],'certification_hash_mismatch'],
        [['encryptedSnapshotBytes'=>124],'certification_hash_mismatch'],[['encryptedSnapshotBytes'=>'123'],'certification_hash_mismatch'],
        [['secondaryCiphertextSha256'=>str_repeat('f',64)],'certification_hash_mismatch'],[['isolatedRestoreVerified'=>false],'certification_restore_invalid'],
        [['secondaryCiphertextReadbackVerified'=>1],'certification_restore_invalid']
    ];
    foreach($invalidProofs as [$changes,$expected]){
        $invalidBody=json_encode(array_replace($proof,$changes),JSON_THROW_ON_ERROR);$s=$makeProofServer($invalidBody);
        refused($expected,fn()=>cbCertify($private,$r,$s,$invalidBody,$now),'proof rejects '.array_key_first($changes));
        check(!file_exists($private.'/certification.json'),'rejected proof publishes no receipt');
    }
    $missing=$proof;unset($missing['sourceRelease']);$missingBody=json_encode($missing,JSON_THROW_ON_ERROR);$s=$makeProofServer($missingBody);
    refused('certification_schema_invalid',fn()=>cbCertify($private,$r,$s,$missingBody,$now),'proof missing field refused');
    $s=$proofServer;unset($s['HTTP_X_CODEX_BACKUP_PROOF_SIGNATURE']);
    refused('certification_signature_invalid',fn()=>cbCertify($private,$r,$s,$body,$now),'raw proof signature required');
    $s=$proofServer;$s['HTTP_X_CODEX_BACKUP_PROOF_SIGNATURE']=base64_encode(str_repeat("\0",512));
    refused('certification_signature_invalid',fn()=>cbCertify($private,$r,$s,$body,$now),'wrong proof signature refused');
    $s=$proofServer;$different=$proof;$different['expiresAtEpoch']=$now+3599;$differentBody=json_encode($different,JSON_THROW_ON_ERROR);
    $s['HTTP_X_CODEX_BACKUP_BODY_SHA256']=hash('sha256',$differentBody);
    refused('certification_signature_invalid',fn()=>cbCertify($private,$r,$s,$differentBody,$now),'raw proof signature binds exact body');
    check(cbAuthorize($r,$proofServer,$now)==='certify','canonical signature authorizes signed proof submission');
    $result=cbCertify($private,$r,$proofServer,$body,$now);
    check($result['ok']===true&&$result['certificationRecorded']===true,'local fixture proof recorded');
    $gate=cbMetadata($private)['restoreGate'];
    check(base64_decode($gate['bodyBase64'],true)===$body,'restore gate preserves exact signed body');
    check(openssl_verify($body,base64_decode($gate['signatureBase64'],true),$publicPem,OPENSSL_ALGO_SHA256)===1,'published restore gate signature verifies');
    $receipt=json_decode(file_get_contents($private.'/certification.json'),true);
    check($receipt['schema']==='bertina-private-backup-signed-receipt-v1'&&$receipt['restoreGate']===$gate,'receipt contains same restore gate');
    $pointer=json_decode(file_get_contents(dirname($private).'/.codex-private-backup-current.json'),true);
    check($pointer===['schema'=>'bertina-private-backup-current-v1','id'=>$r['id'],'recipientSpkiSha256'=>$spki],'current pointer uses pipeline identity fields');
    foreach([$private.'/metadata.json',$private.'/certification.json',dirname($private).'/.codex-private-backup-current.json'] as $file)
        check((fileperms($file)&0777)===0600,'published proof artifact private permissions');
    check(cbCertify($private,$r,$proofServer,$body,$now)['certificationRecorded']===true,'identical proof retry accepted');
    $changedBody=json_encode($different,JSON_THROW_ON_ERROR);$changedServer=$makeProofServer($changedBody);
    refused('certification_already_published',fn()=>cbCertify($private,$r,$changedServer,$changedBody,$now),'different signed proof cannot replace gate');
    check(cbMetadata($private)['restoreGate']===$gate,'rejected replacement leaves original proof unchanged');
    echo json_encode(['ok'=>true,'checks'=>$checks,'scope'=>'local_synthetic_helper_no_database_connection_no_remote_calls'])."\n";
} finally {
    removeTree($root);
}
