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
    $scientificAcceptanceNotRecorded=in_array(
        'independently_accepted_model',$pending,true);
    $ownerAcceptedUnvalidatedGeneralChat=
        jrLocalChatUnvalidatedPublicOwnerApproval($cfg) &&
        $scientificAcceptanceNotRecorded;
    // Scientific evidence remains BLOCKED, never represented as PASS.
    // This explicit owner-controlled policy may exempt only that one
    // scientific-approval requirement for PUBLIC GENERAL education chat.
    // All remaining security, source, privacy, model-rights and worker
    // gates must pass through jrLocalChatReady() unchanged.
    $effectivePending=$ownerAcceptedUnvalidatedGeneralChat
        ?array_values(array_diff($pending,['independently_accepted_model']))
        :$pending;
    $staged=empty($effectivePending)&&empty($unknown);
    $allScientificGatesPassed=empty($pending)&&empty($unknown);
    // Owner's visual screenshot of a successful private pilot is useful
    // evidence of that one turn, but is NOT proof of repeated scientific
    // acceptance or fresh approved public-chat signed polling.
    $signedPilotBridge=($snapshot['publicSignedPilotBridgeLive']??false)===true;
    $live=((($snapshot['live']??null)===true)&&$staged)||
        $signedPilotBridge;
    return [
        'ok'=>true,
        'schema'=>'jr.jrei.public-launch-decision.v1',
        'launchMode'=>$signedPilotBridge?
            'OWNER_APPROVED_SIGNED_PILOT_PUBLIC_BRIDGE':
            ($ownerAcceptedUnvalidatedGeneralChat?
            'OWNER_APPROVED_PUBLIC_GENERAL_UNVALIDATED':'REVIEW_ONLY_NOT_AUTHORIZING'),
        'source'=>'OWNER_SESSION_MOTHER_DB_AND_PRIVATE_SERVER_POLICY',
        'checkedAt'=>time(),
        'checks'=>$checks,
        'blocked'=>$pending,
        'nonBlockingOwnerWaivedScientificGate'=>$ownerAcceptedUnvalidatedGeneralChat?
            ['independently_accepted_model']:[],
        'scientificModelValidationEstablished'=>!$scientificAcceptanceNotRecorded,
        'unknown'=>$unknown,
        'gateCount'=>count($expected),
        'passedGateCount'=>count($expected)-count($pending)-count($unknown),
        'allPublicBackendGatesPassed'=>$allScientificGatesPassed,
        'operationalSecurityGatesPassed'=>$staged,
        'publicChatEligibleOnServer'=>$live,
        'publicSignedPilotBridgeLive'=>$signedPilotBridge,
        'dedicatedStartChatGatesStillDistinct'=>true,
        'independentLiveConversationAcceptanceRecorded'=>false,
        'ownerPrivatePilotAutomaticallyPromoted'=>false,
        'publicAiEnabledByThisRead'=>false,
        'requiresExactShaQaAndOwnerControlledDeploy'=>true,
        'requiresActualWindowWorkerChatMode'=>!$signedPilotBridge,
        'doesNotDisclosePrivateConfigValues'=>true,
    ];
}
