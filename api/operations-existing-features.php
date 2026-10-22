<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Source discovery inventory, not a feature-flag or live-health oracle.
 * All cards belong to the 13 existing ENG domains, never a 14th engine.
 */
function operationsExistingFeatures(): array {
    $file=__DIR__.'/internal/operations-existing-features.json';
    $raw=@file_get_contents($file);
    $value=is_string($raw)&&strlen($raw)<65536?json_decode($raw,true):null;
    if(!is_array($value)||($value['schema']??null)!=='operations-existing-feature-catalogue-v1'
       ||!is_array($value['features']??null)||count($value['features'])>50)
        return ['ok'=>true,'schema'=>'operations-existing-feature-catalogue-v1',
            'status'=>'source_projection_unavailable','total'=>null,'features'=>[],
            'limitation'=>'Private source discovery has not been deployed.'];
    $seen=[];$features=[];
    foreach($value['features'] as $feature) {
        if(!is_array($feature))continue;
        $id=(string)($feature['id']??'');
        $engine=(string)($feature['engineId']??'');
        $state=(string)($feature['sourceState']??'');
        if(!preg_match('/^[a-z0-9-]{2,80}$/D',$id)||isset($seen[$id])
           ||!preg_match('/^ENG-(0[1-9]|1[0-3])$/D',$engine)
           ||!in_array($state,['source_present','source_incomplete'],true))continue;
        $seen[$id]=true;
        $features[]=[
            'id'=>$id,'engineId'=>$engine,
            'nameFa'=>(string)($feature['nameFa']??$id),
            'nameEn'=>(string)($feature['nameEn']??$id),
            'sourceState'=>$state,
            'sourceFiles'=>$feature['sources']??[],
            'controlPolicy'=>(string)($feature['controlPolicy']??'unknown'),
            'adminTarget'=>(string)($feature['adminTarget']??''),
            'productionState'=>'not_independently_verified',
            'canDisableWithoutApproval'=>false,
        ];
    }
    return ['ok'=>true,'schema'=>'operations-existing-feature-catalogue-v1',
        'status'=>count($features)===(int)($value['total']??-1)?'source_inventory':'partial',
        'total'=>count($features),'generatedAt'=>$value['generatedAt']??null,
        'features'=>$features,
        'limitation'=>'Source presence is not operational activation. Canonical redirects, security controls, private authentication and payments must not be disabled automatically.'];
}
