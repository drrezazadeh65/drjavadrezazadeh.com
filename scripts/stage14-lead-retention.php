<?php
declare(strict_types=1);
/** Bertina CLI-only dry-run retention task for stage14 consented lead metadata.
 * Not a web endpoint and never part of public page traffic.
 * Operators must supply private auth DB config and separately enable purging.
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$args=$argv??[];
$execute=in_array('--purge',$args,true);
if ($execute && getenv('JR_STAGE14_RETENTION_ENABLED') !== 'true') {
    fwrite(STDERR,"stage14_retention_not_authorized\n");
    exit(2);
}
$private=dirname(__DIR__).'/api/config.local.php';
if (!is_file($private)) { fwrite(STDERR,"stage14_private_db_config_missing\n");exit(2); }
$c=require $private;
if (!is_array($c) || !is_string($c['db_dsn']??null) || !is_string($c['db_user']??null)
    || !is_string($c['db_password']??null) || $c['db_dsn']==='' || $c['db_user']==='') {
    fwrite(STDERR,"stage14_private_db_config_invalid\n");exit(2);
}
try {
    $pdo=new PDO($c['db_dsn'],$c['db_user'],$c['db_password'],[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
    ]);
    $cut=time();$withdrawnCut=$cut-30*86400;
    $select=$pdo->prepare("SELECT COUNT(*) AS total FROM growth_lead_requests WHERE expires_at<? OR (state='WITHDRAWN' AND consent_withdrawn_at IS NOT NULL AND consent_withdrawn_at<?)");
    $select->execute([$cut,$withdrawnCut]);
    $n=(int)$select->fetchColumn();
    if (!$execute) { echo "stage14_retention_dry_run eligible=".$n."\n";exit(0); }
    $pdo->beginTransaction();
    try {
        $delete=$pdo->prepare("DELETE FROM growth_lead_requests WHERE expires_at<? OR (state='WITHDRAWN' AND consent_withdrawn_at IS NOT NULL AND consent_withdrawn_at<?)");
        $delete->execute([$cut,$withdrawnCut]);$removed=$delete->rowCount();
        $pdo->commit();echo "stage14_retention_deleted_count=".$removed."\n";exit(0);
    } catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
} catch(Throwable $e){
    // Never print raw provider responses, DSN, credentials or customer content.
    fwrite(STDERR,"stage14_retention_database_unavailable\n");
    exit(2);
}
