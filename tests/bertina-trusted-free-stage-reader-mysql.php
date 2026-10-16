<?php
declare(strict_types=1);
/**
 * Full synthetic SQL composition contract for protected first stages.
 * Uses only ephemeral MySQL/MariaDB temporary tables, no production rows.
 */
$dsn='mysql:host=127.0.0.1;port=3306;dbname=operations_fixture;charset=utf8mb4';
if(getenv('OPERATIONS_TEST_DSN')!==$dsn ||
   getenv('SCIENTIFIC_TRUSTED_READER_FIXTURE')!=='1'){
    fwrite(STDERR,"Refusing non-fixture trusted reader test\n");exit(2);
}
require_once __DIR__.'/../platform/bertina-free-stage-trusted-reader.php';
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),
    (string)getenv('OPERATIONS_TEST_PASSWORD'),[
      PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES=>false
    ]);
$tables=[
 'customer_accounts'=>'id CHAR(36) PRIMARY KEY,status VARCHAR(24),email_verified_at BIGINT',
 'eco_subjects'=>'id CHAR(36) PRIMARY KEY,owner_account_id CHAR(36),guardian_account_id CHAR(36),subject_type VARCHAR(32),status VARCHAR(24),age_band VARCHAR(24)',
 'eco_subject_relationships'=>'id CHAR(36) PRIMARY KEY,subject_id CHAR(36),related_account_id CHAR(36),relationship_code VARCHAR(32),verification_status VARCHAR(24),verified_by_account_id CHAR(36),expires_at DATETIME(3)',
 'eco_subject_age_attestations'=>'id CHAR(36) PRIMARY KEY,subject_id CHAR(36),classification VARCHAR(12),jurisdiction_code CHAR(2),policy_version VARCHAR(48),source_code VARCHAR(64),review_status VARCHAR(24),verified_by_account_id CHAR(36),reviewed_by_account_id CHAR(36),evidence_sha256 CHAR(64),verified_at DATETIME(3),expires_at DATETIME(3),revoked_at DATETIME(3)',
 'eco_minor_assent_records'=>'id CHAR(36) PRIMARY KEY,subject_id CHAR(36),guardian_account_id CHAR(36),notice_version VARCHAR(32),notice_sha256 CHAR(64),decision VARCHAR(24),verification_status VARCHAR(24),source_code VARCHAR(40),reviewer_account_id CHAR(36),assented_at DATETIME(3),expires_at DATETIME(3),withdrawn_at DATETIME(3)',
 'eco_consent_notices'=>'id CHAR(36) PRIMARY KEY,purpose_code VARCHAR(64),version_label VARCHAR(32),locale CHAR(2),notice_sha256 CHAR(64),effective_at DATETIME(3),retired_at DATETIME(3)',
 'eco_consent_records'=>'id CHAR(36) PRIMARY KEY,account_id CHAR(36),subject_id CHAR(36),notice_id CHAR(36),decision VARCHAR(24),granted_at DATETIME(3),withdrawn_at DATETIME(3)'
];
foreach($tables as $table=>$cols)$pdo->exec('CREATE TEMPORARY TABLE '.$table.' ('.$cols.') ENGINE=InnoDB');
$a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$p='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
$adult='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
$child='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
$v1='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
$v2='ffffffff-ffff-4fff-8fff-ffffffffffff';
$now=strtotime('2026-10-16 12:00:00 UTC');
$count=0;
$check=static function(bool $pass,string $message)use(&$count):void{
 $count++;if(!$pass){fwrite(STDERR,"FAIL ".$message."\n");exit(1);}
};
$decision=static fn(string $account,string $id,string $module,string $stage) =>
 bertinaTrustedFreeFirstStageDecision($pdo,$account,$id,$module,$stage,'IR',$now);
try{
 $check($decision($a,$adult,'RCAS','CONTEXT_REFLECTION')['allowed']===false,
     'transactions required by all private first-stage reads');
 $pdo->beginTransaction();
 $pdo->prepare("INSERT INTO customer_accounts VALUES (?,'active',1000)")
     ->execute([$a]);
 $pdo->prepare("INSERT INTO customer_accounts VALUES (?,'active',1000)")
     ->execute([$p]);
 $pdo->prepare("INSERT INTO eco_subjects VALUES
      (?, ?,NULL,'LEARNER','ACTIVE','UNDER_18')")->execute([$adult,$a]);
 $pdo->prepare("INSERT INTO eco_subjects VALUES
      (?,NULL,?,'LEARNER','ACTIVE','UNDER_18')")->execute([$child,$p]);
 $pdo->prepare("INSERT INTO eco_subject_relationships VALUES
      ('guardian',?,?,'GUARDIAN','VERIFIED','independent-checker','2026-12-01 00:00:00')")
     ->execute([$child,$p]);
 $ageSql="INSERT INTO eco_subject_age_attestations VALUES(
      ?,?,?,'IR','AGE_ATTESTATION_V1','INDEPENDENT_REVIEW','APPROVED',
      'verifier-a','reviewer-b',REPEAT('a',64),
      '2026-10-14 08:00:00','2026-12-01 08:00:00',NULL)";
 $insert=$pdo->prepare($ageSql);
 $insert->execute([$v1,$adult,'ADULT']);
 $insert->execute([$v2,$child,'MINOR']);
 $pdo->prepare("INSERT INTO eco_minor_assent_records VALUES(
     'assent1',?,?,'assent-v1',REPEAT('c',64),
     'ASSENTED','VERIFIED','REVIEWED_ASSENT','witness',
     '2026-10-15 08:00:00','2026-12-01 08:00:00',NULL)")
    ->execute([$child,$p]);
 $pdo->exec("INSERT INTO eco_consent_notices VALUES
      ('notice','ASSESSMENT','v1','fa',REPEAT('d',64),
       '2026-10-01 00:00:00',NULL)");
 $q=$pdo->prepare("INSERT INTO eco_consent_records VALUES
     (?, ?, ?,'notice','GRANTED','2026-10-15 09:00:00',NULL)");
 $q->execute(['grant-self',$a,$adult]);
 $q->execute(['grant-parent',$p,$child]);

 foreach(['GOLDEN_TALENT'=>'ORIENTATION','RCAS'=>'CONTEXT_REFLECTION',
          'BAHAR'=>'STARTER_PLAN'] as $module=>$stage){
   $self=$decision($a,$adult,$module,$stage);
   $minor=$decision($p,$child,$module,$stage);
   $check($self['allowed']===true&&$self['payment_required']===false,
       'valid adult stage '.$module);
   $check($minor['allowed']===true&&$minor['payment_required']===false,
       'fully verified guardian and learner assent '.$module);
   foreach([$self,$minor] as $res){
      $serialized=json_encode($res);
      $check(!str_contains($serialized,$adult) &&
             !str_contains($serialized,$child) &&
             !str_contains($serialized,$a) &&
             !str_contains($serialized,$p),
             'permission DTO emits no learner or guardian ID');
   }
 }
 $check(!$decision($a,$adult,'RCAS','PAID_REPORT')['allowed'],
       'paid or unknown stage cannot be unlocked');
 $check(!$decision($a,$child,'RCAS','CONTEXT_REFLECTION')['allowed'],
       'other account is denied');
 $check(!$decision($p,$adult,'RCAS','CONTEXT_REFLECTION')['allowed'],
       'guardian cannot act as adult owner');
 $pdo->exec("UPDATE eco_minor_assent_records SET withdrawn_at=
    '2026-10-16 10:00:00' WHERE id='assent1'");
 $check(!$decision($p,$child,'RCAS','CONTEXT_REFLECTION')['allowed'],
       'latest learner assent withdrawal denies all private stages');
 $pdo->exec("UPDATE eco_minor_assent_records SET withdrawn_at=NULL
    WHERE id='assent1'");
 $pdo->exec("UPDATE eco_subject_age_attestations SET revoked_at=
    '2026-10-16 10:00:00' WHERE id='".$v1."'");
 $check(!$decision($a,$adult,'BAHAR','STARTER_PLAN')['allowed'],
       'expired or revoked adult age proof cannot be reused');
 $pdo->exec("UPDATE eco_subject_age_attestations SET revoked_at=NULL
    WHERE id='".$v1."'");
 $pdo->exec("UPDATE eco_subject_relationships SET expires_at=
    '2026-10-14 00:00:00' WHERE id='guardian'");
 $check(!$decision($p,$child,'BAHAR','STARTER_PLAN')['allowed'],
       'expired guardian rights cannot be reused');
 $pdo->exec("UPDATE eco_subject_relationships SET expires_at=
    '2026-12-01 00:00:00' WHERE id='guardian'");
 $pdo->exec("UPDATE eco_consent_records SET withdrawn_at=
    '2026-10-16 10:00:00' WHERE id='grant-parent'");
 $check(!$decision($p,$child,'RCAS','CONTEXT_REFLECTION')['allowed'],
       'withdrawn assessment consent overrides all other proof');
 $pdo->exec("UPDATE eco_consent_records SET withdrawn_at=NULL
    WHERE id='grant-parent'");
 $pdo->exec("UPDATE customer_accounts SET status='disabled'
    WHERE id='".$p."'");
 $check(!$decision($p,$child,'BAHAR','STARTER_PLAN')['allowed'],
       'inactive account denied regardless of valid guardian and assent records');
 $pdo->exec("UPDATE customer_accounts SET status='active'
    WHERE id='".$p."'");
 $check($decision($p,$child,'BAHAR','STARTER_PLAN')['allowed']===true,
       'verified source restored after unrelated revoked fixtures reset');
 $pdo->rollBack();
 echo "Bertina full SQL-sourced free-stage trust composition: ".$count." checks passed\n";
}finally{
 if($pdo->inTransaction())$pdo->rollBack();
 foreach(array_keys($tables) as $name)
   $pdo->exec('DROP TEMPORARY TABLE IF EXISTS '.$name);
}
