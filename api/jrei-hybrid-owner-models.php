<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Owner-only offline model inventory. Metadata review does not install weights,
 * verify performance, select a live model or authorize new Worker job types.
 */
function jrHybridModelRegistryReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT model_id FROM jrei_local_model_registry LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
function jrHybridModelSnapshot(PDO $pdo): array {
    $ready=jrHybridModelRegistryReady($pdo);
    $out=['modelRegistryReady'=>$ready,'registeredModels'=>[]];
    if(!$ready)return $out;
    $q=$pdo->query('SELECT model_id,model_version,model_artifact_sha256,
        source_url,licence_code,licence_url,framework,quantization,
        required_ram_mb,languages,status,revision,weights_installed_verified,
        runtime_verified,measured_tokens_per_second,measured_p95_latency_ms,
        measured_peak_ram_mb,independent_quality_accepted,approved_at
        FROM jrei_local_model_registry
        ORDER BY updated_at DESC,model_id,model_version LIMIT 60');
    foreach($q as $m)$out['registeredModels'][]=[
      'modelId'=>$m['model_id'],'modelVersion'=>$m['model_version'],
      'artifactSha256'=>$m['model_artifact_sha256'],
      'sourceUrl'=>$m['source_url'],'licenceCode'=>$m['licence_code'],
      'licenceUrl'=>$m['licence_url'],
      'framework'=>$m['framework'],'quantization'=>$m['quantization'],
      'requiredRamMb'=>(int)$m['required_ram_mb'],
      'languages'=>$m['languages'],'status'=>$m['status'],
      'revision'=>(int)$m['revision'],
      'weightsInstalledVerified'=>(int)$m['weights_installed_verified']===1,
      'runtimeVerified'=>(int)$m['runtime_verified']===1,
      'independentQualityAccepted'=>(int)$m['independent_quality_accepted']===1,
      'measuredTokensPerSecond'=>$m['measured_tokens_per_second']===null?
          null:(float)$m['measured_tokens_per_second'],
      'measuredP95LatencyMs'=>$m['measured_p95_latency_ms']===null?
          null:(int)$m['measured_p95_latency_ms'],
      'measuredPeakRamMb'=>$m['measured_peak_ram_mb']===null?
          null:(int)$m['measured_peak_ram_mb'],
      'approvedAt'=>$m['approved_at']===null?null:(int)$m['approved_at']
    ];
    return $out;
}
function jrHybridModelOwnerChange(PDO $pdo,string $actor,array $body): array {
    if(!jrHybridModelRegistryReady($pdo))
        throw new DomainException('model_registry_migration_required');
    $action=$body['action']??null;
    $now=time();
    if($action==='propose_local_model'){
        $id=$body['modelId']??null;$version=$body['modelVersion']??null;
        $sha=$body['artifactSha256']??null;
        $url=$body['sourceUrl']??null;$licenceUrl=$body['licenceUrl']??null;
        $licence=$body['licenceCode']??null;$quant=$body['quantization']??null;
        $ram=$body['requiredRamMb']??null;
        foreach([$url,$licenceUrl] as $web){
            if(!is_string($web)||strlen($web)>500||
               filter_var($web,FILTER_VALIDATE_URL)===false||
               parse_url($web,PHP_URL_SCHEME)!=='https'||
               parse_url($web,PHP_URL_USER)!==null||
               parse_url($web,PHP_URL_PASS)!==null)
                throw new InvalidArgumentException('model_source_url_invalid');
        }
        if(!jrHybridIdentifier($id)||!jrHybridIdentifier($version)||
           !jrHybridSha($sha)||
           !is_string($licence)||
           !preg_match('/^[A-Za-z0-9._:+\/-]{3,80}$/D',$licence)||
           !is_string($quant)||!preg_match('/^[A-Za-z0-9._-]{2,40}$/D',$quant)||
           !is_int($ram)||$ram<256||$ram>131072||
           ($body['confirmation']??null)!=='PROPOSE_LICENSED_LOCAL_MODEL_METADATA')
            throw new InvalidArgumentException('invalid_model_proposal');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('INSERT INTO jrei_local_model_registry
              (model_id,model_version,model_artifact_sha256,
              source_url,licence_code,licence_url,quantization,
              required_ram_mb,status,proposed_at,proposed_by_account_id,
              updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
            $q->execute([$id,$version,$sha,$url,$licence,$licenceUrl,
              $quant,$ram,'PENDING',$now,$actor,$now]);
            operationsAudit($pdo,$actor,'jrei_model_metadata_proposed',
              $id.':'.$version);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'modelId'=>$id,'status'=>'PENDING',
           'weightsInstalled'=>false,'runtimeVerified'=>false];
    }
    if(in_array($action,['approve_model_rights','suspend_model_version'],true)){
        $id=$body['modelId']??null;$version=$body['modelVersion']??null;
        $revision=$body['revision']??null;
        $approve=$action==='approve_model_rights';
        if(!jrHybridIdentifier($id)||!jrHybridIdentifier($version)||
           !is_int($revision)||$revision<1||
           ($body['confirmation']??null)!==($approve?
             'RIGHTS_REVIEWED_NO_MODEL_ACTIVATION':
             'SUSPEND_LOCAL_MODEL_METADATA'))
            throw new InvalidArgumentException('model_review_invalid');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT status,revision FROM jrei_local_model_registry
              WHERE model_id=? AND model_version=? FOR UPDATE');
            $q->execute([$id,$version]);$r=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($r)||(int)$r['revision']!==$revision||
              ($approve&&$r['status']!=='PENDING')||
              (!$approve&&!in_array($r['status'],
                ['PENDING','RIGHTS_REVIEWED'],true)))
                throw new DomainException('model_version_conflict');
            $state=$approve?'RIGHTS_REVIEWED':'SUSPENDED';
            $q=$pdo->prepare('UPDATE jrei_local_model_registry
              SET status=?,revision=revision+1,
              approved_at=?,approved_by_account_id=?,suspended_at=?,updated_at=?
              WHERE model_id=? AND model_version=? AND revision=?');
            $q->execute([$state,$approve?$now:null,$approve?$actor:null,
              $approve?null:$now,$now,$id,$version,$revision]);
            if($q->rowCount()!==1)
                throw new DomainException('model_version_conflict');
            operationsAudit($pdo,$actor,$approve?
                'jrei_model_rights_metadata_reviewed':
                'jrei_model_registry_version_suspended',$id.':'.$version);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'modelId'=>$id,'modelVersion'=>$version,
          'status'=>$state,'runtimeVerified'=>false,
          'modelAutomaticallyInstalled'=>false,'modelAutomaticallyActivated'=>false];
    }
    throw new InvalidArgumentException('invalid_model_action');
}
