<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Read-only explanation of signed-node lease eligibility.
 * Every match is a DECLARATION, not verified local file possession; no
 * diagnosis can certify scientific validity, model uptime or final acceptance.
 */
function jrHybridOwnerDispatchDiagnostics(PDO $pdo,array $snapshot): array {
    $rows=[];
    $nodes=is_array($snapshot['nodes']??null)?$snapshot['nodes']:[];
    $offers=is_array($snapshot['nodeOffers']??null)?$snapshot['nodeOffers']:[];
    $catalogue=($snapshot['catalogueReady']??false)===true;
    $offersReady=($snapshot['nodeOffersAvailable']??false)===true;
    $now=time();
    foreach($nodes as $n){
        $id=$n['nodeId']??null;
        if(!jrHybridUuid($id))continue;
        $state=$n['state']??null;
        $reason=null;$matching=0;
        if(($snapshot['backendEnabled']??false)!==true)
            $reason='BACKEND_DISABLED';
        elseif(($n['revoked']??false)===true)
            $reason='NODE_REVOKED';
        elseif(($n['ownerEnabled']??false)!==true)
            $reason='OWNER_DISABLED';
        elseif($state==='OFFLINE')
            $reason='NODE_OFFLINE';
        elseif($state==='BUSY')
            $reason='NODE_REPORTS_BUSY';
        elseif(!in_array($state,['ONLINE','DEGRADED'],true))
            $reason='NODE_NOT_ELIGIBLE';
        elseif(!$catalogue)
            $reason='CATALOGUE_NOT_MIGRATED';
        elseif(!$offersReady)
            $reason='OFFER_RECORDS_NOT_AVAILABLE';
        else{
            $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_hybrid_jobs
                WHERE status='LEASED' AND leased_to_node=?
                AND lease_expires_at>=?");
            $q->execute([$id,$now]);
            if((int)$q->fetchColumn()>0){
                $reason='WORKER_HAS_ACTIVE_LEASE';
            }else{
                $hasMatchedOffer=false;
                foreach($offers as $offer)
                    if(($offer['nodeId']??null)===$id&&
                       ($offer['matchesApprovedVersion']??false)===true){
                        $hasMatchedOffer=true;break;
                    }
                if(!$hasMatchedOffer){
                    $reason='NO_APPROVED_LOCAL_CORPUS';
                }else{
                    // Direct mother-DB join avoids false "empty queue" when
                    // relevant queued jobs fall outside the recent UI list.
                    $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_hybrid_jobs j
                        INNER JOIN jrei_hybrid_node_offers o
                          ON o.dataset_id=j.requested_dataset_id
                         AND o.dataset_sha256=j.dataset_sha256
                         AND o.evidence_sha256=j.evidence_sha256
                         AND o.evaluation_version=j.evaluation_version
                        INNER JOIN jrei_hybrid_public_datasets d
                          ON d.dataset_id=o.dataset_id
                         AND d.evaluation_version=o.evaluation_version
                         AND d.dataset_sha256=o.dataset_sha256
                         AND d.evidence_sha256=o.evidence_sha256
                        WHERE o.node_id=? AND o.last_advertised_at>=?
                          AND d.status='APPROVED' AND j.status='QUEUED'
                          AND j.expires_at>=?");
                    $q->execute([$id,$now-120,$now]);
                    $matching=(int)$q->fetchColumn();
                    $reason=$matching>0?'APPROVED_JOB_WAITING_FOR_POLL':
                       'NO_QUEUED_JOB_FOR_LOCAL_CORPUS';
                }
            }
        }
        $rows[]=[
          'nodeId'=>$id,'reasonCode'=>$reason,
          'matchingQueuedJobCount'=>$matching,
          'independentlyVerifiedLocalDataset'=>false,
          'leaseGuaranteed'=>false,'modelInferenceVerified'=>false
        ];
    }
    return $rows;
}
