<?php
declare(strict_types=1);
require_once __DIR__.'/../scripts/bertina-private-recovery-gate.php';

function expectCode(callable $run, string $code): void {
    try { $run(); } catch (RuntimeException $e) {
        if ($e->getMessage()===$code) return;
        throw new RuntimeException('unexpected failure: '.$e->getMessage().' (wanted '.$code.')');
    }
    throw new RuntimeException('missing rejection: '.$code);
}
function cleanFixture(string $dir): void {
    if (is_dir($dir)) {
        foreach (scandir($dir) as $base) {
            if ($base==='.'||$base==='..') continue;
            $file=$dir.'/'.$base;
            if (is_dir($file)&&!is_link($file)) cleanFixture($file);
            else unlink($file);
        }
        rmdir($dir);
    }
}
$fixture=sys_get_temp_dir().'/bertina-gate-unit-'.bin2hex(random_bytes(8));
if (!mkdir($fixture,0700) || !mkdir($fixture.'/site',0700)) throw new RuntimeException('fixture_setup_failed');
$request=json_decode((string)file_get_contents(__DIR__.'/../.bertina-backup-trigger'),true,512,JSON_THROW_ON_ERROR);
$encoded=base64_encode(json_encode($request,JSON_THROW_ON_ERROR));
try {
    $bad=$request;$bad['id']='../../unsafe';
    expectCode(fn()=>drjrRecoveryCheck($fixture.'/site',base64_encode(json_encode($bad)),time()),'recovery_request_invalid');
    $bad=$request;$bad['publicKeyPem']='malicious-key';
    expectCode(fn()=>drjrRecoveryCheck($fixture.'/site',base64_encode(json_encode($bad)),time()),'recovery_public_key_invalid');
    // A real owner certificate passes the static SPKI pin: no private pointer is present.
    expectCode(fn()=>drjrRecoveryCheck($fixture.'/site',$encoded,time()),'recovery_file_invalid');
    symlink($fixture.'/absent-pointer',$fixture.'/.codex-private-backup-current.json');
    expectCode(fn()=>drjrRecoveryCheck($fixture.'/site',$encoded,time()),'recovery_file_invalid');
    unlink($fixture.'/.codex-private-backup-current.json');
    file_put_contents($fixture.'/.codex-private-backup-current.json',json_encode([
        'schema'=>'bertina-private-backup-current-v1',
        'id'=>$request['id'],
        'recipientSpkiSha256'=>'45b0d78e2327a30e1a84017c2293d6c3fa2050cc33bae1766035c250333e50b9'
    ],JSON_THROW_ON_ERROR));
    chmod($fixture.'/.codex-private-backup-current.json',0600);
    expectCode(fn()=>drjrRecoveryCheck($fixture.'/site',$encoded,time()),'recovery_private_directory_invalid');
    $private=$fixture.'/.codex-private-backup-'.$request['id'];
    mkdir($private,0700);
    expectCode(fn()=>drjrRecoveryCheck($fixture.'/site',$encoded,time()),'recovery_file_invalid');
    file_put_contents($private.'/metadata.json','{"ok":false}');
    expectCode(fn()=>drjrRecoveryCheck($fixture.'/site',$encoded,time()),'recovery_file_invalid');
    echo "PASS: 7 owner-pinned fail-closed recovery gate cases; no live host, archive or private key touched.\n";
} finally {
    cleanFixture($fixture);
}
