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
            if($pdo->query('SELECT 1 FROM '.$table.' LIMIT 0')===false)return false;
        }
        return true;
    } catch (Throwable $e) {
        return false;
    }
}
/**
 * Read-only capability check for the canonical Bertina MariaDB BAHAR schema.
 * The older platform/bahar-persistence.mjs contract describes a PostgreSQL
 * prototype with different column names. It must not write to these tables.
 * Zero-row SELECTs verify required columns only, never real student records.
 */
function goldenTalentBaharStorageSchemaReady(?PDO $pdo): bool {
    if(!$pdo)return false;
    try{
        foreach([
            'SELECT id,subject_id,portfolio_code,state,human_mentor_account_id FROM eco_bahar_portfolios LIMIT 0',
            'SELECT id,portfolio_id,baseline_revision,source_fingerprint,review_status FROM eco_bahar_baselines LIMIT 0',
            'SELECT id,portfolio_id,week_start_date,cycle_number,state,human_reviewed_at FROM eco_bahar_weekly_cycles LIMIT 0',
            'SELECT id,cycle_id,evidence_kind,observed_at,review_state FROM eco_bahar_learning_evidence LIMIT 0',
            'SELECT id,cycle_id,reviewer_account_id,decision_code,created_at FROM eco_bahar_reviews LIMIT 0'
        ] as $sql){
            if($pdo->query($sql)===false)return false;
        }
        return true;
    }catch(Throwable $e){
        return false;
    }
}
/**
 * The same strict MySQL UTC consent projection used by the isolated science
 * policy tests. Direct HTTP access cannot provide this history. A missing
 * reference implementation fails closed rather than trusting a legacy grant.
 *
 * Full rows MUST come from subject/account/purpose-scoped server SQL. LIMIT
 * 1025 is a fail-closed overflow sentinel; >1024 decisions are not accepted.
 */
function goldenTalentPurposeConsentCurrent(array $rows,int|float $now,string $purpose): bool {
    $projector=__DIR__.'/golden-talent-consent.php';
    if(!is_file($projector))return false;
    require_once $projector;
    if(!function_exists('bertinaCurrentConsent'))return false;
    return bertinaCurrentConsent($rows,$purpose,$now)['allowed']===true;
}
function goldenTalentAssessmentConsentCurrent(array $rows,int|float $now): bool {
    return goldenTalentPurposeConsentCurrent($rows,$now,'ASSESSMENT');
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
    $consent=$pdo->prepare("SELECT c.id,c.account_id,c.subject_id,c.notice_id,
            c.decision,c.withdrawn_at,c.granted_at,
            n.purpose_code,n.version_label,n.locale,n.notice_sha256,
            n.effective_at,n.retired_at
        FROM eco_consent_records c
        INNER JOIN eco_consent_notices n ON n.id=c.notice_id
        WHERE c.subject_id=? AND c.account_id=?
          AND n.purpose_code='ASSESSMENT'
        ORDER BY c.granted_at DESC,c.id DESC LIMIT 1025");
    $items=[];
    $now=microtime(true);
    foreach(array_slice($candidates,0,25) as $row) {
        $subjectId=(string)($row['id']??'');
        if(!validUuid($subjectId))continue;
        $consent->execute([$subjectId,$accountId]);
        $decisions=$consent->fetchAll(PDO::FETCH_ASSOC);
        if(!goldenTalentAssessmentConsentCurrent(is_array($decisions)?$decisions:[],$now))continue;
        $items[]=[
            'subjectId'=>$subjectId,
            'displayName'=>(string)($row['pseudonym']??''),
            'relationship'=>'VERIFIED_GUARDIAN',
            'assessmentConsent'=>'CURRENT',
            'availableActions'=>[] // no submissions, reports or entitlements yet
        ];
    }
    return $items;
}
/**
 * Minimal guardian BAHAR projection for explicitly authorised visibility.
 * Two independent purposes are checked: assessment and parent visibility.
 * Absence of a current grant, an unverified relationship, or unavailable
 * schema returns no learner. No answers or longitudinal interpretations.
 */
function goldenTalentGuardianBaharOverview(PDO $pdo,string $accountId): array {
    $authorised=goldenTalentMyVerifiedSubjects($pdo,$accountId);
    $consent=$pdo->prepare("SELECT c.id,c.account_id,c.subject_id,c.notice_id,
            c.decision,c.withdrawn_at,c.granted_at,
            n.purpose_code,n.version_label,n.locale,n.notice_sha256,
            n.effective_at,n.retired_at
        FROM eco_consent_records c
        JOIN eco_consent_notices n ON n.id=c.notice_id
        WHERE c.subject_id=? AND c.account_id=?
          AND n.purpose_code='PARENT_VISIBILITY'
        ORDER BY c.granted_at DESC,c.id DESC LIMIT 1025");
    $counts=$pdo->prepare("SELECT
            COUNT(DISTINCT p.id) AS portfolio_count,
            COUNT(w.id) AS weekly_cycle_count,
            COALESCE(SUM(CASE WHEN w.human_reviewed_at IS NOT NULL
                THEN 1 ELSE 0 END),0) AS human_reviewed_cycle_count
        FROM eco_bahar_portfolios p
        LEFT JOIN eco_bahar_weekly_cycles w ON w.portfolio_id=p.id
        WHERE p.subject_id=?");
    if(!$consent||!$counts)throw new RuntimeException('bahar_query_unavailable');
    $output=[];
    $now=microtime(true);
    foreach($authorised as $subject){
        $id=(string)($subject['subjectId']??'');
        if(!validUuid($id))continue;
        if(!$consent->execute([$id,$accountId]))throw new RuntimeException('bahar_consent_query_failed');
        $decisions=$consent->fetchAll(PDO::FETCH_ASSOC);
        if(!goldenTalentPurposeConsentCurrent(is_array($decisions)?$decisions:[],$now,'PARENT_VISIBILITY'))continue;
        if(!$counts->execute([$id]))throw new RuntimeException('bahar_counts_query_failed');
        $row=$counts->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row))throw new RuntimeException('bahar_counts_result_unavailable');
        $output[]=[
            'learnerAlias'=>(string)($subject['displayName']??''),
            'portfolioCount'=>(int)($row['portfolio_count']??0),
            'weeklyCycleCount'=>(int)($row['weekly_cycle_count']??0),
            'humanReviewedCycleCount'=>(int)($row['human_reviewed_cycle_count']??0)
        ];
    }
    return $output;
}

/** Append minimal private read evidence; caller must commit before respond(). */
function goldenTalentAuditGuardianBaharOverview(PDO $pdo,string $accountId,int $count): void {
    $nonce=bin2hex(random_bytes(32));
    $eventKey=hash('sha256','GT_BAHAR_GUARDIAN_OVERVIEW_READ|'.$accountId.'|'.$nonce);
    $statement=$pdo->prepare("INSERT INTO eco_audit_events
        (event_key,actor_account_id,action_code,entity_kind,entity_id,
         correlation_id,payload_sha256,event_sha256)
         VALUES(?,?,'GT_BAHAR_GUARDIAN_OVERVIEW_READ','GUARDIAN_ACCOUNT',?,?,?,?)");
    if(!$statement||!$statement->execute([
        $eventKey,$accountId,$accountId,uuidv4(),
        hash('sha256','visible_learner_count:'.$count),
        hash('sha256','GT_BAHAR_GUARDIAN_OVERVIEW_READ|'.$eventKey)
    ]))throw new RuntimeException('bahar_audit_required');
}
function goldenTalentRoute(string $path,string $verb): never {
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Robots-Tag: noindex, noarchive, nosnippet');
    if($path==='/golden-talent/my-bahar-overview' && $verb==='GET'){
        $pdo=db();
        if(!$pdo)fail('database_unconfigured',503);
        $account=sessionAccount($pdo);
        if(!$account||($account['status']??'')!=='active'
            ||empty($account['email_verified_at']))fail('unauthorized',401);
        $accountId=(string)($account['id']??'');
        if(!validUuid($accountId))fail('unauthorized',401);
        if(!goldenTalentBaseSchemaPresent($pdo)
            ||!goldenTalentBaharStorageSchemaReady($pdo))
            fail('golden_talent_schema_unavailable',503);
        if(!rateAllowed($pdo,'gt_bahar_guardian_overview',$accountId,10,300))
            fail('rate_limited',429);
        try{
            if(!$pdo->beginTransaction())throw new RuntimeException('bahar_read_transaction_unavailable');
            $items=goldenTalentGuardianBaharOverview($pdo,$accountId);
            goldenTalentAuditGuardianBaharOverview($pdo,$accountId,count($items));
            if(!$pdo->commit())throw new RuntimeException('bahar_audit_commit_required');
            respond([
                'ok'=>true,'service'=>'golden-talent',
                'schema'=>'bahar-guardian-overview-v1',
                'scope'=>'verified_guardian_assessment_and_parent_visibility',
                'learners'=>$items,'candidateScanLimit'=>25,
                'interpretationsExposed'=>false,
                'rawEvidenceExposed'=>false,
                'longitudinalTrendValidated'=>false,
                'learnerSubmissionEnabled'=>false,
                'professionalReviewApiActive'=>false,
                'note'=>'Read-only counts. These are neither growth scores, performance evaluations nor access to private assessment content.'
            ]);
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            error_log('Golden Talent BAHAR overview unavailable: '.get_class($e));
            fail('bahar_private_unavailable',503);
        }
    }
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
            if(!$pdo->beginTransaction())throw new RuntimeException('audit_transaction_unavailable');
            $items=goldenTalentMyVerifiedSubjects($pdo,$accountId);
            // An attributable, append-only read event is required before a
            // private learner alias may leave the server. Log no student IDs,
            // answers, pseudonyms or assessment outcomes in the event.
            $eventKey=hash('sha256','GT_GUARDIAN_LIST_READ|'.$accountId.'|'.bin2hex(random_bytes(32)));
            $eventDigest=hash('sha256',$eventKey.'|'.count($items));
            $audit=$pdo->prepare("INSERT INTO eco_audit_events
                (event_key,actor_account_id,action_code,entity_kind,entity_id,
                 correlation_id,payload_sha256,event_sha256)
                VALUES(?,?,'GT_GUARDIAN_LIST_READ','GUARDIAN_ACCOUNT',?,?,?,?)");
            if(!$audit||!$audit->execute([
                $eventKey,$accountId,$accountId,uuidv4(),
                hash('sha256','count:'.count($items)),$eventDigest
            ]))throw new RuntimeException('audit_write_failed');
            if(!$pdo->commit())throw new RuntimeException('audit_commit_failed');
            respond(['ok'=>true,'service'=>'golden-talent',
                'scope'=>'verified_guardian_current_assessment_consent',
                'learners'=>$items,'candidateScanLimit'=>25,
                'paginationAvailable'=>false,
                'privateAssessmentApiActive'=>false,
                'automaticPaidEntitlement'=>false,
                'note'=>'Only verified guardian links with current assessment consent are listed. No private assessment data or report access is granted.']);
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            error_log('Golden Talent private listing unavailable: '.get_class($e));
            fail('golden_talent_private_unavailable',503);
        }
    }
    if ($path==='/golden-talent/health' && $verb==='GET') {
        $pdo=db();
        $schema=goldenTalentBaseSchemaPresent($pdo);
        $baharSchema=goldenTalentBaharStorageSchemaReady($pdo);
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
            'baharReadiness'=>[
                'bertinaMysqlSchemaColumnsAvailable'=>$baharSchema,
                'weeklyCycleAndEvidenceApiActive'=>false,
                'consentScopedPortfolioAccessActive'=>false,
                'professionalReviewApiActive'=>false,
                'longitudinalTrendValidated'=>false,
                'requiresHumanReview'=>true,
                'legacyPostgresqlAdapterCompatible'=>false,
                'note'=>'Structural readiness only. Live BAHAR persistence, entitlement, consent, review and recovery are not certified.'
            ],
            'readOnly'=>true,
            'warning'=>'Capability and schema checks do not prove scientific validation, consent, identity, payments, private storage or full production acceptance.'
        ]);
    }
    fail('not_found',404);
}
