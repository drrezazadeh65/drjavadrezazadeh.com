<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Deterministic, evidence-gated improvement proposals for JREI.
 * Produces reviewable plans only. Never executes SQL, writes source code,
 * changes production settings, or promotes unverified claims to knowledge.
 */
function jrJreiProposeImprovements(array $metrics): array {
    $proposals = [];
    $rules = [
        ['key'=>'download_failures','threshold'=>5,'kind'=>'RETRY_POLICY_REVIEW','action'=>'Review transport failure categories, backoff and host pacing'],
        ['key'=>'unprocessed_documents','threshold'=>100,'kind'=>'PARSER_CAPACITY_REVIEW','action'=>'Review parser coverage and bounded processing capacity'],
        ['key'=>'unverified_claims','threshold'=>50,'kind'=>'EVIDENCE_REVIEW','action'=>'Prioritize independent verification and source provenance'],
        ['key'=>'schema_errors','threshold'=>1,'kind'=>'ADDITIVE_MIGRATION_REVIEW','action'=>'Inspect schema version and prepare an idempotent additive migration'],
    ];
    foreach ($rules as $rule) {
        $value = $metrics[$rule['key']] ?? null;
        if (!is_int($value) || $value < $rule['threshold']) continue;
        $proposals[] = [
            'id'=>hash('sha256', $rule['kind'].':'.$rule['key']),
            'kind'=>$rule['kind'],
            'signal'=>$rule['key'],
            'observed_count'=>$value,
            'action'=>$rule['action'],
            'state'=>'PROPOSED_NOT_EXECUTED',
            'requires_tests'=>true,
            'requires_review'=>true,
        ];
    }
    return $proposals;
}
