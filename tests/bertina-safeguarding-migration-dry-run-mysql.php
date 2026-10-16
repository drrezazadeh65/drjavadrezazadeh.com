<?php
declare(strict_types=1);
/**
 * Proposal SQL compatibility: executes exactly two proposed CREATE TABLE
 * statements in a RANDOM DISPOSABLE TEST database. NEVER production.
 *
 * The candidate file is explicitly NOT APPLIED on Bertina. This fixture
 * verifies syntactic DDL, FK references, index fields and minimal PII columns.
 */
$dsn='mysql:host=127.0.0.1;port=3306;dbname=operations_fixture;charset=utf8mb4';
if(getenv('OPERATIONS_TEST_DSN')!==$dsn ||
   getenv('SCIENTIFIC_DDL_FIXTURE_ENABLED')!=='1'){
    fwrite(STDERR,"Refusing non-fixture migration compatibility test\n");exit(2);
}
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),
    (string)getenv('OPERATIONS_TEST_PASSWORD'),[
       PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
       PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
       PDO::ATTR_EMULATE_PREPARES=>false
    ]);
$schema='science_ddl_'.bin2hex(random_bytes(6));
$pdo->exec('CREATE DATABASE '.$schema.
    ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$conn=str_replace('dbname=operations_fixture','dbname='.$schema,$dsn);
$db=null;$count=0;
$check=static function(bool $ok,string $why)use(&$count):void{
    $count++;if(!$ok)throw new RuntimeException('FAIL: '.$why);
};
try{
    $db=new PDO($conn,(string)getenv('OPERATIONS_TEST_USER'),
        (string)getenv('OPERATIONS_TEST_PASSWORD'),[
         PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
        ]);
    $db->exec('CREATE TABLE customer_accounts(
       id CHAR(36) NOT NULL PRIMARY KEY
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    $db->exec('CREATE TABLE eco_subjects(
       id CHAR(36) NOT NULL PRIMARY KEY
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    $path=__DIR__.'/../database/unified/006a_age_attestation_PROPOSAL_NOT_APPLIED.sql';
    $sql=file_get_contents($path);
    if(!is_string($sql))throw new RuntimeException('Proposed DDL not found');
    $pattern='/CREATE TABLE IF NOT EXISTS (eco_[a-z_]+) \((.*?)\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;/s';
    preg_match_all($pattern,$sql,$matches,PREG_SET_ORDER);
    $names=array_map(static fn(array $m):string=>$m[1],$matches);
    $expected=['eco_subject_age_attestations','eco_minor_assent_records'];
    $check($names===$expected,'DDL must contain exactly both reviewed candidate table definitions');
    foreach($matches as $match)$db->exec($match[0]);
    $tables=$db->query(
      "SELECT TABLE_NAME,ENGINE
       FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
         AND TABLE_NAME LIKE 'eco_%' ORDER BY TABLE_NAME"
    )->fetchAll(PDO::FETCH_ASSOC);
    $found=array_column($tables,'ENGINE','TABLE_NAME');
    foreach($expected as $table)$check(($found[$table]??null)==='InnoDB',
        'Candidate table '.$table.' must support transactional row locks');
    $fk=$db->query(
      "SELECT TABLE_NAME,CONSTRAINT_NAME,REFERENCED_TABLE_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
       AND TABLE_NAME IN ('eco_subject_age_attestations','eco_minor_assent_records')"
    )->fetchAll(PDO::FETCH_ASSOC);
    $check(count($fk)===6,'Candidate schemas require all six subject/reviewer/guardian foreign keys');
    $targetCounts=[];
    foreach($fk as $relation){
        $targetCounts[$relation['TABLE_NAME'].'>'.$relation['REFERENCED_TABLE_NAME']]=
            ($targetCounts[$relation['TABLE_NAME'].'>'.$relation['REFERENCED_TABLE_NAME']]??0)+1;
    }
    $check(($targetCounts['eco_subject_age_attestations>eco_subjects']??0)===1 &&
           ($targetCounts['eco_subject_age_attestations>customer_accounts']??0)===2 &&
           ($targetCounts['eco_minor_assent_records>eco_subjects']??0)===1 &&
           ($targetCounts['eco_minor_assent_records>customer_accounts']??0)===2,
        'Subject, guardian and reviewer FKs must target canonical parent tables');
    foreach([
      'eco_subject_age_attestations'=>[
          'subject_id','verified_at','id'
      ],
      'eco_minor_assent_records'=>[
          'subject_id','guardian_account_id','assented_at'
      ]
    ] as $table=>$expectedCols){
        $q=$db->prepare(
            "SELECT COLUMN_NAME FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME LIKE 'idx_eco_%'
             ORDER BY SEQ_IN_INDEX");
        $q->execute([$table]);
        $check($q->fetchAll(PDO::FETCH_COLUMN)===$expectedCols,
            'Indexed consent and verification history must be subject-scoped and date-ordered');
    }
    $cols=$db->query(
        "SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN
           ('eco_subject_age_attestations','eco_minor_assent_records')"
    )->fetchAll(PDO::FETCH_ASSOC);
    $columnNames=array_column($cols,'COLUMN_NAME');
    foreach(['date_of_birth','dob','national_id','identity_scan','proof_document',
             'passport','legal_name','email','phone'] as $pii)
        $check(!in_array($pii,$columnNames,true),'Candidate must not store raw '.$pii);
    foreach($expected as $table){
        $query=$db->query('SELECT * FROM '.$table.' LIMIT 0');
        $check($query!==false,'Proposed table '.$table.' supports read-only zero-row preflight');
    }
    echo 'Bertina age/assent proposed DDL isolated migration dry-run: '.
        $count." checks passed\n";
}finally{
    $db=null;
    $pdo->exec('DROP DATABASE '.$schema);
}
