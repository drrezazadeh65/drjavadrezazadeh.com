<?php
declare(strict_types=1);
/**
 * Bertina-host-managed release preflight.
 *
 * Owner instruction 2026-10-14: hosting provider handles automatic backups.
 * The deployment pipeline MUST NOT inspect, generate, prune or require backups
 * in this mode. This gate ONLY compares the expected trusted live stamp with
 * the exact file currently installed, before a new release is extracted.
 *
 * Historical signed-restore/cPanel recovery helpers remain opt-in utilities,
 * not prerequisites for this host-managed development mode.
 */
function drjrHostingManagedReleaseCheck(string $siteRoot,string $expectedLiveSha): array {
    if(preg_match('/^[a-f0-9]{40}$/D',$expectedLiveSha)!==1)
        throw new RuntimeException('hosting_release_expected_sha_invalid');
    $root=realpath($siteRoot);
    if($root===false||is_link($siteRoot)||basename($root)!=='public_html')
        throw new RuntimeException('hosting_release_root_invalid');
    $swPath=$root.'/sw.js';
    if(!is_file($swPath)||is_link($swPath))
        throw new RuntimeException('hosting_release_live_stamp_missing');
    $live=@file_get_contents($swPath);
    if(!is_string($live))throw new RuntimeException('hosting_release_live_stamp_unreadable');
    $matches=[];
    if(preg_match_all("/^const CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})';$/m",$live,$matches)!==1
        ||!isset($matches[1][0])
        ||!hash_equals($expectedLiveSha,(string)$matches[1][0]))
        throw new RuntimeException('hosting_release_live_stamp_drift');
    return [
        'schema'=>'bertina-host-managed-release-preflight-v1',
        'mode'=>'hosting_managed',
        'verifiedLiveSha'=>$expectedLiveSha,
        'backupChecked'=>false,
        'backupRestorationCertified'=>false,
        'source'=>'owner-authorized-provider-backup-responsibility'
    ];
}
