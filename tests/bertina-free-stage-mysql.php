<?php
declare(strict_types=1);
/**
 * ISOLATED MySQL contract test. Temporary tables ONLY in loopback
 * operations_fixture. Never open production DB or store personal records.
 */
require_once __DIR__.'/../platform/bertina-free-stage-authorisation.php';
$dsn=(string)(getenv('OPERATIONS_TEST_DSN') ?: '');
if ($dsn !== 'mysql:host=127.0.0.1;port=3306;dbname=operations_fixture;charset=utf8mb4') {
    fwrite(STDERR,"Refusing to connect outside isolated loopback operations_fixture\n");
    exit(2);
}
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),(string)getenv('OPERATIONS_TEST_PASSWORD'),[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
]);
$tables=[
  'eco_subjects'=>'id CHAR(36) PRIMARY KEY, owner_account_id CHAR(36), guardian_account_id CHAR(36), subject_type VARCHAR(32), status VARCHAR(24), age_band VARCHAR(24)',
  'eco_subject_relationships'=>'id CHAR(36) PRIMARY KEY, subject_id CHAR(36), related_account_id CHAR(36), relationship_code VARCHAR(32), verification_status VARCHAR(24), verified_by_account_id CHAR(36), expires_at DATETIME(3)',
  'eco_consent_notices'=>'id CHAR(36) PRIMARY KEY, purpose_code VARCHAR(64), version_label VARCHAR(32), locale CHAR(2), notice_sha256 CHAR(64), effective_at DATETIME(3), retired_at DATETIME(3)',
  'eco_consent_records'=>'id CHAR(36) PRIMARY KEY, account_id CHAR(36), subject_id CHAR(36), notice_id CHAR(36), decision VARCHAR(20), granted_at DATETIME(3), withdrawn_at DATETIME(3)'
];
foreach ($tables as $name=>$columns) $pdo->exec('CREATE TEMPORARY TABLE '.$name.' ('.$columns.')');
$now=strtotime('2026-10-16 12:00:00 UTC');
$checks=0;
$expect=static function(bool $valid,string $label) use (&$checks): void {
    $checks++;
    if (!$valid) { fwrite(STDERR,"FAIL: $label\n"); exit(1); }
};
$adult=['state'=>'VERIFIED','classification'=>'ADULT','source'=>'INDEPENDENT_VERIFIED_RECORD','reference'=>'fixture-adult'];
$minor=['state'=>'VERIFIED','classification'=>'MINOR','source'=>'INDEPENDENT_VERIFIED_RECORD','reference'=>'fixture-child'];

/** Fixture read-model: NEVER reuse this as HTTP API without production review. */
$context=static function(string $actor,string $subject,string $module,string $stage,
                         ?array $age) use ($pdo,$now): array {
    $s=$pdo->prepare('SELECT id,owner_account_id,guardian_account_id,subject_type,status,age_band
        FROM eco_subjects WHERE id=?');
    $s->execute([$subject]);
    $person=$s->fetch();
    $r=$pdo->prepare('SELECT subject_id,related_account_id,relationship_code,verification_status,
        verified_by_account_id,expires_at
        FROM eco_subject_relationships WHERE subject_id=? AND related_account_id=?');
    $r->execute([$subject,$actor]);
    $c=$pdo->prepare("SELECT c.id,c.account_id,c.subject_id,c.notice_id,c.decision,
        c.granted_at,c.withdrawn_at,n.purpose_code,n.version_label,n.locale,
        n.notice_sha256,n.effective_at,n.retired_at
        FROM eco_consent_records c
        JOIN eco_consent_notices n ON n.id=c.notice_id
        WHERE c.subject_id=? AND c.account_id=? AND n.purpose_code='ASSESSMENT'
        ORDER BY c.granted_at DESC,c.id DESC");
    $c->execute([$subject,$actor]);
    return ['module'=>$module,'stage'=>$stage,'server_context'=>'TRUSTED_BACKEND',
        'history_complete'=>true,'now'=>$now,
        'actor'=>['id'=>$actor,'source'=>'SERVER_SESSION','status'=>'active',
                  'session_verified'=>true,'email_verified'=>true],
        'subject'=>$person?:null,'relationships'=>$r->fetchAll(),
        'consent_history'=>$c->fetchAll(),'age_verification'=>$age];
};
$gate=static fn(array $ctx): bool => bertinaAuthoriseFreeStage($ctx)['allowed']===true;
try {
    $pdo->exec("INSERT INTO eco_subjects VALUES
      ('adult','self',NULL,'LEARNER','ACTIVE','18_PLUS'),
      ('child',NULL,'parent','LEARNER','ACTIVE','UNDER_18')");
    $pdo->exec("INSERT INTO eco_consent_notices VALUES
      ('assess','ASSESSMENT','v1','fa',REPEAT('a',64),'2026-10-01 00:00:00',NULL),
      ('parent-visibility','PARENT_VISIBILITY','v1','fa',REPEAT('b',64),'2026-10-01 00:00:00',NULL)");
    $pdo->exec("INSERT INTO eco_consent_records VALUES
      ('self-grant','self','adult','assess','GRANTED','2026-10-10 09:00:00.100',NULL),
      ('parent-grant','parent','child','assess','GRANTED','2026-10-10 09:00:00.100',NULL),
      ('visibility','parent','child','parent-visibility','GRANTED','2026-10-10 09:00:00.100',NULL)");
    $pdo->exec("INSERT INTO eco_subject_relationships VALUES
      ('relation','child','parent','GUARDIAN','VERIFIED','reviewer','2026-12-01 00:00:00')");
    foreach(['GOLDEN_TALENT'=>'ORIENTATION','RCAS'=>'CONTEXT_REFLECTION','BAHAR'=>'STARTER_PLAN'] as $module=>$stage) {
        $expect($gate($context('self','adult',$module,$stage,$adult)),'adult free:'.$module);
        $expect($gate($context('parent','child',$module,$stage,$minor)),'guardian free:'.$module);
    }
    $expect(!$gate($context('stranger','adult','RCAS','CONTEXT_REFLECTION',$adult)),'stranger denied');
    $expect(!$gate($context('self','adult','RCAS','ADVANCED_REPORT',$adult)),'paid denied');
    $expect(!$gate($context('self','adult','RCAS','CONTEXT_REFLECTION',null)),'age proof absent');
    $pdo->exec("UPDATE eco_consent_records SET withdrawn_at='2026-10-15 10:00:00.000'
        WHERE id='self-grant'");
    $expect(!$gate($context('self','adult','RCAS','CONTEXT_REFLECTION',$adult)),'withdrawn-at mutation');
    $pdo->exec("INSERT INTO eco_consent_records VALUES
        ('new-grant','self','adult','assess','GRANTED','2026-10-15 11:00:00.000',NULL)");
    $expect($gate($context('self','adult','RCAS','CONTEXT_REFLECTION',$adult)),'later regrant restores');
    $pdo->exec("INSERT INTO eco_consent_records VALUES
        ('withdrawal','self','adult','assess','WITHDRAWN','2026-10-15 11:30:00.000',NULL)");
    $expect(!$gate($context('self','adult','RCAS','CONTEXT_REFLECTION',$adult)),'explicit latest withdrawal');
    $pdo->exec("UPDATE eco_subject_relationships SET expires_at='2026-10-15 00:00:00' WHERE id='relation'");
    $expect(!$gate($context('parent','child','BAHAR','STARTER_PLAN',$minor)),'expired guardian');
    $pdo->exec("UPDATE eco_subject_relationships SET expires_at=NULL,verification_status='PENDING' WHERE id='relation'");
    $expect(!$gate($context('parent','child','BAHAR','STARTER_PLAN',$minor)),'unverified guardian');
    $pdo->exec("UPDATE eco_subject_relationships SET verification_status='VERIFIED' WHERE id='relation'");
    $expect($gate($context('parent','child','BAHAR','STARTER_PLAN',$minor)),'reverified guardian');
    $pdo->exec("UPDATE eco_consent_notices SET retired_at='2026-10-14 00:00:00' WHERE id='assess'");
    $expect(!$gate($context('parent','child','BAHAR','STARTER_PLAN',$minor)),'retired assessment notice');
    echo "Bertina MySQL ephemeral guardian and consent: ".$checks." checks passed\n";
} finally {
    foreach (array_keys($tables) as $name) $pdo->exec('DROP TEMPORARY TABLE IF EXISTS '.$name);
}
