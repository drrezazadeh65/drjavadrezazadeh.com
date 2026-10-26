<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Private, source-stage JREI Python skills bridge.
 * Caller MUST already have an active SUPER_ADMIN MFA session, rate gate and
 * same-origin CSRF, enforced by the ORIGINAL operationsRoute().
 * No browser-selected Python URL, key, tool identifier, SQL, shell or model.
 * This module neither authenticates a human nor grants any new permissions.
 */
function jrOwnerJreiPythonSkillDispatch(array $privateConfig, array $body, ?string $ownerAccountId=null): array
{
    $action=$body['action']??null;
    if (!is_string($action) ||
        !in_array($action,['catalog','triage-evidence','heldout-review','calculate','memory-save','memory-read','memory-revoke'],true)) {
        throw new InvalidArgumentException('python_skill_action_invalid');
    }

    $base=[
        'ok'=>true,
        'schema'=>'jr.jrei.owner-python-skill-view.v1',
        'sourceOnly'=>true,
        'productionSkillAccepted'=>false,
        'motherDbConnectedByPython'=>false,
        'modelInferenceVerified'=>false,
        'privilegedExecutionAllowed'=>false,
    ];
    if (($privateConfig['jrei_python_internal_enabled']??false)!==true) {
        return $base+[
            'status'=>'PRIVATE_PYTHON_NOT_ENABLED',
            'result'=>null,
        ];
    }

    if ($action==='catalog') {
        if (array_keys($body)!==['action']) {
            throw new InvalidArgumentException('python_catalog_body_invalid');
        }
        $route='/internal/v1/skills/catalog';
        $payload=[];
        $expected='jr.jrei.skill-catalog.v1';
    } elseif ($action==='triage-evidence') {
        if (count($body)!==2 ||
            !array_key_exists('payload',$body) ||
            !is_array($body['payload']) ||
            array_is_list($body['payload']) ||
            strlen(json_encode($body['payload'],
                JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR))>12000) {
            throw new InvalidArgumentException('python_evidence_body_invalid');
        }
        $route='/internal/v1/skills/evidence/triage';
        $payload=$body['payload'];
        $expected='jr.jrei.evidence-triage-result.v1';
    } elseif ($action==='heldout-review') {
        if (count($body)!==2 || !array_key_exists('payload',$body) ||
            !is_array($body['payload']) || array_is_list($body['payload']) ||
            strlen(json_encode($body['payload'],
                JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR))>52000) {
            throw new InvalidArgumentException('python_heldout_body_invalid');
        }
        $route='/internal/v1/learning/heldout/review';
        $payload=$body['payload'];
        $expected='jr.jrei.heldout-review-result.v1';
    } elseif ($action==='calculate') {
        if (count($body)!==2 || !array_key_exists('payload',$body) ||
            !is_array($body['payload']) || array_is_list($body['payload']) ||
            count($body['payload'])<1 ||
            !is_string($body['payload']['expression']??null) ||
            strlen($body['payload']['expression'])>400) {
            throw new InvalidArgumentException('python_arithmetic_body_invalid');
        }
        $route='/internal/v1/skills/arithmetic/calculate';
        $payload=$body['payload'];
        $expected='jr.jrei.arithmetic-result.v1';
    } else {
        if (!is_string($ownerAccountId) ||
            !preg_match('/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/Di',$ownerAccountId)) {
            throw new InvalidArgumentException('python_owner_memory_account_missing');
        }
        if ($action==='memory-revoke') {
            if (($privateConfig['jrei_python_owner_memory_enabled']??false)!==true &&
                ($privateConfig['jrei_python_owner_memory_revoke_enabled']??false)!==true) {
                throw new RuntimeException('JREI_OWNER_MEMORY_REVOKE_DISABLED');
            }
        } elseif (($privateConfig['jrei_python_owner_memory_enabled']??false)!==true) {
            throw new RuntimeException('JREI_OWNER_MEMORY_DISABLED');
        }
        if (count($body)!==2 || !isset($body['payload']) ||
            !is_array($body['payload']) || array_is_list($body['payload']) ||
            array_key_exists('owner_account_id',$body['payload']) ||
            strlen(json_encode($body['payload'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR))>12000) {
            throw new InvalidArgumentException('python_owner_memory_payload_invalid');
        }
        $payload=$body['payload'];
        $payload['owner_account_id']=strtolower($ownerAccountId);
        $suffix=match($action) {
            'memory-save'=>'save','memory-read'=>'read','memory-revoke'=>'revoke'
        };
        $route='/internal/v1/memory/owner/'.$suffix;
        $expected=match($action) {
            'memory-save'=>'jr.jrei.owner-memory-receipt.v1',
            'memory-read'=>'jr.jrei.owner-memory-read.v1',
            'memory-revoke'=>'jr.jrei.owner-memory-revoked.v1'
        };
    }
    // Preserve existing authenticated operations routes and isolated MySQL
    // fixtures when this optional Python service is disabled. Never require
    // a source-only adapter while bootstrapping PHP routes. Fail CLOSED if
    // explicitly enabled on a host missing the verified private adapter.
    $adapter=dirname(__DIR__).'/platform/jrei-python/php/jrei-python-internal-client.php';
    if (!is_file($adapter) || !is_readable($adapter)) {
        throw new RuntimeException('JREI_PYTHON_PRIVATE_ADAPTER_NOT_INSTALLED');
    }
    require_once $adapter;
    if (!function_exists('jrJreiPythonInternalPropose')) {
        throw new RuntimeException('JREI_PYTHON_PRIVATE_ADAPTER_INVALID');
    }
    // Distinct signed private service credential; no owner/user fields forwarded.
    $result=jrJreiPythonInternalPropose($privateConfig,$route,$payload);
    if (($result['schema_version']??null)!==$expected) {
        throw new RuntimeException('JREI_PYTHON_SKILL_CONTRACT_MISMATCH');
    }
    if ($action==='catalog' &&
        (($result['privileged_execution_enabled']??null)!==false ||
         !is_array($result['skills']??null))) {
        throw new RuntimeException('JREI_PYTHON_CATALOG_UNTRUSTED');
    }
    if ($action==='triage-evidence' &&
        (($result['executed']??null)!==false ||
         ($result['approved_for_retrieval']??null)!==false ||
         ($result['source_rights_approved_by_skill']??null)!==false)) {
        throw new RuntimeException('JREI_PYTHON_RESULT_PRIVILEGE_ESCALATION');
    }
    if ($action==='heldout-review' &&
        (($result['promotion_executed']??null)!==false ||
         ($result['model_weights_changed']??null)!==false ||
         ($result['independently_verified_by_service']??null)!==false ||
         ($result['learning_strategy_improvement_proven']??null)!==false ||
         !in_array($result['decision']??null,[
           'HOLD_RIGHTS_OR_LEAKAGE','HOLD_LANGUAGE_REGRESSION',
           'HOLD_LATENCY_REGRESSION','INSUFFICIENT_REVIEWED_SAMPLE',
           'NO_DEMONSTRATED_IMPROVEMENT','REVIEW_CANDIDATE_ONLY'
         ],true))) {
        throw new RuntimeException('JREI_PYTHON_HELDOUT_PRIVILEGE_ESCALATION');
    }
    if ($action==='calculate' &&
        (($result['performed_without_model']??null)!==true ||
         ($result['any_model_weights_changed']??null)!==false ||
         ($result['source_rights_approved']??null)!==false ||
         !is_int($result['numerator']??null) ||
         !is_int($result['denominator']??null) ||
         $result['denominator']<1)) {
        throw new RuntimeException('JREI_PYTHON_ARITHMETIC_CONTRACT_MISMATCH');
    }
    if (str_starts_with($action,'memory-')) {
        if (($result['used_for_model_training']??null)!==false ||
            ($action==='memory-save' && ($result['persist_result']??null)!=='MOTHER_DB_ATOMIC_INSERT') ||
            ($action==='memory-read' && ($result['available_to_other_tenants']??null)!==false) ||
            ($action==='memory-revoke' && ($result['historical_backups_erased']??null)!==false)) {
            throw new RuntimeException('JREI_PYTHON_MEMORY_CONTRACT_MISMATCH');
        }
        // Only a real successful signed Python+mother-DB reply may change
        // these response indicators. Never infer live memory from source.
        $base['sourceOnly']=false;
        $base['motherDbConnectedByPython']=true;
        return $base+[
            'status'=>'PRIVATE_OWNER_MEMORY_RESULT_RECEIVED',
            'result'=>$result,
        ];
    }
    return $base+[
        'status'=>'PRIVATE_SKILL_RESPONSE_RECEIVED',
        'result'=>$result,
    ];
}
