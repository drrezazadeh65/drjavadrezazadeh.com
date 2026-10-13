<?php
declare(strict_types=1);

// Canonical Bertina same-origin Golden Talent capability contract.
// Source presence is not evidence of clinical or psychometric validation.
// Never emit learner data, provider transactions, private schemas or secrets.
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function goldenTalentBaseSchemaPresent(?PDO $pdo): bool {
    if (!$pdo) return false;
    try {
        foreach ([
            'eco_subjects','eco_consent_records','eco_talent_evidence',
            'eco_talent_evidence_reviews','eco_talent_profiles',
            'eco_talent_profile_revisions','eco_rcas_route_runs',
            'eco_rcas_route_evidence','eco_golden_path_releases',
            'eco_bahar_portfolios','eco_bahar_weekly_cycles'
        ] as $table) {
            // No SELECT of personal records, columns or rows.
            $pdo->query('SELECT 1 FROM '.$table.' LIMIT 0');
        }
        return true;
    } catch (Throwable $e) {
        return false;
    }
}
function goldenTalentRoute(string $path,string $verb): never {
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Robots-Tag: noindex, noarchive, nosnippet');
    if ($path==='/golden-talent/health' && $verb==='GET') {
        $schema=goldenTalentBaseSchemaPresent(db());
        $catalog=localCatalog();
        $professional=[];
        foreach (['service:talent_initial','service:golden_talent_comprehensive',
                     'service:golden_talent_premium','vip:golden-talent-signature'] as $sku) {
            $p=$catalog[$sku]??null;
            $professional[]=['sku'=>$sku,'catalogued'=>is_array($p)&&($p['price']??0)>0,
                'path'=>str_starts_with($sku,'vip:')
                    ? '/fa/vip/?vip=golden-talent-signature#vip-checkout-heading'
                    : '/fa/services/checkout/?service='.substr($sku,8)];
        }
        respond([
            'ok'=>true,'service'=>'golden-talent',
            'rcasStart'=>['mode'=>'BROWSER_ONLY_PREVALIDATION',
                'revision'=>'start-1.1','coreItemCount'=>28,
                'normativeScoring'=>false,'diagnosticDecision'=>false,
                'serverResponseStorage'=>false],
            'professionalServices'=>[
                'checkoutPrerequisitesReady'=>commerceReady(),
                'catalogue'=>$professional,
                'automaticDigitalEntitlement'=>false],
            'protectedSystem'=>[
                'unifiedSchemaPresent'=>$schema,
                'privateAssessmentApiActive'=>false,
                'profilePersistenceActive'=>false,
                'parentTeacherEvidenceApiActive'=>false,
                'professionalReleaseApiActive'=>false],
            'deepModules'=>'PREVALIDATION',
            'goldenPath'=>'HUMAN_REVIEW_REQUIRED',
            'baharContinuity'=>'NOT_LIVE',
            'readOnly'=>true,
            'warning'=>'Capability and schema checks do not prove scientific validation, consent, identity, payments, private storage or full production acceptance.'
        ]);
    }
    fail('not_found',404);
}
