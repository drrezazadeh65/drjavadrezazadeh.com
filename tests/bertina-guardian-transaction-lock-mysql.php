<?php
declare(strict_types=1);
/**
 * Disposable TWO-CONNECTION MySQL/MariaDB row-lock integration test.
 * It creates a random, disposable schema on the loopback CI MySQL service.
 * NEVER use this script against a production DSN or real student records.
 */
$dsn='mysql:host=127.0.0.1;port=3306;dbname=operations_fixture;charset=utf8mb4';
if (getenv('OPERATIONS_TEST_DSN')!==$dsn ||
    getenv('SCIENTIFIC_LOCK_FIXTURE_ENABLED')!=='1') {
    fwrite(STDERR,"Refusing non-fixture consent lock test\n");
    exit(2);
}
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/golden-talent.php';
function validUuid(string $v): bool {
    return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i',$v)===1;
}
$admin=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),
    (string)getenv('OPERATIONS_TEST_PASSWORD'),[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
    ]);
$name='science_lock_fixture_'.bin2hex(random_bytes(6));
$admin->exec('CREATE DATABASE '.$name.' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$conn=str_replace('dbname=operations_fixture','dbname='.$name,$dsn);
$a=null;$b=null;
$checks=0;
$expect=static function(bool $valid,string $message) use (&$checks): void {
    $checks++;
    if(!$valid)throw new RuntimeException($message);
};
$subject='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$guardian='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
try {
    $a=new PDO($conn,(string)getenv('OPERATIONS_TEST_USER'),
        (string)getenv('OPERATIONS_TEST_PASSWORD'),[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $b=new PDO($conn,(string)getenv('OPERATIONS_TEST_USER'),
        (string)getenv('OPERATIONS_TEST_PASSWORD'),[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    foreach([$a,$b] as $pdo)$pdo->exec("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    $b->exec('SET SESSION innodb_lock_wait_timeout=1');
    $a->exec("CREATE TABLE eco_subjects(
       id CHAR(36) PRIMARY KEY, guardian_account_id CHAR(36), pseudonym VARCHAR(120),
       status VARCHAR(24), subject_type VARCHAR(32), created_at DATETIME(3)
    ) ENGINE=InnoDB");
    $a->exec("CREATE TABLE eco_subject_relationships(
       id CHAR(36) PRIMARY KEY, subject_id CHAR(36), related_account_id CHAR(36),
       relationship_code VARCHAR(32), verification_status VARCHAR(24),
       expires_at DATETIME(3)
    ) ENGINE=InnoDB");
    $a->exec("CREATE TABLE eco_consent_notices(
       id CHAR(36) PRIMARY KEY, purpose_code VARCHAR(64), version_label VARCHAR(32),
       locale CHAR(2), notice_sha256 CHAR(64),
       effective_at DATETIME(3), retired_at DATETIME(3)
    ) ENGINE=InnoDB");
    $a->exec("CREATE TABLE eco_consent_records(
       id CHAR(36) PRIMARY KEY, subject_id CHAR(36), account_id CHAR(36),
       notice_id CHAR(36), decision VARCHAR(24),
       granted_at DATETIME(3), withdrawn_at DATETIME(3),
       KEY idx_scope_time(subject_id,granted_at)
    ) ENGINE=InnoDB");
    $a->prepare("INSERT INTO eco_subjects VALUES (?,?,'Fixture learner','ACTIVE','LEARNER',UTC_TIMESTAMP(3))")
        ->execute([$subject,$guardian]);
    $a->prepare("INSERT INTO eco_subject_relationships VALUES ('relation',?,?,'GUARDIAN','VERIFIED',NULL)")
        ->execute([$subject,$guardian]);
    $a->exec("INSERT INTO eco_consent_notices VALUES
       ('assessment','ASSESSMENT','v1','fa',REPEAT('a',64),
        UTC_TIMESTAMP(3) - INTERVAL 2 DAY,NULL)");
    $a->prepare("INSERT INTO eco_consent_records VALUES
       ('original',?,?,'assessment','GRANTED',
        UTC_TIMESTAMP(3) - INTERVAL 1 DAY,NULL)")
        ->execute([$subject,$guardian]);

    $expect(!$a->inTransaction(),'fixture begins outside transaction');
    $a->beginTransaction();
    $visible=goldenTalentMyVerifiedSubjects($a,$guardian);
    $expect(count($visible)===1,'guardian can see legitimately granted learner');

    // Locked grant cannot be mutated until read/audit transaction commits.
    $b->beginTransaction();
    $blocked=false;
    try {
        $b->exec("UPDATE eco_consent_records SET withdrawn_at=UTC_TIMESTAMP(3)
                  WHERE id='original'");
    } catch(PDOException $e) {
        $blocked=(int)($e->errorInfo[1]??0)===1205;
    }
    $expect($blocked,'withdrawal mutation must wait for ongoing guarded read');
    $b->rollBack();
    $a->commit();

    $b->beginTransaction();
    $b->exec("UPDATE eco_consent_records SET withdrawn_at=UTC_TIMESTAMP(3)
             WHERE id='original'");
    $b->commit();
    $a->beginTransaction();
    $expect(goldenTalentMyVerifiedSubjects($a,$guardian)===[],
        'revoked assessment consent denies the next guarded read');

    // Future INSERT-based consent writers must take the same subject mutex;
    // this proves the mutex works, not that such writers are implemented.
    $b->beginTransaction();
    $blocked=false;
    try {
        $stmt=$b->prepare('SELECT id FROM eco_subjects WHERE id=? FOR UPDATE');
        $stmt->execute([$subject]);
        $stmt->fetch();
    } catch(PDOException $e) {
        $blocked=(int)($e->errorInfo[1]??0)===1205;
    }
    $expect($blocked,'subject serialization lock blocks a future writer');
    $b->rollBack();
    $a->commit();
    echo 'Bertina two-connection guardian consent locks: '.$checks." checks passed\n";
} finally {
    if($a instanceof PDO && $a->inTransaction())$a->rollBack();
    if($b instanceof PDO && $b->inTransaction())$b->rollBack();
    $a=null;$b=null;
    $admin->exec('DROP DATABASE '.$name);
}
