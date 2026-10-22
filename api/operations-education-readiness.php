<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Owner-only educational readiness preflight.
 * Called exclusively after the existing admin session, rate limiter and MFA.
 * Read-only: looks for deployed source artifacts and probes BAHAR table columns
 * with LIMIT 0; never queries learner rows or modifies the mother database.
 * No inferred validation, statistical results, financial readiness or launch.
 */
function operationsEducationBaharColumnPresence(PDO $pdo): ?bool {
    try {
        foreach ([
            'SELECT id,subject_id,portfolio_code,state FROM eco_bahar_portfolios LIMIT 0',
            'SELECT id,portfolio_id,baseline_revision,review_status FROM eco_bahar_baselines LIMIT 0',
            'SELECT id,portfolio_id,week_start_date,cycle_number,state FROM eco_bahar_weekly_cycles LIMIT 0',
            'SELECT id,cycle_id,evidence_kind,observed_at,review_state FROM eco_bahar_learning_evidence LIMIT 0',
            'SELECT id,cycle_id,reviewer_account_id,decision_code,created_at FROM eco_bahar_reviews LIMIT 0'
        ] as $statement) {
            if ($pdo->query($statement)===false) return false;
        }
        return true;
    } catch (Throwable $error) {
        // A failure is an UNKNOWN capability, not evidence of healthy storage.
        return null;
    }
}

function operationsEducationReadiness(PDO $pdo): array {
    $root=dirname(__DIR__);
    $gateDefs=[
        [
            'id'=>'golden-talent',
            'labelFa'=>'استعداد طلایی','labelEn'=>'Golden Talent',
            'sources'=>['fa/golden-talent/index.html','en/golden-talent/index.html'],
            'next'=>'Approve research-to-validation claims, consent lifecycle, identity and report delivery.',
            'stage'=>'FORMATIVE_EVIDENCE',
        ],
        [
            'id'=>'rcas',
            'labelFa'=>'RCAS','labelEn'=>'RCAS',
            'sources'=>['fa/assessments/golden-talent/start/index.html','en/golden-talent/assessment/index.html'],
            'next'=>'Verify scoring version, independent scientific review and safe learner/guardian authorization.',
            'stage'=>'RESEARCH_STAGE',
        ],
        [
            'id'=>'bahar',
            'labelFa'=>'BAHAR','labelEn'=>'BAHAR',
            'sources'=>['fa/bahar/index.html','en/bahar/index.html'],
            'next'=>'Approve complete advanced content, adult/guardian consent, persistence semantics and professional review.',
            'stage'=>'FREE_INTRO_AVAILABLE_IN_SOURCE',
        ],
        [
            'id'=>'golden-path',
            'labelFa'=>'مسیر طلایی','labelEn'=>'Golden Path',
            'sources'=>['fa/app/student/index.html','en/golden-talent/dashboard/index.html'],
            'next'=>'Evidence-linked human reassessment, revision provenance and specialist release authorization.',
            'stage'=>'HUMAN_REVIEW_REQUIRED',
        ],
        [
            'id'=>'admission-intelligence',
            'labelFa'=>'پذیرش و تحلیل کارنامه','labelEn'=>'Admission Intelligence',
            'sources'=>['fa/konkur-ai-lab/index.html','fa/entekhab-reshteh/index.html'],
            'next'=>'Independently verify 1405 guide pages, amendments, programme rows, eligibility rules and source versions.',
            'stage'=>'OFFICIAL_DATA_UNREVIEWED',
        ],
        [
            'id'=>'choice-studio',
            'labelFa'=>'استودیوی انتخاب','labelEn'=>'Choice Studio',
            'sources'=>['fa/entekhab-reshteh/index.html','en/student-guidance/index.html'],
            'next'=>'Verify accessible five-criterion decision tools; maintain non-predictive scope and human override.',
            'stage'=>'DESCRIPTIVE_DECISION_SUPPORT',
        ]
    ];
    $engineRows=[];
    $missingCount=0;
    foreach ($gateDefs as $gate) {
        $present=0;
        foreach ($gate['sources'] as $relative) {
            // Only exact application-owned paths; never accept a URL or user input.
            if (is_file($root.'/'.$relative)) $present++;
        }
        $allPresent=$present===count($gate['sources']);
        if(!$allPresent)$missingCount++;
        $engineRows[]=[
            'id'=>$gate['id'],
            'labelFa'=>$gate['labelFa'],'labelEn'=>$gate['labelEn'],
            'sourceStage'=>$gate['stage'],
            'expectedSourceFiles'=>count($gate['sources']),
            'sourceFilesPresent'=>$present,
            'sourceFilesPresentTogether'=>$allPresent,
            'scientificallyValidated'=>false,
            'liveEngineVerified'=>false,
            'customerEntitlementVerified'=>false,
            'admissionPredictionAllowed'=>false,
            'releaseApproved'=>false,
            'nextRequirement'=>$gate['next']
        ];
    }
    $guide=null;$offer=null;
    try {
        if (function_exists('operationsEducational1405ReviewSnapshot'))
            $guide=operationsEducational1405ReviewSnapshot();
    } catch (Throwable $error) { $guide=null; }
    try {
        if (function_exists('operationsEducationalOffersRead'))
            $offer=operationsEducationalOffersRead();
    } catch (Throwable $error) { $offer=null; }
    // Contract availability is a source-file inventory, NOT scientific proof.
    // It may be requested on demand only after owner session + recent MFA.
    $researchContracts=[
        [
            'id'=>'master-orchestrator','path'=>'platform/jr-educational-master-orchestrator.mjs',
            'role'=>'deterministic_six_engine_coordination','scienceStatus'=>'PREVALIDATION',
        ],
        [
            'id'=>'evidence-exchange','path'=>'platform/jr-educational-evidence-exchange.mjs',
            'role'=>'signed_reviewed_evidence_boundary','scienceStatus'=>'INDEPENDENT_ATTESTATIONS_REQUIRED',
        ],
        [
            'id'=>'official-catalogue','path'=>'platform/jr-admission-catalogue-trust-gate.mjs',
            'role'=>'official_programme_row_attestation','scienceStatus'=>'SIGNED_SOURCE_AND_PAGE_REVIEW_REQUIRED',
        ],
        [
            'id'=>'admission-validation','path'=>'platform/jr-admission-outcome-validation.mjs',
            'role'=>'offline_temporal_outcome_validation','scienceStatus'=>'INDEPENDENT_HOLDOUT_DATA_REQUIRED',
        ],
        [
            'id'=>'professional-golden-path-release',
            'path'=>'platform/jr-golden-path-release-trust.mjs',
            'role'=>'signed_professional_approval_to_bahar_draft',
            'scienceStatus'=>'REQUIRES_PRIVATE_PROFESSIONAL_ATTESTATION',
        ],
        [
            'id'=>'owner-price-drafts',
            'path'=>'api/operations-education-price-drafts.php',
            'role'=>'owner_draft_prices_without_customer_checkout',
            'scienceStatus'=>'SCIENTIFIC_FINANCIAL_AND_ENTITLEMENT_RELEASE_NOT_APPROVED',
        ],
        [
            'id'=>'guardian-bahar-view',
            'path'=>'assets/js/jr-bahar-guardian-overview-v1.js',
            'role'=>'private_guardian_overview_under_existing_dual_consent',
            'scienceStatus'=>'COUNTS_NOT_PROGRESS_SCORES',
        ],
        [
            'id'=>'bahar-bridge','path'=>'platform/jr-bahar-study-bridge.mjs',
            'role'=>'private_memory_weekly_workbook','scienceStatus'=>'RESEARCH_STAGE',
        ],
        [
            'id'=>'source-governance','path'=>'platform/jr-admission-source-governance.mjs',
            'role'=>'default_off_1405_source_intake','scienceStatus'=>'SOURCE_APPROVAL_NOT_GRANTED',
        ]
    ];
    $contractSnapshot=[];
    foreach($researchContracts as $entry){
        $contractSnapshot[]=[
            'id'=>$entry['id'],'role'=>$entry['role'],
            'sourceFilePresent'=>is_file($root.'/'.$entry['path']),
            'scienceStatus'=>$entry['scienceStatus'],
            'productionVerified'=>false,'releaseAuthorized'=>false
        ];
    }
    $draftState=null;
    try {
        if(function_exists('operationsEducationalDraftPricesRead'))
            $draftState=operationsEducationalDraftPricesRead($pdo);
    } catch(Throwable $error){$draftState=null;}
    $baharColumns=operationsEducationBaharColumnPresence($pdo);
    return [
        'ok'=>true,
        'schema'=>'jr.education-governance-admin-snapshot.v1',
        'checkedAt'=>time(),
        'scope'=>'owner_mfa_readonly_source_and_column_probe',
        'state'=>'UNVERIFIED_FOR_RELEASE',
        'engines'=>$engineRows,
        'researchContracts'=>$contractSnapshot,
        'summary'=>[
            'engines'=>count($engineRows),
            'sourceSetsNotFullyPresent'=>$missingCount,
            'scienceValidatedEngines'=>0,
            'approvedEducationPaidOffers'=>0,
            'officialAdmissionProgrammeRowsApproved'=>0,
            'endToEndReleaseCertified'=>false
        ],
        'sourceDependencies'=>[
            'guideManifestReadAvailable'=>$guide!==null,
            'sourceGuidesIdentified'=>$guide['summary']['guideCount']??null,
            'sourceGuidePagesInventoried'=>$guide['summary']['sourcePdfPages']??null,
            'offerDraftInventoryAvailable'=>$offer!==null,
            'unapprovedOfferDrafts'=>$offer['summary']['proposals']??null,
            'baharMotherDatabaseColumnsPresent'=>$baharColumns,
            'educationalDraftPricingStorageReady'=>$draftState!==null &&
                ($draftState['requiresAdditiveMigration']??true)===false,
            'educationalDraftOverrides'=>is_array($draftState['drafts']??null)
                ?count($draftState['drafts']):null,
            'motherDatabaseContentAudited'=>false
        ],
        'readOnly'=>true,'canActivate'=>false,'canRelease'=>false,
        'limitations'=>[
            'Source-file presence is not evidence of a valid response on the public web.',
            'A column-only MySQL check does not establish a usable private learning portfolio.',
            'No live payments, login flows, guardian authorizations or scientific validations were assessed.',
            'All validation and production publication gates remain separate and unmet by this projection.'
        ]
    ];
}
