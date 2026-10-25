<?php
declare(strict_types=1);
// ONLY disposable MariaDB test. The fake owner approved a RECENT, checked
// backup file in /tmp; this never authorises any Bertina production DDL.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/api/jrei-local-schema-caretaker.php';
function verifySchema(bool $ok,string $message): void {
 if(!$ok){fwrite(STDERR,"FAIL: $message\n");exit(1);}
}
$db=new PDO('mysql:host=127.0.0.1;port=3306;dbname=drjavad1_store;charset=utf8mb4',
 'root',getenv('JREI_FIXTURE_DB_PASSWORD')?:'',
 [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$path=getenv('JREI_FIXTURE_BACKUP_PATH')?:'';
$sha=getenv('JREI_FIXTURE_BACKUP_SHA256')?:'';
$cfg=['jrei_local_schema_caretaker_enabled'=>true,
 'operations_cron_master_enabled'=>true,
 'jrei_local_schema_backup_file'=>$path,
 'jrei_local_schema_backup_sha256'=>$sha];
verifySchema(count(jrJreiLocalSchemaStatements())===3,
 'three owner-reviewed source schema statements only');
verifySchema(jrJreiLocalSchemaBackupReady($cfg),
 'real disposable SQL backup and digest required');
verifySchema(!jrHybridModelRegistryReady($db),'missing model registry before caretaker');
verifySchema(!jrLocalChatSchemaReady($db),'missing chat schema before caretaker');
try {
 jrJreiLocalSchemaApply($db,[...$cfg,'jrei_local_schema_backup_sha256'=>str_repeat('0',64)]);
 verifySchema(false,'wrong SHA must prohibit all DDL');
}catch(DomainException $expected){}
verifySchema(!jrLocalChatSchemaReady($db),'invalid backup never changes database');
$first=jrJreiLocalSchemaApply($db,$cfg);
verifySchema($first['state']==='ADDITIVE_SCHEMA_READY'&&$first['newTables']===3,
 'source-reviewed caretaker creates all three missing mother tables in order');
$second=jrJreiLocalSchemaApply($db,$cfg);
verifySchema($second['newTables']===0&&($second['newColumns']??-1)===0,
 'subsequent Cron runs are idempotent');
// Simulate a documented legacy production schema drift on this DISPOSABLE
// fixture, never on Bertina. An unverified backup must prohibit ADD COLUMN.
$db->exec('ALTER TABLE jrei_local_chat_node_authorizations
 DROP COLUMN last_signed_chat_seen_at');
verifySchema(!jrLocalChatSchemaReady($db),'legacy schema drift is detected');
try {
 jrJreiLocalSchemaApply($db,[...$cfg,
   'jrei_local_schema_backup_sha256'=>str_repeat('0',64)]);
 verifySchema(false,'legacy repair without validated backup must fail');
}catch(DomainException $expected){}
$repaired=jrJreiLocalSchemaApply($db,$cfg);
verifySchema(($repaired['newColumns']??0)===1&&$repaired['newTables']===0,
 'validated owner caretaker repairs only missing signed freshness column');
verifySchema(jrLocalChatSchemaReady($db),
 'repaired worker schema supports signed-chat readiness');
verifySchema((jrJreiLocalSchemaApply($db,$cfg)['newColumns']??-1)===0,
 'legacy column reconciliation is repeat-safe');
verifySchema(jrHybridModelRegistryReady($db),'model registry postflight passes');
verifySchema(jrLocalChatSchemaReady($db),'postflight chat schema contract passes');
foreach(['customer_accounts','commerce_orders'] as $table){
 verifySchema((int)$db->query('SELECT COUNT(*) FROM '.$table)->fetchColumn()===0,
  'original accounts/payments unchanged');
}
echo "JREI-LM owner-approved additive mother-DB schema caretaker fixture passed\n";
