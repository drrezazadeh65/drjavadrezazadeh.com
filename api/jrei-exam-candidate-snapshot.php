<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Authenticated candidate's OWN commercial exam metadata.
 *
 * Uses the original customer_auth_sessions identity and original assessment
 * session envelope. It NEVER returns answer text, keys, other candidates,
 * minors' records, rank estimates, saved documents or bank transactions.
 * Schema missing = unavailable, not an empty invented learning history.
 */
/**
 * A bounded authenticated START discovery, not a permission grant.
 * Original adult consent, exact verified payment, immutable questions,
 * independent answer key and current clock are checked AGAIN under the
 * original server transaction by jrExamAttemptStart().
 * No student content or payment identifiers are exposed.
 */
function jrExamCandidateStartOptions(PDO $pdo,string $accountId,int $now): array {
    $cfg=cfg();
    if(($cfg['jrei_exam_commercial_enabled']??false)!==true||
       ($cfg['jrei_exam_runtime_enabled']??false)!==true||
       ($cfg['jrei_exam_item_delivery_accepted']??false)!==true||
       !function_exists('jrExamPublishedItemDeliveryReady')||
       !jrExamPublishedItemDeliveryReady($pdo))return [];
    // Do not expose a start control without an original currently-consented
    // adult account-owned assessment subject. No guardian/minor assumptions.
    $q=$pdo->prepare("SELECT id FROM eco_subjects
      WHERE owner_account_id=? AND guardian_account_id IS NULL
        AND age_band IN ('ADULT','18_PLUS')
        AND subject_type='LEARNER' AND status='ACTIVE'
      ORDER BY id ASC LIMIT 4");
    $q->execute([$accountId]);$subject=null;
    foreach($q->fetchAll(PDO::FETCH_COLUMN) as $candidate){
        if(!validUuid((string)$candidate))continue;
        try{
            jrExamAdultSubjectConsent($pdo,$accountId,(string)$candidate);
            $subject=(string)$candidate;
            break;
        }catch(DomainException $e){continue;}
    }
    if($subject===null)return [];
    // One candidate must not see duplicate offers from two entitlement rows.
    // The actual unique entitlement and original provider's verified claim
    // remain mandatory under the transactional start lock.
    $q=$pdo->prepare("SELECT e.offering_id,o.opens_at,o.closes_at,
        o.duration_seconds,o.max_attempts,
        p.title_fa,p.title_en,p.division,
        (SELECT COUNT(*) FROM jrei_exam_commercial_attempts a
         WHERE a.account_id=e.account_id AND a.offering_id=e.offering_id)
         AS attempts_used,
        (SELECT COUNT(*) FROM jrei_exam_commercial_attempts active
         WHERE active.account_id=e.account_id
           AND active.offering_id=e.offering_id
           AND active.attempt_state='IN_PROGRESS') AS running_attempts
      FROM jrei_exam_commercial_entitlements e
      JOIN jrei_exam_commercial_offerings o ON o.offering_id=e.offering_id
      JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
      WHERE e.account_id=? AND e.state='ACTIVE' AND e.revoked_at IS NULL
        AND e.begins_at<=? AND e.expires_at>?
        AND o.offering_state='PUBLISHED' AND p.product_state='PUBLISHED'
        AND o.opens_at<=? AND o.closes_at>?
      ORDER BY o.closes_at ASC,e.offering_id ASC LIMIT 40");
    $q->execute([$accountId,$now,$now,$now,$now]);$options=[];$seen=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
        $id=(string)$row['offering_id'];
        if(!validUuid($id)||isset($seen[$id]))continue;
        $seen[$id]=true;
        $allowed=(int)$row['max_attempts'];
        if($allowed<1||$allowed>10||(int)$row['attempts_used']>=$allowed||
           (int)$row['running_attempts']>0||
           (int)$row['duration_seconds']<60||
           (int)$row['duration_seconds']>28800)continue;
        $options[]=[
          'offeringId'=>$id,'subjectId'=>$subject,
          'titleFa'=>(string)$row['title_fa'],
          'titleEn'=>(string)$row['title_en'],
          'division'=>(string)$row['division'],
          'durationSeconds'=>(int)$row['duration_seconds'],
          'closesAt'=>(int)$row['closes_at'],
          'remainingAttemptAllowance'=>$allowed-(int)$row['attempts_used'],
          'provisionalOnly'=>true,
          'consentPaymentItemsAndScientificReviewRecheckedAtStart'=>true
        ];
        if(count($options)>=12)break;
    }
    return $options;
}

function jrExamCandidateSnapshot(PDO $pdo,string $accountId): array {
    if(!validUuid($accountId))
        throw new InvalidArgumentException('invalid_candidate_account');
    if(!jrExamCommercialSchemaReady($pdo))
        throw new DomainException('exam_commercial_schema_unavailable');
    $q=$pdo->prepare('SELECT
        a.attempt_id,a.attempt_number,a.attempt_state,a.starts_at,
        a.deadline_at,a.submitted_at,a.updated_at,
        p.product_code,p.title_fa,p.title_en,p.division,
        o.offering_id,o.opens_at,o.closes_at,o.duration_seconds,
        e.state AS entitlement_state,e.expires_at AS entitlement_expires_at,
        sess.status AS assessment_session_status
      FROM jrei_exam_commercial_attempts a
      JOIN jrei_exam_commercial_offerings o ON o.offering_id=a.offering_id
      JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
      JOIN jrei_exam_commercial_entitlements e
        ON e.entitlement_id=a.entitlement_id
       AND e.offering_id=a.offering_id AND e.account_id=a.account_id
      JOIN eco_assessment_sessions sess
        ON sess.id=a.assessment_session_id
      WHERE a.account_id=?
      ORDER BY a.updated_at DESC,a.attempt_id DESC LIMIT 40');
    $q->execute([$accountId]);
    $rows=[];
    foreach($q as $r){
        $rows[]=[
          'attemptId'=>$r['attempt_id'],
          'attemptNumber'=>(int)$r['attempt_number'],
          'attemptState'=>$r['attempt_state'],
          'startedAt'=>$r['starts_at']===null?null:(int)$r['starts_at'],
          'deadlineAt'=>$r['deadline_at']===null?null:(int)$r['deadline_at'],
          'submittedAt'=>$r['submitted_at']===null?null:(int)$r['submitted_at'],
          'updatedAt'=>(int)$r['updated_at'],
          'productCode'=>$r['product_code'],
          'titleFa'=>$r['title_fa'],'titleEn'=>$r['title_en'],
          'division'=>$r['division'],
          'offeringId'=>$r['offering_id'],
          'opensAt'=>(int)$r['opens_at'],
          'closesAt'=>(int)$r['closes_at'],
          'durationSeconds'=>(int)$r['duration_seconds'],
          'entitlementState'=>$r['entitlement_state'],
          'entitlementExpiresAt'=>(int)$r['entitlement_expires_at'],
          'assessmentSessionStatus'=>$r['assessment_session_status'],
          'answerContentIncluded'=>false,'paymentProofIncluded'=>false,
          'resultIndependentlyValidated'=>false
        ];
    }
    // Read-only listing is intentionally best-effort. Missing registration
    // or a stale policy shows no proposed starts, never invented access.
    $startOptions=[];
    try{$startOptions=jrExamCandidateStartOptions($pdo,$accountId,time());}
    catch(Throwable $e){}
    return [
      'ok'=>true,'schema'=>'jr.jrei.candidate-exams.v1',
      'startOptions'=>$startOptions,
      'startOptionsAreNotEntitlementProof'=>true,
      'scope'=>'OWNER_ACCOUNT_ONLY',
      'attempts'=>$rows,'hasMorePossible'=>count($rows)>=40,
      'checkoutEnabled'=>false,'answerDisclosureEnabled'=>false,
      'scientificValidationEstablished'=>false
    ];
}
