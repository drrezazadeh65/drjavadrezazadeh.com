<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * JREI public launch decision: advisory read-only evidence, not a release key.
 * Original public-chat gate in jrLocalChatReady() remains authoritative.
 * Never turns switches on, edits model/worker registry, or approves quality.
 * Owner-only caller must already pass original SUPER_ADMIN / recent MFA.
 */
function jrJreiLocalPublicLaunchDecision(array $snapshot,array $cfg): array {
    $readiness=$snapshot['readinessGates']??null;
    $actual=is_array($readiness)&&is_array($readiness['gates']??null)
        ?$readiness['gates']:[];
    $expected=[
        'mother_db_schema','hybrid_private_switch',
        'local_chat_private_switch','owner_public_release',
        'private_queue_encryption','approved_public_evidence_index',
        'privacy_retention_worker','registered_local_model',
        'rights_reviewed_model','independently_accepted_model',
        'authorized_generative_node','recent_signed_generative_poll'
    ];
    $known=[];
    foreach($actual as $row){
        if(!is_array($row)||!is_string($row['id']??null)||
           !is_string($row['state']??null))continue;
        $id=$row['id'];
        if(in_array($id,$expected,true)&&!array_key_exists($id,$known))
            $known[$id]=in_array($row['state'],['PASS','BLOCKED','UNKNOWN'],true)
                ?$row['state']:'UNKNOWN';
    }
    // Dependency order is explicit and cannot convert UNKNOWN into PASS.
    $phases=[
        'mother_database'=>[
            'mother_db_schema','private_queue_encryption',
            'approved_public_evidence_index'
        ],
        'model_evidence'=>[
            'registered_local_model','rights_reviewed_model',
            'independently_accepted_model'
        ],
        'privacy_retention'=>['privacy_retention_worker'],
        'owner_server_authorizations'=>[
            'hybrid_private_switch','local_chat_private_switch',
            'owner_public_release'
        ],
        'signed_generative_worker'=>[
            'authorized_generative_node','recent_signed_generative_poll'
        ],
    ];
    $checks=[];$pending=[];$unknown=[];
    foreach($phases as $phase=>$ids){
        foreach($ids as $id){
            $state=$known[$id]??'UNKNOWN';
            $checks[]=['id'=>$id,'phase'=>$phase,'status'=>$state];
            if($state==='BLOCKED')$pending[]=$id;
            if($state==='UNKNOWN')$unknown[]=$id;
        }
    }
    $staged=empty($pending)&&empty($unknown);
    // Owner's visual screenshot of a successful private pilot is useful
    // evidence of that one turn, but is NOT proof of repeated scientific
    // acceptance or fresh approved public-chat signed polling.
    $live=(($snapshot['live']??null)===true)&&$staged;
    return [
        'ok'=>true,
        'schema'=>'jr.jrei.public-launch-decision.v1',
        'launchMode'=>'REVIEW_ONLY_NOT_AUTHORIZING',
        'source'=>'OWNER_SESSION_MOTHER_DB_AND_PRIVATE_SERVER_POLICY',
        'checkedAt'=>time(),
        'checks'=>$checks,
        'blocked'=>$pending,
        'unknown'=>$unknown,
        'gateCount'=>count($expected),
        'passedGateCount'=>count($expected)-count($pending)-count($unknown),
        'allPublicBackendGatesPassed'=>$staged,
        'publicChatEligibleOnServer'=>$live,
        'independentLiveConversationAcceptanceRecorded'=>false,
        'ownerPrivatePilotAutomaticallyPromoted'=>false,
        'publicAiEnabledByThisRead'=>false,
        'requiresExactShaQaAndOwnerControlledDeploy'=>true,
        'requiresActualWindowWorkerChatMode'=>true,
        'doesNotDisclosePrivateConfigValues'=>true,
    ];
}
