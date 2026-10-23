<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Owner review of an explicitly registered examination COVERAGE EXPECTATION.
 *
 * Approval confirms that this scope merits continued source investigation.
 * It does not approve the candidate document, establish an official
 * examination, validate its answer key, grant copyright or publish an item.
 * Invoked only inside existing SUPER_ADMIN + fresh MFA + CSRF operations route.
 */
function jrKaOwnerCoverageScopeDecision(PDO $pdo, string $actor, array $body): array {
    $action=$body['action']??null;
    $approve=$action==='ka_approve_coverage_scope';
    if (!$approve && $action!=='ka_withdraw_coverage_scope') {
        throw new InvalidArgumentException('invalid_coverage_scope_action');
    }
    $id=$body['requirementId']??null;
    $confirmation=$approve?'APPROVE_COVERAGE_SCOPE_ONLY':'WITHDRAW_COVERAGE_SCOPE_ONLY';
    if (!is_string($id) ||
        !preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D',$id) ||
        ($body['confirmation']??null)!==$confirmation) {
        throw new InvalidArgumentException('invalid_coverage_scope_request');
    }
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('SELECT requirement_state,approved_by_account_id
            FROM jrei_exam_coverage_requirements WHERE requirement_id=? FOR UPDATE');
        $q->execute([$id]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) throw new DomainException('coverage_expectation_not_found');
        $reviewable=in_array((string)$row['requirement_state'],[
            'REQUIRES_SOURCE_REVIEW','SOURCE_CANDIDATE_LINKED_UNREVIEWED'
        ],true);
        if ($approve) {
            if (!$reviewable || $row['approved_by_account_id']!==null) {
                throw new DomainException('coverage_expectation_review_conflict');
            }
            // Preserve original state: a scope approval does not alter source state.
            $q=$pdo->prepare('UPDATE jrei_exam_coverage_requirements
                SET approved_by_account_id=? WHERE requirement_id=?
                AND approved_by_account_id IS NULL AND requirement_state IN
                (\'REQUIRES_SOURCE_REVIEW\',\'SOURCE_CANDIDATE_LINKED_UNREVIEWED\')');
            $q->execute([$actor,$id]);
        } else {
            // Withdrawing an incorrect scope cannot delete its audit/source trail.
            // It also cannot silently revoke unrelated source/licence records.
            if (!$reviewable) throw new DomainException('coverage_expectation_review_conflict');
            $q=$pdo->prepare("UPDATE jrei_exam_coverage_requirements
                SET approved_by_account_id=NULL,
                    requirement_state='WITHDRAWN_SCOPE_ERROR'
                WHERE requirement_id=? AND requirement_state IN
                    ('REQUIRES_SOURCE_REVIEW','SOURCE_CANDIDATE_LINKED_UNREVIEWED')");
            $q->execute([$id]);
        }
        if ($q->rowCount()!==1) {
            throw new DomainException('coverage_expectation_review_conflict');
        }
        operationsAudit($pdo,$actor,$approve?
            'jrei_coverage_scope_approved':'jrei_coverage_scope_withdrawn',$id);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    return ['ok'=>true,'sourceReviewed'=>false,
        'answerKeyVerified'=>false,'rightsToReproduceVerified'=>false];
}
