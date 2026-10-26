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
function jrOwnerJreiPythonSkillDispatch(array $privateConfig, array $body): array
{
    $action=$body['action']??null;
    if (!is_string($action) ||
        !in_array($action,['catalog','triage-evidence','heldout-review'],true)) {
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
    } else {
        if (count($body)!==2 || !array_key_exists('payload',$body) ||
            !is_array($body['payload']) || array_is_list($body['payload']) ||
            strlen(json_encode($body['payload'],
                JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR))>52000) {
            throw new InvalidArgumentException('python_heldout_body_invalid');
        }
        $route='/internal/v1/learning/heldout/review';
        $payload=$body['payload'];
        $expected='jr.jrei.heldout-review-result.v1';
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
    return $base+[
        'status'=>'PRIVATE_SKILL_RESPONSE_RECEIVED',
        'result'=>$result,
    ];
}
