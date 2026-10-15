<?php
declare(strict_types=1);
/**
 * Two independent connections, disposable database, real InnoDB write locking.
 * No production DSN or user records. The test runner must opt in explicitly.
 */
$dsn='mysql:host=127.0.0.1;port=3306;dbname=operations_fixture;charset=utf8mb4';
if(getenv('OPERATIONS_TEST_DSN')!==$dsn ||
   getenv('SCIENTIFIC_WITHDRAWAL_CONCURRENCY_FIXTURE')!=='1'){
    fwrite(STDERR,"Refusing non-fixture write concurrency test\n");exit(2);
}
define('BERTINA_API_BOOTSTRAPPED',true);
define('GT_INTERNAL_CONSENT_WRITE_ENABLED',true);
require_once __DIR__.'/../api/golden-talent.php';
require_once __DIR__.'/../api/golden-talent-consent-write.php';
function validUuid(string $value): bool {
    return preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i',$value)===1;
}
$root=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),
    (string)getenv('OPERATIONS_TEST_PASSWORD'),[
      PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
    ]);
$db='science_revocation_'.bin2hex(random_bytes(6));
$root->exec('CREATE DATABASE '.$db.' CHARACTER SET utf8mb4');
$fixtureDsn=str_replace('dbname=operations_fixture','dbname='.$db,$dsn);
$a=null;$b=null;$checks=0;
$check=static function(bool $valid,string $why)use(&$checks):void{
    $checks++;if(!$valid)throw new RuntimeException('FAILED: '.$why);
};
$subject='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$actor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
$command='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
try{
    $options=[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
              PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
              PDO::ATTR_EMULATE_PREPARES=>false];
    $a=new PDO($fixtureDsn,(string)getenv('OPERATIONS_TEST_USER'),
               (string)getenv('OPERATIONS_TEST_PASSWORD'),$options);
    $b=new PDO($fixtureDsn,(string)getenv('OPERATIONS_TEST_USER'),
               (string)getenv('OPERATIONS_TEST_PASSWORD'),$options);
    $a->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    $b->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    $b->exec('SET SESSION innodb_lock_wait_timeout=1');
    foreach([
      'CREATE TABLE customer_accounts (
         id CHAR(36) PRIMARY KEY,status VARCHAR(20),
         email_verified_at BIGINT
       ) ENGINE=InnoDB',
      'CREATE TABLE eco_subjects (
         id CHAR(36) PRIMARY KEY,guardian_account_id CHAR(36),
         pseudonym VARCHAR(120),status VARCHAR(20),
         subject_type VARCHAR(32),created_at DATETIME(3)
       ) ENGINE=InnoDB',
      'CREATE TABLE eco_subject_relationships (
         id CHAR(36) PRIMARY KEY,subject_id CHAR(36),
         related_account_id CHAR(36),relationship_code VARCHAR(32),
         verification_status VARCHAR(24),expires_at DATETIME(3)
       ) ENGINE=InnoDB',
      'CREATE TABLE eco_consent_notices (
         id CHAR(36) PRIMARY KEY,purpose_code VARCHAR(64),
         version_label VARCHAR(32),locale CHAR(2),notice_sha256 CHAR(64),
         effective_at DATETIME(3),retired_at DATETIME(3)
       ) ENGINE=InnoDB',
      'CREATE TABLE eco_consent_records (
         id CHAR(36) PRIMARY KEY,account_id CHAR(36),
         subject_id CHAR(36),notice_id CHAR(36),
         decision VARCHAR(20),lawful_basis VARCHAR(40),
         evidence_sha256 CHAR(64),granted_at DATETIME(3),
         withdrawn_at DATETIME(3),source_code VARCHAR(64),
         KEY idx_scope_time(subject_id,granted_at)
       ) ENGINE=InnoDB',
      'CREATE TABLE eco_audit_events (
         event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
         event_key CHAR(64) UNIQUE,actor_account_id CHAR(36),
         action_code VARCHAR(64),entity_kind VARCHAR(64),
         entity_id VARCHAR(80),correlation_id CHAR(36),
         payload_sha256 CHAR(64),event_sha256 CHAR(64)
       ) ENGINE=InnoDB'
    ] as $sql)$a->exec($sql);
    $a->prepare("INSERT INTO customer_accounts VALUES(?,'active',1000)")
        ->execute([$actor]);
    $a->prepare("INSERT INTO eco_subjects VALUES
        (?,?,'Fictional learner','ACTIVE','LEARNER',UTC_TIMESTAMP(3))")
        ->execute([$subject,$actor]);
    $a->prepare("INSERT INTO eco_subject_relationships VALUES
        ('relationship',?,?,'GUARDIAN','VERIFIED',NULL)")
        ->execute([$subject,$actor]);
    $a->exec("INSERT INTO eco_consent_notices VALUES
        ('assessment','ASSESSMENT','v1','fa',REPEAT('a',64),
         UTC_TIMESTAMP(3) - INTERVAL 3 DAY,NULL)");
    $a->prepare("INSERT INTO eco_consent_records VALUES
       ('initial',?,?,'assessment','GRANTED','CONSENT',NULL,
        UTC_TIMESTAMP(3) - INTERVAL 2 DAY,NULL,'VERIFIED_INITIAL')")
        ->execute([$actor,$subject]);

    $a->beginTransaction();
    $check(count(goldenTalentMyVerifiedSubjects($a,$actor))===1,
        'original guardian subject is accessible before withdrawal');
    $blocked=false;
    try{
        goldenTalentInternalWithdrawConsent($b,$actor,$subject,'ASSESSMENT',$command);
    }catch(PDOException $e){
        $blocked=(int)($e->errorInfo[1]??0)===1205;
    }
    $check($blocked,'writer waits for existing guardian read subject mutex');
    $check(!$b->inTransaction(),'timed-out withdrawal rolled back its transaction');
    $a->commit();

    $result=goldenTalentInternalWithdrawConsent($b,$actor,$subject,'ASSESSMENT',$command);
    $check($result['state']==='WITHDRAWN'&&$result['changed']===true,
        'writer can commit once reader releases mutex');
    $a->beginTransaction();
    $check(goldenTalentMyVerifiedSubjects($a,$actor)===[],
        'later guarded read denies after withdrawal commit');
    $a->commit();

    $check((int)$b->query("SELECT COUNT(*) FROM eco_consent_records
        WHERE decision='WITHDRAWN'")->fetchColumn()===1,
        'exactly one withdrawal recorded after contention');
    $check((int)$b->query("SELECT COUNT(*) FROM eco_audit_events")->fetchColumn()===1,
        'exactly one committed audit event after contention');
    echo 'Bertina dual-session guarded read vs withdrawal writer: '.$checks." checks passed\n";
} finally {
    if($a instanceof PDO && $a->inTransaction())$a->rollBack();
    if($b instanceof PDO && $b->inTransaction())$b->rollBack();
    $a=null;$b=null;
    $root->exec('DROP DATABASE '.$db);
}
