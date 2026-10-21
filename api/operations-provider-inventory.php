<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/admin-resource-inventory-normalizer.php';

/**
 * MFA-only read model; invoked by the existing operations controller after
 * its administrative authorization gate. No outbound requests, secrets or writes.
 * The deployment build projects the source registry into api/internal because
 * the platform/ source directory is intentionally excluded from public_html.
 */
function operationsProviderInventory(): array {
    $projection=__DIR__.'/internal/free-resources-registry.json';
    $raw=@file_get_contents($projection);
    $data=is_string($raw)&&strlen($raw)<131072?json_decode($raw,true):null;
    $origin='deployed_private_projection';
    if (!is_array($data)||($data['schema']??null)!=='operations-free-resources-v1') {
        // Source-only fallback for developer checkouts, never a second registry.
        $source=dirname(__DIR__).'/platform/free-resources-registry.json';
        $raw=@file_get_contents($source);
        $data=is_string($raw)&&strlen($raw)<131072?json_decode($raw,true):null;
        $origin='canonical_source_registry';
    }
    if (!is_array($data)||!in_array(($data['schema']??null),
        ['operations-free-resources-v1','free-resource-inventory-v1'],true)) {
        return ['status'=>'unavailable','source'=>'none','total'=>0,
            'connected'=>0,'providers'=>[],
            'limitation'=>'Private inventory is unavailable; provider connections cannot be inferred.'];
    }
    $inventory=adminResourceInventoryNormalize($data);
    if ($inventory['total']!==30) {
        return ['status'=>'unavailable','source'=>$origin,'total'=>0,
            'connected'=>0,'providers'=>[],
            'limitation'=>'Resource catalogue is incomplete or malformed; no connection claims made.'];
    }
    $rows=[];
    foreach($inventory['resources'] as $resource) {
        $rows[]=[
            'id'=>$resource['id'],'name'=>$resource['name'],
            'engineId'=>$resource['owner_engine'],'category'=>$resource['category'],
            'officialUrl'=>$resource['official_url'],'accessPath'=>$resource['access_path'],
            'connectionState'=>'unverified','liveMetricsAvailable'=>false,
            'lastObservedAt'=>null,'lastError'=>null,
            'collectionMode'=>'catalogue_only',
            'nextStep'=>'Confirm provider account, authorization, consent and evidence-producing API before marking connected.'
        ];
    }
    return ['status'=>'catalogue_only','source'=>$origin,
        'total'=>count($rows),'connected'=>0,'providers'=>$rows,
        'limitation'=>'Inventory entries are references, not connected accounts or live third-party metrics.'];
}
