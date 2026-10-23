<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * JREI V5.1: honest source-owned operational readiness projection.
 *
 * Reads only the original MFA owner's projections; NEVER executes a Worker,
 * approves science, modifies config or reports an unverified LLM as ready.
 * Source presence, a current heartbeat and an advertised digest are three
 * distinct observations, not an independent end-to-end acceptance.
 */
function jrHybridOwnerReadiness(array $snapshot): array {
    $schema=($snapshot['motherDbSchemaReady']??false)===true;
    $enabled=($snapshot['backendEnabled']??false)===true;
    $datasets=is_array($snapshot['datasets']??null)?$snapshot['datasets']:[];
    $nodes=is_array($snapshot['nodes']??null)?$snapshot['nodes']:[];
    $offers=is_array($snapshot['nodeOffers']??null)?$snapshot['nodeOffers']:[];
    $queue=$snapshot['queueHealth']??null;
    $approvedVersions=0;$eligibleNodeIds=[];
    foreach($datasets as $dataset)
        if(($dataset['status']??null)==='APPROVED')$approvedVersions++;
    foreach($nodes as $node){
        $id=$node['nodeId']??null;
        if(!is_string($id)||($node['ownerEnabled']??false)!==true||
           ($node['revoked']??false)===true||
           !in_array($node['state']??null,['ONLINE','DEGRADED'],true))
            continue;
        $eligibleNodeIds[$id]=true;
    }
    $matchingNodeIds=[];
    if(($snapshot['nodeOffersAvailable']??false)===true){
        foreach($offers as $offer){
            $id=$offer['nodeId']??null;
            if(is_string($id)&&isset($eligibleNodeIds[$id])&&
               ($offer['matchesApprovedVersion']??false)===true)
                $matchingNodeIds[$id]=true;
        }
    }
    $problems=[];
    if(!$schema)$problems[]='HYBRID_TABLES_UNAVAILABLE';
    if(!$enabled)$problems[]='PRIVATE_HYBRID_SWITCH_OFF';
    if(($snapshot['catalogueReady']??false)!==true)
        $problems[]='GOVERNED_CORPUS_MIGRATION_REQUIRED';
    if($approvedVersions<1)$problems[]='NO_APPROVED_PUBLIC_HOLDOUT_VERSION';
    if(!count($eligibleNodeIds))$problems[]='NO_CONNECTED_ELIGIBLE_SIGNED_NODE';
    if(($snapshot['nodeOffersAvailable']??false)!==true)
        $problems[]='NODE_DECLARATION_REGISTRY_UNAVAILABLE';
    if(!count($matchingNodeIds))
        $problems[]='NO_MATCHING_SIGNED_LOCAL_CORPUS_DECLARATION';
    $unresolved=null;
    if(is_array($queue)&&($queue['countsAvailable']??false)===true){
        $c=$queue['counts']??[];
        $unresolved=(int)($c['staleLeasedUnreconciled']??0)+
            (int)($c['unknownOutcomeAwaitingOwner']??0);
        if($unresolved>0)$problems[]='UNKNOWN_JOB_OUTCOME_NEEDS_MANUAL_REVIEW';
    }
    if($unresolved===null)$problems[]='QUEUE_HEALTH_NOT_OBSERVABLE';
    $possible=$schema&&$enabled&&$approvedVersions>0&&
        count($matchingNodeIds)>0&&$unresolved===0;
    $modelVerified=($snapshot['modelInferenceVerified']??false)===true;
    return [
      'schema'=>'jr.jrei.owner-readiness.v1',
      'status'=>$possible?'CANDIDATE_FOR_GOVERNED_EVALUATION':'NOT_READY',
      'blockedReasons'=>$problems,
      'approvedCorpusVersions'=>$approvedVersions,
      'eligibleSignedNodeCount'=>count($eligibleNodeIds),
      'declaringMatchedCorpusCount'=>count($matchingNodeIds),
      'unresolvedJobOutcomes'=>$unresolved,
      'eligibleForFirstRealJobCandidate'=>$possible,
      'independentlyVerifiedDatasetFiles'=>false,
      'lastSuccessfulEndToEndEvaluationVerified'=>false,
      'modelInferenceVerified'=>$modelVerified,
      'publicConversationalAIReady'=>false,
      'scientificValidityEstablished'=>false,
      'deploymentAuthorized'=>false,
      'explanation'=>'Readiness denotes source-owned declarations and policy only; '.
          'actual Windows data files, job acceptance, model runtime and scientific '.
          'quality must be independently accepted before live use.'
    ];
}
