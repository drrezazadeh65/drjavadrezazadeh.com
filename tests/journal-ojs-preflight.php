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

/**
 * All administrative flags may be present while the journal is not installed.
 * An absent OJS configuration must still prevent an approval, without reading
 * production settings or creating a real manuscript.
 */
$env = [
    'JHELA_OJS_CONFIG_FILE' => '/nonexistent/jhela-config-'.bin2hex(random_bytes(8)).'.inc.php',
    'JHELA_OJS_INSTALL_VERIFIED' => 'true',
    'JHELA_EDITORIAL_E2E_PASSED' => 'true',
    'JHELA_ROLE_SECURITY_TESTS_PASSED' => 'true',
    'JHELA_SMTP_DELIVERY_VERIFIED' => 'true',
    'JHELA_BACKUP_RESTORE_VERIFIED' => 'true',
    'JR_PUBLIC_TLS_CONFIRMED' => 'true',
];
$cmd = array_merge($env, []);
$descriptors=[1=>['pipe','w'],2=>['pipe','w']];
$process = proc_open([PHP_BINARY,$target],$descriptors,$pipes,null,$cmd);
if (!is_resource($process)) throw new RuntimeException('Probe cannot run with isolated environment');
$second=stream_get_contents($pipes[1]);$stderr=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);
$secondStatus=proc_close($process);
$observed=json_decode((string)$second,true);
if ($secondStatus!==2 || !is_array($observed) || ($observed['ready_for_public_submission']??null)!==false) {
    throw new RuntimeException('Administrator flags bypassed OJS installation gate');
}
$checksById=[];
foreach ($observed['checks'] as $check) $checksById[$check['id']]=$check['pass'];
if (($checksById['ojs_configuration']??null)!==false || ($checksById['ojs_installed']??null)!==false) {
    throw new RuntimeException('Missing OJS configuration falsely passed');
}
echo "PASS: asserted flags without OJS installation remain blocked\\n";
