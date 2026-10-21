<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Pure adapter for the existing resource inventory and its deploy-time
 * MFA-only projection. No provider connections are created or inferred.
 */
function adminResourceInventoryNormalize(array $registry): array
{
    $resources=$registry['resources']??null;
    if (!is_array($resources) || count($resources)>100) {
        return ['total'=>0,'connected'=>0,'unverified'=>0,'resources'=>[]];
    }
    $items=[];$seen=[];
    foreach ($resources as $resource) {
        if (!is_array($resource)) continue;
        $id=(string)($resource['id']??'');
        $engine=(string)($resource['ownerEngine']??$resource['owner_engine']??'');
        $url=(string)($resource['url']??$resource['official_url']??'');
        if (!preg_match('/^[a-z0-9][a-z0-9-]{1,79}$/D',$id)
            || isset($seen[$id]) || !preg_match('/^ENG-(0[1-9]|1[0-3])$/D',$engine)
            || !filter_var($url,FILTER_VALIDATE_URL)
            || parse_url($url,PHP_URL_SCHEME)!=='https') continue;
        $seen[$id]=true;
        $items[]=[
            'id'=>$id,'name'=>(string)($resource['name']??$id),
            'owner_engine'=>$engine,'category'=>(string)($resource['category']??''),
            'access_path'=>(string)($resource['accessPath']??$resource['access_path']??''),
            'connection_status'=>'UNVERIFIED','live_metrics'=>'UNAVAILABLE',
            'official_url'=>$url
        ];
    }
    return [
        'total'=>count($items),'connected'=>0,
        'unverified'=>count($items),'resources'=>$items
    ];
}
