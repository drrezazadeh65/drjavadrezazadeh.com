<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * JREI APEX V2: optional owner-gated Python proposal preflight.
 * Not an executor. Reuses original SUPER_ADMIN/MFA/CSRF operationsRoute.
 * No free-text instructions, browser-provided DAGs or external Python URLs.
 * This module must only be invoked for the explicit "plan-python" action.
 */
function jrApexPythonPlanSchemaReady(PDO $pdo): bool
{
    try {
        $pdo->query('SELECT mission_id,proposal_sha256,proposal_json,created_at FROM jrei_apex_mission_python_plans LIMIT 0');
        return true;
    } catch (Throwable $e) { return false; }
}

function jrApexPythonNodesForIntent(string $intent): array
{
    // Stable bounded vocabulary inherited from jrei_core.contracts.MissionNode.
    return match ($intent) {
        'SEO_ROBOTS_DIAGNOSTIC', 'JREI_NODE_HEALTH_REVIEW',
        'MOTHER_DB_METADATA_REVIEW' => [
            ['id'=>'observe-01','kind'=>'SITE_CHANGE_OBSERVE','after'=>[]]
        ],
        'NEWS_INGESTION_DIAGNOSTIC' => [
            ['id'=>'discover-01','kind'=>'PUBLIC_SOURCE_DISCOVERY','after'=>[]],
            ['id'=>'rights-02','kind'=>'RIGHTS_REVIEW','after'=>['discover-01']],
            ['id'=>'facts-03','kind'=>'NEWS_FACT_REVIEW','after'=>['rights-02']]
        ],
        'EDUCATION_SOURCE_GAP_REVIEW' => [
            ['id'=>'discover-01','kind'=>'PUBLIC_SOURCE_DISCOVERY','after'=>[]],
            ['id'=>'rights-02','kind'=>'RIGHTS_REVIEW','after'=>['discover-01']],
            ['id'=>'index-03','kind'=>'EVIDENCE_INDEX_PROPOSAL','after'=>['rights-02']]
        ],
        'LEARNING_EVIDENCE_REVIEW' => [
            ['id'=>'review-01','kind'=>'EDUCATIONAL_RESPONSE_REVIEW','after'=>[]]
        ],
        'WEBSITE_CODE_REVIEW', 'WEBSITE_SEO_GEO_REVIEW',
        'WEBSITE_DESIGN_ACCESSIBILITY_REVIEW',
        'WEBSITE_OPERATIONS_ENGINES_REVIEW' => [
            ['id'=>'observe-01','kind'=>'SITE_CHANGE_OBSERVE','after'=>[]],
            ['id'=>'patch-02','kind'=>'SITE_PATCH_PROPOSAL','after'=>['observe-01']]
        ],
        'WEBSITE_DATABASE_SCHEMA_REVIEW' => [
            // The existing mother database remains the authority: planning
            // cannot install, alter or delete any table, index or row.
            ['id'=>'observe-01','kind'=>'SITE_CHANGE_OBSERVE','after'=>[]]
        ],
        default => throw new InvalidArgumentException('unregistered_apex_intent')
    };
}

function jrApexPythonPrepare(PDO $pdo, array $cfg, string $accountId, array $body): ?array
{
    if (($cfg['jrei_apex_mission_python_plan_enabled']??false)!==true ||
        ($cfg['jrei_python_internal_enabled']??false)!==true ||
        ($cfg['jrei_apex_missions_owner_write_enabled']??false)!==true) {
        throw new DomainException('apex_python_planning_disabled');
    }
    if (!jrApexPythonPlanSchemaReady($pdo)) {
        throw new RuntimeException('apex_python_plan_migration_required');
    }
    $intent=$body['intent']??null;
    $requestKey=$body['requestKey']??null;
    if (!is_string($intent) || !in_array($intent,JR_APEX_MISSION_INTENTS,true) ||
        !is_string($requestKey) || preg_match('/^[a-f0-9]{32}$/D',$requestKey)!==1) {
        throw new InvalidArgumentException('apex_python_plan_request_invalid');
    }
    $digest=hash('sha256','jr.jrei.apex-mission-request.v1|'.$intent);
    // Idempotent replay of an already stored owner request does NOT call Python.
    $prior=$pdo->prepare('SELECT mission_id,request_digest FROM jrei_apex_owner_missions WHERE owner_account_id=? AND request_key=? LIMIT 1');
    $prior->execute([$accountId,$requestKey]);
    $existing=$prior->fetch(PDO::FETCH_ASSOC);
    if ($existing) {
        if (!hash_equals((string)$existing['request_digest'],$digest)) {
            throw new DomainException('mission_request_key_conflict');
        }
        return null;
    }
    $control=jrApexMissionControl($pdo);
    if (!$control || (int)$control['planning_enabled']!==1 ||
        (int)$control['emergency_stop']!==0 ||
        (int)$control['execution_enabled']!==0) {
        throw new DomainException('mission_planning_stopped');
    }
    $id=jrApexMissionUuid();
    $policyHash=hash('sha256','jr.apex.planning.v1|'.$control['revision']);
    $nodes=jrApexPythonNodesForIntent($intent);
    $adapter=__DIR__.'/jrei-remote-api-client.php';
    if (!is_readable($adapter)) throw new RuntimeException('apex_python_client_missing');
    require_once $adapter;
    if (!function_exists('jrJreiPythonInternalPropose')) {
        throw new RuntimeException('apex_python_client_invalid');
    }
    $result=jrJreiPythonInternalPropose($cfg,'/internal/v1/missions/propose',[
        'schema_version'=>'jr.jrei.scoped-mission.v1',
        'mission_id'=>$id,
        'policy_digest'=>$policyHash,
        'nodes'=>$nodes
    ]);
    if (($result['schema_version']??null)!=='jr.jrei.scoped-mission.v1' ||
        ($result['mission_id']??null)!==$id ||
        ($result['policy_digest']??null)!==$policyHash ||
        ($result['executed']??null)!==false ||
        ($result['authorized']??null)!==false ||
        ($result['site_modified']??null)!==false ||
        ($result['private_data_access_granted']??null)!==false ||
        ($result['model_training_started']??null)!==false ||
        !is_array($result['graph']??null) || !array_is_list($result['graph']) ||
        count($result['graph'])!==count($nodes)) {
        throw new DomainException('apex_python_proposal_untrusted');
    }
    $expected=[];
    foreach ($nodes as $node) $expected[$node['id']]=$node;
    $observed=[];
    foreach ($result['graph'] as $step) {
        if (!is_array($step) || array_keys($step)!==['id','kind','after','status','permission']) {
            throw new DomainException('apex_python_step_contract_mismatch');
        }
        $stepId=$step['id']??null;
        if (!is_string($stepId) || !isset($expected[$stepId]) ||
            isset($observed[$stepId]) ||
            $step['kind']!==$expected[$stepId]['kind'] ||
            $step['after']!==$expected[$stepId]['after'] ||
            $step['status']!=='PROPOSED_NOT_EXECUTED' ||
            $step['permission']!=='INDEPENDENT_AUTHORITY_REQUIRED') {
            throw new DomainException('apex_python_step_untrusted');
        }
        foreach ($step['after'] as $required) {
            if (!isset($observed[$required])) throw new DomainException('apex_python_order_invalid');
        }
        $observed[$stepId]=true;
    }
    $json=json_encode($result,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    if (strlen($json)>12000) throw new DomainException('apex_python_response_too_large');
    return [
        'missionId'=>$id,'policyDigest'=>$policyHash,
        'controlRevision'=>(int)$control['revision'],
        'json'=>$json,'digest'=>hash('sha256',$json)
    ];
}

function jrApexPythonStore(PDO $pdo, string $missionId, array $prepared, int $at): void
{
    if ($missionId!==$prepared['missionId']) {
        throw new DomainException('apex_python_mission_mismatch');
    }
    // This insert occurs inside the ORIGINAL mission creation transaction.
    $pdo->prepare('INSERT INTO jrei_apex_mission_python_plans
        (mission_id,proposal_sha256,proposal_json,created_at) VALUES(?,?,?,?)')
        ->execute([$missionId,$prepared['digest'],$prepared['json'],$at]);
}

function jrApexPythonAttachSnapshot(PDO $pdo, array &$base, array $ids): void
{
    $base['pythonProposals']=[];
    $base['pythonProposalSchemaReady']=jrApexPythonPlanSchemaReady($pdo);
    if (!$base['pythonProposalSchemaReady'] || !$ids) return;
    $slots=implode(',',array_fill(0,count($ids),'?'));
    $q=$pdo->prepare('SELECT p.mission_id,p.proposal_sha256,p.proposal_json,
            p.created_at,m.policy_digest,m.created_at AS mission_created_at
        FROM jrei_apex_mission_python_plans p
        JOIN jrei_apex_owner_missions m ON m.mission_id=p.mission_id
        WHERE p.mission_id IN ('.$slots.')');
    $q->execute($ids);
    foreach ($q as $row) {
        $serialized=(string)$row['proposal_json'];
        $digest=(string)$row['proposal_sha256'];
        $proposal=strlen($serialized)<=12000
            ?json_decode($serialized,true,20):null;
        $intact=preg_match('/^[a-f0-9]{64}$/D',$digest)===1 &&
            hash_equals(hash('sha256',$serialized),$digest) &&
            is_array($proposal) &&
            ($proposal['schema_version']??null)==='jr.jrei.scoped-mission.v1' &&
            ($proposal['mission_id']??null)===(string)$row['mission_id'] &&
            ($proposal['policy_digest']??null)===(string)$row['policy_digest'] &&
            (int)$row['created_at']>=(int)$row['mission_created_at'] &&
            ($proposal['executed']??null)===false &&
            ($proposal['authorized']??null)===false &&
            ($proposal['site_modified']??null)===false &&
            ($proposal['private_data_access_granted']??null)===false &&
            ($proposal['model_training_started']??null)===false &&
            is_array($proposal['graph']??null) &&
            array_is_list($proposal['graph']) &&
            count($proposal['graph'])<=32;
        $base['pythonProposals'][]=[
            'missionId'=>(string)$row['mission_id'],
            'proposalSha256'=>$digest,
            'createdAt'=>(int)$row['created_at'],
            'integrityVerified'=>$intact,
            'graph'=>$intact?$proposal['graph']:[],
            'state'=>$intact
                ?'PYTHON_PROPOSAL_STORED_NOT_EXECUTED'
                :'PYTHON_PROPOSAL_QUARANTINED_INTEGRITY_FAILURE',
            'signedWorkerCompletionVerified'=>false,
            'productionOutcomeVerified'=>false
        ];
    }
}
