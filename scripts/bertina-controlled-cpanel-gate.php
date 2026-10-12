<?php
// Include-only alternative to the pinned RSA restore gate. READ ONLY.
// Explicit owner risk acceptance is checked by a manual GitHub Actions dispatch.
// This check verifies local custody/readability of two cPanel backups, NOT a
// verified isolated restore, recoverable SQL contents, or bank settlement.
function drjrCpanelFail(string $reason): never {
    throw new RuntimeException('cpanel_' . $reason);
}
function drjrCpanelBackupCheck(string $siteRoot, string $expectedLiveSha, int $now): array {
    if (!preg_match('/^[a-f0-9]{40}$/D', $expectedLiveSha)) drjrCpanelFail('sha_invalid');
    $root=realpath($siteRoot);
    if ($root===false || is_link($siteRoot) || basename($root)!=='public_html')
        drjrCpanelFail('site_root_invalid');
    $home=dirname($root);
    if ($home==='/' || is_link($home) || !is_dir($home)) drjrCpanelFail('home_invalid');
    $live=@file_get_contents($root.'/sw.js');
    if (!is_string($live) ||
        !preg_match("/^const CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})';$/m",$live,$match) ||
        !hash_equals($expectedLiveSha,$match[1]))
        drjrCpanelFail('live_release_drift');
    $files=[
        'backup-10.12.2026_23-23-00_drjavad1.tar.gz',
        'backup-10.12.2026_23-32-32_drjavad1.tar.gz'
    ];
    $evidence=[];
    foreach ($files as $name) {
        $path=$home.'/'.$name;
        clearstatcache(true,$path);
        if (is_link($path) || !is_file($path) || realpath($path)!==$path)
            drjrCpanelFail('backup_missing_or_symlink');
        if ((fileperms($path)&0777)!==0600 || fileowner($path)!==fileowner($root))
            drjrCpanelFail('backup_permissions_or_owner');
        $size=filesize($path);
        $mtime=filemtime($path);
        if (!is_int($size) || $size<134217728 || $size>2147483648 ||
            !is_int($mtime) || $mtime>$now+60 || $now-$mtime>7*86400)
            drjrCpanelFail('backup_size_or_age');
        $fp=@fopen($path,'rb');
        if (!$fp) drjrCpanelFail('backup_unreadable');
        try { $magic=fread($fp,3); } finally { fclose($fp); }
        if ($magic!=="\x1f\x8b\x08") drjrCpanelFail('backup_not_gzip');
        $digest=@hash_file('sha256',$path);
        if (!is_string($digest) || !preg_match('/^[a-f0-9]{64}$/D',$digest))
            drjrCpanelFail('backup_hash_read_failed');
        clearstatcache(true,$path);
        if (filesize($path)!==$size || filemtime($path)!==$mtime)
            drjrCpanelFail('backup_changed_during_check');
        $evidence[]=['file'=>$name,'bytes'=>$size,'sha256'=>$digest];
    }
    return [
        'schema'=>'drjavad-controlled-cpanel-backup-observation-v1',
        'mode'=>'owner_cpanel_custody',
        'verifiedLiveReleaseSha'=>$expectedLiveSha,
        'observedBackups'=>$evidence,
        'isolatedRestoreVerified'=>false,
        'scope'=>'owner_accepted_cpanel_backup_custody_NOT_test_restoration'
    ];
}
