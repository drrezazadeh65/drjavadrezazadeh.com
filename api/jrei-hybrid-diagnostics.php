<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Explain observed dispatch readiness WITHOUT attempting a lease or running
 * an evaluation. This is purely an owner-facing source-owned projection.
 *
 * A matching digest ADVERTISEMENT is never called a verified dataset file.
 * Only real end-to-end acceptance may establish successful processing.
 */
function jrHybridOwnerDispatchDiagnostics(array $snapshot): array {
    $result=['schema'=>'jr.jrei.dispatch-diagnostics.v1',
      'scientificallyValidated'=>false,
      'realProcessingEndToEndVerified'=>false,'nodes'=>[]];
    $nodes=is_array($snapshot['nodes']??null)?$snapshot['nodes']:[];
    $offers=is_array($snapshot['nodeOffers']??null)?
      $snapshot['nodeOffers']:[];
    $jobs=is_array($snapshot['jobs']??null)?$snapshot['jobs']:[];
    $records=is_array($snapshot['datasets']??null)?
      $snapshot['datasets']:[];
    $active=[];
    foreach($records as $r)if(($r['status']??null)==='APPROVED')
        $active[]=$r;
    foreach($nodes as $node){
        $id=$node['nodeId']??null;
        if(!is_string($id))continue;
        $owned=[];
        foreach($offers as $offer)
            if(($offer['nodeId']??null)===$id)
                $owned[]=$offer;
        $compatible=[];
        foreach($owned as $offer)
            if(($offer['matchesApprovedVersion']??false)===true)
                $compatible[]=$offer;
        $reason=null;
        if(($snapshot['backendEnabled']??null)!==true)
            $reason='PRIVATE_BACKEND_DISABLED';
        elseif(($node['revoked']??false)===true)
            $reason='WORKER_KEY_REVOKED';
        elseif(($node['ownerEnabled']??false)!==true)
            $reason='OWNER_NODE_DISABLED';
        elseif(($node['state']??null)==='OFFLINE')
            $reason='NO_RECENT_SIGNED_HEARTBEAT';
        elseif(($node['state']??null)==='MAINTENANCE')
            $reason='WORKER_MAINTENANCE';
        elseif(($node['state']??null)==='BUSY')
            $reason='WORKER_BUSY_OR_RESOURCE_LIMIT';
        elseif(($node['state']??null)!=='ONLINE'&&
               ($node['state']??null)!=='DEGRADED')
            $reason='WORKER_STATE_UNCONFIRMED';
        elseif(($snapshot['catalogueReady']??false)!==true)
            $reason='GOVERNED_CORPUS_MIGRATION_NOT_APPLIED';
        elseif(!$active)
            $reason='NO_APPROVED_PUBLIC_CORPUS';
        elseif(($snapshot['nodeOffersAvailable']??false)!==true)
            $reason='WORKER_OFFER_REGISTRY_UNAVAILABLE';
        elseif(!$owned)
            $reason='WORKER_HAS_NO_RECENT_CORPUS_DECLARATION';
        elseif(!$compatible)
            $reason='NODE_DATASET_VERSION_OR_HASH_NOT_APPROVED';
        else{
            $queueMatched=false;
            foreach($jobs as $job){
                if(($job['status']??null)!=='QUEUED')continue;
                foreach($compatible as $offer){
                    if(($job['datasetId']??null)===$offer['datasetId']&&
                       ($job['evaluationVersion']??null)===$offer['evaluationVersion']){
                        $queueMatched=true;break 2;
                    }
                }
            }
            $reason=$queueMatched?'CAN_ATTEMPT_APPROVED_LEASE':
              'NO_MATCHING_QUEUED_EVALUATION';
        }
        $result['nodes'][]=[
          'nodeId'=>$id,'reason'=>$reason,
          'matchingDatasetDeclarations'=>count($compatible),
          'advertisedDatasetDeclarations'=>count($owned),
          'leaseGuaranteed'=>false,'locallyInstalledCorpusVerified'=>false
        ];
    }
    return $result;
}
