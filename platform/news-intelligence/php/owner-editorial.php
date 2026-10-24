<?php
declare(strict_types=1);
/**
 * Private editorial read/decision handlers, SOURCE ONLY, NOT ROUTED.
 * Include from EXISTING authenticated owner-MFA operations controller only.
 * Caller must perform real server-side session, RBAC, MFA, CSRF and nonce
 * validation; no client-supplied "isAdmin" flag counts as proof.
 * Does not generate public files, send emails or publish social media.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
function jrNewsOwnerAuthority(array $serverSession): array {
    if (($serverSession['source']??null)!=='EXISTING_OPERATIONS_SESSION' ||
        ($serverSession['ownerAuthenticated']??null)!==true ||
        ($serverSession['mfaVerified']??null)!==true ||
        ($serverSession['csrfVerified']??null)!==true ||
        ($serverSession['scope']??null)!=='JREI_NEWS_EDITORIAL') {
        throw new RuntimeException('news_owner_authority_required');
    }
    $actor=$serverSession['accountId']??null;
    $audit=$serverSession['mfaAuditReference']??null;
    if (!is_string($actor) ||
        !preg_match('/^[0-9a-f-]{36}$/iD',$actor) ||
        !is_string($audit) || !preg_match('/^[a-zA-Z0-9._:-]{5,100}$/D',$audit)) {
        throw new RuntimeException('news_owner_session_invalid');
    }
    return ['actor'=>$actor,'audit'=>$audit];
}
function jrNewsPrivateOwnerQueue(PDO $pdo,array $session,
    int $limit=40): array {
    jrNewsOwnerAuthority($session);
    if ($limit<1 || $limit>100) {
        throw new InvalidArgumentException('news_queue_limit_invalid');
    }
    $stmt=$pdo->prepare(
        "SELECT v.revision_id,v.revision_number,v.approval_digest,
                v.editorial_state,v.created_at,c.headline,c.priority_code,
                c.source_url,c.content_sha256
         FROM jrei_news_editorial_versions v
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         WHERE v.editorial_state='PENDING_OWNER_APPROVAL'
         ORDER BY c.priority_code ASC, v.created_at ASC LIMIT :lim"
    );
    $stmt->bindValue(':lim',$limit,PDO::PARAM_INT);
    $stmt->execute();
    return ['schema'=>'jr.jrei.news-owner-review-queue.v1',
        'items'=>$stmt->fetchAll(PDO::FETCH_ASSOC),
        'source'=>'PRIVATE_MOTHER_DATABASE',
        'publiclyAvailable'=>false,'smtpDeliveryConfirmed'=>false];
}
function jrNewsPrivateRecordDecision(PDO $pdo,array $session,
    string $revisionId,string $expectedApprovalDigest,
    string $action,int $nowEpoch): array {
    $auth=jrNewsOwnerAuthority($session);
    if (!in_array($action,['APPROVE','REJECT','REQUEST_REVISION'],true) ||
        !preg_match('/^[0-9a-f-]{36}$/iD',$revisionId) ||
        !preg_match('/^[a-f0-9]{64}$/D',$expectedApprovalDigest) ||
        $nowEpoch<=0) {
        throw new InvalidArgumentException('news_owner_decision_invalid');
    }
    if (!function_exists('operationsAudit')) {
        throw new RuntimeException('news_owner_operations_audit_missing');
    }
    $pdo->beginTransaction();
    try {
        $stmt=$pdo->prepare(
            'SELECT approval_digest,editorial_state
             FROM jrei_news_editorial_versions
             WHERE revision_id=? FOR UPDATE'
        );
        $stmt->execute([$revisionId]);
        $row=$stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row ||
            (string)$row['editorial_state']!=='PENDING_OWNER_APPROVAL' ||
            !hash_equals((string)$row['approval_digest'],$expectedApprovalDigest)) {
            throw new RuntimeException('news_stale_or_unreviewable_revision');
        }
        $bytes=random_bytes(16);
        $bytes[6]=chr((ord($bytes[6])&15)|64);
        $bytes[8]=chr((ord($bytes[8])&63)|128);
        $hex=bin2hex($bytes);
        $decisionId=substr($hex,0,8).'-'.substr($hex,8,4).'-'.
            substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20,12);
        $pdo->prepare(
            'INSERT INTO jrei_news_owner_decisions
             (decision_id,revision_id,owner_account_id,approval_digest,
              action_code,owner_mfa_audit_ref,decided_at)
             VALUES(?,?,?,?,?,?,?)'
        )->execute([$decisionId,$revisionId,$auth['actor'],
            $expectedApprovalDigest,$action,$auth['audit'],$nowEpoch]);
        $state=match($action) {
            'APPROVE'=>'OWNER_APPROVED',
            'REJECT'=>'REJECTED',
            'REQUEST_REVISION'=>'REVISION_REQUESTED'
        };
        $pdo->prepare(
            'UPDATE jrei_news_editorial_versions SET editorial_state=?
             WHERE revision_id=? AND editorial_state=?'
        )->execute([$state,$revisionId,'PENDING_OWNER_APPROVAL']);
        operationsAudit($pdo,$auth['actor'],'jrei_news_owner_decision',$decisionId);
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-owner-decision-receipt.v1',
            'decisionId'=>$decisionId,'revisionId'=>$revisionId,
            'decision'=>$action,'editorialState'=>$state,
            'publiclyPublished'=>false,'distributionPerformed'=>false];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}
