<?php
declare(strict_types=1);
require __DIR__.'/../scripts/bertina-hosting-managed-release.php';
function checkHostedRefusal(callable $fn,string $expected): void {
    try {$fn();} catch(RuntimeException $e) {
        if($e->getMessage()===$expected){echo "PASS ".$expected."\n";return;}
        throw $e;
    }
    throw new RuntimeException('hosting_gate_fail_open_'.$expected);
}
$root=sys_get_temp_dir().'/hosting-managed-'.bin2hex(random_bytes(8));
$site=$root.'/public_html';
if(!mkdir($root,0700)||!mkdir($site,0700))
    throw new RuntimeException('hosting_fixture_create_failed');
$first=str_repeat('a',40);
$next=str_repeat('b',40);
try {
    checkHostedRefusal(fn()=>drjrHostingManagedReleaseCheck($site,$first),
        'hosting_release_live_stamp_missing');
    file_put_contents($site.'/sw.js',"const CACHE_VERSION='jr-site-bertina-$first';\n");
    $checked=drjrHostingManagedReleaseCheck($site,$first);
    if(($checked['verifiedLiveSha']??null)!==$first ||
       ($checked['mode']??null)!=='hosting_managed' ||
       ($checked['backupChecked']??null)!==false ||
       ($checked['backupRestorationCertified']??null)!==false)
        throw new RuntimeException('hosting_gate_evidence_incorrect');
    echo "PASS hosting-managed release requires no backup files\n";
    checkHostedRefusal(fn()=>drjrHostingManagedReleaseCheck($site,$next),
        'hosting_release_live_stamp_drift');
    checkHostedRefusal(fn()=>drjrHostingManagedReleaseCheck($site,'not-a-sha'),
        'hosting_release_expected_sha_invalid');
    file_put_contents($site.'/sw.js',"const CACHE_VERSION='jr-site-bertina-$first';\nconst CACHE_VERSION='jr-site-bertina-$first';\n");
    checkHostedRefusal(fn()=>drjrHostingManagedReleaseCheck($site,$first),
        'hosting_release_live_stamp_drift');
    unlink($site.'/sw.js');
    file_put_contents($root.'/outside-sw.js',"const CACHE_VERSION='jr-site-bertina-$first';\n");
    symlink($root.'/outside-sw.js',$site.'/sw.js');
    checkHostedRefusal(fn()=>drjrHostingManagedReleaseCheck($site,$first),
        'hosting_release_live_stamp_missing');
    echo "PASS host-managed gate protects exact pre-extraction live stamp only\n";
} finally {
    if(is_link($site.'/sw.js')||is_file($site.'/sw.js'))unlink($site.'/sw.js');
    if(is_file($root.'/outside-sw.js'))unlink($root.'/outside-sw.js');
    rmdir($site);
    rmdir($root);
}
