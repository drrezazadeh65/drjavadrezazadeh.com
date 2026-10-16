<?php
declare(strict_types=1);

// The public release includes api/ but not platform/ or research tests.
if (PHP_SAPI !== 'cli' && !defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404); exit;
}

/**
 * Read-only scientific schema compatibility inventory for trusted PHP callers.
 * Loaded only from the authenticated MFA-protected operations API.
 *
 * Every SQL statement uses a fixed table/column allowlist and LIMIT 0.
 * No personal row, aggregate, password, connection string or data count is
 * read or returned. A successful projection is a structural preflight ONLY:
 * it does NOT certify indexes, grants, FKs, migrations, backups or live data.
 */
function bertinaScientificSchemaContract(PDO $pdo): array {
    $contract=[
        'consent_guardian'=>[
            'eco_subjects'=>['id','owner_account_id','guardian_account_id',
                'subject_type','status','age_band'],
            'eco_subject_relationships'=>['id','subject_id','related_account_id',
                'relationship_code','verification_status','verified_by_account_id','expires_at'],
            'eco_consent_notices'=>['id','purpose_code','version_label',
                'locale','notice_sha256','effective_at','retired_at'],
            'eco_consent_records'=>['id','account_id','subject_id',
                'notice_id','decision','granted_at','withdrawn_at']
        ],
        'assessment'=>[
            'eco_assessment_instruments'=>['id','instrument_code','validation_state','status'],
            'eco_instrument_versions'=>['id','instrument_id','status'],
            'eco_assessment_sessions'=>['id','subject_id','instrument_version_id','consent_id','status'],
            'eco_assessment_responses'=>['id','session_id','item_id'],
            'eco_scoring_models'=>['id','instrument_version_id'],
            'eco_score_runs'=>['id','session_id','scoring_model_id'],
            'eco_assessment_reports'=>['id','session_id','report_status'],
            'eco_assessment_reviews'=>['id','report_id','reviewer_account_id']
        ],
        'bahar'=>[
            'eco_bahar_portfolios'=>['id','subject_id','portfolio_code','state'],
            'eco_bahar_baselines'=>['id','portfolio_id','baseline_revision','review_status'],
            'eco_bahar_weekly_cycles'=>['id','portfolio_id','week_start_date',
                'cycle_number','state','human_reviewed_at'],
            'eco_bahar_learning_evidence'=>['id','cycle_id','evidence_kind',
                'observed_at','review_state'],
            'eco_bahar_reviews'=>['id','cycle_id','reviewer_account_id','decision_code','created_at']
        ],
        // Candidate safeguarding records are deliberately NOT installed by
        // this read-only probe. A missing table must show NOT READY rather
        // than silently treating a guardian declaration as valid age/assent.
        'safeguarding'=>[
            'eco_subject_age_attestations'=>[
                'id','subject_id','classification','jurisdiction_code',
                'policy_version','source_code','review_status',
                'verified_by_account_id','reviewed_by_account_id',
                'evidence_sha256','verified_at','expires_at','revoked_at'
            ],
            'eco_minor_assent_records'=>[
                'id','subject_id','guardian_account_id',
                'notice_version','notice_sha256','decision',
                'verification_status','source_code','reviewer_account_id',
                'assented_at','expires_at','withdrawn_at'
            ]
        ]
    ];
    $modules=[];
    foreach ($contract as $module=>$tables) {
        $failed=[];
        foreach ($tables as $name=>$columns) {
            // SQL identifiers come EXCLUSIVELY from the static checked list.
            try {
                $stmt=$pdo->query('SELECT '.implode(',',$columns).' FROM '.$name.' LIMIT 0');
                if ($stmt===false) $failed[]=$name;
                else $stmt->closeCursor();
            } catch (Throwable $e) {
                $failed[]=$name;
            }
        }
        $modules[$module]=[
            'columnProjectionReady'=>count($failed)===0,
            'requiredTables'=>count($tables),
            'incompatibleTables'=>$failed
        ];
    }
    return [
        'schema'=>'scientific-structural-preflight-v2',
        'modules'=>$modules,
        'personalRowsRead'=>false,
        'realProductionCertified'=>false,
        'operationalWriteApproved'=>false
    ];
}
