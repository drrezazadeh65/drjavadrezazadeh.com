<?php
declare(strict_types=1);
/**
 * Synthetic-only ephemeral MariaDB acceptance for approved-source catalogue.
 * Never run using a production DSN. No application credentials or PII.
 */
$dsn=(string)(getenv('JR_KONKUR_CI_DSN') ?: '');
if (!str_starts_with($dsn,'mysql:host=127.0.0.1;')
    || !str_contains($dsn,'dbname=drjavad1_store')
    || getenv('JR_KONKUR_SYNTHETIC_FIXTURE') !== 'true') {
    fwrite(STDERR,"Refusing to run without explicit local synthetic MariaDB fixture.\n");
    exit(2);
}
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/konkur-admission.php';
$pdo=new PDO($dsn,(string)(getenv('JR_KONKUR_CI_USER') ?: 'root'),
    (string)(getenv('JR_KONKUR_CI_PASSWORD') ?: ''),[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES=>false,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    ]);
function must(bool $condition,string $message): void {
    if(!$condition)throw new RuntimeException('Fixture assertion failed: '.$message);
}
function fixtureId(PDO $pdo,string $table,string $marker,string $value): string {
    if(!in_array($table,['eco_admission_cycles','eco_admission_documents',
       'eco_admission_document_pages','eco_admission_programme_offerings'],true))throw new RuntimeException('bad fixture table');
    if(!in_array($marker,['scope_code','document_code','printed_page_label','programme_location_code'],true))throw new RuntimeException('bad fixture marker');
    $sql='SELECT id FROM '.$table.' WHERE '.$marker.'=? LIMIT 1';
    $q=$pdo->prepare($sql);$q->execute([$value]);$id=$q->fetchColumn();
    must(is_string($id)&&$id!=='','synthetic row absent '.$table);
    return $id;
}
function records(PDO $pdo,int $year,string $group=''): array {
    $sql=konkurApprovedCatalogueSql()."\nAND c.admission_year=:year";
    if($group!=='')$sql.="\nAND p.examination_group_code=:group";
    $sql.="\nORDER BY p.programme_location_code LIMIT :lim";
    $q=$pdo->prepare($sql);
    $q->bindValue(':year',$year,PDO::PARAM_INT);
    if($group!=='')$q->bindValue(':group',$group,PDO::PARAM_STR);
    $q->bindValue(':lim',20,PDO::PARAM_INT);
    $q->execute();
    return $q->fetchAll(PDO::FETCH_ASSOC);
}
must(konkurCatalogueSchemaReady($pdo),'complete reviewed-schema gate');
$offering=fixtureId($pdo,'eco_admission_programme_offerings','programme_location_code','00001');
$cycle=fixtureId($pdo,'eco_admission_cycles','scope_code','SYNTHETIC_FIXTURE');
$document=fixtureId($pdo,'eco_admission_documents','document_code','SYNTHETIC_NOT_OFFICIAL');
$page=fixtureId($pdo,'eco_admission_document_pages','printed_page_label','SYNTHETIC PAGE');
$reviewer=$pdo->query("SELECT approved_by_account_id FROM eco_admission_cycles WHERE scope_code='SYNTHETIC_FIXTURE' LIMIT 1")->fetchColumn();
must(is_string($reviewer),'synthetic account exists');
must(count(records($pdo,1403,'SYNTHETIC'))===1,'approved fixture visible only to source-cited catalogue');
must(records($pdo,1403,'SYNTHETIC')[0]['sourceDocument']==='SYNTHETIC_NOT_OFFICIAL','document provenance intact');
must(count(records($pdo,1405))===0,'six owner-confirmed guide drafts never published');
must(count(records($pdo,1403,'MATHEMATICS'))===0,'group restriction excludes fixture');

$set=$pdo->prepare('UPDATE eco_admission_programme_offerings SET conditions_review_state=? WHERE id=?');
$set->execute(['UNREVIEWED',$offering]);
must(count(records($pdo,1403))===0,'incomplete special conditions block publication');
$set->execute(['COMPLETE',$offering]);
must(count(records($pdo,1403))===1,'fully reviewed fixture reappears');

$set=$pdo->prepare('UPDATE eco_admission_document_pages SET page_review_state=? WHERE id=?');
$set->execute(['UNREVIEWED',$page]);
must(count(records($pdo,1403))===0,'unreviewed original PDF page blocks publication');
$set->execute(['REVIEWED',$page]);

$set=$pdo->prepare('UPDATE eco_admission_documents SET document_review_state=? WHERE id=?');
$set->execute(['OWNER_CONFIRMED',$document]);
must(count(records($pdo,1403))===0,'issuer confirmation alone insufficient for publication');
$set->execute(['QA_APPROVED',$document]);
must(count(records($pdo,1403))===1,'human source review reactivates verified fixture');

$successor=bin2hex(random_bytes(16));
$pdo->prepare("INSERT INTO eco_admission_documents(id,cycle_id,document_code,revision_no,document_kind,issuer_code,
 supersedes_document_id,document_review_state) VALUES (?,?, 'SYNTHETIC_AMENDMENT',1,'AMENDMENT','SANJESH',?,'DRAFT')")
 ->execute([$successor,$cycle,$document]);
must(count(records($pdo,1403))===0,'pending amendment blocks superseded guide');
$pdo->prepare('DELETE FROM eco_admission_documents WHERE id=?')->execute([$successor]);
must(count(records($pdo,1403))===1,'no amendment restores reviewed source');

$newer=bin2hex(random_bytes(16));
$pdo->prepare("INSERT INTO eco_admission_programme_offerings (
 id,cycle_id,examination_group_code,admission_track_code,programme_location_code,
 record_revision,official_institution_name,programme_title,source_page_id,normalized_row_sha256,
 conditions_review_state,review_state)
 VALUES (?,?,?,?,?,2,'SYNTHETIC','SYNTHETIC UPDATED',?,?,'UNREVIEWED','DRAFT')")
 ->execute([$newer,$cycle,'SYNTHETIC','SYNTHETIC_TRACK','00001',$page,str_repeat('d',64)]);
must(count(records($pdo,1403))===0,'unreviewed newer code revision blocks older publication');
$pdo->prepare('DELETE FROM eco_admission_programme_offerings WHERE id=?')->execute([$newer]);
must(count(records($pdo,1403))===1,'removing hypothetical revision restores fixture');

$condition=bin2hex(random_bytes(16));
$pdo->prepare("INSERT INTO eco_admission_offering_conditions (
 id,offering_id,condition_code,condition_kind,official_text_excerpt,source_page_id,review_state)
 VALUES (?,?, 'SYNTHETIC_CONDITION','GENERAL','SYNTHETIC NOT A REAL ADMISSION CONDITION',?,'DRAFT')")
 ->execute([$condition,$offering,$page]);
must(count(records($pdo,1403))===0,'unreviewed condition blocks even approved offering');
$pdo->prepare("UPDATE eco_admission_offering_conditions SET review_state='APPROVED',approved_by_account_id=?,approved_at=NOW(3) WHERE id=?")
 ->execute([$reviewer,$condition]);
must(count(records($pdo,1403))===1,'individually approved condition passes');
echo "PASS: approved-only catalogue, cycle/group isolation, special conditions, PDF review, amendments and versions; entirely ephemeral synthetic database.\n";
