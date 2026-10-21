<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Admin-only external-provider inventory projection.
 * Caller MUST enforce existing admin membership and fresh MFA before returning
 * this structure. This helper makes no outbound calls and reveals no secrets.
 * A catalogue entry is never evidence of a live connection.
 */
function operationsProviderInventory(): array {
    $path=dirname(__DIR__).'/platform/free-resources-registry.json';
    $raw=@file_get_contents($path);
    $source=is_string($raw)?json_decode($raw,true):null;
    if (!is_array($source) || ($source['schema']??null)!=='free-resource-inventory-v1'
        || !is_array($source['resources']??null)) {
        return ['status'=>'unavailable','source'=>'free-resource-inventory-v1',
            'total'=>0,'connected'=>0,'providers'=>[],
            'limitation'=>'Source inventory unavailable; no connection state can be inferred.'];
    }
    $rows=[];$seen=[];
    foreach ($source['resources'] as $provider) {
        if (!is_array($provider))continue;
        $id=(string)($provider['id']??'');
        $name=(string)($provider['name']??'');
        $engine=(string)($provider['owner_engine']??'');
        $url=(string)($provider['official_url']??'');
        if (!preg_match('/^[a-z0-9][a-z0-9-]{1,79}$/D',$id)
            || isset($seen[$id]) || $name==='' || !preg_match('/^ENG-(0[1-9]|1[0-3])$/D',$engine)
            || !filter_var($url,FILTER_VALIDATE_URL)
            || parse_url($url,PHP_URL_SCHEME)!=='https')continue;
        $seen[$id]=true;
        $rows[]=[
            'id'=>$id,'name'=>mb_substr($name,0,160),'engineId'=>$engine,
            'category'=>(string)($provider['category']??''),
            'officialUrl'=>$url,
            'accessPath'=>(string)($provider['access_path']??''),
            'connectionState'=>'unverified',
            'liveMetricsAvailable'=>false,
            'lastObservedAt'=>null,
            'lastError'=>null,
            'collectionMode'=>'catalogue_only',
            'nextStep'=>'Review provider account, permission, consent and API adapter before enabling collection.'
        ];
    }
    return ['status'=>'catalogue_only','source'=>'free-resource-inventory-v1',
        'total'=>count($rows),'connected'=>0,'providers'=>$rows,
        'limitation'=>'The listed providers are candidates, not verified connections. No live statistics are collected by this function.'];
}
