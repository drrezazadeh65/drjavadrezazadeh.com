<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Restricted JHELA maturity planning snapshot.
 * Only reachable from operationsRoute() AFTER verified admin membership and fresh MFA.
 * Never fetches manuscript bodies, reviewer accounts, DB credentials or secrets.
 */
function operationsJhelaReadContract(string $filename, string $schema): array {
    $allowed = [
        'jhela-native-intake-activation-v1.json'=>'jhela-native-intake-activation-v1',
        'jhela-international-roadmap-v1.json'=>'jhela-international-roadmap-v1',
        'jhela-target-architecture-v1.json'=>'jhela-target-architecture-v1',
        'jhela-gate-evidence-ledger-v1.json'=>'jhela-gate-evidence-ledger-v1',
    ];
    if (!isset($allowed[$filename]) || $allowed[$filename] !== $schema) {
        throw new RuntimeException('journal_contract_not_authorised');
    }
    $base = __DIR__.'/internal';
    // CLI contract fixtures may read source contracts; production MUST use protected projected files.
    if (PHP_SAPI === 'cli' && getenv('JHELA_SOURCE_TEST') === '1') $base = dirname(__DIR__).'/platform';
    $file = $base.'/'.$filename;
    $raw = @file_get_contents($file);
    if (!is_string($raw) || strlen($raw) > 130000 || strlen($raw) < 50) {
        throw new RuntimeException('journal_contract_unavailable');
    }
    $data = json_decode($raw,true,64,JSON_THROW_ON_ERROR);
    if (!is_array($data) || ($data['schema'] ?? null) !== $schema) {
        throw new RuntimeException('journal_contract_invalid');
    }
    return $data;
}

/** Never convert missing evidence into production passes, invented counts or false index badges. */
function operationsJhelaSnapshot(): array {
    $live=operationsJhelaReadContract('jhela-native-intake-activation-v1.json','jhela-native-intake-activation-v1');
    $roadmap=operationsJhelaReadContract('jhela-international-roadmap-v1.json','jhela-international-roadmap-v1');
    $architecture=operationsJhelaReadContract('jhela-target-architecture-v1.json','jhela-target-architecture-v1');
    $ledger=operationsJhelaReadContract('jhela-gate-evidence-ledger-v1.json','jhela-gate-evidence-ledger-v1');
    if (count($roadmap['phases'] ?? []) !== 10 || count($ledger['stageRecords'] ?? []) !== 10 ||
        count($architecture['scaleStages'] ?? []) !== 4 ||
        ($architecture['status'] ?? '') !== 'OWNER_DIRECTED_FUTURE_TARGET_NOT_DEPLOYED') {
        throw new RuntimeException('journal_contract_mismatch');
    }
    if (($live['ownerAuthorizesPreliminaryManuscriptSubmission'] ?? false) !== true ||
        ($live['independentReviewOrAcceptanceOperational'] ?? true) !== false ||
        ($live['nativePublishingWorkflowOperational'] ?? true) !== false ||
        ($roadmap['publicationStatus'] ?? '') !== 'PRELAUNCH') {
        throw new RuntimeException('journal_status_requires_independent_evidence');
    }
    $steps=[];
    foreach ($roadmap['phases'] as $phase) {
        $id=$phase['id']??null;
        if (!is_string($id) || !preg_match('/^JH-0[1-9]$|^JH-10$/D',$id)) throw new RuntimeException('journal_stage_invalid');
        $record=null;
        foreach ($ledger['stageRecords'] as $candidate) {
            if (($candidate['id'] ?? null)===$id) { $record=$candidate; break; }
        }
        if (!is_array($record) || ($record['status'] ?? '')!=='UNVERIFIED'
            || ($record['claimsAllowed'] ?? true)!==false || !empty($record['evidence'])) {
            throw new RuntimeException('journal_stage_not_independently_verified');
        }
        $steps[]=[
            'id'=>$id,
            'en'=>mb_substr((string)($phase['en']??''),0,170),
            'fa'=>mb_substr((string)($phase['fa']??''),0,170),
            'evidenceState'=>'unverified',
            'claimsAllowed'=>false,
        ];
    }
    $tiers=[];
    foreach ($architecture['scaleStages'] as $tier) {
        $id=(string)($tier['id']??'');
        if (!in_array($id,['T0_TRANSITION','T1_DEDICATED','T2_HIGH_AVAILABILITY','T3_PUBLISHING_NETWORK'],true)) {
            throw new RuntimeException('journal_tier_invalid');
        }
        $tiers[]=['id'=>$id,'state'=>'planned_not_commissioned'];
    }
    return [
        'ok'=>true,
        'schema'=>'jhela-owner-maturity-snapshot-v1',
        'source'=>'governed_repository_contracts_not_live_editorial_data',
        'checkedAt'=>gmdate('c'),
        'journal'=>'JHELA',
        'editorial'=>[
            'platform'=>'first_party_native',
            'submissionPolicy'=>'CONDITIONAL_ON_LIVE_HOST',
            'reviewWorkflow'=>'not_independently_verified',
            'realManuscriptCounts'=>null,
            'reviewerIdentitiesIncluded'=>false,
        ],
        'capacity'=>[
            'plannedAdditionalGB'=>5,
            'plannedAt'=>'2026-10-17',
            'installedVerified'=>false,
            'liveFreeGB'=>null,
            'architecturalLimit'=>false,
        ],
        'scientificMilestones'=>$steps,
        'verifiedIndexClaims'=>[],
        'evidenceReview'=>[
            'verifiedStageCount'=>0,
            'unverifiedStageCount'=>10,
            'progressPercent'=>null,
            'privateAuditVault'=>'not_provisioned',
        ],
        'infrastructureTiers'=>$tiers,
        'limitations'=>[
            'Source policy status is not a measurement of editorial server health, article counts or index membership.',
            'Publication and payment must remain closed until independent runtime evidence and owner authorisation.',
        ],
    ];
}
