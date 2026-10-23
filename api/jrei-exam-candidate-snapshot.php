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
    return [
      'ok'=>true,'schema'=>'jr.jrei.candidate-exams.v1',
      'scope'=>'OWNER_ACCOUNT_ONLY',
      'attempts'=>$rows,'hasMorePossible'=>count($rows)>=40,
      'checkoutEnabled'=>false,'answerDisclosureEnabled'=>false,
      'scientificValidationEstablished'=>false
    ];
}
