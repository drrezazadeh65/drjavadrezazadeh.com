<?php
declare(strict_types=1);

// Ephemeral, signed owner access only. Never include this generated helper in a site release.
const CB_REQUEST_B64 = '__CODEX_BACKUP_REQUEST_BASE64__';
const CB_MAX_BYTES = 2147483648;
const CB_FREE_RESERVE = 67108864;

function cbFail(string $code): never { throw new RuntimeException($code); }
function cbPrivateConfiguration(string $path): array {
    // Preserve the host configuration exactly; discard include output before validating it.
    if(!ob_start())cbFail('private_configuration_buffer_unavailable');
    try{$configuration=require $path;$output=ob_get_contents();}
    catch(Throwable $e){cbFail('private_configuration_load_failed');}
    finally{ob_end_clean();}
    if(!is_array($configuration))cbFail('private_configuration_type_invalid');
    if(!is_string($output)||preg_match('/\A[ \t\r\n]*\z/',$output)!==1)cbFail('private_configuration_output_invalid');
    return $configuration;
}
function cbRequest(): array {
    $raw=base64_decode(CB_REQUEST_B64,true);
    $r=is_string($raw)?json_decode($raw,true):null;
    if(!is_array($r)||($r['schema']??'')!=='bertina-private-backup-v1'||!preg_match('/^[a-f0-9]{32}$/',(string)($r['id']??''))||
        !preg_match('/^[a-f0-9]{40}$/',(string)($r['sourceRelease']??''))||!is_int($r['issuedAt']??null)||!is_int($r['expiresAt']??null)||$r['expiresAt']<=$r['issuedAt']||$r['expiresAt']-$r['issuedAt']>3600)cbFail('request_invalid');
    $key=openssl_pkey_get_public((string)($r['publicKeyPem']??''));$details=$key?openssl_pkey_get_details($key):false;
    if(!is_array($details)||($details['bits']??0)!==4096||($details['type']??-1)!==OPENSSL_KEYTYPE_RSA)cbFail('request_key_invalid');
    return $r;
}
function cbCanonical(array $r,array $s): string {
    return implode("\n",['bertina-private-backup-v1',$r['id'],(string)($s['REQUEST_METHOD']??''),
        (string)($s['HTTP_X_CODEX_BACKUP_ACTION']??''),(string)($s['HTTP_X_CODEX_BACKUP_TIME']??''),
        (string)($s['HTTP_X_CODEX_BACKUP_NONCE']??''),(string)($s['HTTP_RANGE']??''),
        'bertina-private-backup-'.$r['id'].'.php',(string)$r['expiresAt'],(string)($s['HTTP_X_CODEX_BACKUP_BODY_SHA256']??'')]);
}
function cbAuthorize(array $r,array $s,int $now): string {
    if(($s['HTTPS']??'')!=='on'||(int)($s['SERVER_PORT']??0)!==443||strtolower((string)($s['HTTP_HOST']??''))!=='drjavadrezazadeh.com')cbFail('native_https_required');
    if($now<$r['issuedAt']-30||$now>=$r['expiresAt'])cbFail('request_expired');
    $action=(string)($s['HTTP_X_CODEX_BACKUP_ACTION']??'');$method=(string)($s['REQUEST_METHOD']??'');
    if(!in_array([$method,$action],[['POST','create'],['GET','status'],['GET','download'],['POST','retire'],['POST','certify']],true))cbFail('request_action_invalid');
    $at=(string)($s['HTTP_X_CODEX_BACKUP_TIME']??'');$nonce=(string)($s['HTTP_X_CODEX_BACKUP_NONCE']??'');
    if(!preg_match('/^[0-9]{10}$/',$at)||abs($now-(int)$at)>120||!preg_match('/^[a-f0-9]{64}$/',$nonce))cbFail('request_window_invalid');
    if($action!=='download'&&($s['HTTP_RANGE']??'')!=='')cbFail('request_range_invalid');
    $bodyHash=(string)($s['HTTP_X_CODEX_BACKUP_BODY_SHA256']??'');if(($action==='certify'&&!preg_match('/^[a-f0-9]{64}$/',$bodyHash))||($action!=='certify'&&$bodyHash!==''))cbFail('request_body_hash_invalid');
    $signature=base64_decode((string)($s['HTTP_X_CODEX_BACKUP_SIGNATURE']??''),true);
    if(!is_string($signature)||strlen($signature)!==512||openssl_verify(cbCanonical($r,$s),$signature,$r['publicKeyPem'],OPENSSL_ALGO_SHA256)!==1)cbFail('signature_invalid');
    return $action;
}
function cbPrivateDirectory(string $site,array $r): string {
    $real=realpath($site);if($real===false||$real==='/'||is_link($site))cbFail('site_root_invalid');
    $private=dirname($real).'/.codex-private-backup-'.$r['id'];
    if(str_starts_with($private,$real.'/')||is_link($private))cbFail('private_path_invalid');
    if(!file_exists($private)&&!mkdir($private,0700))cbFail('private_directory_unavailable');
    if(!is_dir($private)||!chmod($private,0700)||((fileperms($private)&0777)!==0700)||realpath($private)!==$private)cbFail('private_permissions_invalid');
    return $private;
}
function cbWrite(string $file,string $data): void {
    if(is_link($file))cbFail('private_file_symlink');
    $tmp=$file.'.tmp-'.bin2hex(random_bytes(8));$fp=fopen($tmp,'x+b');
    if(!$fp)cbFail('private_file_unavailable');
    try{if(!chmod($tmp,0600))cbFail('private_file_unavailable');cbOutput($fp,$data);if(!fflush($fp))cbFail('private_flush_failed');if(function_exists('fsync')&&!fsync($fp))cbFail('private_sync_failed');fclose($fp);$fp=null;if(!rename($tmp,$file))cbFail('private_publish_failed');}
    finally{if(is_resource($fp))fclose($fp);if(is_file($tmp)&&!unlink($tmp))cbFail('private_cleanup_failed');}
}
function cbOutput($fp,string $data): void {
    $uri=(string)(stream_get_meta_data($fp)['uri']??'');if(str_starts_with($uri,'/'))cbDisk(dirname($uri),strlen($data));
    for($offset=0,$length=strlen($data);$offset<$length;){$written=fwrite($fp,substr($data,$offset));if($written===false||$written===0)cbFail('private_write_failed');$offset+=$written;}
}
function cbDisk(string $directory,int $additional=0): void { $free=disk_free_space($directory);if($free===false||$free<$additional+CB_FREE_RESERVE)cbFail('backup_free_space_reserve'); }
function cbNonce(string $private,string $nonce): void {
    $dir=$private.'/nonces';if(!is_dir($dir)&&!mkdir($dir,0700))cbFail('nonce_directory_unavailable');
    if(is_link($dir)||(fileperms($dir)&0777)!==0700)cbFail('nonce_directory_invalid');
    $fp=@fopen($dir.'/'.$nonce,'x+b');if(!$fp)cbFail('nonce_replayed');
    if(!chmod($dir.'/'.$nonce,0600)){fclose($fp);cbFail('nonce_permissions_invalid');}fclose($fp);
}
function cbQuoteIdentifier(string $value): string {return '`'.str_replace('`','``',$value).'`';}
function cbSchemaVisible(PDO $pdo,string $schema): array {
    // Schema ALL exposes every object, without requiring global production privilege.
    $grants=$pdo->query('SHOW GRANTS FOR CURRENT_USER()')->fetchAll(PDO::FETCH_COLUMN);
    foreach($grants as $grant){
        if(preg_match('/^GRANT ALL PRIVILEGES ON (.+) TO /i',(string)$grant,$m)&&in_array($m[1],['*.*',cbQuoteIdentifier($schema).'.*',cbQuoteIdentifier(str_replace(['_','%'],['\\_','\\%'],$schema)).'.*'],true))return $grants;
    }
    cbFail('complete_metadata_visibility_unverified');
}
function cbDefinitions(PDO $pdo,string $schema): array {
    $q=$pdo->prepare('SELECT TABLE_NAME,TABLE_TYPE,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME');$q->execute([$schema]);
    $objects=[];
    foreach($q->fetchAll() as $row){
        $name=(string)$row['TABLE_NAME'];$kind=(string)$row['TABLE_TYPE'];
        if($kind==='BASE TABLE'&&strcasecmp((string)$row['ENGINE'],'InnoDB')!==0)cbFail('nontransactional_table_present');
        if(!in_array($kind,['BASE TABLE','VIEW'],true))cbFail('unsupported_database_object');
        $created=$pdo->query('SHOW CREATE '.($kind==='VIEW'?'VIEW':'TABLE').' '.cbQuoteIdentifier($schema).'.'.cbQuoteIdentifier($name))->fetch();
        $ddl=$created[$kind==='VIEW'?'Create View':'Create Table']??null;
        if(!is_string($ddl)||$ddl==='')cbFail('database_definition_unavailable');
        $objects[]=['kind'=>$kind==='VIEW'?'view':'table','name'=>$name,'ddl'=>$ddl,'characterSetClient'=>(string)($created['character_set_client']??''),'collationConnection'=>(string)($created['collation_connection']??'')];
        if($kind==='VIEW'){$v=$pdo->prepare('SELECT COLUMN_NAME,ORDINAL_POSITION,COLUMN_TYPE,IS_NULLABLE,COLLATION_NAME,CHARACTER_SET_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION');$v->execute([$schema,$name]);$objects[array_key_last($objects)]['viewColumns']=$v->fetchAll();}
    }
    foreach([
        ['trigger','TRIGGERS','TRIGGER_NAME','TRIGGER_SCHEMA','SQL Original Statement'],
        ['procedure','ROUTINES','ROUTINE_NAME','ROUTINE_SCHEMA','Create Procedure'],
        ['function','ROUTINES','ROUTINE_NAME','ROUTINE_SCHEMA','Create Function'],
        ['event','EVENTS','EVENT_NAME','EVENT_SCHEMA','Create Event']
    ] as [$kind,$table,$nameColumn,$schemaColumn,$createColumn]){
        $sql='SELECT '.cbQuoteIdentifier($nameColumn).' AS object_name FROM information_schema.'.cbQuoteIdentifier($table).' WHERE '.cbQuoteIdentifier($schemaColumn).'=?';
        if($table==='ROUTINES')$sql.=' AND ROUTINE_TYPE=\''.strtoupper($kind).'\'';
        $sql.=' ORDER BY '.cbQuoteIdentifier($nameColumn);$q=$pdo->prepare($sql);$q->execute([$schema]);
        foreach($q->fetchAll(PDO::FETCH_COLUMN) as $name){
            $row=$pdo->query('SHOW CREATE '.strtoupper($kind).' '.cbQuoteIdentifier($schema).'.'.cbQuoteIdentifier((string)$name))->fetch();
            $ddl=$row[$createColumn]??null;if(!is_string($ddl)||$ddl==='')cbFail('database_definition_unavailable');
            $objects[]=['kind'=>$kind,'name'=>(string)$name,'ddl'=>$ddl,'sqlMode'=>(string)($row['sql_mode']??''),
                'characterSetClient'=>(string)($row['character_set_client']??''),'collationConnection'=>(string)($row['collation_connection']??''),'timeZone'=>$kind==='event'?(string)($row['time_zone']??''):null,'databaseCollation'=>(string)(array_change_key_case($row,CASE_LOWER)['database collation']??'')];
        }
    }
    return $objects;
}
function cbDefinitionFingerprint(array $objects): string {
    foreach($objects as &$o)if($o['kind']==='table')$o['ddl']=cbNormalizeAutoIncrement($o['ddl']);unset($o);
    return hash('sha256',json_encode($objects,JSON_THROW_ON_ERROR));
}
function cbNormalizeAutoIncrement(string $ddl): string {
    $out='';$quote='';$length=strlen($ddl);
    for($i=0;$i<$length;$i++){$char=$ddl[$i];
        if($quote!==''){$out.=$char;if($char==='\\'&&$quote!=='`'&&$i+1<$length){$out.=$ddl[++$i];continue;}if($char===$quote){if($i+1<$length&&$ddl[$i+1]===$quote)$out.=$ddl[++$i];else $quote='';}continue;}
        if(in_array($char,["'",'"','`'],true)){$quote=$char;$out.=$char;continue;}
        if(($i===0||!preg_match('/[A-Za-z0-9_]/',$ddl[$i-1]))&&preg_match('/\GAUTO_INCREMENT=\d+\b/i',$ddl,$m,0,$i)){$out.='AUTO_INCREMENT=SNAPSHOT';$i+=strlen($m[0])-1;continue;}$out.=$char;
    }return $out;
}
function cbDdl(PDO $pdo,$fp,array $object,array $context,bool $replace=false): void {
    $charset=$object['characterSetClient']?:$context['characterSetClient'];$collation=$object['collationConnection']?:$context['collationConnection'];$mode=$object['sqlMode']??$context['sqlMode'];
    if(!preg_match('/^[A-Za-z0-9_]+$/',$charset)||!preg_match('/^[A-Za-z0-9_]+$/',$collation)||!preg_match('/^[A-Z0-9_,]*$/',$mode))cbFail('database_creation_context_invalid');
    $databaseCollation=$object['databaseCollation']??$context['databaseCollation'];if($databaseCollation==='')$databaseCollation=$context['databaseCollation'];if(!preg_match('/^[A-Za-z0-9_]+$/',$databaseCollation))cbFail('database_creation_context_invalid');
    cbOutput($fp,'ALTER DATABASE '.cbQuoteIdentifier($context['schemaName']).' COLLATE '.$databaseCollation.";\n");
    $ddl=$replace?preg_replace('/^CREATE /','CREATE OR REPLACE ',$object['ddl'],1):$object['ddl'];
    // Preserve original parser encoding even when the dump contains mixed legacy charset sections.
    if(!in_array(strtolower($charset),['utf8','utf8mb3','utf8mb4'],true)){
        $q=$pdo->prepare('SELECT CAST(CONVERT(? USING '.$charset.') AS BINARY) AS encoded, CONVERT(CONVERT(? USING '.$charset.') USING utf8mb4) AS roundtrip');$q->execute([$ddl,$ddl]);$encoded=$q->fetch();$q->closeCursor();
        if(!is_array($encoded)||$encoded['roundtrip']!==$ddl)cbFail('database_ddl_encoding_not_lossless');$ddl=$encoded['encoded'];
    }
    do{$delimiter='__CB_'.bin2hex(random_bytes(4)).'__';}while(str_contains($ddl,$delimiter));
    if($object['kind']==='event'){$zone=(string)($object['timeZone']??'');if(!preg_match('/^(?:SYSTEM|[A-Za-z0-9_+\/:.-]+)$/',$zone)||$zone==='')cbFail('event_time_zone_invalid');cbOutput($fp,"SET SESSION time_zone='".$zone."';\n");}
    cbOutput($fp,"SET SESSION character_set_client='".$charset."';\nSET SESSION character_set_connection='".$charset."';\nSET SESSION collation_connection='".$collation."';\nSET SESSION sql_mode='".$mode."';\nDELIMITER ".$delimiter."\n".$ddl.$delimiter."\nDELIMITER ;\n");
}
function cbSqlLiteral(?string $hex,array $column): string {
    if($hex===null)return 'NULL';if(!preg_match('/^(?:[A-Fa-f0-9]{2})*$/D',$hex))cbFail('database_value_invalid');
    $type=strtolower((string)$column['DATA_TYPE']);$bytes=hex2bin($hex);
    if(in_array($type,['tinyint','smallint','mediumint','int','bigint','decimal','float','double','real','year'],true)){
        if(!preg_match('/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/',(string)$bytes))cbFail('database_numeric_invalid');return "'".$bytes."'";
    }
    if(in_array($type,['binary','varbinary','tinyblob','blob','mediumblob','longblob','bit'],true))return $hex===''?"X''":'0x'.$hex;
    $charset=(string)($column['CHARACTER_SET_NAME']??'');if($charset==='')$charset='ascii';
    if(!preg_match('/^[A-Za-z0-9_]+$/',$charset))cbFail('database_charset_invalid');
    if(in_array($type,['geometry','point','linestring','polygon','multipoint','multilinestring','multipolygon','geometrycollection'],true))cbFail('spatial_column_requires_special_dump');
    return 'CONVERT('.($hex===''?"X''":'0x'.$hex).' USING '.$charset.')';
}
function cbContentCanonical(array $values): string {
    foreach($values as &$value){if($value===null)continue;if(!is_string($value)||!preg_match('/^(?:[A-Fa-f0-9]{2})*$/D',$value))cbFail('database_content_value_invalid');$value=strtoupper($value);}unset($value);
    return json_encode(array_values($values),JSON_THROW_ON_ERROR)."\n";
}
function cbContentValues(array $row,int $count): array {
    $expected=[];$values=[];for($i=0;$i<$count;$i++){$name='cb_hex_'.$i;$expected[]=$name;if(!array_key_exists($name,$row))cbFail('database_content_alias_missing');$value=$row[$name];if($value!==null&&!is_string($value))cbFail('database_content_value_invalid');$values[]=$value;}if(array_keys($row)!==$expected)cbFail('database_content_alias_invalid');return $values;
}
function cbContentQuery(string $schema,string $table,array $columns,array $primary): string {
    if(!$columns||count($columns)!==count(array_unique($columns))||array_diff($primary,$columns)||count($primary)!==count(array_unique($primary)))cbFail('database_content_columns_invalid');
    $select=[];$order=[];
    foreach(array_values($columns) as $i=>$column){if(!is_string($column)||$column==='')cbFail('database_content_columns_invalid');$id=cbQuoteIdentifier('cb_t').'.'.cbQuoteIdentifier($column);$hex='HEX(CAST('.$id.' AS BINARY))';$select[]=$hex.' AS '.cbQuoteIdentifier('cb_hex_'.$i);if(!$primary){$order[]='('.$id.' IS NULL) DESC';$order[]='CAST('.$hex.' AS BINARY) ASC';}}
    if($primary)$order=array_map(fn($name)=>cbQuoteIdentifier('cb_t').'.'.cbQuoteIdentifier((string)$name).' ASC',$primary);
    return 'SELECT '.implode(',',$select).' FROM '.cbQuoteIdentifier($schema).'.'.cbQuoteIdentifier($table).' AS '.cbQuoteIdentifier('cb_t').' ORDER BY '.implode(',',$order);
}
function cbContentSort(PDO $pdo,string $schema,string $table,array $columns,array $primary): array {
    if($primary)return [null,null];
    $select=[];foreach(array_values($columns) as $i=>$column)$select[]='MAX(OCTET_LENGTH(CAST('.cbQuoteIdentifier($column).' AS BINARY))) AS '.cbQuoteIdentifier('cb_max_'.$i);
    $row=$pdo->query('SELECT '.implode(',',$select).' FROM '.cbQuoteIdentifier($schema).'.'.cbQuoteIdentifier($table))->fetch();
    if(!is_array($row))cbFail('database_content_sort_unavailable');$maximum=0;foreach($row as $value){if($value!==null&&(!is_numeric($value)||(int)$value<0))cbFail('database_content_sort_unavailable');$maximum=max($maximum,(int)$value);}
    if($maximum>4194304)cbFail('database_content_sort_value_too_large');$sort=max(4,$maximum*2);$pdo->exec('SET SESSION max_sort_length='.$sort);$actual=$pdo->query('SELECT @@SESSION.max_sort_length')->fetchColumn();if(!is_numeric($actual)||(int)$actual<$sort)cbFail('database_content_sort_limit_unavailable');return [$maximum,$sort];
}
function cbDump(PDO $pdo,string $private): array {
    $schema=(string)$pdo->query('SELECT DATABASE()')->fetchColumn();if($schema==='')cbFail('database_schema_missing');$grants=cbSchemaVisible($pdo,$schema);
    $pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');$pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    $file=$private.'/database.sql.pending';$fp=fopen($file,'x+b');if(!$fp||!chmod($file,0600))cbFail('database_dump_unavailable');
    $rows=[];$objects=[];$contents=[];
    try{
        $context=$pdo->query('SELECT @@version AS serverVersion,@@system_time_zone AS systemTimeZone,@@sql_mode AS sqlMode,@@character_set_client AS characterSetClient,@@collation_connection AS collationConnection,@@character_set_database AS databaseCharacterSet,@@collation_database AS databaseCollation')->fetch();$context['schemaName']=$schema;
        $schemaCreate=$pdo->query('SHOW CREATE DATABASE '.cbQuoteIdentifier($schema))->fetch();$schemaCreateSql=$schemaCreate['Create Database']??null;if(!is_string($schemaCreateSql))cbFail('database_schema_definition_missing');
        $systemContext=cbSystemTimeZone($pdo);
        $objects=cbDefinitions($pdo,$schema);$fingerprint=cbDefinitionFingerprint($objects);
        cbOutput($fp,"-- Private backup. Restore ONLY to a wholly isolated MySQL instance, event_scheduler=OFF and no external network. Database creation context changes in this dump are intended solely for that disposable instance. Never run against production.\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\nSET UNIQUE_CHECKS=0;\nSET SESSION time_zone='+00:00';\n");
        foreach($objects as $object)if($object['kind']==='table')cbDdl($pdo,$fp,$object,$context);
        cbOutput($fp,"SET NAMES utf8mb4;\nSET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO';\n");
        foreach($objects as $object){if($object['kind']!=='table')continue;$table=$object['name'];
            $c=$pdo->prepare('SELECT COLUMN_NAME,DATA_TYPE,CHARACTER_SET_NAME,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION');$c->execute([$schema,$table]);$allColumns=$c->fetchAll();
            $columns=array_values(array_filter($allColumns,fn($r)=>!preg_match('/(?:VIRTUAL|STORED) GENERATED/i',(string)$r['EXTRA'])));$allNames=array_map(fn($c)=>(string)$c['COLUMN_NAME'],$allColumns);$insertNames=array_map(fn($c)=>(string)$c['COLUMN_NAME'],$columns);$generated=array_values(array_diff($allNames,$insertNames));
            $key=$pdo->prepare("SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX");$key->execute([$schema,$table]);$primary=$key->fetchAll(PDO::FETCH_COLUMN);[$maximum,$sort]=cbContentSort($pdo,$schema,$table,$allNames,$primary);
            $list=array_map(fn($c)=>cbQuoteIdentifier((string)$c['COLUMN_NAME']),$columns);$indices=array_flip($allNames);$hash=hash_init('sha256');$q=$pdo->query(cbContentQuery($schema,$table,$allNames,$primary));$count=0;
            while(($row=$q->fetch(PDO::FETCH_ASSOC))!==false){
                $ordered=cbContentValues($row,count($allNames));hash_update($hash,cbContentCanonical($ordered));
                $values=array_map(fn($c)=>cbSqlLiteral($ordered[$indices[$c['COLUMN_NAME']]],$c),$columns);
                cbOutput($fp,'INSERT INTO '.cbQuoteIdentifier($table).' ('.implode(',',$list).') VALUES ('.implode(',',$values).");\n");$count++;
                if(ftell($fp)>CB_MAX_BYTES)cbFail('backup_size_limit');
            }$q->closeCursor();$rows[$table]=$count;$contents[$table]=['columnNames'=>$allNames,'insertColumnNames'=>$insertNames,'generatedColumnNames'=>$generated,'primaryKeyColumns'=>$primary,'orderStrategy'=>$primary?'primary_key':'binary_hex_null_first','canonicalization'=>'ordered-hex-json-lines-v1','rowCount'=>$count,'sha256'=>hash_final($hash),'maximumValueBytes'=>$maximum,'sortMaxLength'=>$sort];
        }
        // Temporary views break dependency ordering; the original definitions replace them below.
        foreach($objects as $object)if($object['kind']==='view'){
            $q=$pdo->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION');$q->execute([$schema,$object['name']]);$names=$q->fetchAll(PDO::FETCH_COLUMN);
            if(!$names)cbFail('view_columns_unavailable');cbOutput($fp,'CREATE VIEW '.cbQuoteIdentifier($object['name']).' AS SELECT '.implode(',',array_map(fn($name)=>'NULL AS '.cbQuoteIdentifier((string)$name),$names)).";\n");
        }
        foreach(['function','procedure','view','trigger','event'] as $kind)foreach($objects as $object)if($object['kind']===$kind)cbDdl($pdo,$fp,$object,$context,$kind==='view');
        cbOutput($fp,'ALTER DATABASE '.cbQuoteIdentifier($schema).' COLLATE '.$context['databaseCollation'].";\nSET FOREIGN_KEY_CHECKS=1;\nSET UNIQUE_CHECKS=1;\n");
        if(!hash_equals($fingerprint,cbDefinitionFingerprint(cbDefinitions($pdo,$schema))))cbFail('database_schema_changed');
        $pdo->commit();if(!fflush($fp))cbFail('database_dump_flush_failed');
        return ['scope'=>'configured_application_schema_only','schema'=>$schema,'schemaCreateSql'=>$schemaCreateSql,'currentUserGrants'=>$grants,'systemTimeZoneContext'=>$systemContext,'file'=>$file,'creationContext'=>$context,'objects'=>$objects,'rowCounts'=>$rows,'tableContents'=>$contents,'consistentSnapshot'=>true,'allTablesInnoDB'=>true,'metadataVisibility'=>'schema_all_or_global_all','excludedDatabaseScopes'=>['other_schemas','server_accounts_grants','server_configuration','cross_schema_data_referenced_by_stored_objects']];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}finally{fclose($fp);}
}
function cbFiles(string $site,string $helper): array {
    clearstatcache(true);$files=[];$bytes=0;$root=realpath($site);if($root===false)cbFail('site_root_invalid');
    $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS));
    foreach($it as $entry){$path=$entry->getPathname();if(is_link($path))cbFail('site_symlink_present');if(!$entry->isFile())cbFail('site_special_file_present');
        if($path===$helper)continue;$real=realpath($path);if($real===false||!str_starts_with($real,$root.'/'))cbFail('site_path_escape');
        $relative=substr($real,strlen($root)+1);if($relative===''||str_contains($relative,'\\')||preg_match('#(^|/)\.\.(/|$)#',$relative))cbFail('site_path_invalid');
        $size=filesize($real);$sha=hash_file('sha256',$real);if($size===false||$sha===false||!is_readable($real))cbFail('site_file_unreadable');$bytes+=$size;if($bytes>CB_MAX_BYTES)cbFail('backup_size_limit');
        $files[$relative]=['path'=>$real,'size'=>$size,'sha256'=>$sha,'mode'=>fileperms($real)&0777,'mtime'=>filemtime($real)];
    }ksort($files,SORT_STRING);if(!isset($files['api/config.local.php']))cbFail('private_configuration_missing');return $files;
}
function cbDirectories(string $site): array {
    clearstatcache(true);$root=realpath($site);if($root===false)cbFail('site_root_invalid');$dirs=[];
    $it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::SELF_FIRST);
    foreach($it as $entry){$path=$entry->getPathname();if(is_link($path))cbFail('site_symlink_present');if(!$entry->isDir())continue;
        $real=realpath($path);if($real===false||!str_starts_with($real,$root.'/'))cbFail('site_path_escape');$dirs[substr($real,strlen($root)+1)]=['mode'=>fileperms($real)&0777];
    }ksort($dirs,SORT_STRING);return $dirs;
}
function cbCreate(string $site,string $private,array $r,string $helper): array {
    if(!class_exists('ZipArchive')||!defined('ZipArchive::EM_AES_256')||!ZipArchive::isEncryptionMethodSupported(ZipArchive::EM_AES_256,true)||!ZipArchive::isEncryptionMethodSupported(ZipArchive::EM_AES_256,false))cbFail('zip_aes256_unavailable');
    $state=$private.'/metadata.json';if(is_link($state)||is_link($private.'/backup.lock'))cbFail('private_control_symlink');
    if(is_file($state)){ $value=cbMetadata($private);$final=$private.'/full-backup.zip';if(($value['ok']??false)===true&&($value['id']??'')===$r['id']&&!is_file($private.'/database.sql.pending')&&!is_link($final)&&is_file($final)&&filesize($final)===($value['archiveBytes']??null)&&hash_equals((string)($value['archiveSha256']??''),(string)hash_file('sha256',$final)))return $value;cbFail('backup_already_started');}
    $lock=fopen(sys_get_temp_dir().'/drjr-bertina-deploy-'.hash('sha256',realpath($site)).'.lock','c');
    if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))cbFail('deployment_in_progress');
    $own=fopen($private.'/backup.lock','c');if(!$own||!chmod($private.'/backup.lock',0600)||!flock($own,LOCK_EX|LOCK_NB)){flock($lock,LOCK_UN);fclose($lock);cbFail('backup_in_progress');}
    $archive=$private.'/full-backup.zip.pending';$zip=null;$sqlFile=$private.'/database.sql.pending';$pdo=null;$success=false;$startedAt=time();$reserve=str_repeat('r',131072);
    register_shutdown_function(function()use(&$reserve,&$success,$private,$archive,$sqlFile){$reserve='';if(!$success){if(is_file($sqlFile))@unlink($sqlFile);if(is_file($archive))@unlink($archive);if(is_file($private.'/full-backup.zip'))@unlink($private.'/full-backup.zip');}});
    try{
        cbWrite($state,json_encode(['ok'=>false,'status'=>'creating','id'=>$r['id'],'startedAt'=>$startedAt],JSON_THROW_ON_ERROR));
        $files=cbFiles($site,$helper);$directories=cbDirectories($site);$sw=@file_get_contents($site.'/sw.js');if(!is_string($sw)||!preg_match("/^const CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})';$/m",$sw,$release)||$release[1]!==$r['sourceRelease'])cbFail('backup_source_release_mismatch');$configuration=cbPrivateConfiguration($site.'/api/config.local.php');
        $dsn=(string)($configuration['db_dsn']??'');if(!str_starts_with($dsn,'mysql:'))cbFail('mysql_configuration_missing');
        $pdo=new PDO($dsn,(string)($configuration['db_user']??''),(string)($configuration['db_password']??''),[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
        cbDisk($private);$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY,false);$pdo->exec('SET NAMES utf8mb4');$pdo->exec("SET SESSION time_zone='+00:00'");$dump=cbDump($pdo,$private);$inputBytes=array_sum(array_column($files,'size'))+filesize($sqlFile);$archiveBound=$inputBytes+(count($files)+3)*2048+4194304;$stageBound=$archiveBound+filesize($sqlFile);if($inputBytes>CB_MAX_BYTES||$stageBound>CB_MAX_BYTES)cbFail('backup_total_staging_size_limit');cbDisk($private,$archiveBound);$password=bin2hex(random_bytes(32));
        $zip=new ZipArchive();if($zip->open($archive,ZipArchive::CREATE|ZipArchive::EXCL)!==true||!$zip->setPassword($password))cbFail('archive_open_failed');
        $manifest=['schema'=>'bertina-private-backup-content-v1','id'=>$r['id'],'createdAt'=>$startedAt,'database'=>$dump,'siteFiles'=>[],'siteDirectories'=>$directories,'entries'=>[],'exclusions'=>['exact_ephemeral_helper'=>basename($helper)],'limitations'=>['ZIP filenames remain in archive headers; the archive is private and signed-access only.','Restore only in an isolated MySQL instance. No production restore was attempted.']];unset($manifest['database']['file']);
        foreach($files as $relative=>$file){$name='site/'.$relative;$zip->addFile($file['path'],$name)||cbFail('archive_add_failed');$zip->setEncryptionName($name,ZipArchive::EM_AES_256)||cbFail('archive_encryption_failed');$manifest['entries'][$name]=['bytes'=>$file['size'],'sha256'=>$file['sha256']];$manifest['siteFiles'][$relative]=array_diff_key($file,['path'=>true]);}
        $name='database/database.sql';if(!$zip->addFile($sqlFile,$name)||!$zip->setEncryptionName($name,ZipArchive::EM_AES_256))cbFail('archive_database_failed');$manifest['entries'][$name]=['bytes'=>filesize($sqlFile),'sha256'=>hash_file('sha256',$sqlFile)];
        $json=json_encode($manifest,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);$archiveBound=$inputBytes+strlen($json)+(count($files)+3)*2048+4194304;if(filesize($sqlFile)+$archiveBound>CB_MAX_BYTES)cbFail('backup_total_staging_size_limit');cbDisk($private,$archiveBound);if(!$zip->addFromString('manifest.json',$json)||!$zip->setEncryptionName('manifest.json',ZipArchive::EM_AES_256))cbFail('archive_manifest_failed');
        if(!$zip->close()||!chmod($archive,0600))cbFail('archive_close_failed');$zip=null;if(filesize($archive)+filesize($sqlFile)>CB_MAX_BYTES)cbFail('backup_total_staging_size_limit');
        if(cbFiles($site,$helper)!==$files||cbDirectories($site)!==$directories)cbFail('site_changed_during_backup');
        $zip=new ZipArchive();if($zip->open($archive)!==true||!$zip->setPassword($password))cbFail('archive_verify_open_failed');
        $expected=$manifest['entries'];$expected['manifest.json']=['bytes'=>strlen($json),'sha256'=>hash('sha256',$json)];
        if($zip->numFiles!==count($expected))cbFail('archive_count_mismatch');
        foreach($expected as $name=>$entry){$stat=$zip->statName($name);if(!is_array($stat)||($stat['encryption_method']??null)!==ZipArchive::EM_AES_256)cbFail('archive_unencrypted_entry');
            $stream=$zip->getStream($name);if(!is_resource($stream))cbFail('archive_decryption_failed');$hash=hash_init('sha256');$count=0;while(!feof($stream)){$chunk=fread($stream,65536);if($chunk===false){fclose($stream);cbFail('archive_read_failed');}$count+=strlen($chunk);hash_update($hash,$chunk);}fclose($stream);
            if($count!==$entry['bytes']||!hash_equals($entry['sha256'],hash_final($hash)))cbFail('archive_integrity_failed');
        }$zip->close();$zip=null;
        if(!unlink($sqlFile))cbFail('plaintext_cleanup_failed');
        if(!openssl_public_encrypt($password,$envelope,$r['publicKeyPem'],OPENSSL_PKCS1_OAEP_PADDING))cbFail('password_envelope_failed');$password='';
        $target=$private.'/full-backup.zip';if(!rename($archive,$target)||!chmod($target,0600))cbFail('archive_publish_failed');
        $metadata=['ok'=>true,'schema'=>'bertina-private-backup-metadata-v1','id'=>$r['id'],'createdAt'=>$startedAt,'accessExpiresAt'=>$r['expiresAt'],'archiveBytes'=>filesize($target),'archiveMtime'=>filemtime($target),'archiveSha256'=>hash_file('sha256',$target),'contentManifestSha256'=>hash('sha256',$json),'databaseDefinitionSha256'=>hash('sha256',json_encode($dump['objects'],JSON_THROW_ON_ERROR)),'sourceReleaseSha'=>$r['sourceRelease'],'recipientSpkiSha256'=>cbSpki($r['publicKeyPem']),'sourceServiceWorkerSha256'=>$files['sw.js']['sha256']??null,'envelopeAlgorithm'=>'RSA-OAEP-SHA1','archiveEncryption'=>'ZIP-AES256-each-entry','passwordEnvelope'=>base64_encode($envelope),'fileCount'=>count($files),'tableCount'=>count($dump['rowCounts']),'objectCount'=>count($dump['objects']),'consistentSnapshot'=>true,'metadataComplete'=>true,'databaseScope'=>'configured_application_schema_only'];
        cbWrite($state,json_encode($metadata,JSON_THROW_ON_ERROR));$success=true;return $metadata;
    }finally{
        if($zip instanceof ZipArchive)$zip->close();if($pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();
        $cleanupFailed=false;if(is_file($sqlFile)&&!@unlink($sqlFile))$cleanupFailed=true;
        if(!$success||$cleanupFailed){if(is_file($archive)&&!@unlink($archive))$cleanupFailed=true;if(is_file($private.'/full-backup.zip')&&!@unlink($private.'/full-backup.zip'))$cleanupFailed=true;try{cbWrite($state,json_encode(['ok'=>false,'status'=>'failed','id'=>$r['id'],'error'=>'backup_not_complete'],JSON_THROW_ON_ERROR));}catch(Throwable $ignored){$cleanupFailed=true;}$success=false;}
        flock($own,LOCK_UN);fclose($own);flock($lock,LOCK_UN);fclose($lock);if($cleanupFailed)cbFail('backup_cleanup_failed');
    }
}
function cbMetadata(string $private): array {
    $file=$private.'/metadata.json';if(!is_file($file)||is_link($file))cbFail('backup_not_started');$value=json_decode((string)file_get_contents($file),true);if(!is_array($value))cbFail('backup_metadata_invalid');return $value;
}
function cbRange(string $range,int $size): array {
    if($range==='')return [0,$size-1,200];
    if(!preg_match('/^bytes=(\d+)-(\d+)$/',$range,$m))cbFail('download_range_invalid');$start=(int)$m[1];$end=(int)$m[2];
    if($start<0||$end<$start||$end>=$size||$end-$start+1>16777216)cbFail('download_range_invalid');return [$start,$end,206];
}
function cbSpki(string $pem): string {
    $key=openssl_pkey_get_public($pem);$details=$key?openssl_pkey_get_details($key):false;
    if(!is_array($details)||($details['bits']??0)!==4096||($details['type']??-1)!==OPENSSL_KEYTYPE_RSA)cbFail('request_key_invalid');
    $base=preg_replace('/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\\s/','',(string)$details['key']);$der=base64_decode((string)$base,true);if(!is_string($der))cbFail('request_key_invalid');return hash('sha256',$der);
}
function cbSystemTimeZone(PDO $pdo): array {
    $name=(string)$pdo->query('SELECT @@system_time_zone')->fetchColumn();$samples=[];
    $pdo->exec("SET SESSION time_zone='SYSTEM'");
    try{for($year=2020;$year<=2030;$year++)for($month=1;$month<=12;$month++){$wall=sprintf('%04d-%02d-15 12:00:00',$year,$month);$q=$pdo->prepare('SELECT UNIX_TIMESTAMP(?)');$q->execute([$wall]);$stamp=$q->fetchColumn();$q->closeCursor();if(!is_numeric($stamp))cbFail('system_timezone_context_unavailable');$samples[]=['wallTime'=>$wall,'unixTimestamp'=>(string)$stamp];}}
    finally{$pdo->exec("SET SESSION time_zone='+00:00'");}return ['name'=>$name,'samples'=>$samples,'sampleScope'=>'monthly_2020_through_2030'];
}
function cbCertify(string $private,array $r,array $server,string $body,int $now): array {
    if(strlen($body)>16384||!hash_equals((string)($server['HTTP_X_CODEX_BACKUP_BODY_SHA256']??''),hash('sha256',$body)))cbFail('certification_body_invalid');
    $value=json_decode($body,true);$meta=cbMetadata($private);
    $keys=['schema','backupId','recipientSpkiSha256','sourceRelease','createdAtEpoch','certifiedAtEpoch','expiresAtEpoch','encryptedSnapshotSha256','encryptedSnapshotBytes','isolatedRestoreVerified','secondaryCiphertextReadbackVerified','secondaryCiphertextSha256'];
    if(!is_array($value)||array_diff(array_keys($value),$keys)||array_diff($keys,array_keys($value))||$value['schema']!=='bertina-private-backup-restore-proof-v1'||$value['backupId']!==$r['id']||($meta['ok']??false)!==true)cbFail('certification_schema_invalid');
    $spki=cbSpki($r['publicKeyPem']);if($value['recipientSpkiSha256']!==$spki||$value['sourceRelease']!==$r['sourceRelease']||($meta['sourceReleaseSha']??'')!==$r['sourceRelease'])cbFail('certification_source_invalid');
    if(!is_int($value['createdAtEpoch'])||$value['createdAtEpoch']!==$meta['createdAt']||!is_int($value['certifiedAtEpoch'])||abs($now-$value['certifiedAtEpoch'])>120||$value['certifiedAtEpoch']<$value['createdAtEpoch']||!is_int($value['expiresAtEpoch'])||$value['expiresAtEpoch']<=$now||$value['expiresAtEpoch']>$value['createdAtEpoch']+21600)cbFail('certification_time_invalid');
    if($value['encryptedSnapshotSha256']!==$meta['archiveSha256']||!is_int($value['encryptedSnapshotBytes'])||$value['encryptedSnapshotBytes']!==$meta['archiveBytes']||$value['secondaryCiphertextSha256']!==$meta['archiveSha256'])cbFail('certification_hash_mismatch');
    if($value['isolatedRestoreVerified']!==true||$value['secondaryCiphertextReadbackVerified']!==true)cbFail('certification_restore_invalid');
    $signature=base64_decode((string)($server['HTTP_X_CODEX_BACKUP_PROOF_SIGNATURE']??''),true);if(!is_string($signature)||strlen($signature)!==512||openssl_verify($body,$signature,$r['publicKeyPem'],OPENSSL_ALGO_SHA256)!==1)cbFail('certification_signature_invalid');
    $gate=['bodyBase64'=>base64_encode($body),'signatureBase64'=>base64_encode($signature)];
    if(isset($meta['restoreGate'])&&$meta['restoreGate']!==$gate)cbFail('certification_already_published');
    $meta['restoreGate']=$gate;cbWrite($private.'/metadata.json',json_encode($meta,JSON_THROW_ON_ERROR));
    cbWrite($private.'/certification.json',json_encode(['schema'=>'bertina-private-backup-signed-receipt-v1','restoreGate'=>$gate,'recordedAt'=>$now,'scope'=>'owner_attested_actual_isolated_restore_and_independent_ciphertext_readback'],JSON_THROW_ON_ERROR));
    cbWrite(dirname($private).'/.codex-private-backup-current.json',json_encode(['schema'=>'bertina-private-backup-current-v1','id'=>$r['id'],'recipientSpkiSha256'=>$spki],JSON_THROW_ON_ERROR));
    return ['ok'=>true,'certificationRecorded'=>true,'backupId'=>$r['id'],'archiveSha256'=>$meta['archiveSha256']];
}
function cbDispatch(): never {
    ini_set('display_errors','0');ini_set('log_errors','0');umask(0077);
    header('Cache-Control: no-store, private, max-age=0');header('X-Robots-Tag: noindex, nofollow, noarchive');header('Referrer-Policy: no-referrer');header('X-Content-Type-Options: nosniff');
    $authorized=false;
    try{
        $r=cbRequest();$action=cbAuthorize($r,$_SERVER,time());$authorized=true;$site=realpath(__DIR__);if(!$site)cbFail('site_root_invalid');
        $private=cbPrivateDirectory($site,$r);cbNonce($private,(string)$_SERVER['HTTP_X_CODEX_BACKUP_NONCE']);
        if($action==='create'){ignore_user_abort(true);set_time_limit(600);$value=cbCreate($site,$private,$r,__FILE__);}
        elseif($action==='status')$value=cbMetadata($private);
        elseif($action==='certify'){$body=file_get_contents('php://input',false,null,0,16385);if(!is_string($body))cbFail('certification_body_invalid');$value=cbCertify($private,$r,$_SERVER,$body,time());}
        elseif($action==='retire'){
            if(is_link($private.'/backup.lock'))cbFail('private_control_symlink');$lock=fopen($private.'/backup.lock','c');if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))cbFail('backup_in_progress');$failed=false;
            foreach(['database.sql.pending','full-backup.zip.pending'] as $name)if(is_file($private.'/'.$name)&&!@unlink($private.'/'.$name))$failed=true;
            flock($lock,LOCK_UN);fclose($lock);if($failed)cbFail('backup_cleanup_failed');if(!unlink(__FILE__))cbFail('helper_retirement_failed');$value=['ok'=>true,'retired'=>true,'privateBackupRetained'=>is_file($private.'/full-backup.zip')];
        }
        else{
            $value=cbMetadata($private);if(($value['ok']??false)!==true)cbFail('backup_not_complete');$file=$private.'/full-backup.zip';if(is_link($file)||!is_file($file)||filesize($file)!==$value['archiveBytes']||filemtime($file)!==($value['archiveMtime']??null))cbFail('private_archive_changed');
            [$start,$end,$status]=cbRange((string)($_SERVER['HTTP_RANGE']??''),(int)$value['archiveBytes']);http_response_code($status);header('Content-Type: application/octet-stream');header('Content-Disposition: attachment; filename="encrypted-backup.zip"');header('Accept-Ranges: bytes');header('Content-Length: '.($end-$start+1));if($status===206)header('Content-Range: bytes '.$start.'-'.$end.'/'.$value['archiveBytes']);
            $fp=fopen($file,'rb');if(!$fp||fseek($fp,$start)!==0)cbFail('archive_stream_failed');$remaining=$end-$start+1;while($remaining>0){$chunk=fread($fp,min(262144,$remaining));if(!is_string($chunk)||$chunk==='')cbFail('archive_stream_failed');echo $chunk;$remaining-=strlen($chunk);}fclose($fp);exit;
        }header('Content-Type: application/json; charset=utf-8');echo json_encode($value,JSON_THROW_ON_ERROR);exit;
    }catch(Throwable $e){http_response_code($authorized?503:404);header('Content-Type: application/json; charset=utf-8');$code=$authorized&&preg_match('/^[a-z_]{3,70}$/',$e->getMessage())?$e->getMessage():'private_backup_unavailable';echo json_encode(['ok'=>false,'error'=>$code],JSON_THROW_ON_ERROR);exit;}
}
if(!defined('CODEX_BACKUP_LIBRARY_CONTEXT'))cbDispatch();
