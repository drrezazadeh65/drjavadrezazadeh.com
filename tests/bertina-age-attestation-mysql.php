<?php
declare(strict_types=1);
/**
 * Isolated MySQL 8/MariaDB 10.11 temporary-table attestation reader tests.
 * This neither applies the proposed migration nor reads real learner data.
 */
$dsn='mysql:host=127.0.0.1;port=3306;dbname=operations_fixture;charset=utf8mb4';
if(getenv('OPERATIONS_TEST_DSN')!==$dsn ||
   getenv('SCIENTIFIC_AGE_FIXTURE_ENABLED')!=='1'){
    fwrite(STDERR,"Refusing non-fixture age verification test\n");exit(2);
}
require_once __DIR__.'/../platform/bertina-age-attestation-reader.php';
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),
    (string)getenv('OPERATIONS_TEST_PASSWORD'),[
      PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES=>false
    ]);
$pdo->exec("CREATE TEMPORARY TABLE eco_subjects(
    id CHAR(36) PRIMARY KEY,age_band VARCHAR(24)
) ENGINE=InnoDB");
$pdo->exec("CREATE TEMPORARY TABLE eco_subject_age_attestations(
    id CHAR(36) PRIMARY KEY,
    subject_id CHAR(36),
    classification VARCHAR(12),
    jurisdiction_code CHAR(2),
    policy_version VARCHAR(48),
    source_code VARCHAR(64),
    review_status VARCHAR(24),
    verified_by_account_id CHAR(36),
    reviewed_by_account_id CHAR(36),
    evidence_sha256 CHAR(64),
    verified_at DATETIME(3),expires_at DATETIME(3),revoked_at DATETIME(3)
) ENGINE=InnoDB");
$subject='11111111-1111-4111-8111-111111111111';
$id='22222222-2222-4222-8222-222222222222';
$reviewer1='33333333-3333-4333-8333-333333333333';
$reviewer2='44444444-4444-4444-8444-444444444444';
$now=microtime(true);
$checks=0;
$expect=static function(bool $ok,string $message)use(&$checks):void{
    $checks++;
    if(!$ok){fwrite(STDERR,"FAIL: ".$message."\n");exit(1);}
};
$check=static fn(): ?array => bertinaVerifiedAgeAttestation($pdo,$subject,'IR',$now);
try {
    $pdo->prepare("INSERT INTO eco_subjects VALUES(?,'UNDER_18')")->execute([$subject]);
    $expect($check()===null,'requires an active transaction');
    $pdo->beginTransaction();
    $expect($check()===null,'no independent reviewed attestation is not age proof');

    $insert=$pdo->prepare("INSERT INTO eco_subject_age_attestations VALUES(
        ?,?,?,?,?,?,?,?,?,?,
        UTC_TIMESTAMP(3) - INTERVAL 2 DAY,
        UTC_TIMESTAMP(3) + INTERVAL 20 DAY,NULL)");
    $insert->execute([$id,$subject,'ADULT','IR','AGE_ATTESTATION_V1',
        'INDEPENDENT_REVIEW','APPROVED',$reviewer1,$reviewer2,str_repeat('a',64)]);
    $v=$check();
    $expect(is_array($v)&&$v['state']==='VERIFIED'&&
        $v['classification']==='ADULT'&&
        $v['source']==='INDEPENDENT_VERIFIED_RECORD'&&$v['reference']===$id,
        'independently reviewed valid attestation maps to exact existing DTO');
    $expect(count($v)===4,'returned DTO never leaks reviewer identity or evidence hash');
    $expect($check()['classification']==='ADULT',
        'self-reported age_band UNDER_18 cannot override independent reviewed adult proof');
    $expect(bertinaVerifiedAgeAttestation($pdo,$subject,'AZ',$now)===null,
        'attestation in another jurisdiction is never reused');
    $expect(bertinaVerifiedAgeAttestation($pdo,'other','IR',$now)===null,
        'malformed subject ID denied');
    $expect(bertinaVerifiedAgeAttestation($pdo,$subject,'IR',-1)===null,
        'invalid current time denied');

    $pdo->exec("UPDATE eco_subject_age_attestations SET expires_at=
         UTC_TIMESTAMP(3) - INTERVAL 1 DAY WHERE id='".$id."'");
    $expect($check()===null,'expired proof denies');
    $pdo->exec("UPDATE eco_subject_age_attestations SET expires_at=
         UTC_TIMESTAMP(3) + INTERVAL 20 DAY WHERE id='".$id."'");
    $pdo->exec("UPDATE eco_subject_age_attestations SET revoked_at=
         UTC_TIMESTAMP(3) - INTERVAL 1 DAY WHERE id='".$id."'");
    $expect($check()===null,'revoked attestation denies');

    $id2='55555555-5555-4555-8555-555555555555';
    $insert->execute([$id2,$subject,'MINOR','IR','AGE_ATTESTATION_V1',
        'INDEPENDENT_REVIEW','APPROVED',$reviewer1,$reviewer2,str_repeat('b',64)]);
    // Adjust newer approval AFTER the older revocation.
    $pdo->exec("UPDATE eco_subject_age_attestations SET verified_at=
       UTC_TIMESTAMP(3) - INTERVAL 12 HOUR WHERE id='".$id2."'");
    $expect($check()['classification']==='MINOR',
        'fresh independent verification after revocation may classify minor');

    $pdo->exec("UPDATE eco_subject_age_attestations SET review_status='PENDING'
       WHERE id='".$id2."'");
    $expect($check()===null,'pending newer review cannot fall back to old approval');
    $pdo->exec("UPDATE eco_subject_age_attestations SET review_status='APPROVED',
       verified_by_account_id=reviewed_by_account_id WHERE id='".$id2."'");
    $expect($check()===null,'self-review does not constitute independent verification');
    $pdo->prepare("UPDATE eco_subject_age_attestations SET verified_by_account_id=?
       WHERE id=?")->execute([$reviewer1,$id2]);
    $pdo->exec("UPDATE eco_subject_age_attestations SET evidence_sha256='invalid'
       WHERE id='".$id2."'");
    $expect($check()===null,'missing or malformed evidence provenance hash denies');
    $pdo->exec("UPDATE eco_subject_age_attestations SET evidence_sha256=REPEAT('b',64),
       verified_at=UTC_TIMESTAMP(3)+INTERVAL 1 DAY WHERE id='".$id2."'");
    $expect($check()===null,'future verification timestamp denies');
    $pdo->exec("UPDATE eco_subject_age_attestations SET
       verified_at=UTC_TIMESTAMP(3)-INTERVAL 12 HOUR,
       source_code='SELF_ASSERTION' WHERE id='".$id2."'");
    $expect($check()===null,'self assertion is not an approved independent source');
    $pdo->exec("UPDATE eco_subject_age_attestations SET
       source_code='INDEPENDENT_REVIEW',reviewed_by_account_id=NULL WHERE id='".$id2."'");
    $expect($check()===null,'independent second reviewer required');
    $pdo->prepare("UPDATE eco_subject_age_attestations
       SET reviewed_by_account_id=? WHERE id=?")->execute([$reviewer2,$id2]);
    $expect($check()['classification']==='MINOR','restored valid approved review');
    // Historical collision at the same verified instant must deny.
    $pdo->exec("UPDATE eco_subject_age_attestations SET verified_at=
        (SELECT latest.verified_at FROM
         (SELECT verified_at FROM eco_subject_age_attestations
          WHERE id='".$id2."') AS latest)
        WHERE id='".$id."'");
    $expect($check()===null,'same-tick conflicting classification fails closed');

    $pdo->rollBack();
    $pdo->beginTransaction();
    $expect($check()===null,'rolled-back attestations do not become evidence');
    $pdo->rollBack();
    $pdo->beginTransaction();
    $pdo->exec('DROP TEMPORARY TABLE eco_subject_age_attestations');
    $expect($check()===null,'uninstalled candidate schema fails closed');
    $pdo->rollBack();
    echo "Bertina independent age attestation temporary-table policy: ".$checks." checks passed\n";
}finally{
    if($pdo->inTransaction())$pdo->rollBack();
    foreach(['eco_subject_age_attestations','eco_subjects'] as $table)
        $pdo->exec('DROP TEMPORARY TABLE IF EXISTS '.$table);
}
