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
            'eco_subjects','eco_subject_relationships','eco_consent_notices',
            'eco_consent_records','eco_privacy_requests','eco_object_refs',
            'eco_audit_events','eco_talent_evidence','eco_talent_evidence_reviews',
            'eco_talent_profiles','eco_talent_profile_revisions',
            'eco_rcas_route_runs','eco_rcas_route_evidence',
            'eco_golden_path_releases','eco_golden_path_actions',
            'eco_bahar_portfolios','eco_bahar_baselines',
            'eco_bahar_weekly_cycles','eco_bahar_learning_evidence',
            'eco_bahar_reviews'
        ] as $table) {
            // No SELECT of personal records, columns or rows.
            $pdo->query('SELECT 1 FROM '.$table.' LIMIT 0');
        }
        return true;
    } catch (Throwable $e) {
        return false;
    }
}
/**
 * Fail-closed consent projection for a verified guardian. The latest decision,
 * not the existence of any historical grant, governs visibility. The SQL query
 * orders by granted_at DESC; ambiguous identical timestamps deny access.
 */
function goldenTalentAssessmentConsentCurrent(array $rows,int $now): bool {
    if(!$rows||count($rows)>2)return false;
    $first=$rows[0];
    if(!is_array($first)||($first['decision']??'')!=='GRANTED'
        ||($first['withdrawn_at']??null)!==null
        ||($first['purpose_code']??'')!=='ASSESSMENT')return false;
    if(count($rows)>1 &&
        (string)($rows[0]['granted_at']??'')===(string)($rows[1]['granted_at']??''))return false;
    $toTime=static function($value): ?int {
        if(!is_string($value)||trim($value)==='')return null;
        try {
            $d=new DateTimeImmutable($value,new DateTimeZone('UTC'));
            return $d->getTimestamp();
        }catch(Throwable $e){return null;}
    };
    $decided=$toTime($first['granted_at']??null);
    $effective=$toTime($first['effective_at']??null);
    $retired=$toTime($first['retired_at']??null);
    if($decided===null||$effective===null||$decided>$now||$effective>$now)return false;
    if(($first['retired_at']??null)!==null&&($retired===null||$retired<=$now))return false;
    return true;
}
function goldenTalentMyVerifiedSubjects(PDO $pdo,string $accountId): array {
    $subjects=$pdo->prepare("SELECT s.id,s.pseudonym,s.status
        FROM eco_subjects s
        INNER JOIN eco_subject_relationships r ON
          r.subject_id=s.id AND r.related_account_id=?
          AND r.relationship_code='GUARDIAN' AND r.verification_status='VERIFIED'
          AND (r.expires_at IS NULL OR r.expires_at>UTC_TIMESTAMP(3))
        WHERE s.guardian_account_id=? AND s.subject_type='LEARNER'
          AND s.status='ACTIVE'
        ORDER BY s.created_at DESC,s.id DESC LIMIT 26");
    $subjects->execute([$accountId,$accountId]);
    $candidates=$subjects->fetchAll(PDO::FETCH_ASSOC);
    if(!is_array($candidates))return [];
    $consent=$pdo->prepare("SELECT c.decision,c.withdrawn_at,c.granted_at,
            n.purpose_code,n.effective_at,n.retired_at
        FROM eco_consent_records c
        INNER JOIN eco_consent_notices n ON n.id=c.notice_id
        WHERE c.subject_id=? AND c.account_id=?
          AND n.purpose_code='ASSESSMENT'
        ORDER BY c.granted_at DESC,c.id DESC LIMIT 2");
    $items=[];
    $now=nowTs();
    foreach(array_slice($candidates,0,25) as $row) {
        $subjectId=(string)($row['id']??'');
        if(!validUuid($subjectId))continue;
        $consent->execute([$subjectId,$accountId]);
        $decisions=$consent->fetchAll(PDO::FETCH_ASSOC);
        if(!goldenTalentAssessmentConsentCurrent(is_array($decisions)?$decisions:[],$now))continue;
        $items[]=[
            'subjectId'=>$subjectId,
            'displayName'=>mb_substr((string)($row['pseudonym']??''),0,120,'UTF-8'),
            'relationship'=>'VERIFIED_GUARDIAN',
            'assessmentConsent'=>'CURRENT',
            'availableActions'=>[] // no submissions, reports or entitlements yet
        ];
    }
    return $items;
}
function goldenTalentRoute(string $path,string $verb): never {
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Robots-Tag: noindex, noarchive, nosnippet');
    if($path==='/golden-talent/my-subjects' && $verb==='GET'){
        $pdo=db();
        if(!$pdo)fail('database_unconfigured',503);
        $account=sessionAccount($pdo);
        if(!$account||($account['status']??'')!=='active'
            ||empty($account['email_verified_at']))fail('unauthorized',401);
        $accountId=(string)($account['id']??'');
        if(!validUuid($accountId))fail('unauthorized',401);
        if(!goldenTalentBaseSchemaPresent($pdo))fail('golden_talent_schema_unavailable',503);
        if(!rateAllowed($pdo,'gt_my_subjects',$accountId,20,300))fail('rate_limited',429);
        try{
            $items=goldenTalentMyVerifiedSubjects($pdo,$accountId);
            respond(['ok'=>true,'service'=>'golden-talent',
                'scope'=>'verified_guardian_current_assessment_consent',
                'learners'=>$items,'limit'=>25,
                'hasMore'=>false,
                'privateAssessmentApiActive'=>false,
                'automaticPaidEntitlement'=>false,
                'note'=>'Only verified guardian links with current assessment consent are listed. No private assessment data or report access is granted.']);
        }catch(Throwable $e){
            error_log('Golden Talent private listing unavailable: '.get_class($e));
            fail('golden_talent_private_unavailable',503);
        }
    }
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
