<?php
declare(strict_types=1);
$target = realpath(__DIR__.'/../scripts/journal-ojs-preflight.php');
if ($target === false) throw new RuntimeException('Missing preflight');
$output=[]; $status=0;
exec(escapeshellarg(PHP_BINARY).' '.escapeshellarg($target).' 2>&1', $output, $status);
$data=json_decode(implode("\n",$output),true);
if (!is_array($data) || ($data['application']??null)!=='JHELA' || !is_array($data['checks']??null)) throw new RuntimeException('Malformed JSON');
if ($status!==2 || ($data['ready_for_public_submission']??null)!==false) throw new RuntimeException('Default must fail closed');
$ids=array_column($data['checks'],'id');
foreach (['ojs_configuration','private_storage','verified_mail','backup_restore','authorization_tests','ojs_installed','editorial_e2e'] as $id) {
    if (!in_array($id,$ids,true)) throw new RuntimeException('Missing gate '.$id);
}
echo "PASS: default JHELA submissions remain closed until verified\n";
