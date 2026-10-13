<?php
declare(strict_types=1);
// CI only: ephemeral MySQL temporary tables. Never connect to production.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/golden-talent.php';
$dsn=getenv('OPERATIONS_TEST_DSN')?:'';
if(!str_starts_with($dsn,'mysql:') || !str_contains($dsn,'dbname=operations_fixture')){
    fwrite(STDERR,"BAHAR schema test requires the isolated operations_fixture MySQL database\n");
    exit(2);
}
$pdo=new PDO($dsn,getenv('OPERATIONS_TEST_USER')?:'',getenv('OPERATIONS_TEST_PASSWORD')?:'');
$pdo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$tables=[
 'eco_bahar_portfolios'=>'id CHAR(36), subject_id CHAR(36), portfolio_code VARCHAR(80), state VARCHAR(24), human_mentor_account_id CHAR(36)',
 'eco_bahar_baselines'=>'id CHAR(36), portfolio_id CHAR(36), baseline_revision INT, source_fingerprint CHAR(64), review_status VARCHAR(24)',
 'eco_bahar_weekly_cycles'=>'id CHAR(36), portfolio_id CHAR(36), week_start_date DATE, cycle_number INT, state VARCHAR(24), human_reviewed_at DATETIME(3)',
 'eco_bahar_learning_evidence'=>'id CHAR(36), cycle_id CHAR(36), evidence_kind VARCHAR(70), observed_at DATETIME(3), review_state VARCHAR(24)',
 'eco_bahar_reviews'=>'id CHAR(36), cycle_id CHAR(36), reviewer_account_id CHAR(36), decision_code VARCHAR(40), created_at DATETIME(3)'
];
if(goldenTalentBaharStorageSchemaReady(null)!==false)throw new RuntimeException('Null PDO must fail closed');
foreach($tables as $table=>$columns){
    $pdo->exec('CREATE TEMPORARY TABLE '.$table.' ('.$columns.')');
}
try{
    if(!goldenTalentBaharStorageSchemaReady($pdo))
        throw new RuntimeException('Expected isolated complete MariaDB contract to be structurally ready');
    $pdo->exec('DROP TEMPORARY TABLE eco_bahar_weekly_cycles');
    $pdo->exec('CREATE TEMPORARY TABLE eco_bahar_weekly_cycles
        (id CHAR(36), portfolio_id CHAR(36), week_start_date DATE, cycle_number INT, state VARCHAR(24))');
    if(goldenTalentBaharStorageSchemaReady($pdo)!==false)
        throw new RuntimeException('Missing reviewer timestamp column must fail closed');
    $pdo->exec('DROP TEMPORARY TABLE eco_bahar_weekly_cycles');
    $pdo->exec('CREATE TEMPORARY TABLE eco_bahar_weekly_cycles
        (id CHAR(36), portfolio_id CHAR(36), week_start_date DATE, cycle_number INT,
         state VARCHAR(24), human_reviewed_at DATETIME(3))');
    if(!goldenTalentBaharStorageSchemaReady($pdo))
        throw new RuntimeException('Schema repair must pass structural preflight');
    echo "BAHAR Bertina temporary-table schema preflight passed (no production data).\n";
}finally{
    foreach(array_keys($tables) as $table){
        $pdo->exec('DROP TEMPORARY TABLE IF EXISTS '.$table);
    }
}
