<?php
declare(strict_types=1);
/** Isolated MySQL 8 / MariaDB 10.11 consent withdrawal tests only. */
$dsn='mysql:host=127.0.0.1;port=3306;dbname=operations_fixture;charset=utf8mb4';
if (getenv('OPERATIONS_TEST_DSN')!==$dsn ||
    getenv('SCIENTIFIC_WITHDRAWAL_FIXTURE_ENABLED')!=='1') {
    fwrite(STDERR,"Refusing non-fixture consent write test\n");
    exit(2);
}
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/golden-talent-consent-write.php';
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),
    (string)getenv('OPERATIONS_TEST_PASSWORD'),[
      PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES=>false
    ]);
// Internal consent writes stay disabled by default, even in the API package.
$inactiveRejected=false;
try{
    goldenTalentInternalWithdrawConsent($pdo,
        '22222222-2222-4222-8222-222222222222',
        '11111111-1111-4111-8111-111111111111',
        'ASSESSMENT',
        '44444444-4444-4444-8444-444444444444');
}catch(DomainException $e){
    $inactiveRejected=$e->getMessage()==='WITHDRAWAL_FEATURE_NOT_RELEASED';
}
if(!$inactiveRejected)throw new RuntimeException('Internal withdrawal was active without explicit server gate');
define('GT_INTERNAL_CONSENT_WRITE_ENABLED',true);
$checks=0;
$check=static function(bool $ok,string $label) use (&$checks): void {
    $checks++;
    if(!$ok)throw new RuntimeException('FAIL: '.$label);
};
$expectError=static function(string $code,callable $run,string $label) use ($check): void {
    try {$run();$check(false,$label.' wrongly passed');}
    catch(DomainException $e){$check($e->getMessage()===$code,$label.': '.$e->getMessage());}
};
$subject='11111111-1111-4111-8111-111111111111';
$parent='22222222-2222-4222-8222-222222222222';
$other='33333333-3333-4333-8333-333333333333';
$command1='44444444-4444-4444-8444-444444444444';
$command2='55555555-5555-4555-8555-555555555555';
$command3='66666666-6666-4666-8666-666666666666';
$ddl=[
  "CREATE TEMPORARY TABLE eco_subjects (
    id CHAR(36) PRIMARY KEY,guardian_account_id CHAR(36),status VARCHAR(20)) ENGINE=InnoDB",
  "CREATE TEMPORARY TABLE customer_accounts (
    id CHAR(36) PRIMARY KEY,status VARCHAR(20),email_verified_at BIGINT) ENGINE=InnoDB",
  "CREATE TEMPORARY TABLE eco_consent_notices (
    id CHAR(36) PRIMARY KEY,purpose_code VARCHAR(64),
    version_label VARCHAR(32),locale CHAR(2),notice_sha256 CHAR(64),
    effective_at DATETIME(3),retired_at DATETIME(3)) ENGINE=InnoDB",
  "CREATE TEMPORARY TABLE eco_consent_records (
    id CHAR(36) PRIMARY KEY,account_id CHAR(36),subject_id CHAR(36),
    notice_id CHAR(36),decision VARCHAR(20),lawful_basis VARCHAR(40),
    evidence_sha256 CHAR(64),granted_at DATETIME(3),withdrawn_at DATETIME(3),
    source_code VARCHAR(64),KEY idx_consent_subject_time(subject_id,granted_at)) ENGINE=InnoDB",
  "CREATE TEMPORARY TABLE eco_audit_events(
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,event_key CHAR(64) UNIQUE,
    actor_account_id CHAR(36),action_code VARCHAR(64),
    entity_kind VARCHAR(64),entity_id VARCHAR(80),
    correlation_id CHAR(36),payload_sha256 CHAR(64),event_sha256 CHAR(64)) ENGINE=InnoDB"
];
foreach($ddl as $sql)$pdo->exec($sql);
try {
    $pdo->prepare("INSERT INTO eco_subjects VALUES (?,?,'ACTIVE')")->execute([$subject,$parent]);
    $q=$pdo->prepare("INSERT INTO customer_accounts VALUES (?,'active',1000)");
    $q->execute([$parent]);$q->execute([$other]);
    $pdo->exec("INSERT INTO eco_consent_notices VALUES
       ('assess','ASSESSMENT','v1','fa',REPEAT('a',64),
        UTC_TIMESTAMP(3) - INTERVAL 3 DAY,NULL),
       ('visible','PARENT_VISIBILITY','v1','fa',REPEAT('b',64),
        UTC_TIMESTAMP(3) - INTERVAL 3 DAY,NULL)");
    $pdo->prepare("INSERT INTO eco_consent_records VALUES
       ('grant-assessment',?,?,'assess','GRANTED','CONSENT',NULL,
         UTC_TIMESTAMP(3) - INTERVAL 2 DAY,NULL,'ORIGINAL_GRANTED')")
       ->execute([$parent,$subject]);
    $pdo->prepare("INSERT INTO eco_consent_records VALUES
       ('grant-visible',?,?,'visible','GRANTED','CONSENT',NULL,
         UTC_TIMESTAMP(3) - INTERVAL 2 DAY,NULL,'ORIGINAL_GRANTED')")
       ->execute([$parent,$subject]);
    $withdraw=static fn(string $actor,string $subjectId,string $purpose,string $command) =>
        goldenTalentInternalWithdrawConsent($pdo,$actor,$subjectId,$purpose,$command);
    $check(!$pdo->inTransaction(),'fixture starts outside tx');
    $expectError('INVALID_WITHDRAWAL_SCOPE',
        static fn()=> $withdraw($parent,$subject,'MARKETING',$command1),
        'unrecognised purpose rejected');
    $expectError('NO_PERSISTED_CONSENT',
        static fn()=> $withdraw($other,$subject,'ASSESSMENT',$command1),
        'other account cannot revoke parent consent');
    $check(!$pdo->inTransaction(),'rejected request does not leave open tx');
    $expectError('TRANSACTION_ALREADY_ACTIVE',function()use($pdo,$withdraw,$parent,$subject,$command1){
        $pdo->beginTransaction();
        try {$withdraw($parent,$subject,'ASSESSMENT',$command1);}
        finally{$pdo->rollBack();}
    },'nested transaction denied');
    $r=$withdraw($parent,$subject,'ASSESSMENT',$command1);
    $check($r===['state'=>'WITHDRAWN','purpose'=>'ASSESSMENT','changed'=>true],
        'first withdrawal committed');
    $check(!$pdo->inTransaction(),'withdrawal commits its transaction');
    $r=$withdraw($parent,$subject,'ASSESSMENT',$command1);
    $check($r['state']==='ALREADY_APPLIED'&&$r['changed']===false,
        'same command ID replay is idempotent');
    $r=$withdraw($parent,$subject,'ASSESSMENT',$command2);
    $check($r['state']==='ALREADY_UNAVAILABLE'&&$r['changed']===false,
        'fresh withdrawal request after revocation does not duplicate event');
    $check((int)$pdo->query("SELECT COUNT(*) FROM eco_audit_events")->fetchColumn()===1,
        'only one audited withdrawal on replay');
    $check((int)$pdo->query("SELECT COUNT(*) FROM eco_consent_records
        WHERE decision='WITHDRAWN'")->fetchColumn()===1,
        'only one persisted withdrawal');
    $r=$withdraw($parent,$subject,'PARENT_VISIBILITY',$command2);
    $check($r['state']==='WITHDRAWN'&&$r['purpose']==='PARENT_VISIBILITY',
        'independent visibility purpose can be revoked');
    $check((int)$pdo->query("SELECT COUNT(*) FROM eco_audit_events")->fetchColumn()===2,
        'separate purpose append audited');
    $expectError('COMMAND_SCOPE_MISMATCH',
        static fn()=> $withdraw($parent,$subject,'ASSESSMENT',$command2),
        'command cannot cross purposes');
    $audit=$pdo->query("SELECT action_code,entity_kind,entity_id,payload_sha256
        FROM eco_audit_events")->fetchAll();
    foreach($audit as $event){
        $check($event['action_code']==='GT_CONSENT_WITHDRAWN' &&
            $event['entity_kind']==='ACCOUNT' &&
            $event['entity_id']===$parent,
            'audit scoped only to actor');
        $check(!str_contains(json_encode($event),$subject),
            'subject ID absent from audit');
    }
    $check((int)$pdo->query("SELECT COUNT(*) FROM eco_consent_records
        WHERE decision='GRANTED'")->fetchColumn()===2,
        'historical original grants not deleted');
    $q=$pdo->prepare("SELECT c.id,c.subject_id,c.account_id,c.notice_id,
          c.decision,c.granted_at,c.withdrawn_at,
          n.purpose_code,n.version_label,n.locale,n.notice_sha256,
          n.effective_at,n.retired_at
        FROM eco_consent_records c
        JOIN eco_consent_notices n ON n.id=c.notice_id
        WHERE c.subject_id=? AND c.account_id=? AND n.purpose_code='ASSESSMENT'
        ORDER BY c.granted_at DESC");
    $q->execute([$subject,$parent]);$history=$q->fetchAll();
    $check(bertinaCurrentConsent($history,'ASSESSMENT',microtime(true))['allowed']===false,
        'read-path projection immediately denies revoked grant');
    $check($history[0]['decision']==='WITHDRAWN' &&
        $history[0]['withdrawn_at']!==null,
        'canonical explicit WITHDRAWN decision has same-millisecond revocation time');

    $pdo->exec("UPDATE customer_accounts SET status='disabled'
        WHERE id='".$parent."'");
    $expectError('VERIFIED_ACCOUNT_REQUIRED',
        static fn()=> $withdraw($parent,$subject,'ASSESSMENT',$command3),
        'disabled account rejected');
    $pdo->exec("UPDATE customer_accounts SET status='active',email_verified_at=NULL
        WHERE id='".$parent."'");
    $expectError('VERIFIED_ACCOUNT_REQUIRED',
        static fn()=> $withdraw($parent,$subject,'ASSESSMENT',$command3),
        'unverified account rejected');
    $pdo->exec("UPDATE customer_accounts SET email_verified_at=1000
        WHERE id='".$parent."'");

    // Transaction atomicity: no audit table means NO consent event committed.
    $subject2='77777777-7777-4777-8777-777777777777';
    $pdo->prepare("INSERT INTO eco_subjects VALUES (?,?,'ACTIVE')")
        ->execute([$subject2,$parent]);
    $pdo->exec("INSERT INTO eco_consent_notices VALUES
       ('extra','ASSESSMENT','v2','fa',REPEAT('c',64),
        UTC_TIMESTAMP(3) - INTERVAL 1 DAY,NULL)");
    $pdo->prepare("INSERT INTO eco_consent_records VALUES
       ('grant2',?,?,'extra','GRANTED','CONSENT',NULL,
        UTC_TIMESTAMP(3) - INTERVAL 1 SECOND,NULL,'ORIGINAL_GRANTED')")
        ->execute([$parent,$subject2]);
    $pdo->exec('DROP TEMPORARY TABLE eco_audit_events');
    $failed=false;
    try {$withdraw($parent,$subject2,'ASSESSMENT',$command3);}
    catch(Throwable $e){$failed=true;}
    $check($failed,'missing audit storage must reject consent write');
    $check(!$pdo->inTransaction(),'failing audit rolled back');
    $check((int)$pdo->query("SELECT COUNT(*) FROM eco_consent_records
        WHERE id='".$command3."'")->fetchColumn()===0,
        'unlogged withdrawal never persists');
    echo "Bertina transactional withdrawal and private audit: ".$checks." checks passed\n";
} finally {
    if($pdo->inTransaction())$pdo->rollBack();
    foreach(['eco_audit_events','eco_consent_records','eco_consent_notices',
             'customer_accounts','eco_subjects'] as $table)
       $pdo->exec('DROP TEMPORARY TABLE IF EXISTS '.$table);
}
