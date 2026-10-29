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
        !in_array($action,['catalog','triage-evidence','heldout-review','calculate',
          'evidence-graph','knowledge-correction','answer-grounding-review','metacognitive-plan','learning-value-plan','capacity-plan','exam-blueprint-review','news-editorial-preflight','strategy-propose','mission-bind','method-feedback','grounded-retrieval','source-extract',
          'self-improvement','language-growth','model-portfolio','model-draft','memory-save','memory-read','memory-list','memory-revoke'],true)) {
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
    } elseif (in_array($action,
        ['evidence-graph','knowledge-correction','answer-grounding-review','metacognitive-plan','learning-value-plan','capacity-plan','exam-blueprint-review','strategy-propose','mission-bind','method-feedback','grounded-retrieval','source-extract','news-editorial-preflight','self-improvement','language-growth','model-portfolio'],true)) {
        // All three are strictly read-only: no browser-selected endpoint,
        // unreviewed model tool, raw learner records, action execution or
        // assignment authority. The original admin MFA/CSRF gate is retained.
        if (count($body)!==2 || !array_key_exists('payload',$body) ||
            !is_array($body['payload']) || array_is_list($body['payload'])) {
            throw new InvalidArgumentException('python_learning_proposal_payload_invalid');
        }
        $raw=json_encode($body['payload'],
            JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        if (!is_string($raw) || strlen($raw)>52000 ||
            count($body['payload'])>18) {
            throw new InvalidArgumentException('python_learning_proposal_size_invalid');
        }
        if($action==='self-improvement' &&
           ($privateConfig['jrei_python_self_improvement_enabled']??false)!==true)
            throw new RuntimeException('JREI_SELF_IMPROVEMENT_DISABLED');
        $payload=$body['payload'];
        $route=match($action) {
            'evidence-graph'=>'/internal/v1/learning/evidence-graph/review',
            'knowledge-correction'=>'/internal/v1/knowledge/corrections/review',
            'answer-grounding-review'=>'/internal/v1/learning/answers/grounding-review',
            'metacognitive-plan'=>'/internal/v1/learning/metacognitive/plan',
            'learning-value-plan'=>'/internal/v1/learning/value-of-information/plan',
            'capacity-plan'=>'/internal/v1/orchestration/capacity/plan',
            'exam-blueprint-review'=>'/internal/v1/exams/blueprint/review',
            'strategy-propose'=>'/internal/v1/learning/strategy/propose',
            'mission-bind'=>'/internal/v1/learning/metacognitive/mission-bind',
            'method-feedback'=>'/internal/v1/learning/metacognitive/method-feedback',
            'self-improvement'=>'/internal/v1/learning/self-improvement/plan',
            'language-growth'=>'/internal/v1/learning/native-language/plan',
            'model-portfolio'=>'/internal/v1/model/portfolio/plan',
            'grounded-retrieval'=>'/internal/v1/knowledge/retrieval/propose',
            'source-extract'=>'/internal/v1/knowledge/extraction/propose',
            'news-editorial-preflight'=>'/internal/v1/news/official/editorial-preflight'
        };
        $expected=match($action) {
            'evidence-graph'=>'jr.jrei.evidence-graph-review.v1',
            'knowledge-correction'=>'jr.jrei.knowledge-correction-result.v1',
            'answer-grounding-review'=>'jr.jrei.answer-grounding-review-result.v1',
            'metacognitive-plan'=>'jr.jrei.metacognitive-cycle-result.v1',
            'learning-value-plan'=>'jr.jrei.learning-voi-result.v1',
            'capacity-plan'=>'jr.jrei.adaptive-placement-result.v1',
            'exam-blueprint-review'=>'jr.jrei.exam-blueprint-review-result.v1',
            'strategy-propose'=>'jr.jrei.learning-strategy-proposal.v1',
            'mission-bind'=>'jr.jrei.metacognitive-mission-binding-result.v1',
            'method-feedback'=>'jr.jrei.method-feedback-result.v1',
            'self-improvement'=>'jr.jrei.self-improvement-cycle-result.v1',
            'language-growth'=>'jr.jrei.native-language-growth-result.v1',
            'model-portfolio'=>'jr.jrei.model-portfolio-result.v1',
            'grounded-retrieval'=>'jr.jrei.grounded-retrieval-result.v1',
            'source-extract'=>'jr.jrei.knowledge-extract-result.v1',
            'news-editorial-preflight'=>'jr.jrei.news-editorial-preflight-result.v1'
        };
    } elseif ($action==='model-draft') {
        // Source-only private owner tool, wholly separate from public Qwen
        // chat and from all original payments, rights or memory privileges.
        if (($privateConfig['jrei_python_owner_model_draft_enabled']??false)!==true) {
            throw new RuntimeException('JREI_PRIVATE_MODEL_DRAFT_DISABLED');
        }
        if (count($body)!==2 || !isset($body['payload']) ||
            !is_array($body['payload']) || array_is_list($body['payload'])) {
            throw new InvalidArgumentException('jrei_model_draft_body_invalid');
        }
        $input=$body['payload'];
        if (count($input)<3 || count($input)>5 ||
            count(array_diff(array_keys($input),
                ['request_id','language','question','max_output_tokens','academic_task']))!==0 ||
            !is_string($input['request_id']??null) ||
            !preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/D',$input['request_id']) ||
            !in_array($input['language']??null,['fa','en'],true) ||
            !in_array($input['academic_task']??'EXPLAIN',
              ['EXPLAIN','SOCRATIC_TUTOR','CRITICAL_REVIEW','ASSESSMENT_DESIGN',
               'CODING_PROPOSAL','SITE_ARCHITECTURE'],true) ||
            !is_string($input['question']??null) ||
            strlen($input['question'])>4000 ||
            preg_match('/\A[\s\S]{5,1000}\z/uD',$input['question'])!==1 ||
            (array_key_exists('max_output_tokens',$input) &&
              (!is_int($input['max_output_tokens']) ||
               $input['max_output_tokens']<32 ||
               $input['max_output_tokens']>640))) {
            throw new InvalidArgumentException('jrei_model_draft_parameters_invalid');
        }
        $route='/internal/v1/model/owner-draft';
        $payload=[
            'schema_version'=>'jr.jrei.owner-local-model-draft.v1',
            'request_id'=>$input['request_id'],
            'language'=>$input['language'],
            'academic_task'=>$input['academic_task']??'EXPLAIN',
            'question'=>$input['question'],
            'purpose'=>'PRIVATE_EDUCATIONAL_DRAFT',
            'max_output_tokens'=>$input['max_output_tokens']??384
        ];
        $expected='jr.jrei.owner-local-model-draft-result.v1';
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
            'memory-save'=>'save','memory-read'=>'read',
            'memory-list'=>'list','memory-revoke'=>'revoke'
        };
        $route='/internal/v1/memory/owner/'.$suffix;
        $expected=match($action) {
            'memory-save'=>'jr.jrei.owner-memory-receipt.v1',
            'memory-read'=>'jr.jrei.owner-memory-read.v1',
            'memory-list'=>'jr.jrei.owner-memory-list-result.v1',
            'memory-revoke'=>'jr.jrei.owner-memory-revoked.v1'
        };
    }
    // Preserve existing authenticated operations routes and isolated MySQL
    // fixtures when this optional Python service is disabled. Never require
    // a source-only adapter while bootstrapping PHP routes. Fail CLOSED if
    // explicitly enabled on a host missing the verified private adapter.
    $adapter=__DIR__.'/jrei-remote-api-client.php';
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
    if ($action==='self-improvement') {
        if (($result['cycle_id']??null)!==($payload['cycle_id']??null) ||
            ($result['self_code_written']??null)!==false ||
            ($result['self_learning_model_weights_updated']??null)!==false ||
            ($result['production_deployed']??null)!==false ||
            ($result['tests_run']??null)!==false ||
            ($result['autonomous_background_loop_running']??null)!==false ||
            ($result['independent_review_attested_by_this_service']??null)!==false ||
            !is_array($result['decisions']??null) ||
            !array_is_list($result['decisions']) ||
            count($result['decisions'])!==count($payload['candidates']??[])) {
            throw new RuntimeException('JREI_SELF_IMPROVEMENT_RESULT_UNTRUSTED');
        }
        $expected=[];
        foreach($payload['candidates'] as $candidate) {
            if(!is_array($candidate)||!is_string($candidate['candidate_id']??null)||
               isset($expected[$candidate['candidate_id']]))
                throw new RuntimeException('JREI_SELF_IMPROVEMENT_CANDIDATE_INVALID');
            $expected[$candidate['candidate_id']]=$candidate;
        }
        foreach($result['decisions'] as $decision) {
            $id=$decision['candidate_id']??null;
            if(!is_string($id)||!isset($expected[$id])||
               ($decision['target_path']??null)!==($expected[$id]['target_path']??null)||
               ($decision['base_source_sha256']??null)!==($expected[$id]['base_source_sha256']??null)||
               ($decision['proposed_diff_sha256']??null)!==($expected[$id]['proposed_diff_sha256']??null)||
               ($decision['patch_applied']??null)!==false ||
               ($decision['deployment_started']??null)!==false ||
               ($decision['owner_approval_required']??null)!==true) {
                throw new RuntimeException('JREI_SELF_IMPROVEMENT_DECISION_UNTRUSTED');
            }
            unset($expected[$id]);
        }
        if($expected)throw new RuntimeException('JREI_SELF_IMPROVEMENT_UNBOUND_CANDIDATES');
    }
    if ($action==='language-growth' &&
        (($result['cycle_id']??null)!==($payload['cycle_id']??null) ||
         ($result['model_weights_updated']??null)!==false ||
         ($result['quality_promotion_executed']??null)!==false ||
         ($result['model_training_started']??null)!==false ||
         ($result['independently_verified']??null)!==false ||
         ($result['qwen_exclusive_dependency_required']??null)!==false ||
         !is_array($result['goals']??null) ||
         !array_is_list($result['goals']))) {
        throw new RuntimeException('JREI_LANGUAGE_GROWTH_UNTRUSTED');
    }
    if ($action==='model-portfolio' &&
        (($result['production_switch_executed']??null)!==false ||
         ($result['chosen_runtime_started']??null)!==false ||
         ($result['language_independence_proven']??null)!==false ||
         ($result['actual_native_jrei_inference_independently_observed']??null)!==false ||
         !is_array($result['eligible_sandbox_engine_ids']??null) ||
         !array_is_list($result['eligible_sandbox_engine_ids']) ||
         !is_array($result['reason_codes']??null) ||
         !array_is_list($result['reason_codes']))) {
        throw new RuntimeException('JREI_MODEL_PORTFOLIO_UNTRUSTED');
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
    if ($action==='answer-grounding-review' &&
        (($result['public_answer_authorized']??null)!==false ||
         ($result['claim_truth_verified']??null)!==false ||
         ($result['source_rights_independently_attested']??null)!==false ||
         ($result['citations_validated_in_mother_db']??null)!==false ||
         ($result['model_weights_changed']??null)!==false ||
         !is_array($result['sentences']??null) ||
         !is_array($result['held_sentence_ids']??null) ||
         !in_array($result['decision']??null,[
           'HOLD_UNGROUNDED_OR_CONFLICTING_DRAFT',
           'CANDIDATE_REQUIRES_INDEPENDENT_REVIEW'
         ],true))) {
        throw new RuntimeException('JREI_DRAFT_GROUNDING_PRIVILEGE_ESCALATION');
    }
    if ($action==='knowledge-correction' &&
        (($result['correction_executed']??null)!==false ||
         ($result['publisher_or_exam_status_changed']??null)!==false ||
         ($result['live_urls_redirected_or_deleted']??null)!==false ||
         ($result['notifications_sent']??null)!==false ||
         ($result['independently_verified_against_mother_db']??null)!==false ||
         ($result['source_rights_independently_attested']??null)!==false ||
         !is_array($result['recommendations']??null) ||
         !is_array($result['affected_artifact_ids']??null))) {
        throw new RuntimeException('JREI_PYTHON_CORRECTION_PRIVILEGE_ESCALATION');
    }
    if ($action==='evidence-graph' &&
        (($result['publication_executed']??null)!==false ||
         ($result['knowledge_promoted']??null)!==false ||
         ($result['citations_retrieved_or_verified']??null)!==false ||
         ($result['inputs_independently_attested']??null)!==false ||
         !is_array($result['claims']??null))) {
        throw new RuntimeException('JREI_PYTHON_PROVENANCE_PRIVILEGE_ESCALATION');
    }
    if ($action==='metacognitive-plan' &&
        (($result['automatic_skill_promotion']??null)!==false ||
         ($result['autonomous_model_training_started']??null)!==false ||
         ($result['learning_improvement_proven']??null)!==false ||
         ($result['knowledge_written']??null)!==false ||
         ($result['source_acquisition_started']??null)!==false ||
         ($result['public_site_changed']??null)!==false ||
         !is_array($result['decisions']??null))) {
        throw new RuntimeException('JREI_PYTHON_METACOGNITION_PRIVILEGE_ESCALATION');
    }
    if ($action==='strategy-propose' &&
        (($result['automatic_method_change_applied']??null)!==false ||
         ($result['changes_executed']??null)!==false ||
         ($result['model_weights_changed']??null)!==false ||
         ($result['scientific_improvement_proven']??null)!==false ||
         ($result['inputs_independently_attested_by_service']??null)!==false ||
         !is_array($result['compared_method_evidence']??null))) {
        throw new RuntimeException('JREI_PYTHON_STRATEGY_PRIVILEGE_ESCALATION');
    }
    if ($action==='news-editorial-preflight' &&
        (($result['original_cms_writes_performed']??null)!==false ||
         ($result['bilingual_pages_published']??null)!==false ||
         ($result['original_cms_receipts_created']??null)!==false ||
         ($result['rights_independently_attested_by_service']??null)!==false ||
         ($result['facts_added_to_permanent_model_training']??null)!==false ||
         ($result['owner_per_article_approval_added']??null)!==false ||
         ($result['live_news_pipeline_proven']??null)!==false ||
         !is_array($result['claims']??null) ||
         !in_array($result['decision']??null,[
            'TECHNICAL_OR_RIGHTS_HOLD','OWNER_MFA_EXCEPTION_CANDIDATE',
            'OFFICIAL_NEWS_CMS_HANDOFF_CANDIDATE'
         ],true))) {
        throw new RuntimeException('JREI_PYTHON_ORIGINAL_NEWS_PRIVILEGE_ESCALATION');
    }
    if ($action==='exam-blueprint-review' &&
        (($result['exam_published']??null)!==false ||
         ($result['sale_or_payment_executed']??null)!==false ||
         ($result['answer_key_verified_by_service']??null)!==false ||
         ($result['testly_humanability_validated']??null)!==false ||
         ($result['timed_exam_activated']??null)!==false ||
         ($result['applicant_entitlement_checked']??null)!==false ||
         ($result['student_answer_data_accessed']??null)!==false ||
         ($result['original_exam_authority']??null)!=='PHP_MOTHER_DB_ONLY' ||
         !is_array($result['findings']??null))) {
        throw new RuntimeException('JREI_PYTHON_EXAM_METADATA_PRIVILEGE_ESCALATION');
    }
    if ($action==='learning-value-plan' &&
        (($result['network_or_worker_job_started']??null)!==false ||
         ($result['model_training_started']??null)!==false ||
         ($result['mother_database_written']??null)!==false ||
         ($result['learner_outcome_improved']??null)!==false ||
         ($result['source_attestation_independently_verified']??null)!==false ||
         ($result['measurement_scientifically_validated']??null)!==false ||
         !is_array($result['selections']??null))) {
        throw new RuntimeException('JREI_PYTHON_VALUE_OF_LEARNING_PRIVILEGE_ESCALATION');
    }
    if ($action==='capacity-plan' &&
        (($result['scheduler_enabled_by_this_plan']??null)!==false ||
         ($result['network_requests_issued']??null)!==false ||
         ($result['autonomous_executions_confirmed']??null)!==false ||
         ($result['resource_measurements_independently_verified']??null)!==false ||
         !is_array($result['placements']??null))) {
        throw new RuntimeException('JREI_PYTHON_CAPACITY_PRIVILEGE_ESCALATION');
    }
    if ($action==='mission-bind' &&
        (($result['mission_submitted']??null)!==false ||
         ($result['worker_lease_issued']??null)!==false ||
         ($result['rights_granted']??null)!==false ||
         ($result['independent_review_completed']??null)!==false ||
         ($result['improvement_proven']??null)!==false ||
         ($result['original_owner_authority_required']??null)!==true ||
         !is_array($result['proposal']??null) ||
         ($result['proposal']['executed']??null)!==false ||
         ($result['proposal']['authorized']??null)!==false ||
         ($result['proposal']['site_modified']??null)!==false ||
         ($result['proposal']['model_training_started']??null)!==false)) {
        throw new RuntimeException('JREI_PYTHON_MISSION_BIND_PRIVILEGE_ESCALATION');
    }
    if ($action==='method-feedback' &&
        (($result['causal_method_superiority_proven']??null)!==false ||
         ($result['input_review_attested_by_service']??null)!==false ||
         ($result['strategy_automatically_changed']??null)!==false ||
         ($result['model_weights_changed']??null)!==false ||
         ($result['knowledge_or_worker_jobs_modified']??null)!==false ||
         !is_array($result['methods']??null))) {
        throw new RuntimeException('JREI_PYTHON_METHOD_FEEDBACK_PRIVILEGE_ESCALATION');
    }
    if ($action==='source-extract' &&
        (($result['rights_approved_by_extractor']??null)!==false ||
         ($result['original_document_licensed_by_extractor']??null)!==false ||
         ($result['data_sent_to_model']??null)!==false ||
         ($result['public_text_reproduced']??null)!==false ||
         ($result['source_truth_independently_verified']??null)!==false ||
         ($result['citations_indexed']??null)!==false ||
         ($result['database_modified']??null)!==false ||
         !is_array($result['anchors']??null))) {
        throw new RuntimeException('JREI_SOURCE_EXTRACTION_PRIVILEGE_ESCALATION');
    }
    if ($action==='source-extract') {
        foreach ($result['anchors'] as $anchor) {
            if (!is_array($anchor) ||
                ($anchor['public_citation_rights_verified']??null)!==false ||
                ($anchor['source_text_untrusted']??null)!==true ||
                (!array_key_exists('short_review_excerpt',$anchor) ||
                 $anchor['short_review_excerpt']!==null)) {
                throw new RuntimeException('JREI_UNREVIEWED_SOURCE_EXCERPT_EXPOSED');
            }
        }
    }
    if ($action==='grounded-retrieval' &&
        (($result['answer_generated']??null)!==false ||
         ($result['publication_authorized']??null)!==false ||
         ($result['citation_anchors_retrieved']??null)!==false ||
         ($result['model_called']??null)!==false ||
         ($result['source_entitlements_verified_here']??null)!==false ||
         !is_array($result['selections']??null) ||
         !is_array($result['withheld']??null))) {
        throw new RuntimeException('JREI_GROUNDED_RETRIEVAL_PRIVILEGE_ESCALATION');
    }
    if ($action==='grounded-retrieval') {
        foreach ($result['selections'] as $candidate) {
            if (!is_array($candidate) ||
                ($candidate['citation_validated_in_mother_db']??null)!==false ||
                ($candidate['source_rights_independently_attested_by_service']??null)!==false) {
                throw new RuntimeException('JREI_UNATTESTED_RETRIEVAL_CITATION');
            }
        }
    }
    if ($action==='model-draft' &&
        (($result['result_state']??null)!=='UNVERIFIED_MODEL_DRAFT' ||
         ($result['model_alias']??null)!=='jrei-qwen3-4b-q4km' ||
         ($result['model_weights_modified']??null)!==false ||
         ($result['training_started']??null)!==false ||
         ($result['source_citations_independently_verified']??null)!==false ||
         ($result['factual_accuracy_independently_verified']??null)!==false ||
         ($result['source_rights_verified']??null)!==false ||
         ($result['owner_scientific_review_required']??null)!==true ||
         ($result['public_publish_authorized']??null)!==false ||
         ($result['persisted_to_mother_db']??null)!==false ||
         ($result['request_id']??null)!==$payload['request_id'] ||
         ($result['language']??null)!==$payload['language'] ||
         ($result['academic_task']??null)!==$payload['academic_task'] ||
         !is_string($result['model_output']??null) ||
         strlen($result['model_output'])>24000 ||
         !preg_match('/^[a-f0-9]{64}$/D',(string)($result['response_sha256']??'')) ||
         !hash_equals(hash('sha256',$result['model_output']),
              (string)$result['response_sha256']))) {
        throw new RuntimeException('JREI_PRIVATE_MODEL_DRAFT_CONTRACT_UNTRUSTED');
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
            ($action==='memory-save' && (!is_bool($result['idempotent_replay']??null) ||
              ($result['persist_result']??null)!==
                ($result['idempotent_replay']?'MOTHER_DB_VERIFIED_REPLAY':'MOTHER_DB_ATOMIC_INSERT'))) ||
            ($action==='memory-read' && ($result['available_to_other_tenants']??null)!==false) ||
            ($action==='memory-revoke' && ($result['historical_backups_erased']??null)!==false)) {
            throw new RuntimeException('JREI_PYTHON_MEMORY_CONTRACT_MISMATCH');
        }
        if ($action==='memory-list') {
            if (($result['payload_contains_plaintext']??null)!==false ||
                ($result['available_to_other_tenants']??null)!==false ||
                !is_array($result['entries']??null) ||
                !array_is_list($result['entries']) ||
                count($result['entries'])>50 ||
                !is_bool($result['has_more']??null)) {
                throw new RuntimeException('JREI_OWNER_MEMORY_LIST_UNTRUSTED');
            }
            $max=(int)($payload['limit']??25);
            if ($max<1 || $max>50 || count($result['entries'])>$max) {
                throw new RuntimeException('JREI_OWNER_MEMORY_LIST_LIMIT_INVALID');
            }
            foreach ($result['entries'] as $entry) {
                if(!is_array($entry) ||
                   count(array_diff(array_keys($entry),
                       ['record_id','purpose','created_at','expires_at']))!==0 ||
                   count($entry)!==4 ||
                   !is_string($entry['record_id']??null) ||
                   !preg_match('/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/D',
                       $entry['record_id']) ||
                   !in_array($entry['purpose']??null,
                       ['OWNER_WORK_NOTE','OWNER_RESEARCH_NOTE','OWNER_PREFERENCE'],true) ||
                   !is_int($entry['created_at']??null) ||
                   !is_int($entry['expires_at']??null)) {
                    throw new RuntimeException('JREI_OWNER_MEMORY_LIST_ENTRY_INVALID');
                }
            }
            if (($result['has_more']===true) !==
                ($result['next_before_created_at']!==null &&
                 $result['next_before_record_id']!==null)) {
                throw new RuntimeException('JREI_OWNER_MEMORY_LIST_CURSOR_INVALID');
            }
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
    if ($action==='model-draft') {
        // A returned unverified local answer is not a scientific citation,
        // validated claim, model-quality pass or public publication.
        $base['sourceOnly']=false;
        return $base+[
            'status'=>'PRIVATE_OWNER_MODEL_DRAFT_RECEIVED_UNVERIFIED',
            'result'=>$result,
        ];
    }
    return $base+[
        'status'=>'PRIVATE_SKILL_RESPONSE_RECEIVED',
        'result'=>$result,
    ];
}
