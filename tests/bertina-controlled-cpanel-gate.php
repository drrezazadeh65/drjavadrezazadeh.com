<?php
declare(strict_types=1);
require __DIR__.'/../scripts/bertina-controlled-cpanel-gate.php';
function checkCase(callable $fn,string $expected):void {
    try{$fn();}catch(RuntimeException $e){
        if($e->getMessage()==='cpanel_'.$expected){echo "PASS rejected ".$expected."\n";return;}
        throw new RuntimeException("Unexpected failure ".$e->getMessage()." expected ".$expected);
    }
    throw new RuntimeException("Failed open for ".$expected);
}
function makeBackup(string $path):void {
    $fp=fopen($path,'w+b');
    fwrite($fp,"\x1f\x8b\x08");
    ftruncate($fp,134217728);
    fclose($fp);
    chmod($path,0600);
}
$base=sys_get_temp_dir().'/drjr-cpanel-gate-'.bin2hex(random_bytes(8));
$site=$base.'/public_html';
if(!mkdir($base,0700)||!mkdir($site,0700))throw new RuntimeException('fixture_mkdir');
$old=str_repeat('a',40);
$changed=str_repeat('b',40);
$paths=[
    $base.'/backup-10.12.2026_23-23-00_drjavad1.tar.gz',
    $base.'/backup-10.12.2026_23-32-32_drjavad1.tar.gz',
];
$rotated=$base.'/backup-2026-10-13_10-00-00_drjavad1.tar.gz';
try {
    checkCase(fn()=>drjrCpanelBackupCheck($site,$old,time()),'live_release_drift');
    file_put_contents($site.'/sw.js',"const CACHE_VERSION='jr-site-bertina-$old';\n");
    checkCase(fn()=>drjrCpanelBackupCheck($site,$changed,time()),'live_release_drift');
    checkCase(fn()=>drjrCpanelBackupCheck($site,$old,time()),'backup_missing_or_symlink');
    foreach($paths as $path)makeBackup($path);
    touch($paths[0],time()-5);
    $evidence=drjrCpanelBackupCheck($site,$old,time());
    if(count($evidence['observedBackups'])!==1 ||
       $evidence['observedBackups'][0]['file']!==basename($paths[1]) ||
       $evidence['isolatedRestoreVerified']!==false ||
       $evidence['scope']!=='owner_accepted_cpanel_backup_custody_NOT_test_restoration')
        throw new RuntimeException('single_newest_backup_contract_failed');
    echo "PASS newest single readable gzip backup selected; isolated restore is not claimed\n";
    chmod($paths[1],0644);
    checkCase(fn()=>drjrCpanelBackupCheck($site,$old,time()),'backup_permissions_or_owner');
    chmod($paths[1],0600);
    touch($paths[0],time()+120);
    touch($paths[1],time()+120);
    checkCase(fn()=>drjrCpanelBackupCheck($site,$old,time()),'backup_size_or_future_date');
    touch($paths[1]);
    unlink($paths[1]);
    symlink($paths[0],$paths[1]);
    checkCase(fn()=>drjrCpanelBackupCheck($site,$old,time()),'backup_missing_or_symlink');
    unlink($paths[1]);
    makeBackup($paths[1]);
    makeBackup($rotated);
    touch($rotated,time()+1);
    $rotation=drjrCpanelBackupCheck($site,$old,time());
    if(count($rotation['observedBackups'])!==1 ||
       $rotation['observedBackups'][0]['file']!==basename($rotated))
        throw new RuntimeException('dated_backup_rotation_failed');
    echo "PASS date-stamped backup rotation is accepted; no hard-coded backup filename\n";
    file_put_contents($site.'/sw.js',"const CACHE_VERSION='jr-site-bertina-$changed';\n");
    checkCase(fn()=>drjrCpanelBackupCheck($site,$old,time()),'live_release_drift');
    echo "PASS: controlled cPanel gate is read-only, fail-closed, and never claims restoration.\n";
}finally{
    foreach(array_merge($paths,[$rotated]) as $path)if(file_exists($path)||is_link($path))unlink($path);
    if(is_file($site.'/sw.js'))unlink($site.'/sw.js');
    rmdir($site);rmdir($base);
}
