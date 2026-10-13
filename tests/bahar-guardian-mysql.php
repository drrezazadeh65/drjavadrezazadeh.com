<?php
declare(strict_types=1);
// Synthetic contract tests ONLY in isolated operations_fixture. All names
// temporarily shadow source tables; production data is never queried.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/golden-talent.php';
function nowTs(): int {return time();}
function validUuid(string $value): bool {
    return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i',$value)===1;
}
function uuidv4(): string {return 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';}
function expectBahar(bool $condition,string $reason): void {
    if(!$condition)throw new RuntimeException($reason);
}
$dsn=(string)(getenv('OPERATIONS_TEST_DSN')?:'');
if(!str_starts_with($dsn,'mysql:')||!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn)){
    fwrite(STDERR,"Refusing BAHAR data fixture outside isolated operations_fixture\n");
    exit(2);
}
$pdo=new PDO($dsn,getenv('OPERATIONS_TEST_USER')?:'',getenv('OPERATIONS_TEST_PASSWORD')?:'',[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
]);
$schema=[
'eco_subjects'=>"id CHAR(36),pseudonym VARCHAR(120),status VARCHAR(24),subject_type VARCHAR(32),guardian_account_id CHAR(36),created_at DATETIME(3)",
'eco_subject_relationships'=>"subject_id CHAR(36),related_account_id CHAR(36),relationship_code VARCHAR(32),verification_status VARCHAR(24),expires_at DATETIME(3)",
'eco_consent_notices'=>"id CHAR(36),purpose_code VARCHAR(64),effective_at DATETIME(3),retired_at DATETIME(3)",
'eco_consent_records'=>"id CHAR(36),subject_id CHAR(36),account_id CHAR(36),notice_id CHAR(36),decision VARCHAR(20),withdrawn_at DATETIME(3),granted_at DATETIME(3)",
'eco_bahar_portfolios'=>"id CHAR(36),subject_id CHAR(36),state VARCHAR(24),portfolio_code VARCHAR(80),created_at DATETIME(3)",
'eco_bahar_weekly_cycles'=>"id CHAR(36),portfolio_id CHAR(36),human_reviewed_at DATETIME(3)",
'eco_audit_events'=>"event_key CHAR(64),actor_account_id CHAR(36),action_code VARCHAR(64),entity_kind VARCHAR(64),entity_id CHAR(36),correlation_id CHAR(36),payload_sha256 CHAR(64),event_sha256 CHAR(64)"
];
$owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
$subject='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
$subject2='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
foreach($schema as $table=>$columns)$pdo->exec('CREATE TEMPORARY TABLE '.$table.' ('.$columns.')');
try{
    $pdo->prepare("INSERT INTO eco_subjects VALUES
        (?,?, 'ACTIVE','LEARNER',?,UTC_TIMESTAMP(3)),
        (?,?, 'ACTIVE','LEARNER',?,UTC_TIMESTAMP(3))")->execute([
        $subject,'Fictional learner A',$owner,$subject2,'Fictional learner B',$owner
    ]);
    $pdo->prepare("INSERT INTO eco_subject_relationships VALUES
        (?,?,'GUARDIAN','VERIFIED',NULL),
        (?,?,'GUARDIAN','PENDING',NULL)")->execute([
        $subject,$owner,$subject2,$owner
    ]);
    $pdo->exec("INSERT INTO eco_consent_notices VALUES
        ('assessment','ASSESSMENT',UTC_TIMESTAMP(3) - INTERVAL 30 DAY,NULL),
        ('parent','PARENT_VISIBILITY',UTC_TIMESTAMP(3) - INTERVAL 30 DAY,NULL)");
    $pdo->prepare("INSERT INTO eco_consent_records VALUES
        ('assessment-grant',?,?, 'assessment','GRANTED',NULL,UTC_TIMESTAMP(3) - INTERVAL 9 DAY),
        ('parent-grant',?,?, 'parent','GRANTED',NULL,UTC_TIMESTAMP(3) - INTERVAL 9 DAY)")->execute([
        $subject,$owner,$subject,$owner
    ]);
    $pdo->prepare("INSERT INTO eco_bahar_portfolios VALUES
        ('portfolio1',?,'ACTIVE','BAHAR',UTC_TIMESTAMP(3)),
        ('portfolio2',?,'DRAFT','STARTER',UTC_TIMESTAMP(3))")->execute([$subject,$subject]);
    $pdo->exec("INSERT INTO eco_bahar_weekly_cycles VALUES
        ('week1','portfolio1',UTC_TIMESTAMP(3)),
        ('week2','portfolio1',NULL),
        ('week3','portfolio2',NULL)");
    $overview=goldenTalentGuardianBaharOverview($pdo,$owner);
    expectBahar(count($overview)===1,'Only verified, consented learner may be visible');
    expectBahar($overview[0]['learnerAlias']==='Fictional learner A','Alias is scoped');
    expectBahar($overview[0]['portfolioCount']===2,'Only authorised portfolio count');
    expectBahar($overview[0]['weeklyCycleCount']===3,'Weeks count must aggregate across portfolios');
    expectBahar($overview[0]['humanReviewedCycleCount']===1,'Only human-reviewed cycles counted');
    foreach(['rawAnswers','interpretation','diagnosis','evidence','progressScore'] as $field){
        expectBahar(!array_key_exists($field,$overview[0]),'Sensitive field must not be emitted: '.$field);
    }
    expectBahar(goldenTalentGuardianBaharOverview($pdo,$other)===[],'Unrelated account is denied');
    $pdo->prepare("INSERT INTO eco_consent_records VALUES
        ('parent-revoked',?,?,'parent','WITHDRAWN',UTC_TIMESTAMP(3) - INTERVAL 1 DAY,UTC_TIMESTAMP(3) - INTERVAL 1 DAY)")->execute([$subject,$owner]);
    expectBahar(goldenTalentGuardianBaharOverview($pdo,$owner)===[],'Newer visibility revocation blocks all BAHAR counts');
    $pdo->prepare("INSERT INTO eco_consent_records VALUES
        ('parent-regrant',?,?,'parent','GRANTED',NULL,UTC_TIMESTAMP(3))")->execute([$subject,$owner]);
    expectBahar(count(goldenTalentGuardianBaharOverview($pdo,$owner))===1,'Current regrant can restore authorised summary');
    $pdo->prepare("UPDATE eco_subject_relationships SET verification_status='PENDING' WHERE subject_id=?")
        ->execute([$subject]);
    expectBahar(goldenTalentGuardianBaharOverview($pdo,$owner)===[],'Unverified relationship denies access');
    $pdo->prepare("UPDATE eco_subject_relationships SET verification_status='VERIFIED' WHERE subject_id=?")
        ->execute([$subject]);
    $pdo->prepare("INSERT INTO eco_consent_records VALUES
        ('assessment-revoked',?,?,'assessment','WITHDRAWN',UTC_TIMESTAMP(3) - INTERVAL 2 HOUR,UTC_TIMESTAMP(3) - INTERVAL 2 HOUR)")->execute([$subject,$owner]);
    expectBahar(goldenTalentGuardianBaharOverview($pdo,$owner)===[],'Revoked assessment consent denies parent overview');
    $pdo->beginTransaction();
    goldenTalentAuditGuardianBaharOverview($pdo,$owner,0);
    $pdo->commit();
    $logs=$pdo->query("SELECT action_code,entity_kind,entity_id FROM eco_audit_events")->fetchAll();
    expectBahar(count($logs)===1,'Private read audit is appended');
    expectBahar($logs[0]['action_code']==='GT_BAHAR_GUARDIAN_OVERVIEW_READ','Audit action is bounded');
    expectBahar($logs[0]['entity_kind']==='GUARDIAN_ACCOUNT','No child entity in audit');
    expectBahar($logs[0]['entity_id']===$owner,'Audit references actor only');
    echo "BAHAR guardian MySQL synthetic consent, revocation, access and audit tests passed.\n";
}finally{
    if($pdo->inTransaction())$pdo->rollBack();
    foreach(array_keys($schema) as $table)$pdo->exec('DROP TEMPORARY TABLE IF EXISTS '.$table);
}
